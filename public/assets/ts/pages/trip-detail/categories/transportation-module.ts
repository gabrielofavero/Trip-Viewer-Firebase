import { getTransportations } from '../../../app/config.js';
import { getState } from '../../../data/state.js';
import { convertFromDateObject, getDateNoTime, getTodayDateObject } from '../../../utils/dates.js';
import { getLanguagePackName, translate } from '../../../i18n/translation.js';
import { getChildIDs, getID } from '../../../utils/dom.js';
import { isOnDarkMode } from '../../../theme/visibility.js';
import { openToast } from '../../../utils/messages.js';
import { loadCustomSelect } from '../../../ui/custom-select.js';
import { setCSSRule } from '../../../theme/stylesheets.js';
import { fade } from '../../../theme/animations.js';
import { getSensitiveReservationHTML } from '../support/sensitive-reservation.js';
import { initSwiper } from '../support/swiper.js';
import { ADJUST_HEIGHT_CARDS, adjustCardsHeights } from '../support/visibility.js';
import { getDateString, getTimeStringFromDate, jsTimeToVisualTime } from '../../../utils/dates.js';
import { codifyText } from '../../../utils/dom.js';
import { END_DATE } from '../view.js';
import { START_DATE } from '../view.js';

var TRANSPORTATION_ICONS = [];
var ACTIVE_TRANSPORTATION;
var ACTIVE_TRANSPORTATIONS = [];
var ACTIVE_TRANSPORTATION_TITLES = [];

/** Maps Portuguese data keys to English HTML element suffixes (from cleanup refactoring) */
function mapTransportationKey(key: string): string {
	const map: Record<string, string> = {
		departure: 'departure',
		during: 'internal',
		return: 'return',
	};
	return map[key] || key;
}

export function loadTransportation() {
	const swiperData = getSwiperData();

	buildTransportationSwiper(swiperData);
	resetSwiperVisibility();

	observeFlightBoxes();
	autoNavigateTransportation();
}

function getSwiperData() {
	const swiperData = {};

	const viewMode = getState().transportation.viewMode || 'simple-view';
	const key = viewMode === 'people-view' ? 'person' : 'direction';
	const complement = key === 'person' ? 'custom-' : '';

	ACTIVE_TRANSPORTATIONS = [
		...new Set(
			getState().transportation.data.map((item) => `${complement}${codifyText(item[key])}`),
		),
	];
	ACTIVE_TRANSPORTATION_TITLES = [
		...new Set(getState().transportation.data.map((item) => item[key])),
	];
	ACTIVE_TRANSPORTATION = viewMode === 'people-view' ? ACTIVE_TRANSPORTATIONS[0] : 'departure';

	for (const activeTransport of ACTIVE_TRANSPORTATIONS) {
		swiperData[activeTransport] = [];
	}

	for (let i = 0; i < getState().transportation.data.length; i++) {
		const identifier = `${complement}${codifyText(getState().transportation.data[i][key])}`;
		const htmlContent = getTransportationHTML(i + 1, identifier);
		swiperData[identifier].push(htmlContent);
	}

	return swiperData;
}

function getTransportationHTML(j, identifier) {
	return `<div class="swiper-slide" id="transportation-slide-${j}">
            <div class="testimonial-item">
                ${getFlightBoxHTML(j, identifier)}
              </div>
            </div>`;
}

export function getFlightBoxHTML(j, identifier, innerItinerary = false) {
	const company = getCompanyObj(j);
	return `<div class="flight-box${innerItinerary ? ' inner-itinerary-item' : ''}" id="transportation-${identifier}-box-${j}">
            <div class="flight-diagram">
              <div class="flight-title">
                ${getImageHTML(j, company)}
                ${getReservationHTML(j, company)}
              </div>
              <div class="flight-text">
                <div class="left-text">
                  ${getDepartureArrivalHTML(j, 'departure')}
                </div>
                <div class="center-text">
                  <i class="flight-line" ${adjustFlightLine(j)}">_________</i>
                  <i class="iconify flight-icon" data-icon="${getTransportationIcon(j)}"></i>
                  ${getDurationHTML(j)}
                </div>
                <div class="right-text">
                  ${getDepartureArrivalHTML(j, 'arrival')}
                </div>
              </div>
            </div>
          </div>`;
}

function getCompanyObj(j) {
	const transport = getState().transportation.data[j - 1];
	const type = transport.type;
	const title = transport.company;

	const transportation = getTransportations();
	const titleConfig = transportation?.companies?.[type]?.[title];
	const websiteConfig = transportation?.websites?.[type]?.[title];
	const imageConfig = transportation?.images?.[type]?.[title];

	return {
		title: titleConfig || title,
		images: imageConfig || {},
		website: websiteConfig || '',
		isCustom: !titleConfig,
	};
}

function getImageHTML(j, company) {
	const transport = getState().transportation.data[j - 1];
	if (!company.isCustom) {
		return `<a href="${company.website}">
              <img class="flight-img" id="flight-img-light-${j}" src="${company.images.light}"
                style="display: ${isOnDarkMode() ? 'none' : 'block'};">
              <img class="flight-img" id="flight-img-dark-${j}" src="${company.images.dark}"
                style="display: ${isOnDarkMode() ? 'block' : 'none'};">
            </a>`;
	} else if (company.title) {
		return `<div class="flight-title-text">${company.title}</div>`;
	} else {
		return `<div class="flight-title-text">${transport.points.origin} → ${transport.points.destination}</div>`;
	}
}

function getReservationHTML(j, company) {
	const transport = getState().transportation.data[j - 1];
	let reservation = transport.reservation;
	let link = company.website || '';

	if (getState().pin === 'sensitive-only') {
		return getSensitiveReservationHTML('transportation', transport.id);
	}

	if (transport.link) {
		link = transport.link;
	}

	if (!reservation) return '';
	reservation = reservation[0] === '#' ? reservation.slice(1) : reservation;
	const reservationHTML = link
		? `<a class="flight-code" href="${link}" target="_blank">#${reservation}</a>`
		: `<div class="flight-code">#${reservation}</div>`;
	const icon = `<i class="iconify copy-icon" data-icon="mdi:content-copy" data-action="copy-to-clipboard" data-text="${reservation}"></i>`;
	return `${reservationHTML} ${icon}`;
}

function getDepartureArrivalHTML(j, type) {
	const transport = getState().transportation.data[j - 1];
	const date = convertFromDateObject(transport.dates[type]);
	const location = transport.points[type];
	const flightTimeSuffix = getLanguagePackName() == 'en' ? '-en' : '';

	let result = `<div class="flight-date">${getDateString(date, 'dd/mm')}</div>
                <div class="flight-time${flightTimeSuffix}">${getTimeStringFromDate(date)}</div>`;

	if (location) result += `<div class="flight-location">${location}</div>`;
	return result;
}

function getTransportationIcon(j) {
	const type = getState().transportation.data[j - 1].type;
	const icon = getTransportations().icons[type] || getTransportations().icons.other;
	TRANSPORTATION_ICONS.push(icon);
	return icon;
}

function getDurationHTML(j) {
	const duration = getState().transportation.data[j - 1].duration;
	if (!duration) return '';
	else return `<div class="flight-duration">${jsTimeToVisualTime(duration)}</div>`;
}

function adjustFlightLine(j) {
	const duration = getState().transportation.data[j - 1].duration;
	if (!duration) return "style='transform: translateY(-33.75%);'";
	else return '';
}

function buildTransportationSwiper(swiperData) {
	const viewMode = getState().transportation.viewMode;
	const keys = [];

	loadSwiperPreActions(viewMode, keys);

	for (const key of keys) {
		const content = getID(`transportation-${mapTransportationKey(key)}-content`);
		if (swiperData[key]?.length > 0 || viewMode === 'simple-view') {
			const data =
				viewMode === 'simple-view'
					? [
							...(swiperData['departure'] || []),
							...(swiperData['during'] || []),
							...(swiperData['return'] || []),
						]
					: swiperData[key];
			const swiperButtonStyle = data.length > 1 ? '' : `style="display: none"`;

			if (viewMode != 'people-view') {
				getID(`transportation-${mapTransportationKey(key)}`).style.display = 'block';
			}

			content.innerHTML = `<div id="transportation-${key}-swiper" class="testimonials-slider swiper aos-init aos-animate" data-aos="fade-up" data-aos-delay="100">
                        <div class="swiper-wrapper" id="transportation-${key}-wrapper">
                          ${data.join('')}
                        </div>
                        <div class="swiper-controls">
                          <div class="swiper-button-prev transportation-${key}-prev" ${swiperButtonStyle}></div>
                          <div class="swiper-pagination transportation-${key}-pagination"></div>
                          <div class="swiper-button-next transportation-${key}-next" ${swiperButtonStyle}></div>
                        </div>
                      </div>`;

			ADJUST_HEIGHT_CARDS.push(`transportation-${key}`);
			initSwiper(`transportation-${key}`);

			if (getState().transportation.viewMode == 'leg-view') {
				getID(`transportation-${mapTransportationKey(key)}`).style.visibility = 'hidden';
			}
		}
	}

	function loadSwiperPreActions(viewMode, keys) {
		switch (viewMode) {
			case 'simple-view':
				keys.push('departure');
				break;
			case 'leg-view':
				keys.push('departure', 'during', 'return');
				loadTransportationTabs();
				break;
			case 'people-view':
				keys.push(...ACTIVE_TRANSPORTATIONS);
				loadCustomTransportationSelect();
				loadCustomTransportationDivs();
				break;
		}
		return keys;
	}
}

export function loadTransportationImages() {
	let j = 1;
	while (getID(`transportation-slide-${j}`)) {
		const light = getID(`flight-img-light-${j}`);
		const dark = getID(`flight-img-dark-${j}`);

		if (light && dark) {
			light.style.display = isOnDarkMode() ? 'none' : 'block';
			dark.style.display = isOnDarkMode() ? 'block' : 'none';
		}

		j++;
	}
}

function loadGeneralTransportationIcon() {
	const unique = [...new Set(TRANSPORTATION_ICONS)];
	if (unique.length == 1) {
		getID('transportation-nav').setAttribute('data-icon', unique[0]);
	}
}

export function copyToClipboard(text) {
	navigator.clipboard.writeText(text);
	openToast(translate('messages.text_copied'));
}

function loadCustomTransportationSelect() {
	if (ACTIVE_TRANSPORTATIONS.length <= 1) return;
	getID('transportation-select').style.display = '';
	const options = [];
	for (let i = 0; i < ACTIVE_TRANSPORTATIONS.length; i++) {
		options.push({
			value: ACTIVE_TRANSPORTATIONS[i],
			label: ACTIVE_TRANSPORTATION_TITLES[i],
		});
	}

	const customSelect = {
		id: 'transportation-select',
		options: options,
		activeOption: ACTIVE_TRANSPORTATION,
		action: customTransportationSelectAction,
	};

	loadCustomSelect(customSelect);
}

function loadCustomTransportationDivs() {
	const container = getID('transportation-custom-container');
	container.innerHTML = '';

	for (let i = 0; i < ACTIVE_TRANSPORTATIONS.length; i++) {
		const transport = ACTIVE_TRANSPORTATIONS[i];
		const display = i === 0 ? 'block' : 'none';
		container.innerHTML += `<div class='transportation-box' id="transportation-${transport}" style="display: ${display}">
                              <div id="transportation-${transport}-content"></div>
                            </div>`;
	}
}

function loadTransportationTabs() {
	loadTransportationTabsHTML();

	const tabsContainer = getID('tabs-container-transportation');
	if (tabsContainer) tabsContainer.style.display = '';

	for (let i = 0; i < ACTIVE_TRANSPORTATIONS.length; i++) {
		const div = getID(`transportation-${mapTransportationKey(ACTIVE_TRANSPORTATIONS[i])}`);
		if (!div) continue;
		div.style.display = i === 0 ? 'block' : 'none';
		div.style.marginTop = '2em';
	}

	setTransportationTabListeners();
}

function loadTransportationTabsHTML() {
	const tab = getID('tab-transportation');
	if (!tab) return;
	const itemMap = {
		departure: 'departure',
		during: 'during',
		return: 'return',
	};

	for (let i = 0; i < ACTIVE_TRANSPORTATIONS.length; i++) {
		const item = ACTIVE_TRANSPORTATIONS[i];
		const checked = i === 0 ? 'checked' : '';
		const translation = translate(`trip.transportation.${itemMap[item]}`);
		tab.innerHTML += `<input type="radio" id="radio-${item}" name="tabs-transportation" ${checked}>`;
		tab.innerHTML += `<label class="tab" for="radio-${item}">${translation}</label>`;
	}

	tab.innerHTML += '<span class="glider"></span>';

	const children = getChildIDs('tab-transportation');
	for (let i = 0; i < children.length; i++) {
		setCSSRule(
			`.tabs-container input[id="${children[i]}"]:checked~.glider`,
			'transform',
			`translateX(${i * 100}%)`,
		);
	}
}

function setTransportationTabListeners() {
	ACTIVE_TRANSPORTATIONS.forEach((transport) => {
		const radio = `radio-${transport}`;
		const radioEl = getID(radio);
		if (!radioEl) return;
		radioEl.addEventListener('click', function () {
			const transportId = radio.replace('radio-', '');
			if (ACTIVE_TRANSPORTATION === transportId) return;

			const previousTransport = ACTIVE_TRANSPORTATION;
			ACTIVE_TRANSPORTATION = transportId;

			const previous = `transportation-${mapTransportationKey(previousTransport)}`;
			const current = `transportation-${mapTransportationKey(ACTIVE_TRANSPORTATION)}`;

			const currentEl = getID(current);
			const previousEl = getID(previous);
			if (currentEl) currentEl.style.visibility = '';
			if (previousEl) previousEl.style.visibility = '';

			fade([previous], [current]);
		});
	});
}

function observeFlightBoxes() {
	const flightBoxes = document.querySelectorAll('.flight-box');
	if (flightBoxes.length === 0) return;

	let timeoutId;
	const observer = new MutationObserver(() => {
		clearTimeout(timeoutId);

		timeoutId = setTimeout(() => {
			flightBoxes.forEach((box) => {
				if ((box as HTMLElement).offsetHeight < 5) {
					adjustCardsHeights('transportation');
				}
			});
		}, 200);
	});

	flightBoxes.forEach((box) => {
		observer.observe(box, { attributes: true, childList: true, subtree: true });
	});
}

export function adjustTransportationBoxContainerHeight() {
	const elements = document.querySelectorAll('.flight-box');
	const heights = Array.from(elements, (el) => (el as HTMLElement).offsetHeight);
	heights.push(250);
	const container = getID('transportation-box-container');
	container.style.height = `${Math.max(...heights)}px`;
}

function resetSwiperVisibility() {
	const viewMode = getState().transportation.viewMode || 'simple-view';

	switch (viewMode) {
		case 'leg-view':
			adjustTransportationBoxContainerHeight();
			getID('transportation-departure').style.visibility = '';
			break;
		case 'people-view':
			adjustTransportationBoxContainerHeight();
			getID('transportation-departure').style.display = 'none';
			getID('transportation-internal').style.display = 'none';
			getID('transportation-return').style.display = 'none';
			break;
	}
}

function customTransportationSelectAction(value) {
	// Skip fade if the value hasn't changed — fading the same element
	// out and in causes a race condition where fadeOut's callback sets
	// display:none AFTER fadeIn already set display:block.
	if (ACTIVE_TRANSPORTATION === value) return;

	fade([`transportation-${ACTIVE_TRANSPORTATION}`], [`transportation-${value}`]);
	ACTIVE_TRANSPORTATION = value;

	// Swipers initialized inside hidden divs (display:none) have zero dimensions.
	// After fadeIn makes the container visible, update the swiper to recalculate
	// and re-adjust card heights so flight-boxes get their proper height.
	setTimeout(() => {
		const swiperEl = getID(`transportation-${value}-swiper`);
		if (swiperEl?.swiper) {
			swiperEl.swiper.update();
		}
		adjustCardsHeights('transportation');
	}, 550); // fadeOut(250ms) + timeout(250ms) + fadeIn animate buffer
}

function autoNavigateTransportation() {
	const today = getDateNoTime(convertFromDateObject(getTodayDateObject()));
	const data = getState().transportation.data;
	if (!data || data.length === 0) return;

	let targetIndex;

	// Outside trip dates → show first element
	if (START_DATE?.date && END_DATE?.date) {
		if (today < getDateNoTime(START_DATE.date) || today > getDateNoTime(END_DATE.date)) {
			targetIndex = 0;
		}
	}

	// Inside trip → find most relevant transport
	if (targetIndex === undefined) {
		const todayIndices = [];
		for (let i = 0; i < data.length; i++) {
			const departure = getDateNoTime(convertFromDateObject(data[i].dates.departure));
			if (departure.getTime() === today.getTime()) {
				todayIndices.push(i);
			}
		}

		if (todayIndices.length > 0) {
			// Sort today's transports by departure time
			todayIndices.sort(
				(a, b) =>
					convertFromDateObject(data[a].dates.departure).getTime() -
					convertFromDateObject(data[b].dates.departure).getTime(),
			);

			const now = new Date();

			for (const idx of todayIndices) {
				const arrival = convertFromDateObject(data[idx].dates.arrival);
				if (now <= arrival) {
					targetIndex = idx;
					break;
				}
			}

			// After the last transport's arrival → keep on the last one of today
			if (targetIndex === undefined) {
				targetIndex = todayIndices[todayIndices.length - 1];
			}
		} else {
			// No transport today → find closest future
			let closestDiff = Infinity;
			for (let i = 0; i < data.length; i++) {
				const departure = getDateNoTime(convertFromDateObject(data[i].dates.departure));
				const diff = departure.getTime() - today.getTime();
				if (diff > 0 && diff < closestDiff) {
					closestDiff = diff;
					targetIndex = i;
				}
			}
		}
	}

	if (targetIndex === undefined || targetIndex < 0) return;

	const viewMode = getState().transportation.viewMode || 'simple-view';

	if (viewMode === 'simple-view') {
		const swiperEl = getID('transportation-departure-swiper');
		if (swiperEl?.swiper) {
			swiperEl.swiper.slideTo(targetIndex, 600);
		}
	} else if (viewMode === 'leg-view') {
		const key = 'direction';
		const targetGroup = data[targetIndex][key];

		const radio = getID(`radio-${targetGroup}`);
		if (radio) radio.click();

		let slideIndex = 0;
		for (let i = 0; i < targetIndex; i++) {
			if (data[i][key] === targetGroup) slideIndex++;
		}

		const swiperEl = getID(`transportation-${targetGroup}-swiper`);
		if (swiperEl?.swiper) {
			swiperEl.swiper.slideTo(slideIndex, 600);
		}
	} else if (viewMode === 'people-view') {
		const key = 'person';
		const targetGroup = data[targetIndex][key];
		const groupId = `custom-${codifyText(targetGroup)}`;

		customTransportationSelectAction(groupId);

		let slideIndex = 0;
		for (let i = 0; i < targetIndex; i++) {
			if (data[i][key] === targetGroup) slideIndex++;
		}

		const swiperEl = getID(`transportation-${groupId}-swiper`);
		if (swiperEl?.swiper) {
			swiperEl.swiper.slideTo(slideIndex, 600);
		}
	}
}
