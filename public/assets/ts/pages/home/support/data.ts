import { evictCachedImage } from '../../../app/media-cache.js';
import {
	getUID,
	registerIfUserNotPresent,
	setUserData,
	USER_DATA,
} from '../../../data/firebase/auth.js';
import {
	getUserDestinationSummaries,
	getUserListingSummaries,
	getUserTripSummaries,
} from '../../../data/firebase/database.js';
import {
	createDestinationFolderId,
	type DestinationFolder,
	getCachedDestinationFolders,
	groupDestinationsByFolder,
	saveDestinationFolders,
	seedDestinationFolders,
} from '../../../data/services/destination-folders.service.js';
import { applyPeopleToTravelers, seedPeople } from '../../../data/services/people.service.js';
import { seedTripTemplates } from '../../../data/services/trip-templates.service.js';
import { translate, translatePage } from '../../../i18n/translation.js';
import { getDarkerColor, getLighterColor, hexToRgb } from '../../../theme/colors.js';
import { isOnDarkMode } from '../../../theme/visibility.js';
import { LazyGrid } from '../../../ui/lazy-grid.js';
import { dateObjectToString, getDateNoTime } from '../../../utils/dates.js';
import {
	getCurrentTrips,
	getID,
	getLastUpdatedOnText,
	getNextTrips,
	getOrderedDocumentByUpdateDate,
	getPreviousTrips,
} from '../../../utils/dom.js';
import { stopLoadingScreen } from '../../../utils/loading.js';
import {
	animateDialogClose,
	animateDialogOpen,
	closeMessage,
	DIALOG_LEAVE_CLASS,
	displayError,
	displayPrompt,
} from '../../../utils/messages.js';
import { escapePeopleHTML, getPeopleAvatarStackHTML } from '../../../utils/people-avatars.js';
import {
	editDestination,
	editListing,
	editTrip,
	viewDestination,
	viewListing,
	viewTrip,
} from './navigation.js';
import { loadSettingsPeople } from './people.js';
import { loadSettingsTemplates } from './templates.js';

var INDEX_DATA: Record<string, any> = {};
var CURRENT_TRIPS: any[] = [];
var PREVIOUS_TRIPS: any[] = [];
var NEXT_TRIPS: any[] = [];
var ALL_TRIPS: any[] = []; // Merged for the unified trip view
var SELECTED_TRIP_ID: string | null = null;
var TRIP_ACTIVE_GRID: LazyGrid | null = null;
var TRIP_UPCOMING_GRID: LazyGrid | null = null;
var TRIP_FINISHED_GRID: LazyGrid | null = null;
var DEST_GRID: LazyGrid | null = null;
var LIST_GRID: LazyGrid | null = null;
var GRIDS_INITIALIZED = false;
var SEARCH_QUERY = '';
// Destination folder ids the user expanded on the index (session-only state).
var EXPANDED_DEST_FOLDERS = new Set<string>();

/** Escape text before interpolating it into HTML (folder names are user input). */
function escapeHTML(value: string): string {
	return String(value ?? '')
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

/** Convert an array of { id, ...data } to a Record<string, data> for compatibility with legacy helpers */
function arrayToRecord<T extends { id: string }>(arr: T[]): Record<string, Omit<T, 'id'>> {
	const record: Record<string, any> = {};
	for (const item of arr) {
		const { id, ...rest } = item;
		record[id] = rest;
	}
	return record;
}

export async function loadUserIndex() {
	firebase.auth().onAuthStateChanged(async (user) => {
		if (user) {
			try {
				// registerIfUserNotPresent() reads users/{uid} (creating it if
				// missing) and returns that document, so reuse it here instead of
				// calling getUserData() again (avoids a duplicate read).
				const userData = await registerIfUserNotPresent();
				setUserData(userData);
				// Folder organization lives in the user document.
				seedDestinationFolders(userData?.destinationFolders);
				// People registry (name + photo) also lives in the user document.
				seedPeople(userData?.people);
				loadSettingsPeople();
				// Trip / accommodation templates used by the trip editor.
				seedTripTemplates(userData?.tripTemplates);
				loadSettingsTemplates();
				showLoggedView();

				// Read profile fields from the Firestore user document first,
				// falling back to the Auth user only when they're missing.

				const displayName = userData?.name || user.displayName || '';
				const email = userData?.email || user.email || '';
				const photo = userData?.photoURL || user.photoURL || '';
				const photoURL = photo ? `url(${photo})` : '';

				getID('title-name').innerHTML = displayName ? displayName.split(' ')[0] : '';
				getID('greeting-avatar').style.backgroundImage = photoURL;
				getID('greeting-avatar').style.backgroundSize = 'cover';

				getID('settings-user-name').innerHTML = displayName;
				getID('settings-user-email').innerHTML = email;
				getID('settings-avatar').style.backgroundImage = photoURL;
				getID('settings-avatar').style.backgroundSize = 'cover';

				getID('profile-icon').style.backgroundImage = photoURL;
				getID('profile-icon').style.backgroundSize = 'cover';

				// While the summaries below are still being fetched, show
				// animated skeleton placeholder cards where the real cards will
				// land (the tab loaders below replace them once data arrives).
				showCardSkeletons();

				// Load summaries from subcollections (post-migration 14)
				const uid = await getUID();
				let tripSummaries: any[];
				let destSummaries: any[];
				let listSummaries: any[];
				try {
					[tripSummaries, destSummaries, listSummaries] = await Promise.all([
						getUserTripSummaries(uid),
						getUserDestinationSummaries(uid),
						getUserListingSummaries(uid),
					]);
				} catch (error) {
					clearCardSkeletons();
					throw error;
				}

				INDEX_DATA = {
					trips: arrayToRecord(tripSummaries),
					destinations: arrayToRecord(destSummaries),
					listings: arrayToRecord(listSummaries),
				};

				CURRENT_TRIPS = getCurrentTrips(INDEX_DATA.trips);
				PREVIOUS_TRIPS = getPreviousTrips(INDEX_DATA.trips);
				NEXT_TRIPS = getNextTrips(INDEX_DATA.trips);

				// Build ALL_TRIPS: current first, then next, then previous
				ALL_TRIPS = [
					...CURRENT_TRIPS.map((t) => ({ ...t, category: 'current' })),
					...NEXT_TRIPS.map((t) => ({ ...t, category: 'next' })),
					...PREVIOUS_TRIPS.map((t) => ({ ...t, category: 'past' })),
				];

				initGrids();
				loadTripsTab();
				loadDestinationsTab();
				loadListsTab();
				translatePage();

				// Expose key variables for dev mode (localhost only)
				if (typeof dev !== 'undefined') {
					dev.page.INDEX_DATA = INDEX_DATA;
					dev.page.CURRENT_TRIPS = CURRENT_TRIPS;
					dev.page.PREVIOUS_TRIPS = PREVIOUS_TRIPS;
					dev.page.NEXT_TRIPS = NEXT_TRIPS;
					dev.page.ALL_TRIPS = ALL_TRIPS;
					dev.page.SELECTED_TRIP_ID = SELECTED_TRIP_ID;
					dev.page.USER_DATA = USER_DATA;
				}
			} catch (error) {
				// An error here (e.g. Firestore is offline right after the stored
				// auth session is restored) must never leave the page stuck on
				// skeleton placeholders or bubble up as an unhandled rejection.
				clearCardSkeletons();
				stopLoadingScreen();
				displayError(error, true);
			}
		} else {
			showUnloggedView();
		}
	});
	stopLoadingScreen();
}

function showLoggedView() {
	getID('unlogged-view').style.display = 'none';
	getID('logged-view').style.display = 'block';
	getID('profile-icon').style.display = 'flex';
}

function showUnloggedView() {
	getID('logged-view').style.display = 'none';
	getID('unlogged-view').style.display = 'block';
	getID('profile-icon').style.display = 'none';
	clearCardSkeletons();
}

/*--------------------------------------------------------------
# Card Skeleton (shown while summaries are still loading)
--------------------------------------------------------------*/
// Every grid that holds cards on the index. Trips are split into three
// sections, but while the summaries are loading we don't know which of those
// sections will exist — so all of them (plus destinations/lists) get the same
// placeholders and the tab loaders replace them with the real cards.
var SKELETON_CARD_GRID_IDS = [
	'trip-active-grid',
	'trip-upcoming-grid',
	'trip-finished-grid',
	'dest-grid',
	'list-grid',
];
var SKELETON_CARDS_PER_GRID = 6;

function skeletonCardHTML(): string {
	return `
		<div class="skeleton-card" aria-hidden="true">
			<span class="skeleton-media skeleton-shimmer"></span>
			<span class="skeleton-body">
				<span class="skeleton-line skeleton-title skeleton-shimmer"></span>
				<span class="skeleton-line skeleton-title skeleton-title-short skeleton-shimmer"></span>
				<span class="skeleton-line skeleton-meta skeleton-shimmer"></span>
			</span>
		</div>`;
}

function skeletonCardsHTML(count: number): string {
	let html = '';
	for (let i = 0; i < count; i++) html += skeletonCardHTML();
	return html;
}

function showCardSkeletons() {
	const html = skeletonCardsHTML(SKELETON_CARDS_PER_GRID);
	for (const id of SKELETON_CARD_GRID_IDS) {
		const grid = getID(id);
		if (grid) grid.innerHTML = html;
	}
	// Clear any stale empty-state (e.g. from a previous sign-in) while the
	// placeholders are visible; the tab loaders restore the correct state.
	for (const id of ['trips-empty', 'dest-empty', 'lists-empty']) {
		const empty = getID(id);
		if (empty) empty.style.display = 'none';
	}
}

function clearCardSkeletons() {
	for (const id of SKELETON_CARD_GRID_IDS) {
		const grid = getID(id);
		if (grid) grid.innerHTML = '';
	}
}

/*--------------------------------------------------------------
# Card image loading (external URLs can be slow or unavailable)
--------------------------------------------------------------*/
const CARD_IMAGE_SELECTOR = '.trip-card-image, .dest-card-image, .list-card-image';

function cardImageClass(kind: 'trip' | 'dest' | 'list'): string {
	if (kind === 'trip') return 'trip-card-image';
	if (kind === 'dest') return 'dest-card-image';
	return 'list-card-image';
}

/** Card image backed by a real <img> so the browser reports load/error. Shows
 *  the shimmer skeleton while loading; on error flips to the icon fallback. */
function cardImageHTML(kind: 'trip' | 'dest' | 'list', url: string, icon: string): string {
	return `
		<div class="${cardImageClass(kind)} is-loading">
			<img class="card-image-img" src="${url}" alt="" loading="lazy" decoding="async">
			<i class="iconify card-image-icon" data-icon="${icon}"></i>
		</div>`;
}

function handleCardImageEvent(e: Event, failed: boolean): void {
	const target = e.target as HTMLElement | null;
	if (!target || !(target instanceof HTMLImageElement)) return;
	if (!target.classList.contains('card-image-img')) return;
	const container = target.closest<HTMLElement>(CARD_IMAGE_SELECTOR);
	if (!container) return;

	container.classList.remove('is-loading');
	if (failed) {
		// Image could not load (broken/unavailable external link): show the
		// placeholder icon instead of a broken image. Also drop a cached copy
		// so the next visit retries the URL instead of showing it broken.
		container.classList.add('no-image');
		evictCachedImage(target.src);
		target.remove();
	} else {
		container.classList.add('is-loaded');
	}
}

/** img load/error events don't bubble, so listen on the capture phase from
 *  each grid — this also covers re-renders and infinite-scroll batches. */
function bindCardImageHandlers(grid: HTMLElement | null): void {
	if (!grid) return;
	grid.addEventListener('load', (e) => handleCardImageEvent(e, false), true);
	grid.addEventListener('error', (e) => handleCardImageEvent(e, true), true);
}

/*--------------------------------------------------------------
# Trips Tab
--------------------------------------------------------------*/
function initGrids() {
	if (GRIDS_INITIALIZED) return;
	GRIDS_INITIALIZED = true;

	TRIP_ACTIVE_GRID = new LazyGrid(
		getID('trip-active-grid'),
		getID('trip-active-sentinel'),
		buildTripCardHTML,
	);
	TRIP_UPCOMING_GRID = new LazyGrid(
		getID('trip-upcoming-grid'),
		getID('trip-upcoming-sentinel'),
		buildTripCardHTML,
	);
	TRIP_FINISHED_GRID = new LazyGrid(
		getID('trip-finished-grid'),
		getID('trip-finished-sentinel'),
		buildTripCardHTML,
	);
	DEST_GRID = new LazyGrid(getID('dest-grid'), getID('dest-sentinel'), buildDestCardHTML);
	LIST_GRID = new LazyGrid(getID('list-grid'), getID('list-sentinel'), buildListCardHTML);

	// Card images are real <img>s; bind their load/error listeners once per
	// grid (capture phase) so every rendered + lazy-loaded card is covered.
	bindCardImageHandlers(getID('trip-active-grid'));
	bindCardImageHandlers(getID('trip-upcoming-grid'));
	bindCardImageHandlers(getID('trip-finished-grid'));
	bindCardImageHandlers(getID('dest-grid'));
	bindCardImageHandlers(getID('list-grid'));
	// Cards filed inside destination folders render in their own container, so
	// the grid listener above never sees their image events — bind this too or
	// the shimmer stays forever even after the image has loaded.
	bindCardImageHandlers(getID('dest-folders'));
}

function loadTripsTab() {
	const empty = getID('trips-empty');
	const count = getID('trips-count');

	if (ALL_TRIPS.length === 0) {
		getID('trip-active-section').style.display = 'none';
		getID('trip-upcoming-section').style.display = 'none';
		getID('trip-finished-section').style.display = 'none';
		TRIP_ACTIVE_GRID?.setItems([]);
		TRIP_UPCOMING_GRID?.setItems([]);
		TRIP_FINISHED_GRID?.setItems([]);
		empty.style.display = 'block';
		count.textContent = '';
		return;
	}

	empty.style.display = 'none';
	count.textContent = tripCountLabel(ALL_TRIPS.length);

	// Active trips (happening right now) get their own section on top; "next"
	// (upcoming) and "past" (finished) follow below.
	const active = ALL_TRIPS.filter((t) => t.category === 'current');
	const upcoming = ALL_TRIPS.filter((t) => t.category === 'next');
	const finished = ALL_TRIPS.filter((t) => t.category === 'past');

	getID('trip-active-section').style.display = active.length > 0 ? '' : 'none';
	getID('trip-upcoming-section').style.display = upcoming.length > 0 ? '' : 'none';
	getID('trip-finished-section').style.display = finished.length > 0 ? '' : 'none';

	TRIP_ACTIVE_GRID?.setItems(active);
	TRIP_UPCOMING_GRID?.setItems(upcoming);
	TRIP_FINISHED_GRID?.setItems(finished);

	updateTripSectionCounts();
}

function tripCountLabel(n: number): string {
	return n + ' ' + translate('trip.document') + (n === 1 ? '' : 's');
}

function destCountLabel(n: number): string {
	return (
		n + ' ' + (n === 1 ? translate('destination.document') : translate('destination.title'))
	);
}

function listCountLabel(n: number): string {
	return n + ' ' + (n === 1 ? translate('listing.document') : translate('listing.title'));
}

function updateTripSectionCounts() {
	getID('trip-active-count').textContent = TRIP_ACTIVE_GRID
		? String(TRIP_ACTIVE_GRID.getMatchingCount())
		: '';
	getID('trip-upcoming-count').textContent = TRIP_UPCOMING_GRID
		? String(TRIP_UPCOMING_GRID.getMatchingCount())
		: '';
	getID('trip-finished-count').textContent = TRIP_FINISHED_GRID
		? String(TRIP_FINISHED_GRID.getMatchingCount())
		: '';
}

function buildTripCardHTML(trip): string {
	const bgImage = getTripBackgroundImage(trip);
	const badgeClass =
		trip.category === 'current'
			? 'badge-current'
			: trip.category === 'next'
				? 'badge-next'
				: 'badge-past';
	const badgeLabel =
		trip.category === 'current'
			? translate('index.active')
			: trip.category === 'next'
				? getTripTimeBadgeLabel(trip.start, 'next')
				: getTripTimeBadgeLabel(trip.end, 'past');
	const dateStr = dateObjectToString(trip.start) + ' – ' + dateObjectToString(trip.end);

	const imageHTML = bgImage
		? cardImageHTML('trip', bgImage, 'tabler:plane-departure')
		: `<div class="trip-card-image no-image"><i class="iconify card-image-icon" data-icon="tabler:plane-departure"></i></div>`;

	return `
		<div class="trip-card" data-action="open-trip-dialog" data-trip-id="${trip.id}">
			<span class="trip-card-badge ${badgeClass}">${badgeLabel}</span>
			<div class="trip-card-media">
				${imageHTML}
			</div>
			<div class="trip-card-body">
				<div class="trip-card-title">${trip.title || translate('labels.no_title')}</div>
				<div class="trip-card-meta">
					<i class="iconify" data-icon="material-symbols:calendar-month" style="font-size:13px"></i>
					${dateStr}
				</div>
			</div>
		</div>`;
}

function getTripBackgroundImage(trip) {
	if (!trip.image || !trip.image.active) return null;
	return trip.image.background || trip.image.light || trip.image.dark || null;
}

/**
 * Relative time shown on the trip card badge instead of a static status:
 * "In 10 days" for upcoming trips (until the start) and "10 days ago" for
 * finished ones (since the end). Up to 90 days shows days, longer shows
 * months, anything past a year shows years. Days are rounded up; months and
 * years use normal rounding — a month count that rounds to 12 becomes 1 year.
 */
function getTripTimeBadgeLabel(
	dateObject: Record<string, any> | undefined,
	direction: 'next' | 'past',
): string {
	if (!dateObject) {
		return translate(direction === 'next' ? 'index.upcoming' : 'index.finished');
	}

	const MS_PER_DAY = 86400000;
	const today = getDateNoTime(new Date());
	const target = new Date(Date.UTC(dateObject.year, dateObject.month - 1, dateObject.day));
	const rawDays =
		direction === 'next'
			? (target.getTime() - today.getTime()) / MS_PER_DAY
			: (today.getTime() - target.getTime()) / MS_PER_DAY;
	const days = Math.max(1, Math.ceil(rawDays));

	let unit: 'day' | 'month' | 'year';
	let value: number;
	if (days <= 90) {
		unit = 'day';
		value = days;
	} else if (days <= 365) {
		const months = Math.round(days / 30.4375);
		if (months >= 12) {
			unit = 'year';
			value = 1;
		} else {
			unit = 'month';
			value = months;
		}
	} else {
		unit = 'year';
		value = Math.max(1, Math.round(days / 365.25));
	}

	const key = `index.countdown.${direction}_${unit}` + (value === 1 ? '' : 's');
	return translate(key, { value: String(value) });
}

/*--------------------------------------------------------------
# Trip Dialog
--------------------------------------------------------------*/
export function openTripDialog(tripId) {
	const trip = ALL_TRIPS.find((t) => t.id === tripId);
	if (!trip) return;
	SELECTED_TRIP_ID = tripId;

	const dialog = getID('trip-dialog');
	const bgImage = getTripBackgroundImage(trip);

	// Image
	const imgDiv = getID('trip-dialog-image');
	if (bgImage) {
		imgDiv.style.backgroundImage = `url('${bgImage}')`;
		imgDiv.className = 'dialog-image';
		imgDiv.innerHTML = '';
	} else {
		imgDiv.style.backgroundImage = '';
		imgDiv.className = 'dialog-image no-image';
		imgDiv.innerHTML = `<i class="iconify dialog-image-icon" data-icon="tabler:plane-departure"></i>`;
	}

	// Title
	getID('trip-dialog-title').textContent = trip.title || translate('labels.no_title');

	// Badge
	const badge = getID('trip-dialog-badge');
	const badgeClass =
		trip.category === 'current'
			? 'badge-current'
			: trip.category === 'next'
				? 'badge-next'
				: 'badge-past';
	const badgeLabel =
		trip.category === 'current'
			? translate('index.active')
			: trip.category === 'next'
				? translate('index.upcoming')
				: translate('index.finished');
	badge.textContent = badgeLabel;

	// Custom trip accent — applied to the dialog only (trip-card badge stays as-is)
	const tripColors = trip.colors || {};
	const hasCustomColors = tripColors.active === true && tripColors.light && tripColors.dark;
	const accent = hasCustomColors ? (isOnDarkMode() ? tripColors.dark : tripColors.light) : null;

	const ACCENT_VARS = [
		'--trip-dialog-accent',
		'--trip-dialog-accent-rgb',
		'--trip-dialog-accent-hover',
		'--trip-dialog-accent-soft',
	];
	for (const prop of ACCENT_VARS) dialog.style.removeProperty(prop);

	if (accent) {
		const [r, g, b] = hexToRgb(accent);
		const hoverColor = isOnDarkMode()
			? getDarkerColor(accent, 10)
			: getLighterColor(accent, 10);
		dialog.style.setProperty('--trip-dialog-accent', accent);
		dialog.style.setProperty('--trip-dialog-accent-rgb', `${r}, ${g}, ${b}`);
		dialog.style.setProperty('--trip-dialog-accent-hover', hoverColor);
		dialog.style.setProperty('--trip-dialog-accent-soft', `rgba(${r}, ${g}, ${b}, 0.08)`);
	}

	badge.className = hasCustomColors
		? 'dialog-badge dialog-badge-custom'
		: 'dialog-badge ' + badgeClass;

	// Dates
	getID('trip-dialog-dates').textContent =
		dateObjectToString(trip.start) + ' – ' + dateObjectToString(trip.end);

	// Duration
	const durRow = getID('trip-dialog-duration-row');
	const duration = getTripDurationDays(trip);
	if (duration > 0) {
		durRow.style.display = 'flex';
		getID('trip-dialog-duration').textContent =
			duration + ' ' + (duration === 1 ? translate('index.day') : translate('index.days'));
	} else {
		durRow.style.display = 'none';
	}

	// Last updated
	getID('trip-dialog-updated').textContent = getLastUpdatedOnText(trip.version?.lastUpdated);

	// Travelers — stacked photo circles overlaid on the bottom-right corner of
	// the header image (the row is positioned over the image in CSS). The
	// registry is the source of truth: a photo/name edited in Settings shows up
	// here immediately, without re-saving every trip (the trip copy is only a
	// fallback for shared viewers).
	const travelerList = applyPeopleToTravelers(
		Array.isArray(trip.travelers) ? trip.travelers : [],
	);
	const travelerNames = travelerList
		.map((traveler) => traveler?.name)
		.filter(Boolean)
		.join(', ');
	const travelersStack = getPeopleAvatarStackHTML(travelerList);
	const peopleRow = getID('trip-dialog-people');
	if (peopleRow) {
		peopleRow.innerHTML = travelersStack
			? `<span class="dialog-people-stack" aria-label="${escapePeopleHTML(travelerNames)}">${travelersStack}</span><span class="dialog-people-names" aria-hidden="true">${escapePeopleHTML(travelerNames)}</span>`
			: '';
		peopleRow.style.display = travelersStack ? 'flex' : 'none';
	}

	// Modules — pill order mirrors the view page sections: overview → expenses →
	// transportation → accommodations → itinerary → destinations → gallery.
	const modulesDiv = getID('trip-dialog-modules');
	const moduleNames = {
		summary: translate('labels.overview'),
		expenses: translate('trip.expenses.title'),
		transportation: translate('trip.transportation.title'),
		accommodations: translate('trip.accommodation.title'),
		itinerary: translate('trip.itinerary.title'),
		destinations: translate('destination.title'),
		gallery: translate('trip.gallery.title'),
	};
	let modulesHTML = '';
	if (trip.modules) {
		for (const [key, label] of Object.entries(moduleNames)) {
			if (trip.modules[key] && label) {
				modulesHTML += `<span class="module-pill">${label}</span>`;
			}
		}
	}
	modulesDiv.innerHTML = modulesHTML || `<span class="module-pill">—</span>`;

	// Buttons
	getID('trip-dialog-view').onclick = function () {
		viewTrip(trip.id);
	};
	getID('trip-dialog-edit').onclick = function () {
		editTrip(trip.id);
	};

	// Show dialog with scroll lock (standardized open animation on the card)
	animateDialogOpen(dialog, 'flex');
	const card = dialog.querySelector<HTMLElement>('.dialog-card');
	if (card) animateDialogOpen(card);
	document.body.classList.add('dialog-open');
}

/** Close an index dialog (overlay + card) with the standardized animation. */
function closeIndexDialog(dialogId: string, onDone?: () => void) {
	const dialog = getID(dialogId);
	if (!dialog || dialog.style.display === 'none') {
		onDone?.();
		return;
	}
	const card = dialog.querySelector<HTMLElement>('.dialog-card');
	if (card) {
		// Fade the backdrop out while the card slides down; hide once it ends.
		dialog.classList.add(DIALOG_LEAVE_CLASS);
		animateDialogClose(card, () => {
			dialog.classList.remove(DIALOG_LEAVE_CLASS);
			dialog.style.display = 'none';
			onDone?.();
		});
	} else {
		animateDialogClose(dialog, onDone);
	}
}

export function closeTripDialog() {
	closeIndexDialog('trip-dialog', () => {
		document.body.classList.remove('dialog-open');
		SELECTED_TRIP_ID = null;
	});
}

function getTripDurationDays(trip: Record<string, any>): number {
	if (!trip.start || !trip.end) return 0;
	const start = new Date(trip.start.year, trip.start.month - 1, trip.start.day);
	const end = new Date(trip.end.year, trip.end.month - 1, trip.end.day);
	return Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
}

/*--------------------------------------------------------------
# Destinations Tab
--------------------------------------------------------------*/
function loadDestinationsTab() {
	const empty = getID('dest-empty');
	const count = getID('dests-count');
	const destinations = getOrderedDocumentByUpdateDate(INDEX_DATA.destinations);

	if (destinations.length === 0) {
		DEST_GRID?.setItems([]);
		renderDestinationFolders([]);
		updateLooseDestinationsHeader(0, 0);
		empty.style.display = 'block';
		count.textContent = '';
		return;
	}
	empty.style.display = 'none';
	count.textContent = destCountLabel(destinations.length);
	renderDestinationsTab();
}

/**
 * Render the destinations tab: folder sections first (folders are collapsed
 * unless the user expanded them or a search is active), then the loose
 * destinations that are not filed in any folder.
 */
function renderDestinationsTab() {
	const destinations = getOrderedDocumentByUpdateDate(INDEX_DATA.destinations);
	const { groups, loose } = groupDestinationsByFolder(
		destinations,
		getCachedDestinationFolders(),
	);

	const query = SEARCH_QUERY.trim().toLowerCase();
	const matches = (destination) =>
		!query || String(destination.title || '').toLowerCase().includes(query);

	const visibleGroups = groups
		.map((group) => ({ ...group, items: group.items.filter(matches) }))
		.filter((group) => !query || group.items.length > 0);
	const visibleLoose = loose.filter(matches);

	renderDestinationFolders(visibleGroups);
	DEST_GRID?.setItems(visibleLoose);
	updateLooseDestinationsHeader(visibleGroups.length, visibleLoose.length);
}

function updateLooseDestinationsHeader(folderCount: number, looseCount: number) {
	const title = getID('dest-loose-title');
	const count = getID('dest-loose-count');
	if (!title || !count) return;
	// Only label the loose group when folders exist — otherwise the grid is
	// simply the destination list.
	const show = folderCount > 0 && looseCount > 0;
	title.style.display = show ? 'flex' : 'none';
	count.textContent = show ? String(looseCount) : '';
}

function renderDestinationFolders(groups) {
	const container = getID('dest-folders');
	if (!container) return;

	if (!groups.length) {
		container.innerHTML = '';
		container.style.display = 'none';
		return;
	}
	container.style.display = 'flex';

	// While a search is active, matching cards must be visible without an
	// extra click — the stored expand/collapse state is kept untouched.
	const searching = SEARCH_QUERY.trim().length > 0;

	container.innerHTML = groups
		.map(({ folder, items }) => {
			const expanded = searching || EXPANDED_DEST_FOLDERS.has(folder.id);
			const editLabel = escapeHTML(translate('index.folders.edit_folder'));
			return `
				<div class="dest-folder${expanded ? ' expanded' : ''}" data-folder-id="${escapeHTML(folder.id)}">
					<div class="dest-folder-head">
						<button type="button" class="dest-folder-header" data-action="toggle-dest-folder"
							data-folder-id="${escapeHTML(folder.id)}" aria-expanded="${expanded}">
							<span class="dest-folder-icon">
								<i class="iconify" data-icon="material-symbols:folder"></i>
							</span>
							<span class="dest-folder-name">${escapeHTML(folder.name)}</span>
							<span class="dest-folder-count">${items.length}</span>
							<i class="iconify dest-folder-chevron" data-icon="material-symbols:expand-more"></i>
						</button>
						<button type="button" class="dest-folder-edit" data-action="edit-dest-folder"
							data-folder-id="${escapeHTML(folder.id)}"
							aria-label="${editLabel}" title="${editLabel}">
							<i class="iconify" data-icon="material-symbols:edit"></i>
						</button>
					</div>
					<div class="dest-folder-body" style="display:${expanded ? 'block' : 'none'}">
						<div class="dest-grid">
							${items.map((item) => buildDestCardHTML(item)).join('')}
						</div>
					</div>
				</div>`;
		})
		.join('');
}

/** Expand/collapse a folder section on the destinations tab (DOM-only toggle). */
export function toggleDestinationFolder(folderId: string | null) {
	if (!folderId) return;
	const section = document.querySelector<HTMLElement>(
		`#dest-folders .dest-folder[data-folder-id="${folderId}"]`,
	);
	if (!section) return;

	const expanded = !section.classList.contains('expanded');
	section.classList.toggle('expanded', expanded);
	const body = section.querySelector<HTMLElement>('.dest-folder-body');
	if (body) body.style.display = expanded ? 'block' : 'none';
	const header = section.querySelector<HTMLElement>('.dest-folder-header');
	if (header) header.setAttribute('aria-expanded', String(expanded));

	if (expanded) EXPANDED_DEST_FOLDERS.add(folderId);
	else EXPANDED_DEST_FOLDERS.delete(folderId);
}

/*--------------------------------------------------------------
# Destination Folders Dialog (one folder at a time)
--------------------------------------------------------------*/
// The dialog always works on a single folder: "Add folder" opens it empty and
// the pencil inside a folder's accordion header opens it for that folder.
// Folders are never listed together, so the editor stays simple.

/** Folder being edited, or null while creating a new one. */
var FOLDER_DIALOG_ID: string | null = null;
/** Destination ids checked in the open dialog (not yet persisted). */
var FOLDER_DIALOG_SELECTION = new Set<string>();

/**
 * Open the folder dialog. Without an id it starts a new folder; with an id it
 * edits that folder (rename + destination selection).
 */
export function openFoldersDialog(folderId: string | null = null) {
	const folder = folderId
		? getCachedDestinationFolders().find((item) => item.id === folderId)
		: null;

	FOLDER_DIALOG_ID = folder?.id ?? null;
	FOLDER_DIALOG_SELECTION = new Set(folder?.destinationIds ?? []);

	renderFoldersDialog();
	hideFolderDialogError();
	animateDialogOpen(getID('folders-dialog'), 'flex');
	const card = getID('folders-dialog')?.querySelector<HTMLElement>('.dialog-card');
	if (card) animateDialogOpen(card);
	document.body.classList.add('dialog-open');

	getID('folder-dialog-name')?.focus();
}

export function closeFoldersDialog() {
	FOLDER_DIALOG_ID = null;
	FOLDER_DIALOG_SELECTION = new Set();
	closeIndexDialog('folders-dialog', () => {
		document.body.classList.remove('dialog-open');
	});
}

/** Fill the dialog for the current mode (new folder vs editing one folder). */
function renderFoldersDialog() {
	const editing = FOLDER_DIALOG_ID
		? getCachedDestinationFolders().find((folder) => folder.id === FOLDER_DIALOG_ID)
		: null;

	const title = getID('folder-dialog-title');
	if (title) {
		title.textContent = translate(
			editing ? 'index.folders.edit_title' : 'index.folders.new_title',
		);
	}

	const nameInput = getID('folder-dialog-name') as HTMLInputElement | null;
	if (nameInput) nameInput.value = editing?.name ?? '';

	// Deleting only makes sense for an existing folder.
	const deleteBtn = getID('folder-dialog-delete');
	if (deleteBtn) deleteBtn.style.display = editing ? '' : 'none';

	const destinations = getOrderedDocumentByUpdateDate(INDEX_DATA.destinations);
	const folders = getCachedDestinationFolders();

	// A destination belongs to at most one folder, so the picker only offers
	// the loose destinations plus the ones already filed in this folder.
	const filedElsewhere = new Set<string>();
	for (const folder of folders) {
		if (folder.id === FOLDER_DIALOG_ID) continue;
		for (const destinationId of folder.destinationIds) filedElsewhere.add(destinationId);
	}
	const available = destinations.filter(
		(destination: any) => !filedElsewhere.has(destination.id),
	);

	// Drop checked ids whose destination no longer exists.
	const availableIds = new Set(available.map((destination: any) => destination.id));
	FOLDER_DIALOG_SELECTION = new Set(
		[...FOLDER_DIALOG_SELECTION].filter((id) => availableIds.has(id)),
	);

	const items = getID('folder-dialog-items');
	if (items) {
		items.innerHTML = available
			.map((destination: any) => {
				const checked = FOLDER_DIALOG_SELECTION.has(destination.id);
				return `
					<label class="folder-editor-item${checked ? ' selected' : ''}">
						<input type="checkbox" data-dest-id="${escapeHTML(destination.id)}"${checked ? ' checked' : ''}>
						<span>${escapeHTML(destination.title || translate('labels.no_title'))}</span>
					</label>`;
			})
			.join('');
		items.style.display = available.length ? '' : 'none';

		for (const checkbox of items.querySelectorAll<HTMLInputElement>('input[data-dest-id]')) {
			checkbox.addEventListener('change', () => {
				const destinationId = checkbox.getAttribute('data-dest-id') || '';
				if (!destinationId) return;
				if (checkbox.checked) FOLDER_DIALOG_SELECTION.add(destinationId);
				else FOLDER_DIALOG_SELECTION.delete(destinationId);
				checkbox.closest('.folder-editor-item')?.classList.toggle('selected', checkbox.checked);
				updateFolderDialogCount();
			});
		}
	}

	const empty = getID('folder-dialog-empty');
	if (empty) {
		empty.style.display = available.length ? 'none' : 'block';
		empty.textContent = destinations.length
			? translate('index.folders.no_available')
			: translate('index.no_destinations');
	}

	updateFolderDialogCount();
}

function updateFolderDialogCount() {
	const count = getID('folder-dialog-count');
	if (count) {
		count.textContent = translate('index.folders.selected', {
			count: String(FOLDER_DIALOG_SELECTION.size),
		});
	}
}

function cloneFolders(folders: DestinationFolder[]): DestinationFolder[] {
	return folders.map((folder) => ({ ...folder, destinationIds: [...folder.destinationIds] }));
}

function showFolderDialogError(message: string) {
	const error = getID('folder-dialog-error');
	if (!error) return;
	error.textContent = message;
	error.style.display = 'block';
}

function hideFolderDialogError() {
	const error = getID('folder-dialog-error');
	if (error) error.style.display = 'none';
}

/** Validate and persist the single folder shown in the dialog. */
export async function saveFolderFromDialog() {
	const nameInput = getID('folder-dialog-name') as HTMLInputElement | null;
	const name = nameInput?.value.trim() || '';
	if (!name) {
		showFolderDialogError(translate('index.folders.name_required'));
		nameInput?.focus();
		return;
	}

	const folders = cloneFolders(getCachedDestinationFolders());
	const editingId = FOLDER_DIALOG_ID;
	const duplicated = folders.some(
		(folder) => folder.id !== editingId && folder.name.toLowerCase() === name.toLowerCase(),
	);
	if (duplicated) {
		showFolderDialogError(translate('index.folders.duplicate'));
		nameInput?.focus();
		return;
	}

	const selected = [...FOLDER_DIALOG_SELECTION];
	// A destination can live in a single folder: keep the saved selection out
	// of every other folder as a safety net for stale data.
	for (const folder of folders) {
		if (folder.id === editingId) continue;
		folder.destinationIds = folder.destinationIds.filter((id) => !selected.includes(id));
	}

	let folderId = editingId;
	if (folderId) {
		const folder = folders.find((item) => item.id === folderId);
		if (!folder) return;
		folder.name = name;
		folder.destinationIds = selected;
	} else {
		folderId = createDestinationFolderId();
		folders.push({ id: folderId, name, destinationIds: selected });
	}

	const saved = await saveDestinationFolders(folders);
	if (!saved) {
		showFolderDialogError(translate('index.folders.save_error'));
		return;
	}

	// Reveal the folder on the tab so the change is visible after closing.
	EXPANDED_DEST_FOLDERS.add(folderId);
	closeFoldersDialog();
	renderDestinationsTab();
}

/** Ask for confirmation, then delete the folder being edited. */
export function deleteCurrentFolderFromDialog() {
	const folder = FOLDER_DIALOG_ID
		? getCachedDestinationFolders().find((item) => item.id === FOLDER_DIALOG_ID)
		: null;
	if (!folder) return;

	displayPrompt({
		title: translate('index.folders.delete_title'),
		content: translate('index.folders.delete_message', {
			name: escapeHTML(folder.name),
		}),
		critical: true,
		yesAction: () => deleteDestinationFolderById(folder.id),
	});
}

export async function deleteDestinationFolderById(folderId: string | null) {
	if (!folderId) return;
	const folders = cloneFolders(getCachedDestinationFolders()).filter(
		(folder) => folder.id !== folderId,
	);
	EXPANDED_DEST_FOLDERS.delete(folderId);

	const saved = await saveDestinationFolders(folders);
	closeMessage();
	if (!saved) {
		displayError(new Error(translate('index.folders.save_error')));
		return;
	}

	if (FOLDER_DIALOG_ID === folderId) {
		FOLDER_DIALOG_ID = null;
		FOLDER_DIALOG_SELECTION = new Set();
		closeFoldersDialog();
	}
	renderDestinationsTab();
}

function buildDestCardHTML(dest): string {
	const dateStr = getLastUpdatedOnText(dest.version?.lastUpdated);
	const bgImage = dest.image?.active ? dest.image.background || '' : '';
	const imageHTML = bgImage
		? cardImageHTML('dest', bgImage, 'material-symbols:location-on')
		: `<div class="dest-card-image no-image"><i class="iconify card-image-icon" data-icon="material-symbols:location-on"></i></div>`;

	return `
		<div class="dest-card" data-action="open-dest-dialog" data-dest-id="${dest.id}">
			${imageHTML}
			<div class="dest-card-body">
				<div class="dest-card-title">${dest.title || translate('labels.no_title')}</div>
				<div class="dest-card-meta">
					<i class="iconify" data-icon="material-symbols:schedule" style="font-size:13px"></i>
					${dateStr}
				</div>
			</div>
		</div>`;
}

/*--------------------------------------------------------------
# Lists Tab
--------------------------------------------------------------*/
function loadListsTab() {
	const empty = getID('lists-empty');
	const count = getID('lists-count');
	const listings = getOrderedDocumentByUpdateDate(INDEX_DATA.listings);

	if (listings.length === 0) {
		LIST_GRID?.setItems([]);
		empty.style.display = 'block';
		count.textContent = '';
		return;
	}
	empty.style.display = 'none';
	count.textContent = listCountLabel(listings.length);
	LIST_GRID?.setItems(listings);
}

function buildListCardHTML(list): string {
	const dateStr = getLastUpdatedOnText(list.version?.lastUpdated);
	const bgImage = list.image?.active ? list.image.background || list.image.light || '' : '';
	const imageHTML = bgImage
		? cardImageHTML('list', bgImage, 'fluent:list-28-filled')
		: `<div class="list-card-image no-image"><i class="iconify card-image-icon" data-icon="fluent:list-28-filled"></i></div>`;

	return `
		<div class="list-card" data-action="open-list-dialog" data-list-id="${list.id}">
			${imageHTML}
			<div class="list-card-body">
				<div class="list-card-title">${list.title || translate('labels.no_title')}</div>
				<div class="list-card-meta">
					<i class="iconify" data-icon="material-symbols:schedule" style="font-size:13px"></i>
					${dateStr}
				</div>
			</div>
		</div>`;
}

/*--------------------------------------------------------------
# Destination Dialog
--------------------------------------------------------------*/
export function openDestDialog(destId) {
	const destinations = getOrderedDocumentByUpdateDate(INDEX_DATA.destinations);
	const dest = destinations.find((d) => d.id === destId);
	if (!dest) return;

	getID('dest-dialog-title').textContent = dest.title || translate('labels.no_title');

	// Image
	const imgDiv = getID('dest-dialog-image');
	const bgImage = dest.image?.active ? dest.image.background || '' : '';
	if (bgImage) {
		imgDiv.style.backgroundImage = `url('${bgImage}')`;
		imgDiv.className = 'dialog-image';
		imgDiv.innerHTML = '';
	} else {
		imgDiv.style.backgroundImage = '';
		imgDiv.className = 'dialog-image no-image';
		imgDiv.innerHTML = `<i class="iconify dialog-image-icon" data-icon="material-symbols:location-on"></i>`;
	}

	// Currency
	const currRow = getID('dest-dialog-currency-row');
	if (dest.currency) {
		currRow.style.display = 'flex';
		getID('dest-dialog-currency').textContent = translate('currency.title') + ': ' + dest.currency;
	} else {
		currRow.style.display = 'none';
	}

	// Updated
	getID('dest-dialog-updated').textContent = getLastUpdatedOnText(dest.version?.lastUpdated);

	// Buttons
	getID('dest-dialog-view').onclick = function () {
		closeDestDialog();
		viewDestination(dest.id);
	};
	getID('dest-dialog-edit').onclick = function () {
		closeDestDialog();
		editDestination(dest.id);
	};

	animateDialogOpen(getID('dest-dialog'), 'flex');
	const destCard = getID('dest-dialog')?.querySelector<HTMLElement>('.dialog-card');
	if (destCard) animateDialogOpen(destCard);
	document.body.classList.add('dialog-open');
}

export function closeDestDialog() {
	closeIndexDialog('dest-dialog', () => {
		document.body.classList.remove('dialog-open');
	});
}

/*--------------------------------------------------------------
# List Dialog
--------------------------------------------------------------*/
export function openListDialog(listId) {
	const listings = getOrderedDocumentByUpdateDate(INDEX_DATA.listings);
	const list = listings.find((l) => l.id === listId);
	if (!list) return;

	getID('list-dialog-title').textContent = list.title || translate('labels.no_title');

	// Subtitle
	const subRow = getID('list-dialog-subtitle-row');
	if (list.subtitle) {
		subRow.style.display = 'flex';
		getID('list-dialog-subtitle').textContent = list.subtitle;
	} else {
		subRow.style.display = 'none';
	}

	// Updated
	getID('list-dialog-updated').textContent = getLastUpdatedOnText(list.version?.lastUpdated);

	// Image
	const imgDiv = getID('list-dialog-image');
	const bgImage = list.image?.active ? list.image.background || list.image.light || '' : '';
	if (bgImage) {
		imgDiv.style.backgroundImage = `url('${bgImage}')`;
		imgDiv.className = 'dialog-image';
		imgDiv.innerHTML = '';
	} else {
		imgDiv.style.backgroundImage = '';
		imgDiv.className = 'dialog-image no-image';
		imgDiv.innerHTML = `<i class="iconify dialog-image-icon" data-icon="fluent:list-28-filled"></i>`;
	}

	// Buttons
	getID('list-dialog-view').onclick = function () {
		closeListDialog();
		viewListing(list.id);
	};
	getID('list-dialog-edit').onclick = function () {
		closeListDialog();
		editListing(list.id);
	};

	animateDialogOpen(getID('list-dialog'), 'flex');
	const listCard = getID('list-dialog')?.querySelector<HTMLElement>('.dialog-card');
	if (listCard) animateDialogOpen(listCard);
	document.body.classList.add('dialog-open');
}

export function closeListDialog() {
	closeIndexDialog('list-dialog', () => {
		document.body.classList.remove('dialog-open');
	});
}

/*--------------------------------------------------------------
# Dialog overlay click to close
--------------------------------------------------------------*/
document.addEventListener('click', function (e: MouseEvent) {
	const target = e.target as HTMLElement;
	if (target.classList.contains('dialog-overlay')) {
		if (target.id === 'trip-dialog') closeTripDialog();
		if (target.id === 'dest-dialog') closeDestDialog();
		if (target.id === 'list-dialog') closeListDialog();
		if (target.id === 'folders-dialog') closeFoldersDialog();
	}
});

document.addEventListener('keydown', function (e) {
	if (e.key === 'Escape') {
		if (getID('trip-dialog').style.display === 'flex') closeTripDialog();
		if (getID('dest-dialog').style.display === 'flex') closeDestDialog();
		if (getID('list-dialog').style.display === 'flex') closeListDialog();
		if (getID('folders-dialog').style.display === 'flex') closeFoldersDialog();
	}
});

/*--------------------------------------------------------------
# Search & Tab Coordination
--------------------------------------------------------------*/
function getActiveTab(): string {
	const active = document.querySelector('.category-tab.active');
	return active?.getAttribute('data-tab') || 'trips';
}

function setSearchBarVisible(visible: boolean) {
	const bar = getID('search-bar');
	if (bar) bar.style.display = visible ? 'flex' : 'none';
}

export function applySearch(query: string) {
	SEARCH_QUERY = (query || '').trim();
	const tab = getActiveTab();

	if (tab === 'settings') {
		setSearchBarVisible(false);
		return;
	}
	setSearchBarVisible(true);

	switch (tab) {
		case 'trips':
			TRIP_ACTIVE_GRID?.setQuery(SEARCH_QUERY);
			TRIP_UPCOMING_GRID?.setQuery(SEARCH_QUERY);
			TRIP_FINISHED_GRID?.setQuery(SEARCH_QUERY);
			updateTripSectionCounts();
			break;
		case 'destinations':
			renderDestinationsTab();
			break;
		case 'lists':
			LIST_GRID?.setQuery(SEARCH_QUERY);
			break;
	}
}

export function onSearchInput(value: string) {
	const clear = getID('search-clear');
	if (clear) clear.style.display = value ? 'flex' : 'none';
	applySearch(value);
}

export function clearSearch() {
	const input = getID('search-input') as HTMLInputElement | null;
	if (input) input.value = '';
	onSearchInput('');
}

export function onTabChanged(targetTab?: string | null) {
	const input = getID('search-input') as HTMLInputElement | null;
	applySearch(input?.value || '');

	// While the Settings tab is open, the greeting bar shows the account info
	// (avatar, name, email, sign-out) instead of the greeting.
	//
	// Prefer the explicit target tab over the content panel's `.active` state:
	// switchPanel() only moves `.active` onto the new content panel after its
	// leave animation finishes (asynchronously), so reading `#tab-settings`
	// here would always lag one switch behind — the greeting would swap only
	// when leaving Settings again. The caller passes the newly selected tab;
	// fall back to the settings tab *button* state (set synchronously on
	// click) when no target is given.
	const greetingSection = getID('greeting-section');
	if (greetingSection) {
		const settingsTabBtn = document.querySelector('.category-tab[data-tab="settings"]');
		const isSettings = targetTab
			? targetTab === 'settings'
			: (settingsTabBtn?.classList.contains('active') ?? false);
		greetingSection.classList.toggle('settings-mode', isSettings);
	}
}
