import { getItinerary } from '../../../../app/config.js';
import { getState, TRAVELERS, DESTINATIONS } from '../../../../data/state.js';
import { convertFromDateObject, getDateTitle } from '../../../../utils/dates.js';
import { getAndDestinationTitle, getID, getInnerItineraryTitleHTML } from '../../../../utils/dom.js';
import { translate } from '../../../../i18n/translation.js';
import {
	openDestinationItemDialog,
	openAccommodationDialog,
	openTransportationDialog,
} from '../../support/item-dialogs.js';

export var SCHEDULE_OPEN = false;
export var CURRENT_SCHEDULE_DATE = {
	day: 0,
	month: 0,
	year: 0,
};
var CURRENT_SCHEDULE = null;
var CURRENT_INNER_ITINERARY = [];

function loadModalContentCalendar() {
	let scheduleTitle = CURRENT_SCHEDULE.title;
	const dateStr = getDateTitle(convertFromDateObject(CURRENT_SCHEDULE.date), 'weekday_day_month');

	(getID('itinerary-title')!.querySelector('.title') as HTMLElement).innerText = getScheduleTitle(
		scheduleTitle,
		CURRENT_SCHEDULE.destinationIds,
	);
	getID('itinerary-date').innerText = dateStr;

	CURRENT_INNER_ITINERARY = [];

	loadInnerItineraryHTML();

	// Helpers
	function loadInnerItineraryHTML() {
		const show = shouldShowCheckbox();
		getID('inner-itinerary-travelers-checkboxes').style.display = show ? '' : 'none';

		if (show) {
			loadItineraryTravelersCheckboxes();
			loadItineraryTravelersCheckboxAction();
			return;
		}

		setModalCalendarInnerHTML(
			getID('itinerary-items-early-morning'),
			CURRENT_SCHEDULE.earlyMorning,
		);
		setModalCalendarInnerHTML(getID('itinerary-items-morning'), CURRENT_SCHEDULE.morning);
		setModalCalendarInnerHTML(getID('itinerary-items-afternoon'), CURRENT_SCHEDULE.afternoon);
		setModalCalendarInnerHTML(getID('itinerary-items-night'), CURRENT_SCHEDULE.night);

		adaptModalCalendarInnerHTML();
	}

	function shouldShowCheckbox() {
		if (!CURRENT_SCHEDULE || !TRAVELERS?.length) return false;

		const periods = getItinerary().timeOfDay;
		const combinations = new Set();

		for (const period of periods) {
			const items = CURRENT_SCHEDULE[period] || [];

			for (const item of items) {
				const present = (item.travelers || [])
					.filter((p) => p.isPresent)
					.map((p) => p.id)
					.sort();

				const key = present.join('|');

				combinations.add(key);
			}
		}

		if (combinations.size <= 1) {
			return false;
		}

		return true;
	}
}

function openModalCalendar(schedule, instant = false) {
	CURRENT_SCHEDULE = schedule;
	loadModalContentCalendar();

	if (instant) {
		const box = getID('itinerary-box');
		box.style.transition = 'none';
		box.style.display = 'block';
		box.classList.add('show');
		box.style.opacity = '1';
		requestAnimationFrame(() => {
			box.style.transition = '';
		});
	} else {
		$('#itinerary-box').show();
		setTimeout(() => {
			getID('itinerary-box').classList.toggle('show');
		}, 100);
	}
}

export function closeModalCalendar() {
	SCHEDULE_OPEN = false;
	CURRENT_SCHEDULE = null;
	CURRENT_SCHEDULE_DATE.day = 0;
	CURRENT_SCHEDULE_DATE.month = 0;
	CURRENT_SCHEDULE_DATE.year = 0;

	unloadCalendarTripActive();
	getID('itinerary-box').classList.toggle('show');
	setTimeout(() => {
		$('#itinerary-box').hide();
	}, 300);
}

function reloadModalCalendar(schedule) {
	CURRENT_SCHEDULE = schedule;
	getID('itinerary-modal').classList.toggle('show');
	setTimeout(() => {
		loadModalContentCalendar();
		getID('itinerary-modal').classList.toggle('show');
	}, 300);
}

export async function displayInnerItineraryMessage(index) {
	const entry = CURRENT_INNER_ITINERARY[index];
	if (!entry) return;

	switch (entry.type) {
		case 'destination':
			await openDestinationItemDialog(entry);
			break;
		case 'accommodation':
			await openAccommodationDialog(entry);
			break;
		case 'transportation':
			openTransportationDialog(entry);
			break;
	}
}

export function loadCalendarItem(day, month, year, instant = false) {
	if (!day || !month || !year) {
		console.warn('No data string provided to load calendar item.');
		return;
	}

	unloadCalendarTripActive();

	const calendarTrip = getID(`calendarTrip-${day}-${month}-${year}`);

	if (!calendarTrip) return;

	if (
		day == CURRENT_SCHEDULE_DATE.day &&
		month == CURRENT_SCHEDULE_DATE.month &&
		year == CURRENT_SCHEDULE_DATE.year
	) {
		closeModalCalendar();
		return;
	}

	calendarTrip.classList.add('active');
	CURRENT_SCHEDULE_DATE.day = day;
	CURRENT_SCHEDULE_DATE.month = month;
	CURRENT_SCHEDULE_DATE.year = year;
	if (day != 0) {
		for (let i = 0; i < getState().itinerary.length; i++) {
			var currentDate = convertFromDateObject(getState().itinerary[i].date);
			if (
				currentDate.getUTCDate() == day &&
				currentDate.getUTCMonth() == month - 1 &&
				currentDate.getUTCFullYear() == year
			) {
				if (!SCHEDULE_OPEN) {
					SCHEDULE_OPEN = true;
					openModalCalendar(getState().itinerary[i], instant);
				} else {
					reloadModalCalendar(getState().itinerary[i]);
				}
				break;
			}
		}
	}
}

// Expose on window so inline onclick handlers (set via calendar.ts) can call it
window.loadCalendarItem = loadCalendarItem;

function unloadCalendarTripActive() {
	for (const el of document.querySelectorAll('.calendarTrip')) {
		el.classList.remove('active');
	}
}

// Getters
function getInnerItineraryHTML(item) {
	const innerItinerary = getInnerItinerary(item);
	if (innerItinerary?.item || innerItinerary?.lazyDestinationId) {
		CURRENT_INNER_ITINERARY.push(innerItinerary);
		return `<i class="iconify external-link" data-icon="tabler:external-link" data-action="display-inner-itinerary-message" data-index="${CURRENT_INNER_ITINERARY.length - 1}"></i>`;
	}
	return '';
}

function getInnerItinerary(item, destinations?) {
	const innerItinerary = {
		type: normalizeItemType(item?.type),
		// Raw item data passed to the card dialog (destination entry, accommodation
		// or transportation leg).
		item: null,
		title: '',
		// Lazy destination item — set when the destination doc must be fetched on
		// demand (the view only loads destination metadata on page load).
		lazyDestinationId: '',
		category: '',
		itemId: '',
		destinationId: '',
		currency: '',
	};
	let index = -1;
	switch (innerItinerary.type) {
		case 'transportation':
			if (getState().modules.transportation === true && item.id) {
				index = getState()
					.transportation.data.map((leg) => leg.id)
					.indexOf(item.id);
				if (index >= 0) {
					const transport = getState().transportation.data[index];
					innerItinerary.item = transport;
					innerItinerary.title = `${transport.points?.origin || ''} → ${transport.points?.destination || ''}`;
				}
			}
			break;
		case 'accommodation':
			if (getState().modules.accommodations === true && item.id) {
				index = getState()
					.accommodations.map((accommodation) => accommodation.id)
					.indexOf(item.id);
				if (index >= 0) {
					innerItinerary.item = getState().accommodations[index];
				}
			}
			break;
		case 'destination':
			if (getState().modules.destinations === true && item.location && item.category && item.id) {
				if (!destinations) {
					const destinationIds = DESTINATIONS.map((d) => d.id);
					index = destinationIds.indexOf(item.location);
					destinations = DESTINATIONS?.[index]?.destinations;
				}

				innerItinerary.category = item.category;
				innerItinerary.itemId = item.id;
				innerItinerary.destinationId = item.location;

				// The destination doc isn't loaded on page load (metadata-only
				// view) — mark the item for a lazy fetch when the user opens it.
				if (!destinations) {
					innerItinerary.lazyDestinationId = item.location;
					return innerItinerary;
				}

				const destination = destinations[item.category];
				if (destination && Object.keys(destination).length) {
					const destinationItem = destination[item.id];
					if (destinationItem) {
						innerItinerary.item = destinationItem;
						innerItinerary.currency = destinations.currency || '';
					}
				}

				return innerItinerary;
			}
			break;
	}

	return innerItinerary;
}

/**
 * Accommodation/destination itinerary items are stored with plural types
 * ('accommodations' / 'destinations') by the trip editor, but some legacy
 * docs use the singular forms. Canonicalize both to the singular used by the
 * dialog dispatcher.
 */
function normalizeItemType(type) {
	switch (type) {
		case 'transportation':
			return 'transportation';
		case 'accommodation':
		case 'accommodations':
			return 'accommodation';
		case 'destination':
		case 'destinations':
			return 'destination';
		default:
			return type;
	}
}

export function getScheduleTitle(title, destinations, placeholder = true) {
	if (!title || typeof title === 'string') {
		const placeholderValue = placeholder ? translate('trip.itinerary.title') : '';
		return title || placeholderValue;
	}

	if (!title.value) {
		return placeholder ? translate('trip.itinerary.title') : '';
	}

	if (title.showDestinations) {
		return getAndDestinationTitle(title.value, destinations, placeholder);
	}

	if (title.translate) {
		return translate(`trip.transportation.${title.value}`);
	}

	return title.value;
}

// Setters
function setModalCalendarInnerHTML(div, period) {
	div.innerHTML = '';
	for (let i = 0; i < period.length; i++) {
		if (period[i].label) {
			div.innerHTML += `<div>
                                <i class="bi bi-chevron-right color-icon"></i>
                                ${getInnerItineraryTitleHTML(period[i], 'label-item')}
                                ${getInnerItineraryHTML(period[i].item)}
                              </div>`;
		}
	}
}

// Converters
function adaptModalCalendarInnerHTML() {
	const earlyMorning = getID('itinerary-items-early-morning');
	const morning = getID('itinerary-items-morning');
	const afternoon = getID('itinerary-items-afternoon');
	const night = getID('itinerary-items-night');

	getID('itinerary-early-morning').style.display = earlyMorning.innerHTML ? 'block' : 'none';
	getID('itinerary-morning').style.display = morning.innerHTML ? 'block' : 'none';
	getID('itinerary-afternoon').style.display = afternoon.innerHTML ? 'block' : 'none';
	getID('itinerary-night').style.display = night.innerHTML ? 'block' : 'none';
	getID('no-itinerary').style.display =
		earlyMorning.innerHTML || morning.innerHTML || afternoon.innerHTML || night.innerHTML
			? 'none'
			: 'block';
}

// Custom Checkboxes
function loadItineraryTravelersCheckboxes() {
	const container = getID('inner-itinerary-travelers-checkboxes');
	container.innerHTML = '';

	if (!TRAVELERS?.length) {
		return;
	}

	for (const traveler of TRAVELERS) {
		const id = `trav-${traveler.id}`;

		container.innerHTML += `
            <label class="checkbox-item">
                <input 
                    type="checkbox" 
                    id="${id}" 
                    value="${traveler.id}" 
                    checked
                >
                ${traveler.name}
            </label>
        `;
	}

	// Listen for any checkbox toggle
	container.addEventListener('change', loadItineraryTravelersCheckboxAction);
}

function filterInnerItineraryByTravelers(list, selectedIds) {
	if (!selectedIds.length || selectedIds.length === TRAVELERS.length) {
		return list;
	}

	return list.filter((item) => {
		const present = item.travelers.filter((p) => p.isPresent).map((p) => p.id);

		return selectedIds.some((id) => present.includes(id));
	});
}

function loadItineraryTravelersCheckboxAction() {
	const container = getID('inner-itinerary-travelers-checkboxes');
	const selectedIds = [...container.querySelectorAll("input[type='checkbox']:checked")].map(
		(i) => (i as HTMLInputElement).value,
	);

	const earlyMorningFiltered = filterInnerItineraryByTravelers(
		CURRENT_SCHEDULE.earlyMorning,
		selectedIds,
	);
	const morningFiltered = filterInnerItineraryByTravelers(CURRENT_SCHEDULE.morning, selectedIds);
	const afternoonFiltered = filterInnerItineraryByTravelers(
		CURRENT_SCHEDULE.afternoon,
		selectedIds,
	);
	const nightFiltered = filterInnerItineraryByTravelers(CURRENT_SCHEDULE.night, selectedIds);

	setModalCalendarInnerHTML(getID('itinerary-items-early-morning'), earlyMorningFiltered);
	setModalCalendarInnerHTML(getID('itinerary-items-morning'), morningFiltered);
	setModalCalendarInnerHTML(getID('itinerary-items-afternoon'), afternoonFiltered);
	setModalCalendarInnerHTML(getID('itinerary-items-night'), nightFiltered);

	adaptModalCalendarInnerHTML();
}
