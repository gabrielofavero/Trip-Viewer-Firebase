// ======= View Item Card Dialogs =======
// Card dialogs for the itinerary items on view.html (destination entries,
// accommodations and transportation legs). They mirror the destination page's
// card → dialog pattern: a `.dialog-overlay` + `.dialog-card` with a media
// area on top and a details body below (styles in components/dialog.css +
// destination.css).
//
// Destination entries reuse the destination page's renderers so the dialog
// matches destination.html exactly (same media carousel, score badge, detail
// body and link-button row). Accommodations reuse the same media renderer with
// a hotel icon fallback. Transportation legs render the company logo on a
// neutral, theme-aware background with optional per-company light/dark
// background colors (see `backgrounds` in transportation.json).

import { getID } from '../../../utils/dom.js';
import {
	animateDialogOpen,
	animateDialogClose,
	DIALOG_LEAVE_CLASS,
} from '../../../utils/messages.js';
import { getState } from '../../../data/state.js';
import { getTransportations, getDestinations, getCurrencies } from '../../../app/config.js';
import { translate } from '../../../i18n/translation.js';
import {
	convertFromDateObject,
	getDateString,
	getTimeStringFromDate,
	getWeekday,
	getMonth,
	jsTimeToVisualTime,
} from '../../../utils/dates.js';
import { getDestinationsAccordionBodyHTML } from '../../../pages/destination/support/content.js';
import { getDialogActionsHTML } from '../../../pages/destination/support/card-actions.js';
import { getRatingTranslation } from '../../../models/destination.model.js';
import { getDestinationRaw } from '../../../data/services/destination.service.js';
import {
	getSensitiveReservationHTML,
	loadSensitiveReservations,
} from './sensitive-reservation.js';

/** Media index offset so view dialogs never collide with destination card indices. */
const VIEW_ITEM_MEDIA_J = 9000;

/** Live media lifecycle hooks (set from the dynamically imported card-media). */
let openMedia: ((j: number) => void) | null = null;
let closeMedia: ((j: number) => void) | null = null;
let activeMediaJ: number | null = null;

// ======= Public API =======

/** Wire overlay click + Escape close. Called once from view.ts. */
export function initViewItemDialogs(): void {
	document.addEventListener('click', function (e: MouseEvent) {
		const target = e.target as HTMLElement;
		if (target.classList.contains('dialog-overlay') && target.id === 'view-item-dialog') {
			closeViewItemDialog();
		}
	});

	document.addEventListener('keydown', function (e) {
		const dialog = getID('view-item-dialog');
		if (e.key === 'Escape' && dialog && dialog.style.display === 'flex') {
			closeViewItemDialog();
		}
	});
}

export function closeViewItemDialog(): void {
	if (activeMediaJ != null && closeMedia) {
		closeMedia(activeMediaJ);
	}
	activeMediaJ = null;

	const dialog = getID('view-item-dialog');
	if (!dialog || dialog.style.display === 'none') {
		document.body.classList.remove('dialog-open');
		return;
	}

	const card = dialog.querySelector<HTMLElement>('.dialog-card');
	const done = () => {
		document.body.classList.remove('dialog-open');
	};

	if (card) {
		dialog.classList.add(DIALOG_LEAVE_CLASS);
		animateDialogClose(card, () => {
			dialog.classList.remove(DIALOG_LEAVE_CLASS);
			dialog.style.display = 'none';
			done();
		});
	} else {
		animateDialogClose(dialog, done);
	}
}

/** Destination entry — matches the destination page card dialog exactly. */
export async function openDestinationItemDialog(entry): Promise<void> {
	let item = entry.item;
	let currency = entry.currency || 'BRL';

	if (!item && entry.lazyDestinationId) {
		const destData = await getDestinationRaw(entry.lazyDestinationId);
		if (destData) {
			item = destData[entry.category]?.[entry.itemId];
			currency = destData.currency || 'BRL';
		}
	}

	if (!item) {
		showViewItemDialog({
			mediaHTML: '',
			title: '',
			scoreHTML: '',
			contentHTML: `<div class="text-center py-4">${translate('messages.errors.missing_data')}</div>`,
			mediaJ: null,
		});
		return;
	}

	const { getDialogMediaHTMLWithFallback, openDialogMedia, closeDialogMedia } = await import(
		'../../../pages/destination/support/card-media.js'
	);

	openMedia = openDialogMedia;
	closeMedia = closeDialogMedia;

	const j = VIEW_ITEM_MEDIA_J;
	const values = getPriceScale(currency);
	const planned = getPlannedLabel(entry.category, entry.itemId);

	showViewItemDialog({
		mediaHTML: getDialogMediaHTMLWithFallback(
			item,
			j,
			getDestinationFallbackMediaHTML(entry.category),
		),
		title: getDestinationTitle(item),
		scoreHTML: getDialogScoreBadgeHTMLFor(item),
		contentHTML: `
			${getDestinationsAccordionBodyHTML({ j, item, values, currency, planned, editBtn: false })}
			${getDialogActionsHTML(item)}`,
		mediaJ: j,
	});
}

/** Accommodation — same media carousel + detail body as destination items. */
export async function openAccommodationDialog(entry): Promise<void> {
	const acc = entry.item;
	if (!acc) {
		showMissingItem();
		return;
	}

	const { getDialogMediaHTMLWithFallback, openDialogMedia, closeDialogMedia } = await import(
		'../../../pages/destination/support/card-media.js'
	);

	openMedia = openDialogMedia;
	closeMedia = closeDialogMedia;

	const j = VIEW_ITEM_MEDIA_J;

	showViewItemDialog({
		mediaHTML: getDialogMediaHTMLWithFallback(acc, j, getAccommodationFallbackMediaHTML()),
		title: getAccommodationTitle(acc),
		scoreHTML: '',
		contentHTML: getAccommodationBodyHTML(acc),
		mediaJ: j,
	});
}

/** Transportation — company logo on a neutral, theme-aware background. */
export function openTransportationDialog(entry): void {
	const transport = entry.item;
	if (!transport) {
		showMissingItem();
		return;
	}

	const company = getCompanyInfo(transport);

	showViewItemDialog({
		mediaHTML: getTransportationMediaHTML(transport, company),
		title: getTransportationTitle(transport, company),
		scoreHTML: '',
		contentHTML: getTransportationBodyHTML(transport, company),
		mediaJ: null,
	});
}

// ======= Internals =======

function showMissingItem(): void {
	showViewItemDialog({
		mediaHTML: '',
		title: '',
		scoreHTML: '',
		contentHTML: `<div class="text-center py-4">${translate('messages.errors.missing_data')}</div>`,
		mediaJ: null,
	});
}

/**
 * Return the dialog overlay, creating it on demand. The standalone
 * destination page ships its dialog statically; view.html creates this
 * generic item dialog lazily and swaps its media + body per item type.
 */
function ensureDialog(): HTMLElement {
	const existing = getID('view-item-dialog');
	if (existing) return existing;

	const dialog = document.createElement('div');
	dialog.id = 'view-item-dialog';
	dialog.className = 'dialog-overlay';
	dialog.style.display = 'none';
	dialog.innerHTML = `
        <div class="dialog-card view-item-dialog-card">
          <div id="view-item-dialog-media"></div>
          <a class="dialog-close" data-action="close-view-item-dialog">
            <i class="iconify" data-icon="material-symbols:close"></i>
          </a>
          <div class="dialog-body">
            <div class="dialog-header">
              <div class="dialog-title-row">
                <h2 class="dialog-title" id="view-item-dialog-title"></h2>
              </div>
              <span class="dialog-score-badge" id="view-item-dialog-score" style="display:none"></span>
            </div>
            <div id="view-item-dialog-content"></div>
          </div>
        </div>`;
	document.body.appendChild(dialog);
	return dialog;
}

function showViewItemDialog({ mediaHTML, title, scoreHTML, contentHTML, mediaJ }): void {
	const dialog = ensureDialog();

	const mediaEl = getID('view-item-dialog-media');
	mediaEl.innerHTML = mediaHTML || '';
	mediaEl.style.display = mediaHTML ? '' : 'none';

	getID('view-item-dialog-title').innerHTML = title || '';

	const scoreEl = getID('view-item-dialog-score');
	if (scoreHTML) {
		scoreEl.style.display = 'inline-flex';
		scoreEl.innerHTML = scoreHTML;
	} else {
		scoreEl.style.display = 'none';
		scoreEl.innerHTML = '';
	}

	getID('view-item-dialog-content').innerHTML = contentHTML || '';

	animateDialogOpen(dialog, 'flex');
	const card = dialog.querySelector<HTMLElement>('.dialog-card');
	if (card) animateDialogOpen(card);
	document.body.classList.add('dialog-open');

	activeMediaJ = mediaJ ?? null;
	if (activeMediaJ != null && openMedia) {
		openMedia(activeMediaJ);
	}

	// Sensitive reservation boxes are registered once at boot; re-scan when a
	// dialog introduces new ones (accommodation / transportation dialogs).
	if (getState().pin === 'sensitive-only' && getID('view-item-dialog-content')?.querySelector('.sensitive-box')) {
		loadSensitiveReservations();
	}
}

// ======= Destination helpers =======

function getPriceScale(currency) {
	return getCurrencies().scale[currency] || getCurrencies().scale['BRL'];
}

function getDestinationFallbackMediaHTML(category) {
	const config = getDestinations();
	const icon = config.icons[category] || config.icons.map || 'bx bx-map-alt';
	return `<div class="dest-card-image no-image dialog-media"><i class="${icon}"></i></div>`;
}

function getDialogScoreBadgeHTMLFor(item) {
	const rating = item?.rating;
	if (!RATINGS.includes(rating)) return '';
	return `
        <span class="dest-card-score ${getRatingClassLocal(rating)}">${rating}</span>
        <span class="dest-card-score-text">${getRatingTranslation(rating)}</span>`;
}

const RATINGS = ['1', '2', '3', '4', '5'];

/** Mirrors getRatingClass() from destination/categories.js without its heavy imports. */
function getRatingClassLocal(rating) {
	switch (rating) {
		case '5':
		case '4':
		case '3':
		case '2':
		case '1':
			return `rating-${rating}`;
		default:
			return 'rating-absent';
	}
}

function getDestinationTitle(item) {
	const closed = item?.placeAPI?.closed ? `${translate('placesApi.closed.label')} ` : '';
	if (item.name && item.emoji) {
		return `${closed}${item.name} ${item.emoji}`;
	}
	return `${closed}${item.name}`;
}

/**
 * Build the same "Planned: …" label the destination dialog shows, but derive
 * it directly from the trip itinerary (view.html does not mount the
 * destination page's planned-destination state).
 */
function getPlannedLabel(category, itemId) {
	const itinerary = getState().itinerary || [];
	const matches: { date: any; period: string }[] = [];

	for (const day of itinerary) {
		for (const period of PERIODS) {
			for (const entry of day[period] || []) {
				const it = entry?.item;
				if (!it) continue;
				const type = it.type;
				if (
					(type === 'destination' || type === 'destinations') &&
					it.category === category &&
					it.id === itemId
				) {
					matches.push({ date: day.date, period });
				}
			}
		}
	}

	if (matches.length === 0) return '';
	if (matches.length > 1) return translate('labels.planned.multiple');

	const match = matches[0];
	const date = convertFromDateObject(match.date);
	const weekday = getWeekday(date.getUTCDay());
	const day = match.date.day;
	const month = getMonth(match.date.month - 1).toLowerCase();
	const period = getPeriodLabel(match.period).toLowerCase();
	const periodLabel = period ? ` (${period})` : '';
	return `${translate('labels.planned.title')}: ${weekday}, ${translate('datetime.titles.day_month', { day, month })}${periodLabel}`;
}

const PERIODS = ['earlyMorning', 'morning', 'afternoon', 'night'];

function getPeriodLabel(period) {
	switch (period) {
		case 'earlyMorning':
			return translate('datetime.time_of_day.early_hours');
		case 'morning':
			return translate('datetime.time_of_day.morning');
		case 'afternoon':
			return translate('datetime.time_of_day.afternoon');
		case 'night':
			return translate('datetime.time_of_day.evening');
		default:
			return '';
	}
}

// ======= Accommodation helpers =======

function getAccommodationTitle(acc) {
	return acc.name || translate('trip.accommodation.accommodation');
}

function getAccommodationFallbackMediaHTML() {
	return `<div class="dest-card-image no-image dialog-media"><i class="bx bxs-hotel"></i></div>`;
}

function getAccommodationBodyHTML(acc) {
	const rows: string[] = [];

	if (acc.address) {
		rows.push(getTopicHTML('mingcute:location-line', acc.address));
	}

	const reservation = getAccommodationReservationHTML(acc);
	if (reservation) rows.push(reservation);

	const checkIn = getAccommodationDate(acc.dates?.checkIn);
	const checkOut = getAccommodationDate(acc.dates?.checkOut);
	if (checkIn) {
		rows.push(getTopicHTML('mdi:chevron-right', `${translate('trip.accommodation.checkin')}: ${checkIn}`));
	}
	if (checkOut) {
		rows.push(getTopicHTML('mdi:chevron-right', `${translate('trip.accommodation.checkout')}: ${checkOut}`));
	}

	if (acc.breakfast) {
		rows.push(getTopicHTML('mdi:coffee', translate('trip.accommodation.breakfast')));
	}

	return `
        <div class="destinations-text">
            ${rows.join('')}
            <div class="destinations-description" style="display: ${acc.description ? 'block' : 'none'}">
                ${acc.description || ''}
            </div>
        </div>`;
}

function getAccommodationReservationHTML(acc) {
	if (getState().pin === 'sensitive-only') {
		return getTopicHTML(
			'mdi:file-document-outline',
			getSensitiveReservationHTML('accommodations', acc.id),
			true,
		);
	}

	let reservation = acc.reservation || '';
	if (!reservation) return '';

	if (reservation.charAt(0) === '#') {
		return getTopicHTML('mdi:file-document-outline', `${translate('labels.reservation.title')} ${reservation}`);
	}

	return getTopicHTML('mdi:file-document-outline', `${translate('labels.reservation.title')} #${reservation}`);
}

function getAccommodationDate(dateObject) {
	if (!dateObject) return '';
	const date = convertFromDateObject(dateObject);
	return `${getDateString(date)}, ${getTimeStringFromDate(date)}`;
}

// ======= Transportation helpers =======

function getCompanyInfo(transport) {
	const type = transport.type;
	const title = transport.company;
	const config = getTransportations();

	const titleConfig = config?.companies?.[type]?.[title];
	const websiteConfig = config?.websites?.[type]?.[title];
	const imageConfig = config?.images?.[type]?.[title];
	const backgroundConfig = config?.backgrounds?.[type]?.[title];

	return {
		title: titleConfig || title,
		images: imageConfig || null,
		background: backgroundConfig || null,
		website: websiteConfig || '',
		isCustom: !titleConfig,
	};
}

function getTransportationTitle(transport, company) {
	if (company.title) return company.title;
	return `${transport.points?.origin || ''} → ${transport.points?.destination || ''}`;
}

/**
 * Company logo on a neutral background. Background colors resolve from
 * `backgrounds[type][company]` (custom light/dark) and fall back to the
 * neutral light/dark defaults handled in view.css.
 */
function getTransportationMediaHTML(transport, company) {
	const bg = company.background;
	const vars: string[] = [];
	if (bg?.light) vars.push(`--transport-media-bg-light: ${bg.light}`);
	if (bg?.dark) vars.push(`--transport-media-bg-dark: ${bg.dark}`);
	const bgStyle = vars.length ? ` style="${vars.join('; ')}"` : '';

	if (company.images?.light || company.images?.dark) {
		const light = company.images.light || company.images.dark;
		const dark = company.images.dark || company.images.light;

		return `
        <div class="view-item-transport-media"${bgStyle}>
            <img class="view-item-transport-logo light" src="${light}">
            <img class="view-item-transport-logo dark" src="${dark}">
        </div>`;
	}

	const fallback = company.title
		? `<div class="view-item-transport-title">${company.title}</div>`
		: `<div class="view-item-transport-title">${transport.points?.origin || ''} → ${transport.points?.destination || ''}</div>`;

	return `<div class="view-item-transport-media"${bgStyle}>${fallback}</div>`;
}

function getTransportationBodyHTML(transport, company) {
	const rows: string[] = [];

	const origin = transport.points?.origin || '';
	const destination = transport.points?.destination || '';
	if (origin || destination) {
		rows.push(getTopicHTML('mingcute:rocket-fill', `${origin} → ${destination}`));
	}

	const departure = transport.dates?.departure ? convertFromDateObject(transport.dates.departure) : null;
	const arrival = transport.dates?.arrival ? convertFromDateObject(transport.dates.arrival) : null;
	if (departure || arrival) {
		const departureText = departure
			? `${getDateString(departure)} ${getTimeStringFromDate(departure)}`
			: '';
		const arrivalText = arrival ? `${getDateString(arrival)} ${getTimeStringFromDate(arrival)}` : '';
		rows.push(getTopicHTML('mdi:calendar', [departureText, arrivalText].filter(Boolean).join(' → ')));
	}

	if (transport.duration) {
		rows.push(getTopicHTML('mdi:clock-outline', jsTimeToVisualTime(transport.duration)));
	}

	if (transport.person) {
		rows.push(getTopicHTML('mdi:account', transport.person));
	}

	const typeTitle = getTransportTypeTitle(transport.type);
	if (typeTitle) {
		rows.push(getTopicHTML(getTransportTypeIcon(transport.type), typeTitle));
	}

	const reservation = getTransportationReservationHTML(transport, company);
	if (reservation) rows.push(reservation);

	return `<div class="destinations-text">${rows.join('')}</div>`;
}

function getTransportTypeTitle(type) {
	const config = getTransportations();
	const titleKey = config?.titles?.[type];
	return titleKey ? translate(titleKey) : '';
}

function getTransportTypeIcon(type) {
	const config = getTransportations();
	return config?.icons?.[type] || config?.icons?.other || 'mingcute:rocket-fill';
}

function getTransportationReservationHTML(transport, company) {
	if (getState().pin === 'sensitive-only') {
		return getTopicHTML(
			'mdi:file-document-outline',
			getSensitiveReservationHTML('transportation', transport.id),
			true,
		);
	}

	let reservation = transport.reservation || '';
	if (!reservation) return '';

	let link = company.website || '';
	if (transport.link) link = transport.link;

	reservation = reservation.charAt(0) === '#' ? reservation.slice(1) : reservation;
	const code = link
		? `<a class="flight-code" href="${link}" target="_blank">#${reservation}</a>`
		: `<span class="flight-code">#${reservation}</span>`;
	const copy = `<i class="iconify copy-icon" data-icon="mdi:content-copy" data-action="copy-to-clipboard" data-text="${reservation}"></i>`;

	return getTopicHTML('mdi:file-document-outline', `${code} ${copy}`, true);
}

// ======= Shared markup helper =======

/**
 * One destination-style detail row (icon + content). `rawContent` allows the
 * caller to pass pre-built HTML (e.g. a sensitive reservation box).
 */
function getTopicHTML(icon, content, rawContent = false) {
	return `
        <div class="destinations-topic" style="display: block">
            <i class="iconify color-icon" data-icon="${icon}"></i>
            ${rawContent ? content : (content || '')}
        </div>`;
}
