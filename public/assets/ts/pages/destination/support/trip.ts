import { getState, setState, DOCUMENT_ID } from '../../../data/state.js';
import { cloneObject, getID } from '../../../utils/dom.js';
import {
	convertFromDateObject,
	dateObjectToInputDate,
	getDateTitle,
} from '../../../utils/dates.js';
import { get, getItinerary, update } from '../../../data/firebase/database.js';
import { translate } from '../../../i18n/translation.js';
import { jsDateToInputDate } from '../../../utils/dates.js';
import { ACTIVE_CATEGORY } from '../destination.js';

// Time-of-day keys of an itinerary day (mirrors assets/json/itinerary.json).
const PERIODS = ['earlyMorning', 'morning', 'afternoon', 'night'];

var TRIP_ID;
export var PLANNED_DESTINATION = {};
var ACTIVE_PLANNED_DESTINATION: any[] = [];
export function resetActivePlannedDestination() {
	ACTIVE_PLANNED_DESTINATION = [];
}

/**
 * Trip document plus its itinerary. The itinerary lives in the
 * `trips/{tripId}/itinerary/{dayId}` subcollection (it was an embedded array in
 * older documents), so it is read separately — the destination page can only
 * tell what is planned for the trip when it has it in state.
 */
export async function getTripData(tripID) {
	if (!tripID) return;
	TRIP_ID = tripID;
	const [tripData, itinerary] = await Promise.all([
		get(`trips/${tripID}`),
		getItinerary(tripID).catch((error) => {
			console.warn('[destination] Could not load the trip itinerary:', error);
			return [] as any[];
		}),
	]);
	if (!tripData) return tripData;
	return itinerary?.length ? { ...tripData, itinerary } : tripData;
}

export async function refreshTripData() {
	if (!TRIP_ID) return;
	ACTIVE_PLANNED_DESTINATION = [];
	setState(await getTripData(TRIP_ID));
	loadPlannedDestination();
}

// Planned Destination
export function loadPlannedDestination() {
	// Rebuilt from scratch: the destination component can be mounted more than
	// once per page session (view.html lightbox) and the trip data changes.
	PLANNED_DESTINATION = {};

	const schedules = getState()?.itinerary || [];
	for (const day of schedules) {
		const data = getDayDate(day);
		if (!data) continue;

		for (const period of PERIODS) {
			const periods = day[period];
			if (!Array.isArray(periods)) continue;

			for (const schedule of periods) {
				const item = schedule?.item;
				if (!isDestinationItem(item) || item.location !== DOCUMENT_ID) continue;
				if (!item.category || !item.id) continue;

				PLANNED_DESTINATION[item.category] ??= {};
				PLANNED_DESTINATION[item.category][item.id] ??= [];
				PLANNED_DESTINATION[item.category][item.id].push({ data, period });
			}
		}
	}
}

/** Day date — `date` on current documents, `data` on legacy ones. */
function getDayDate(day) {
	return day?.date || day?.data;
}

/**
 * Itinerary entries reference destinations with the plural type
 * (`destinations`); the singular form is kept for legacy documents.
 */
function isDestinationItem(item) {
	return item?.type === 'destinations' || item?.type === 'destination';
}

/** Destination ids referenced by a day — plain ids or `{ id, title }` refs. */
function getDestinationRefIds(day) {
	return (day?.destinationIds || [])
		.map((ref) => (typeof ref === 'string' ? ref : ref?.id || ref?.destinationId))
		.filter(Boolean);
}

/** First itinerary day whose date matches an `yyyy-mm-dd` input value. */
function findDayByInputDate(schedules, inputDate) {
	return schedules.find((day) => {
		const date = getDayDate(day);
		return !!date && dateObjectToInputDate(date) === inputDate;
	});
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
		const itinerary = getState()?.itinerary || [];
		for (const schedule of itinerary) {
			if (!getDestinationRefIds(schedule).includes(DOCUMENT_ID)) {
				continue;
			}

			const jsDate = convertFromDateObject(getDayDate(schedule));
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

	const currentSchedules = getState()?.itinerary || [];
	const updatedSchedules = getUpdatedSchedules(cloneObject(currentSchedules));

	return await persistItinerary(currentSchedules, updatedSchedules);

	function getUpdatedSchedules(schedules) {
		if (!newData && currentData) {
			return removeDestinationReferences(schedules);
		}

		if (newData && !currentData) {
			return addToLastPosition(schedules);
		}

		if (newData !== currentInputDate || newPeriod !== currentPeriod) {
			return changeOrder(schedules);
		}

		return schedules;
	}

	// ---------- helpers ----------

	function removeDestinationReferences(schedules) {
		for (const day of schedules) {
			for (const period of PERIODS) {
				if (!Array.isArray(day[period])) continue;

				day[period] = day[period].filter((p) => {
					const item = p?.item;
					return !(
						isDestinationItem(item) &&
						item.location === DOCUMENT_ID &&
						item.id === id
					);
				});
			}
		}

		return schedules;
	}

	function addToLastPosition(schedules) {
		const targetDay = findDayByInputDate(schedules, newData);

		if (!targetDay) {
			return schedules;
		}

		targetDay[newPeriod] ??= [];
		targetDay[newPeriod].push(buildPlannedDestination());

		return schedules;
	}

	function changeOrder(schedules) {
		return addToLastPosition(removeDestinationReferences(schedules));
	}

	function buildPlannedDestination() {
		const travelers = cloneObject(getState()?.travelers || []).map((traveler) => ({
			id: traveler.id,
			name: traveler.name,
			isPresent: true,
		}));

		return {
			label: getID(`edit-name-${j}`).value,
			travelers,
			start: '',
			end: '',
			item: {
				type: 'destinations',
				category: ACTIVE_CATEGORY,
				location: DOCUMENT_ID,
				id,
			},
		};
	}
}

/**
 * Persist the updated itinerary days. Days carrying a document id are written
 * back to `trips/{tripId}/itinerary/{dayId}` — only the four period arrays (the
 * rest of the document is left alone) and only for the days that changed.
 * Legacy embedded days (no id) are written back to the trip document.
 *
 * @returns whether anything was written.
 */
async function persistItinerary(currentSchedules, updatedSchedules) {
	if (!updatedSchedules?.length) return false;

	if (updatedSchedules.some((day) => !day?.id)) {
		await update(`trips/${TRIP_ID}`, { itinerary: updatedSchedules });
		return true;
	}

	const changedDays = updatedSchedules.filter(
		(day, index) => !hasSamePeriods(currentSchedules[index], day),
	);
	if (changedDays.length === 0) return false;

	await Promise.all(
		changedDays.map((day) => update(`trips/${TRIP_ID}/itinerary/${day.id}`, pickPeriods(day))),
	);

	return true;
}

function hasSamePeriods(previousDay, day) {
	return PERIODS.every(
		(period) =>
			JSON.stringify(previousDay?.[period] || []) === JSON.stringify(day?.[period] || []),
	);
}

function pickPeriods(day) {
	const periods: Record<string, any[]> = {};
	for (const period of PERIODS) {
		periods[period] = day?.[period] || [];
	}
	return periods;
}
