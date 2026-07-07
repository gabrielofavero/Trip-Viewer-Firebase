import {
	convertFromDateObject,
	convertToDateObject,
	dateObjectToKey,
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
import { DESTINATIONS } from '../../../../data/state.js';
import {
	INNER_ITINERARY,
	afterDragInnerItinerary,
	loadInnerItineraryHTML,
} from '../itinerary-module/inner-itinerary/inner-itinerary.js';
import { updateActiveDestinationsCardsHTML } from '../destination.js';
import { DATAS } from '../../new-trip.js';

export var FIRESTORE_ITINERARY_DATA = {};
export function setItineraryData(val) {
	FIRESTORE_ITINERARY_DATA = val;
}

export function getItineraryArray() {
	let result = [];

	for (let j = 1; j <= DATAS.length; j++) {
		const innerResult = {
			data: convertToDateObject(DATAS[j - 1]),
			destinationIds: [],
			title: {
				price: '',
				translate: false,
				destinations: false,
			},
			earlyMorning: [],
			morning: [],
			afternoon: [],
			night: [],
		};

		innerResult.destinationIds = getDestinationsFromCards('itinerary', j);

		const tituloSelectValue = getID(`itinerary-inner-title-select-${j}`).value;
		if (tituloSelectValue == 'other') {
			innerResult.title.price = getID(`itinerary-inner-title-${j}`).value;
		} else {
			innerResult.title.price = tituloSelectValue;
		}

		innerResult.title.translate = [
			'departure',
			'return',
			'during',
			'departure_and_destinations',
			'return_and_destinations',
		].includes(tituloSelectValue);

		innerResult.title.destinations =
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
	const jsDate = convertFromDateObject(data.data);

	const destinationIdsObject = data.destinationIds;
	let destinationIds = [];
	if (destinationIdsObject && destinationIdsObject.length > 0) {
		destinationIds = destinationIdsObject.map((dest) => dest.destinationId);
		addValuesForActiveDestinationsCards('itinerary', j, destinationIds);
	}

	getID(`itinerary-inner-title-select-${j}`).innerHTML = getItineraryTitleSelectOptions(j);

	let title = data.title?.price ?? data.title;
	if (title) {
		const selectValues = getAllValuesFromSelect(getID(`itinerary-inner-title-select-${j}`));
		if (destinationIds && destinationIds.includes(title)) {
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
		let labels = [];
		let values = [];

		for (const child of getChildIDs(`itinerary-location-${j}`)) {
			const ids = getIDs(child);
			const checkbox = getID(`check-itinerary-${ids}`);
			if (checkbox.checked) {
				labels.push(getID(`check-itinerary-label-${ids}`).innerText);
				values.push(checkbox.value);
			}
		}

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
	const originalData = getItineraryArray() || [];
	const originalDataInputs = originalData.map((data) => dateObjectToKey(data.data));

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
