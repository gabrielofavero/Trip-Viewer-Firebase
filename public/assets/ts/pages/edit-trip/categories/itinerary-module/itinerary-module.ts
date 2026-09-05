import {
	convertFromDateObject,
	convertToDateObject,
	dateObjectToKey,
	formattedDateToDate,
	getArrayOfDates,
	getDateTitle,
	jsDateToKey,
} from '../../../../utils/dates.js';
import {
	getAndDestinationTitle,
	getChildIDs,
	getID,
	getIDs,
	getReadableArray,
} from '../../../../utils/dom.js';
import { addValueToSelectIfExists, getAllValuesFromSelect } from '../../../../ui/fields.js';
import { initializeSortableForGroup } from '../../../../ui/sortable.js';
import { translate } from '../../../../i18n/translation.js';
import {
	addValuesForActiveDestinationsCards,
	getDestinationsFromCards,
	ACTIVE_DESTINATIONS,
} from '../destination.js';
import { DESTINATIONS, DOCUMENT_ID } from '../../../../data/state.js';
import {
	INNER_ITINERARY,
	afterDragInnerItinerary,
	loadInnerItineraryHTML,
} from '../itinerary-module/inner-itinerary/inner-itinerary.js';
import {
	autoPopulateItineraryFromTrip,
	hasItineraryItems,
} from './inner-itinerary/auto-populate.js';
import { updateActiveDestinationsCardsHTML } from '../destination.js';
import { DATAS, loadItinerarySchedule } from '../../new-trip.js';

export var FIRESTORE_ITINERARY_DATA = {};
export function setItineraryData(val) {
	FIRESTORE_ITINERARY_DATA = val;
}

export function getItineraryArray() {
	let result = [];

	for (let j = 1; j <= DATAS.length; j++) {
		const innerResult = {
			date: convertToDateObject(DATAS[j - 1]),
			destinationIds: [],
			title: {
				value: '',
				translate: false,
				showDestinations: false,
			},
			earlyMorning: [],
			morning: [],
			afternoon: [],
			night: [],
		};

		innerResult.destinationIds = getDestinationsFromCards('itinerary', j);

		const tituloSelectValue = getID(`itinerary-inner-title-select-${j}`).value;
		if (tituloSelectValue == 'other') {
			innerResult.title.value = getID(`itinerary-inner-title-${j}`).value;
		} else {
			innerResult.title.value = tituloSelectValue;
		}

		innerResult.title.translate = [
			'departure',
			'return',
			'during',
			'departure_and_destinations',
			'return_and_destinations',
		].includes(tituloSelectValue);

		innerResult.title.showDestinations =
			['departure_and_destinations', 'return_and_destinations', 'all_destinations'].includes(
				tituloSelectValue,
			) || DESTINATIONS.map((d) => d.id).includes(tituloSelectValue);

		if (DATAS[j - 1] && DATAS[j - 1] && INNER_ITINERARY[jsDateToKey(DATAS[j - 1])]) {
			const periods = INNER_ITINERARY[jsDateToKey(DATAS[j - 1])];
			innerResult.earlyMorning = periods.earlyMorning;
			innerResult.morning = periods.morning;
			innerResult.afternoon = periods.afternoon;
			innerResult.night = periods.night;
		}
		result.push(innerResult);
	}

	return result;
}

export function applyLoadedItineraryData(j, data) {
	const jsDate = convertFromDateObject(data.date);

	const destinationIdsObject = data.destinationIds;
	let destinationIds = [];
	if (destinationIdsObject && destinationIdsObject.length > 0) {
		destinationIds = destinationIdsObject.map((dest) => dest.destinationId || dest.id);
		addValuesForActiveDestinationsCards('itinerary', j, destinationIds);
	}

	getID(`itinerary-inner-title-select-${j}`).innerHTML = getItineraryTitleSelectOptions(j);

	let title = data.title?.value ?? data.title;
	if (title) {
		const selectValues = getAllValuesFromSelect(getID(`itinerary-inner-title-select-${j}`));
		if (destinationIds && destinationIds.includes(title)) {
			getID(`itinerary-inner-title-select-${j}`).value = title;
			getID(`itinerary-inner-title-${j}`).style.display = 'none';
		} else if (title.toLowerCase() == 'other' || !selectValues.includes(title)) {
			getID(`itinerary-inner-title-select-${j}`).value = 'other';
			getID(`itinerary-inner-title-${j}`).style.display = 'block';
			getID(`itinerary-inner-title-${j}`).value = title;
		} else {
			getID(`itinerary-inner-title-select-${j}`).value = title;
			getID(`itinerary-inner-title-${j}`).style.display = 'none';
		}
	}

	INNER_ITINERARY[jsDateToKey(jsDate)] = {
		earlyMorning: data.earlyMorning || [],
		morning: data.morning || [],
		afternoon: data.afternoon || [],
		night: data.night || [],
	};

	updateItineraryTitle(j);
	loadInnerItineraryHTML(j);
	initializeSortableForGroup(`itinerary-${j}`, {
		onEnd: afterDragInnerItinerary,
	});
}

export function updateItineraryTitle(j) {
	const div = getID(`itinerary-title-${j}`);
	const tituloInput = getID(`itinerary-inner-title-${j}`);
	const tituloSelect = getID(`itinerary-inner-title-select-${j}`);
	let title;
	let value;

	value = tituloSelect.value;
	switch (value) {
		case '':
			title = '';
			break;
		case 'other':
			title = tituloInput.value;
			tituloInput.style.display = 'block';
			value = tituloInput.value;
			break;
		case 'departure':
		case 'return':
		case 'during':
			title = translate(`trip.transportation.${tituloSelect.value}`);
			tituloInput.style.display = 'none';
			break;
		default:
			title = getDestinationItineraryTitle(value, j);
			tituloInput.style.display = 'none';
	}

	const data = DATAS[j - 1];
	const dataFormatada = getDateTitle(data, 'weekday_day_month');
	div.innerText = getItineraryTitle(dataFormatada, title);
}

function getDestinationItineraryTitle(value, j) {
	const activeDestinations = getActiveDestinations(j);
	const destinationTitles = activeDestinations.map((destination) => destination.label);
	const destinationIds = activeDestinations.map((destination) => destination.value);

	if (value === 'all_destinations') {
		return getReadableArray(destinationTitles);
	}

	if (value.includes('_and_destinations')) {
		return getAndDestinationTitle(value, destinationTitles);
	}

	if (destinationIds.includes(value)) {
		const index = destinationIds.indexOf(value);
		return destinationTitles[index];
	}

	return '';
}

export function getActiveDestinations(j) {
	const result = [];
	const fieldSet = getID(`itinerary-location-${j}`);
	if (!fieldSet) return result;
	for (const card of fieldSet.querySelectorAll('.destination-card.selected')) {
		const nameEl = card.querySelector('.destination-card-name') as HTMLElement;
		const label = nameEl?.textContent?.trim() || '';
		const value = card.getAttribute('data-destination-id') || '';
		if (value) {
			result.push({ label, value });
		}
	}
	return result;
}

export function getItineraryTitleSelectOptions(j = null) {
	const semTitulo = `<option value="">${translate('labels.no_title')}</option>`;
	let destination = '';
	let idaVoltaDestino = '';

	if (j) {
		const activeDestinations = getActiveDestinations(j);
		const labels = activeDestinations.map((d) => d.label);
		const values = activeDestinations.map((d) => d.value);

		if (values.length > 0 && ACTIVE_DESTINATIONS.length > 0) {
			for (let i = 0; i < values.length; i++) {
				destination += `<option value="${values[i]}">${labels[i]}</option>`;
			}
			if (labels.length > 1) {
				const text = getReadableArray(labels);
				destination += `<option value="all_destinations">${text}</option>`;
			}
			const idaArray = [translate('trip.transportation.departure'), ...labels];
			const idaText = getReadableArray(idaArray);
			idaVoltaDestino += `<option value="departure_and_destinations">${idaText}</option>`;

			const voltaArray = [...labels, translate('trip.transportation.return')];
			const voltaText = getReadableArray(voltaArray);
			idaVoltaDestino += `<option value="return_and_destinations">${voltaText}</option>`;
		}
	}

	return `${destination}
            ${destination ? '' : semTitulo}
            <option value="departure">${translate('trip.transportation.departure')}</option>
            <option value="return">${translate('trip.transportation.return')}</option>
            <option value="during">${translate('trip.transportation.during')}</option>
            ${idaVoltaDestino}
            ${destination ? semTitulo : ''}
            <option value="other">${translate('labels.other')}</option>`;
}

function updateItineraryTitleSelect(j) {
	const select = getID(`itinerary-inner-title-select-${j}`);
	const value = select.value;
	select.innerHTML = getItineraryTitleSelectOptions(j);
	if (value) {
		addValueToSelectIfExists(value, select);
	}
	updateItineraryTitle(j);
}

function getItineraryTitle(dataFormatada, title = '') {
	if (title) return `${title}: ${dataFormatada}`;
	else return dataFormatada;
}

export function reloadItinerary() {
	if (!getID('itinerary-enabled').checked) return;
	// When enabling the itinerary with no scheduled items yet, pre-fill the
	// days with the trip's transportations and accommodation check-in/out.
	if (!hasItineraryItems(getItineraryArray() || [])) {
		autoPopulateItineraryFromTrip();
	}
	const originalData = getItineraryArray() || [];
	const originalDataInputs = originalData.map((data) => dateObjectToKey(data.date));

	let j = 1;
	for (const data of DATAS.map((data) => jsDateToKey(data))) {
		if (originalDataInputs.includes(data)) {
			const index = originalDataInputs.indexOf(data);
			const orig = originalData[index];
			applyLoadedItineraryData(j, orig);
		}
		j++;
	}
	updateActiveDestinationsCardsHTML('itinerary');
}

// ======= Duration change: adapt the day tabs & park removed days =======

const ITINERARY_STASH_PREFIX = 'tripviewer:itinerary-stash:';

/** localStorage key scoping parked days to the trip being edited ('new' = unsaved new trip). */
function getItineraryStashKey(): string {
	return `${ITINERARY_STASH_PREFIX}${DOCUMENT_ID || 'new'}`;
}

function readItineraryStash(): Record<string, any> {
	try {
		const raw = window.localStorage.getItem(getItineraryStashKey());
		return raw ? JSON.parse(raw) : {};
	} catch {
		return {};
	}
}

function writeItineraryStash(stash: Record<string, any>): void {
	try {
		const key = getItineraryStashKey();
		if (Object.keys(stash).length === 0) {
			window.localStorage.removeItem(key);
		} else {
			window.localStorage.setItem(key, JSON.stringify(stash));
		}
	} catch {
		// Storage full/unavailable — the edit session keeps working without parking.
	}
}

/**
 * Drop parked days for the trip being edited. Called on a fresh page load and
 * after a successful save so parked days never survive a save/reload boundary
 * ("once saved, what is lost is lost").
 */
export function clearItineraryDurationStash(): void {
	try {
		window.localStorage.removeItem(getItineraryStashKey());
	} catch {
		// ignore
	}
}

/** Whether a captured day carries content worth parking across a shrink. */
function hasDayContent(day: any): boolean {
	if (!day) return false;
	if (day.destinationIds?.length) return true;
	const title = day.title;
	if (title && (typeof title === 'string' ? title : title.value)) return true;
	return hasItineraryItems([day]);
}

/**
 * Rebuild the itinerary schedule to match the trip's current start/end after a
 * duration change, keeping each day's content aligned by date:
 *
 *  - days kept inside the range are re-applied as they were;
 *  - days pushed outside the range are parked in localStorage (not deleted) so
 *    extending the trip again before saving brings them back seamlessly;
 *  - newly-added days start empty, except when their date was removed earlier
 *    in this same editing session — then the parked content is restored.
 */
export function adaptItineraryToDuration(): void {
	const start = getID('start')?.value;
	const end = getID('end')?.value;
	if (!start || !end) return;

	// Snapshot the live content of the currently-rendered (old-range) days,
	// keyed by date, before the DOM is rebuilt.
	const previousDates = DATAS.map((d) => jsDateToKey(d));
	const liveByKey: Record<string, any> = {};
	const liveDays = getItineraryArray() || [];
	for (let i = 0; i < previousDates.length; i++) {
		if (liveDays[i]) liveByKey[previousDates[i]] = liveDays[i];
	}

	const newDates = getArrayOfDates(formattedDateToDate(start), formattedDateToDate(end)).map(
		(d) => jsDateToKey(d),
	);
	const newKeySet = new Set(newDates);

	// Decide which days keep content, and park the removed ones.
	const stash = readItineraryStash();
	const toRestore: Record<string, any> = {};

	for (const key of newDates) {
		if (liveByKey[key]) {
			toRestore[key] = liveByKey[key];
		} else if (stash[key]) {
			// A date removed earlier in this session is coming back → restore it.
			toRestore[key] = stash[key];
			delete stash[key];
		}
	}
	for (const key of previousDates) {
		if (!newKeySet.has(key) && hasDayContent(liveByKey[key])) {
			stash[key] = liveByKey[key];
		}
	}
	writeItineraryStash(stash);

	// Rebuild the day tabs for the new range (loadItinerarySchedule resets DATAS).
	loadItinerarySchedule();

	// Re-apply content to the days that keep it (surviving or restored).
	let j = 1;
	for (const key of newDates) {
		if (toRestore[key]) {
			applyLoadedItineraryData(j, toRestore[key]);
		}
		j++;
	}
	updateActiveDestinationsCardsHTML('itinerary');
}

// Listeners
export function loadItineraryListeners(j) {
	// Card-based destination selection
	const container = getID(`itinerary-location-${j}`);
	if (!container) return;
	for (const card of container.querySelectorAll('.destination-card')) {
		card.addEventListener('click', () => {
			card.classList.toggle('selected');
			if (card.classList.contains('selected')) {
				container.prepend(card);
			}
			updateItineraryTitleSelect(j);
			updateItineraryTitle(j);
		});
	}
}
