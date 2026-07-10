import { getTransportations } from '../../../app/config.js';
import {
	getChildIDs,
	getID,
	getJ,
	getOrCreateCategoryID,
	removeRequired,
	setRequired,
} from '../../../utils/dom.js';
import { formattedDateToDateObject, getTimeBetweenDates } from '../../../utils/dates.js';
import { translate } from '../../../i18n/translation.js';
import { validateLink } from '../../../ui/fields.js';
import { closeAccordions, openLastAccordion } from '../../../ui/accordion.js';
import { buildDS } from '../../../ui/dynamic-select.js';
import { addTransportation } from '../new-trip.js';

export function getTransportationObject(protectedReservationCodes = false) {
	const result = {
		data: [],
		viewMode: getID('people-view').checked
			? 'people'
			: getID('leg-view').checked
				? 'leg'
				: 'simple',
	};
	for (const child of getChildIDs('transportation-box')) {
		const j = getJ(child);
		result.data.push({
			dates: {
				arrival: formattedDateToDateObject(
					getID(`arrival-${j}`).value,
					getID(`arrival-time-${j}`).value,
				),
				departure: formattedDateToDateObject(
					getID(`departure-${j}`).value,
					getID(`departure-time-${j}`).value,
				),
			},
			duration: getID(`transportation-duration-other-${j}`).value,
			company: getCompanyValue(j),
			id: getOrCreateCategoryID('transportation', j),
			direction: getID(`departure-${j}`).checked
				? 'departure'
				: getID(`return-${j}`).checked
					? 'return'
					: 'during',
			link: protectedReservationCodes ? '' : getID(`transportation-link-${j}`).value,
			points: {
				destination: getID(`arrival-point-${j}`).value,
				origin: getID(`departure-point-${j}`).value,
			},
			reservation: protectedReservationCodes ? '' : getID(`reservation-transportation-${j}`).value,
			type: getID(`transportation-type-${j}`).value,
			person: getID(`transportation-person-select-${j}`).value,
		});
	}
	return result;
}

export function getProtectedTransportationObject() {
	const result = {};
	for (const childID of getChildIDs('transportation-box')) {
		const j = getJ(childID);
		const id = getID(`transportation-id-${j}`).value;
		const reservation = getID(`reservation-transportation-${j}`).value;
		const link = getID(`transportation-link-${j}`).value;
		result[id] = { reservation, link };
	}
	return result;
}

export function updateTransportationTitle(i) {
	const departurePoint = getID(`departure-point-${i}`).value;
	const arrivalPoint = getID(`arrival-point-${i}`).value;

	if (!departurePoint || !arrivalPoint) {
		return;
	}

	let text = `${departurePoint} → ${arrivalPoint}`;

	if (getID('leg-view').checked) {
		text = `${getTransportationType(i)}: ${text}`;
	} else {
		const person = getPerson(i);
		if (getID('people-view').checked && person) {
			text = `${person}: ${text}`;
		}
	}

	getID(`transportation-title-${i}`).innerText = text;
}

function getTransportationType(i) {
	const outboundLabel = getID(`departure-${i}`).checked
		? translate('trip.transportation.departure')
		: '';
	const duringLabel = getID(`during-${i}`).checked ? translate('trip.transportation.during') : '';
	const returnLabel = getID(`return-${i}`).checked ? translate('trip.transportation.return') : '';

	return outboundLabel || duringLabel || returnLabel;
}

function getPerson(i) {
	const select = getID(`transportation-person-select-${i}`).value;
	const input = getID(`transportation-person-${i}`).value;

	if (select === 'other' || select === 'select') {
		return input;
	}

	return select;
}

export function loadTransportationVisibility(j) {
	const companiesByType = getTransportations().companies;

	const companySelect = getID(`company-select-${j}`);
	const companyInput = getID(`company-${j}`);
	const type = getID(`transportation-type-${j}`).value;
	const previousValue = companySelect.value;

	const companies = companiesByType[type];

	if (!companies) {
		showOnlyCompanyInput(companySelect, companyInput);
		return;
	}

	populateCompanySelect(companySelect, companies);
	restorePreviousSelection(companySelect, previousValue);

	companySelect.style.display = 'block';
	companyInput.style.display = companySelect.value === 'other' ? 'block' : 'none';

	function populateCompanySelect(select, companies) {
		let options = `<option value="select">${translate('labels.select')}</option>`;

		for (const [value, label] of Object.entries(companies)) {
			options += `<option value="${value}">${label}</option>`;
		}

		options += `<option value="other">${translate('labels.other')}</option>`;
		select.innerHTML = options;
	}

	function restorePreviousSelection(select, value) {
		if (!value) return;

		const exists = Array.from(select.options).some(
			(option: HTMLOptionElement) => option.value === value,
		);

		if (exists) {
			select.value = value;
		}
	}

	function showOnlyCompanyInput(select, input) {
		select.style.display = 'none';
		input.style.display = 'block';
	}
}

export function applyTransportationTypeVisualization(i?) {
	if (i) {
		apply(i);
		return;
	}

	for (const child of getChildIDs('transportation-box')) {
		apply(getJ(child));
	}

	function apply(j) {
		updateTransportationTitle(j);
		getID(`direction-box-${j}`).style.display = getID('leg-view').checked ? 'block' : 'none';
		getID(`people-box-${j}`).style.display = getID('people-view').checked ? 'block' : 'none';

		if (getID('people-view').checked) {
			setRequired(`transportation-person-select-${j}`);
		} else {
			removeRequired(`transportation-person-select-${j}`);
		}
	}
}

function loadAutoDuration(i) {
	const div = getID(`transportation-duration-other-${i}`);

	const startDate = getID(`departure-${i}`).value;
	const startTime = getID(`departure-time-${i}`).value;

	const endDate = getID(`arrival-${i}`).value;
	const endTime = getID(`arrival-time-${i}`).value;

	if (startDate != '' && startTime != '' && endDate != '' && endTime != '') {
		const start = new Date(`${startDate}T${startTime}`);
		const end = new Date(`${endDate}T${endTime}`);
		div.value = getTimeBetweenDates(start, end);
	}
}

// Set Trip
function getCompanyValue(j) {
	const companySelectDiv = getID(`company-select-${j}`);
	const companyInputDiv = getID(`company-${j}`);

	if (companySelectDiv && companyInputDiv) {
		if (companySelectDiv.value == 'other' || companySelectDiv.value == 'select') {
			return companyInputDiv.value;
		} else {
			return companySelectDiv.value;
		}
	}

	return '';
}

// Listeners
export function loadTransportationListeners(j) {
	// Dynamic Selects
	getID(`company-select-${j}`).addEventListener('change', () => loadTransportationVisibility(j));
	getID(`transportation-type-${j}`).addEventListener('change', () =>
		loadTransportationVisibility(j),
	);

	// Dynamic Title
	getID(`departure-point-${j}`).addEventListener('change', () => updateTransportationTitle(j));
	getID(`arrival-point-${j}`).addEventListener('change', () => updateTransportationTitle(j));
	getID(`departure-${j}`).addEventListener('change', () => updateTransportationTitle(j));
	getID(`during-${j}`).addEventListener('change', () => updateTransportationTitle(j));
	getID(`return-${j}`).addEventListener('change', () => updateTransportationTitle(j));

	// Automatic Route Duration Calculation
	getID(`departure-${j}`).addEventListener('change', () => loadAutoDuration(j));
	getID(`departure-time-${j}`).addEventListener('change', () => loadAutoDuration(j));
	getID(`arrival-${j}`).addEventListener('change', () => loadAutoDuration(j));
	getID(`arrival-time-${j}`).addEventListener('change', () => loadAutoDuration(j));

	// Link Validation
	getID(`transportation-link-${j}`).addEventListener('change', () =>
		validateLink(`transportation-link-${j}`),
	);
}

export function transportationAddListenerAction() {
	closeAccordions('transportation');
	addTransportation();
	openLastAccordion('transportation');
	buildDS('transportation-person');
}
