import { getState, DESTINATIONS } from '../../../../data/state.js';
import { getID } from '../../../../utils/dom.js';
import {
	convertFromDateObject,
	getDateString,
	getTodayDateObject,
} from '../../../../utils/dates.js';
import { getColorIndexFromOptions } from '../../../../theme/colors.js';
import { getColors } from '../../../../app/config.js';
import { loadCalendar } from './calendar.js';
import { loadCalendarItem } from './inner-itinerary.js';
import { openItineraryLightbox } from '../../support/embed.js';
import { END_DATE } from '../../view.js';
import { START_DATE } from '../../view.js';
import { CURRENT_SCHEDULE_DATE, SCHEDULE_OPEN } from './inner-itinerary.js';
import { getScheduleDestinations } from '../../../../utils/schedule-destinations.js';

export var SCHEDULE_DESTINATIONS = {};
var PILLS_ACTIONS = {};
var PILLS_INDEX = {};

export function loadItinerarySchedule() {
	loadScheduleDestinations();
	loadCalendar();
	loadSchedulePills();
	loadScheduleTodayButton();

	getID('full-itinerary').addEventListener('click', openFullItinerary);
}

function loadScheduleDestinations() {
	SCHEDULE_DESTINATIONS = getScheduleDestinations(getState()?.itinerary || []);
}

function getUniqueDestinationsFromSchedule() {
	const result = [];
	for (const key in SCHEDULE_DESTINATIONS) {
		const destinations = SCHEDULE_DESTINATIONS[key];
		for (const destination of destinations) {
			if (!result.includes(destination.id)) {
				result.push(destination.id);
			}
		}
	}
	return result;
}

// Pills
function loadSchedulePills(multipleColors = true) {
	PILLS_ACTIONS = {};
	PILLS_INDEX = {};
	const pillBox = getID('pill-box');
	pillBox.innerHTML = '';
	pillBox.style.display = 'none';
	const destinations = getUniqueDestinationsFromSchedule();
	if (destinations.length > 1) {
		pillBox.style.display = '';

		let innerHTML = '';

		for (let i = 0; i < destinations.length; i++) {
			const destinoID = destinations[i];
			const destination = DESTINATIONS.find((destination) => destination.id === destinoID);
			if (!destination) continue;

			innerHTML += `<div class="pill" id="pill-${destinoID}">
                            <span class="pill-circle" id="pill-circle-${destinoID}"></span><span>${destination.title || destination.destinations?.title}</span>
                          </div>`;
		}

		pillBox.innerHTML = innerHTML;

		for (let i = 0; i < destinations.length; i++) {
			const destinoID = destinations[i];
			const destination = DESTINATIONS.find((destination) => destination.id === destinoID);
			if (!destination) continue;

			const colorIndex = multipleColors ? i : -1;
			setPillColors(getID(`pill-circle-${destinoID}`), colorIndex);
			addPillListeners(destinations[i], colorIndex);
			PILLS_INDEX[destinations[i]] = colorIndex;
		}
	}
}

function loadPill(destinoID, action, colorIndex = -1) {
	const lastAction = PILLS_ACTIONS[destinoID];
	if (!lastAction) {
		if (action === 'click' || action === 'mouseenter') {
			PILLS_ACTIONS[destinoID] = action;
			activatePill(destinoID, colorIndex);
		}
	} else if (lastAction === 'click') {
		if (action === 'click') {
			deactivatePill(destinoID);
		}
	} else if (lastAction === 'mouseenter') {
		if (action === 'mouseleave') {
			deactivatePill(destinoID);
		}
		if (action === 'click') {
			PILLS_ACTIONS[destinoID] = action;
		}
	}
}

export function refreshPills() {
	for (const calendarDay of document.getElementsByClassName('calendarTrip')) {
		calendarDay.classList.remove('active-calendar');
	}
	for (const destinoID in PILLS_ACTIONS) {
		for (const calendarDay of document.getElementsByClassName(`pill-${destinoID}`)) {
			setPillColors(calendarDay as HTMLElement, PILLS_INDEX[destinoID]);
			calendarDay.classList.add('active-calendar');
		}
	}
}

function activatePill(destinoID, colorIndex = -1) {
	PILLS_INDEX[destinoID] = colorIndex;
	getID(`pill-${destinoID}`).classList.add('active-pill');
	getID(`pill-circle-${destinoID}`).classList.add('active-circle');
	refreshPills();
}

function deactivatePill(destinoID) {
	getID(`pill-${destinoID}`).classList.remove('active-pill');
	getID(`pill-circle-${destinoID}`).classList.remove('active-circle');
	delete PILLS_ACTIONS[destinoID];
	refreshPills();
}

function addPillListeners(destinoID, colorIndex) {
	getID(`pill-${destinoID}`).addEventListener('mouseenter', function () {
		loadPill(destinoID, 'mouseenter', colorIndex);
	});

	getID(`pill-${destinoID}`).addEventListener('mouseleave', function () {
		loadPill(destinoID, 'mouseleave', colorIndex);
	});

	getID(`pill-${destinoID}`).addEventListener('click', function () {
		loadPill(destinoID, 'click', colorIndex);
	});
}

function setPillColors(element: HTMLElement, colorIndex: number) {
	if (colorIndex >= 0) {
		const color = getColors().options[getColorIndexFromOptions(colorIndex)];
		element.style.setProperty('--schedule-color-light', color.hex);
		element.style.setProperty('--schedule-color-dark', color.dark || color.hex);
	} else {
		element.style.removeProperty('--schedule-color-light');
		element.style.removeProperty('--schedule-color-dark');
	}
}

// Today's Schedule
function loadScheduleTodayButton() {
	const hoje = convertFromDateObject(getTodayDateObject());

	if (hoje >= START_DATE.date && hoje <= END_DATE.date) {
		getID('todays-itinerary-btn').style.display = '';
		getID('todays-itinerary-btn').addEventListener('click', function () {
			const hojeText = getDateString(hoje, 'dd/mm/yyyy');
			const programacaoText =
				CURRENT_SCHEDULE_DATE.day.toString().padStart(2, '0') +
				CURRENT_SCHEDULE_DATE.month.toString().padStart(2, '0') +
				'/' +
				CURRENT_SCHEDULE_DATE.year;

			if (!SCHEDULE_OPEN || (SCHEDULE_OPEN && hojeText != programacaoText)) {
				loadCalendarItem(hoje.getUTCDate(), hoje.getUTCMonth() + 1, hoje.getUTCFullYear(), true);
			}

			getID('itinerary-box').scrollIntoView({ behavior: 'smooth' });
		});
	}
}

// Full Schedule
function openFullItinerary() {
	openItineraryLightbox();
}
