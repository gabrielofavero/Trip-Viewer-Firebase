// ======= Travelers =======
// Traveler functions moved to models/traveler.model.js — imported here for backward compat

import { cloneObject, getID, getReadableArray, getRandomID } from '../../../utils/dom.js';
import { translate } from '../../../i18n/translation.js';
import {
	closeMessage,
	displayFullMessage,
	getContainersInput,
	MESSAGE_PROPERTIES,
} from '../../../utils/messages.js';
import {
	getNewTravelerID,
	hasDuplicateTravelerNames,
	validateTravelersObject,
} from '../../../models/traveler.model.js';
import { loadItineraryData } from '../existing-trip.js';
import { TRAVELERS, DOCUMENT_ID, setTravelersFn } from '../../../data/state.js';
import { refreshTransportationPersonSelects } from './transportation.js';

export function setTravelers(val) {
	setTravelersFn(val);
}
const INCLUDE_LATE_TRAVELERS = false; // Flag to include late travelers in the fieldset
let TRAVELER_SELECT_OPTIONS = '';

export function openTravelersInfo() {
	const properties = cloneObject(MESSAGE_PROPERTIES);
	properties.title = translate('trip.travelers.info');
	properties.containers = getContainersInput();
	properties.fullscreen = true;
	properties.content = getTravelersInfoContent();
	properties.buttons = [
		{
			type: 'cancel',
		},
		{
			type: 'confirm',
			action: `saveTravelersInfo()`,
		},
	];

	displayFullMessage(properties);
	loadTravelersModalListeners();
}

/**
 * Traveler modal — dynamic list UX.
 * One row per traveler (name input + remove button) plus an explicit
 * "Add traveler" button. Replaces the old "number of travelers" spinner,
 * which wiped entered names every time the count changed.
 */
function getTravelersInfoContent() {
	const rows = TRAVELERS.length
		? TRAVELERS.map((traveler, i) => getTravelerRowHTML(i, traveler)).join('')
		: getTravelerRowHTML(0);

	return `
    <div class="travelers-list" id="travelers-list">
        ${rows}
    </div>
    <button type="button" class="btn input-button travelers-add" id="add-traveler">
        <span>+ ${translate('trip.travelers.add_traveler')}</span>
    </button>
    <div class="nice-form-group" id="travelers-names-unique" style="display: none">
        <span class="red">${translate('trip.travelers.unique')}</span>
    </div>
    `;
}

function getTravelerRowHTML(index: number, traveler?: { id?: string; name?: string }) {
	const nameLabel = translate('labels.name');
	const id = traveler?.id || getNewTravelerID();
	const name = traveler?.name || '';
	return `
        <div class="travelers-row" data-index="${index}">
            <div class="nice-form-group travelers-name-group">
                <label class="travelers-row-label">${nameLabel} ${index + 1}</label>
                <input type="hidden" class="travelers-id-input" id="traveler-id-${index}" value="${id}" />
                <input class="travelers-name-input" id="traveler-name-${index}" type="text" maxlength="10"
                    placeholder="${nameLabel}" ${name ? `value="${name}"` : ''} />
            </div>
            <button type="button" class="travelers-remove" data-index="${index}"
                aria-label="${translate('labels.delete')}" title="${translate('labels.delete')}">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
                    <path fill="currentColor" fill-rule="evenodd"
                        d="M8.106 2.553A1 1 0 0 1 9 2h6a1 1 0 0 1 .894.553L17.618 6H20a1 1 0 1 1 0 2h-1v11a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3V8H4a1 1 0 0 1 0-2h2.382l1.724-3.447ZM14.382 4l1 2H8.618l1-2h4.764ZM11 11a1 1 0 1 0-2 0v6a1 1 0 1 0 2 0v-6Zm4 0a1 1 0 1 0-2 0v6a1 1 0 1 0 2 0v-6Z"
                        clip-rule="evenodd"></path>
                </svg>
            </button>
        </div>
    `;
}

function loadTravelersModalListeners() {
	const list = getID('travelers-list');
	if (!list) return;

	getID('add-traveler').addEventListener('click', addTravelerRow);

	// Event delegation so remove buttons work on every row, including new ones.
	list.addEventListener('click', (event) => {
		const button = (event.target as Element).closest<HTMLElement>('.travelers-remove');
		if (!button) return;
		button.closest<HTMLElement>('.travelers-row')?.remove();
		reindexTravelersRows();
		hideTravelersUniqueWarning();
	});
}

function addTravelerRow() {
	const list = getID('travelers-list');
	if (!list) return;
	const index = list.children.length;
	list.insertAdjacentHTML('beforeend', getTravelerRowHTML(index, { id: getNewTravelerIDForModal(list) }));
	hideTravelersUniqueWarning();
	getID(`traveler-name-${index}`)?.focus();
}

/**
 * Generates a traveler ID unique against both the saved travelers and the rows
 * already present in the open modal (avoids collisions when several rows are
 * added in a single session).
 */
function getNewTravelerIDForModal(list: HTMLElement): string {
	const usedIDs = [
		...TRAVELERS.map((t) => t.id),
		...Array.from(list.querySelectorAll<HTMLInputElement>('.travelers-id-input')).map((input) => input.value),
	];
	return getRandomID({ pool: usedIDs });
}

/** Renumbers row labels / input ids after a row is removed. */
function reindexTravelersRows() {
	const list = getID('travelers-list');
	if (!list) return;
	const nameLabel = translate('labels.name');
	Array.from(list.children).forEach((row, i) => {
		const rowEl = row as HTMLElement;
		rowEl.dataset.index = String(i);
		const idInput = rowEl.querySelector<HTMLInputElement>('.travelers-id-input');
		const nameInput = rowEl.querySelector<HTMLInputElement>('.travelers-name-input');
		if (idInput) idInput.id = `traveler-id-${i}`;
		if (nameInput) nameInput.id = `traveler-name-${i}`;
		const label = rowEl.querySelector('.travelers-row-label');
		if (label) label.textContent = `${nameLabel} ${i + 1}`;
		const removeBtn = rowEl.querySelector<HTMLElement>('.travelers-remove');
		if (removeBtn) removeBtn.dataset.index = String(i);
	});
}

function hideTravelersUniqueWarning() {
	const warning = getID('travelers-names-unique');
	if (warning) warning.style.display = 'none';
}

export function saveTravelersInfo() {
	const list = getID('travelers-list');
	if (!list) return;

	const travelers = [];
	for (const row of list.querySelectorAll<HTMLElement>('.travelers-row')) {
		const name = row.querySelector<HTMLInputElement>('.travelers-name-input')?.value.trim() || '';
		if (!name) {
			continue; // Skip empty rows
		}
		travelers.push({
			id: row.querySelector<HTMLInputElement>('.travelers-id-input')?.value || getNewTravelerID(),
			name,
		});
	}

	const names = travelers.map((t) => t.name);
	const hasRepetitions = names.some((name, index) => {
		return names.indexOf(name) !== index;
	});

	if (hasRepetitions) {
		getID('travelers-names-unique').style.display = 'block';
		return;
	}

	setTravelersFn(travelers);
	closeMessage();
	updateTravelersButtonLabel();
	refreshTransportationPersonSelects();
	if (DOCUMENT_ID) {
		loadItineraryData();
	}
}

export function getTravelersFieldset(id, _defaultValue?) {
	const result = document.createElement('div');
	result.className = 'nice-form-group';

	if (id) {
		result.id = id;
	}

	const mandatory = document.createElement('span');
	mandatory.id = `${id}-mandatory`;
	mandatory.className = 'red';
	mandatory.textContent = `(${translate('messages.select_one')})`;
	mandatory.style.display = 'none';

	const titleLabel = document.createElement('label');
	titleLabel.appendChild(document.createTextNode(translate('trip.travelers.title') + ' '));
	titleLabel.appendChild(mandatory);
	result.appendChild(titleLabel);

	const fieldset = document.createElement('fieldset');
	fieldset.className = 'double-fieldset';
	let travelers = 0;

	for (let j = 1; j <= TRAVELERS.length; j++) {
		const traveler = TRAVELERS[j - 1];

		if (!traveler.name) {
			continue; // Skip if no name is provided
		}

		const div = document.createElement('div');
		div.id = `checkbox-${j}`;
		div.className = 'nice-form-group';
		div.style.marginTop = '0px';

		const input = document.createElement('input');
		input.type = 'checkbox';
		input.id = `${id}-${j}`;
		input.value = traveler.id;
		input.checked = true;

		const label = document.createElement('label');
		label.id = `${id}-label-${j}`;
		label.className = 'checkbox-label';
		label.setAttribute('for', input.id);
		label.textContent = traveler.name;

		div.appendChild(input);
		div.appendChild(label);
		fieldset.appendChild(div);
		travelers++;
	}

	result.appendChild(fieldset);

	return travelers > 1 ? result.outerHTML : '';
}

export function enableAllTravelersFieldset(id) {
	const checkedData = [];
	for (const traveler of TRAVELERS) {
		checkedData.push({ id: traveler.id, name: traveler.name, isPresent: true });
	}
	updateTravelersFieldset(id, checkedData);
}

export function updateTravelersFieldset(id, checkedData = []) {
	let j = 1;
	while (getID(`${id}-${j}`)) {
		const checkbox = getID(`${id}-${j}`);
		const value = checkbox.value;
		const traveler = checkedData.find((t) => t.id === value);

		checkbox.checked =
			traveler?.isPresent === undefined ? INCLUDE_LATE_TRAVELERS : traveler.isPresent;
		j++;
	}
}

export function getCheckedTravelersIDs(containerID) {
	const container = getID(containerID);
	if (!container) {
		return [];
	}
	const result = [];
	const fieldset = container.querySelector('fieldset');

	for (const checkBoxContainer of fieldset.children) {
		const label = checkBoxContainer.querySelector('label');
		const checkbox = checkBoxContainer.querySelector('input');
		result.push({
			id: checkbox.value,
			name: label.innerText,
			isPresent: checkbox.checked,
		});
	}

	const missingNames = TRAVELERS.filter((t) => !result.some((r) => r.name === t.name));
	for (const missing of missingNames) {
		result.push({
			id: missing.id,
			name: missing.name,
			isPresent: INCLUDE_LATE_TRAVELERS,
		});
	}

	return result;
}

export function validateTravelersFieldset(id) {
	const mandatory = getID(`${id}-mandatory`);
	if (!mandatory) {
		return true;
	}
	let isValid = false;
	let j = 1;
	while (getID(`${id}-${j}`)) {
		const checkbox = getID(`${id}-${j}`);
		if (checkbox.checked) {
			isValid = true;
			break;
		}
		j++;
	}
	if (!isValid) {
		mandatory.style.display = 'inline';
	}

	return isValid;
}

export function updateTravelersButtonLabel() {
	const el = getID('travelers-info');

	if (TRAVELERS.length === 0) {
		el.textContent = translate('trip.travelers.add');
		return;
	}

	const names = TRAVELERS.map((t) => t.name).filter((n) => n);
	el.textContent = getReadableArray(names);
}

export function getTravelersSelectOptionsHTML() {
	if (!TRAVELER_SELECT_OPTIONS) {
		for (const traveler of TRAVELERS) {
			if (!traveler.name) {
				continue;
			}
			TRAVELER_SELECT_OPTIONS += `<option value="${traveler.id}">${traveler.name}</option>`;
		}
	}
	return TRAVELER_SELECT_OPTIONS;
}

/**
 * Fresh traveler options (never cached) — used by the transportation leg
 * "group by traveler" select so options always reflect the current travelers,
 * even after the traveler list is edited mid-session. Values are traveler IDs;
 * labels are traveler names.
 */
export function getTravelerOptionsHTML(): string {
	let result = '';
	for (const traveler of TRAVELERS) {
		if (!traveler.name) {
			continue;
		}
		result += `<option value="${traveler.id}">${traveler.name}</option>`;
	}
	return result;
}

export function getTravelerName(id) {
	const traveler = TRAVELERS.find((t) => t.id === id);
	return traveler ? traveler.name : '';
}

export function getTravelersObject() {
	const result = {};
	for (const traveler of TRAVELERS) {
		result[traveler.id] = traveler.name;
	}
	return result;
}
