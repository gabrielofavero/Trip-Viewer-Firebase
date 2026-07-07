import { getItinerary } from '../../../app/config.js';
import { getState, setState, DOCUMENT_ID } from '../../../data/state.js';
import { cloneObject, getID } from '../../../utils/dom.js';
import {
	convertFromDateObject,
	dateObjectToInputDate,
	getDateTitle,
} from '../../../utils/dates.js';
import { get, update } from '../../../data/firebase/database.js';
import { translate } from '../../../i18n/translation.js';
import { jsDateToInputDate } from '../../../utils/dates.js';
import { ACTIVE_CATEGORY } from '../destination.js';

var TRIP_ID;
export var PLANNED_DESTINATION = {};
var ACTIVE_PLANNED_DESTINATION: any[] = [];
export function resetActivePlannedDestination() {
	ACTIVE_PLANNED_DESTINATION = [];
}

export async function getTripData(tripID) {
	if (!tripID) return;
	TRIP_ID = tripID;
	return await get(`trips/${tripID}`);
}

export async function refreshTripData() {
	if (!TRIP_ID) return;
	ACTIVE_PLANNED_DESTINATION = [];
	PLANNED_DESTINATION = {};
	setState(await get(`trips/${TRIP_ID}`));
	loadPlannedDestination();
}

// Planned Destination
export function loadPlannedDestination() {
	const schedules = getState()?.itinerary || [];
	for (const day of schedules) {
		const data = day.data;
		for (const period of getItinerary().timeOfDay) {
			const periods = day[period];
			if (!periods) continue;

			for (const schedule of periods) {
				const item = schedule?.item;
				if (!item || item.type !== 'destinations') continue;
				addPlannedDestination(item, data, period);
			}
		}
	}

	function addPlannedDestination(item, data, period) {
		const destination = getState().destinations.find((d) => d.destinationId === item.location);
		if (!destination || destination.destinationId != DOCUMENT_ID) return;

		PLANNED_DESTINATION[item.category] ??= {};
		PLANNED_DESTINATION[item.category][item.id] ??= [];
		PLANNED_DESTINATION[item.category][item.id].push({ data, period });
	}
}

export function getPlannedDestinations(id) {
	return PLANNED_DESTINATION[ACTIVE_CATEGORY]?.[id] || [];
}

export function populatePlannedDestinationEditField(id, j) {
	if (!TRIP_ID) {
		return;
	}
	ACTIVE_PLANNED_DESTINATION = getPlannedDestinations(id);
	loadPlannedDestinationEditFieldHTML(j);
}

function loadPlannedDestinationEditFieldHTML(j) {
	const container = getID(`edit-planned-container-${j}`);
	const dataSelect = getID(`edit-planned-select-data-${j}`);
	const periodSelect = getID(`edit-planned-select-period-${j}`);

	let options = `<option value="">${translate('labels.planned.not_planned')}</option>`;

	switch (ACTIVE_PLANNED_DESTINATION.length) {
		case 0:
			loadNoPD();
			break;
		case 1:
			loadSinglePD();
			break;
		default:
			loadMultiPD();
	}

	container.style.display = '';

	function loadNoPD() {
		loadAllOptions();
		dataSelect.innerHTML = options;
		dataSelect.value = '';
		periodSelect.style.display = 'none';
		addSelectListener();
	}

	function loadSinglePD() {
		loadAllOptions();
		const item = ACTIVE_PLANNED_DESTINATION[0];
		dataSelect.innerHTML = options;
		dataSelect.value = dateObjectToInputDate(item.data);
		periodSelect.value = item.period;
		addSelectListener();
	}

	function loadMultiPD() {
		options += `<option value="multi">${translate('labels.planned.multiple')}</option>`;
		dataSelect.innerHTML = options;
		dataSelect.value = 'multi';
		periodSelect.style.display = 'none';
	}

	function loadAllOptions() {
		const itinerary = getState().itinerary;
		if (!itinerary) return;
		for (const schedule of itinerary) {
			const ids = schedule.destinationIds.map((destination) => destination.destinationId);

			if (!ids.includes(DOCUMENT_ID)) {
				continue;
			}

			const date = schedule.data;
			const jsDate = convertFromDateObject(date);
			const label = getDateTitle(jsDate, 'weekday_day_month');
			options += `<option value="${jsDateToInputDate(jsDate)}">${label}</option>`;
		}
	}

	function addSelectListener() {
		dataSelect.onchange = (e) => {
			periodSelect.style.display = (e.target as HTMLSelectElement).value ? '' : 'none';
		};
	}
}

export async function setPlannedDestination(id, j) {
	const newData = getID(`edit-planned-select-data-${j}`).value;
	const newPeriod = getID(`edit-planned-select-period-${j}`).value;

	const currentSize = ACTIVE_PLANNED_DESTINATION.length;

	if ((currentSize === 0 && !newData) || newData === 'multi') {
		return false;
	}

	const currentData = ACTIVE_PLANNED_DESTINATION[0]?.data;
	const currentInputDate = currentData ? dateObjectToInputDate(currentData) : null;
	const currentPeriod = ACTIVE_PLANNED_DESTINATION[0]?.period;

	if (currentSize === 1 && newData === currentInputDate && newPeriod === currentPeriod) {
		return false;
	}

	const updatedSchedules = getUpdatedSchedules();
	await update(`trips/${TRIP_ID}`, {
		itinerary: updatedSchedules,
	});

	return true;

	function getUpdatedSchedules() {
		if (!newData && currentData) {
			return removeDestinationReferences();
		}

		if (newData && !currentData) {
			return addToLastPosition();
		}

		if (newData !== currentInputDate || newPeriod !== currentPeriod) {
			return changeOrder();
		}

		return getState().itinerary;
	}

	// ---------- helpers ----------

	function removeDestinationReferences() {
		const schedules = cloneObject(getState().itinerary);

		for (const day of schedules) {
			for (const period of ['morning', 'afternoon', 'night', 'earlyMorning']) {
				day[period] = day[period].filter((p) => {
					const item = p?.item;
					return !(
						item &&
						item.type === 'destinations' &&
						item.location === DOCUMENT_ID &&
						item.id === id
					);
				});
			}
		}

		return schedules;
	}

	function addToLastPosition() {
		const schedules = cloneObject(getState().itinerary);

		const targetDay = schedules.find((p) => dateObjectToInputDate(p.data) === newData);

		if (!targetDay) {
			return schedules;
		}

		targetDay[newPeriod].push(buildPlannedDestination());

		return schedules;
	}

	function changeOrder() {
		let schedules = removeDestinationReferences();

		const targetDay = schedules.find((p) => dateObjectToInputDate(p.data) === newData);

		if (!targetDay) {
			return schedules;
		}

		targetDay[newPeriod].push(buildPlannedDestination());

		return schedules;
	}

	function buildPlannedDestination() {
		const people = cloneObject(getState().travelers);
		for (const person of people) {
			person.isPresent = true;
		}
		return {
			itinerary: getID(`edit-name-${j}`).value,
			item: {
				type: 'destinations',
				category: ACTIVE_CATEGORY,
				location: DOCUMENT_ID,
				id: id,
			},
			end: '',
			people: people || [],
			start: '',
		};
	}
}
