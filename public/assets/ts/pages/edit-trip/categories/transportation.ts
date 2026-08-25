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
import { TRAVELERS } from '../../../data/state.js';
import { getTravelerOptionsHTML } from './travelers.js';
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
			// Explicit order so the subcollection reader can restore the user's
			// arrangement (legs are stored as random-ID docs, so Firestore's
			// default doc-ID order would otherwise scramble them).
			order: result.data.length,
			dates: {
				arrival: formattedDateToDateObject(
					getID(`transportation-arrival-date-${j}`).value,
					getID(`arrival-time-${j}`).value,
				),
				departure: formattedDateToDateObject(
					getID(`transportation-departure-date-${j}`).value,
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

	// Prefix depends on the active view mode: leg view → direction label,
	// people view → traveler name (falls back to the raw stored value).
	const prefix = getID('leg-view').checked
		? getTransportationType(i)
		: getID('people-view').checked
			? getPerson(i)
			: '';

	// No route points yet: keep the default "Transportation N" placeholder, but
	// surface the direction/traveler so leg & person edits always show up.
	if (!departurePoint && !arrivalPoint) {
		if (prefix) {
			getID(`transportation-title-${i}`).innerText = prefix;
		}
		return;
	}

	// Build "origin → destination" (tolerates a missing side).
	const text = [departurePoint, arrivalPoint].filter(Boolean).join(' → ');
	getID(`transportation-title-${i}`).innerText = prefix ? `${prefix}: ${text}` : text;
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
	const id = getID(`transportation-person-select-${i}`).value;
	const traveler = TRAVELERS.find((t) => t.id === id);
	return traveler ? traveler.name : id;
}

/**
 * Populate a transportation leg "group by traveler" select from the trip's
 * travelers (values are traveler IDs, labels are names). Backward compatible:
 * when currentValue isn't a known traveler ID (legacy free-text/name values),
 * it is preserved as an extra option so nothing is lost on save.
 */
export function buildTransportationPersonSelect(selectID, currentValue = '') {
	const select = getID(selectID);
	if (!select) return;

	let options = `<option value="">${translate('labels.select')}</option>`;
	options += getTravelerOptionsHTML();

	const knownIds = TRAVELERS.map((t) => t.id);
	if (currentValue && !knownIds.includes(currentValue)) {
		options += `<option value="${currentValue}">${currentValue}</option>`;
	}

	select.innerHTML = options;
	if (currentValue) {
		select.value = currentValue;
	}
}

/** Rebuild every transportation leg person select, keeping current values. */
export function refreshTransportationPersonSelects() {
	for (const child of getChildIDs('transportation-box')) {
		const j = getJ(child);
		const select = getID(`transportation-person-select-${j}`);
		if (select) {
			buildTransportationPersonSelect(select.id, select.value);
			updateTransportationTitle(j);
		}
	}
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

	const startDate = getID(`transportation-departure-date-${i}`).value;
	const startTime = getID(`departure-time-${i}`).value;

	const endDate = getID(`transportation-arrival-date-${i}`).value;
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

	// Dynamic Title — refresh live as the user types the route points (input),
	// plus on blur/selection change to cover programmatic and edge cases.
	getID(`departure-point-${j}`).addEventListener('input', () => updateTransportationTitle(j));
	getID(`arrival-point-${j}`).addEventListener('input', () => updateTransportationTitle(j));
	getID(`departure-point-${j}`).addEventListener('change', () => updateTransportationTitle(j));
	getID(`arrival-point-${j}`).addEventListener('change', () => updateTransportationTitle(j));
	getID(`departure-${j}`).addEventListener('change', () => updateTransportationTitle(j));
	getID(`during-${j}`).addEventListener('change', () => updateTransportationTitle(j));
	getID(`return-${j}`).addEventListener('change', () => updateTransportationTitle(j));
	getID(`transportation-person-select-${j}`).addEventListener('change', () =>
		updateTransportationTitle(j),
	);

	// Automatic Route Duration Calculation
	getID(`transportation-departure-date-${j}`).addEventListener('change', () => loadAutoDuration(j));
	getID(`departure-time-${j}`).addEventListener('change', () => loadAutoDuration(j));
	getID(`transportation-arrival-date-${j}`).addEventListener('change', () => loadAutoDuration(j));
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
}
