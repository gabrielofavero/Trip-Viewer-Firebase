// ======= Travelers =======
// Traveler functions moved to models/traveler.model.js — imported here for backward compat
//
// The trip editor renders the account's people registry as an inline wheel in
// the basic-information form: tap a circle to include that person on the trip,
// or the trailing "+" to create a trip-only person (name + optional photo).
// People created here are registered for future trips only when the "save for
// future trips" checkbox is checked — and only once the trip itself is saved.

import { cloneObject, getID } from '../../../utils/dom.js';
import { translate } from '../../../i18n/translation.js';
import {
	closeMessage,
	displayFullMessage,
	getContainersInput,
	MESSAGE_PROPERTIES,
} from '../../../utils/messages.js';
import { isHttp, markStagedChanges } from '../../../ui/fields.js';
import { TRAVELERS, setTravelersFn } from '../../../data/state.js';
import { refreshTransportationPersonSelects } from './transportation.js';
import {
	createPersonId,
	getCachedPeople,
	queuePersonRegistration,
	type Person,
} from '../../../data/services/people.service.js';
import {
	getPeopleWheelHTML,
	getPeopleWheelSelectedIDs,
	getPersonAvatarHTML,
	initPeopleWheel,
} from '../../../ui/people-wheel.js';
import { escapePeopleHTML } from '../../../utils/people-avatars.js';

export function setTravelers(val) {
	setTravelersFn(val);
}
const INCLUDE_LATE_TRAVELERS = false; // Flag to include late travelers in the fieldset
let TRAVELER_SELECT_OPTIONS = '';

const WHEEL_ID = 'trip-travelers-wheel';
const WHEEL_CONTAINER_ID = 'trip-travelers-container';

/** People currently rendered in the editor wheel (registry + trip-only people). */
let WHEEL_PEOPLE: Person[] = [];
/** Trip-only people created in this session (kept selectable even when unchecked). */
const EXTRA_PEOPLE: Person[] = [];

/*--------------------------------------------------------------
# Inline wheel (basic information)
--------------------------------------------------------------*/

/**
 * Render (or re-render) the travelers wheel in the basic-information form.
 * Selection is mirrored into `TRAVELERS` on every change; `selectedIds`
 * defaults to what the wheel currently shows.
 */
export function renderTripTravelersWheel(selectedIds?: string[]): void {
	const container = getID(WHEEL_CONTAINER_ID);
	if (!container) return;

	const selected = selectedIds ?? getWheelSelection();
	WHEEL_PEOPLE = buildWheelPeople();

	container.innerHTML = getPeopleWheelHTML(WHEEL_ID, WHEEL_PEOPLE, selected, true, {
		label: translate('labels.add'),
		action: 'add-trip-person',
	});

	initPeopleWheel(WHEEL_ID);
	getID(WHEEL_ID)
		?.querySelector<HTMLElement>('[data-wheel-track]')
		?.addEventListener('change', syncTravelersFromWheel);
}

/** Selection currently shown in the wheel (falls back to the trip's travelers). */
function getWheelSelection(): string[] {
	if (!getID(WHEEL_ID)) return TRAVELERS.map((traveler) => traveler.id);
	return getPeopleWheelSelectedIDs(WHEEL_ID);
}

/**
 * People to render: the account registry first, then trip-only people. Names
 * already on the trip but missing from the registry stay selectable instead of
 * silently disappearing from the editor.
 */
function buildWheelPeople(): Person[] {
	const people: Person[] = [...getCachedPeople()];
	const known = new Set(people.map((person) => person.id));

	for (const person of EXTRA_PEOPLE) {
		if (known.has(person.id)) continue;
		known.add(person.id);
		people.push(person);
	}

	for (const traveler of TRAVELERS) {
		if (!traveler?.id || !traveler.name || known.has(traveler.id)) continue;
		known.add(traveler.id);
		const person: Person = {
			id: traveler.id,
			name: traveler.name,
			photo: traveler.photo || '',
		};
		EXTRA_PEOPLE.push(person);
		people.push(person);
	}

	return people;
}

/** Mirror the wheel's checked circles into the trip's traveler list. */
function syncTravelersFromWheel(): void {
	const selected = new Set(getPeopleWheelSelectedIDs(WHEEL_ID));
	const travelers = WHEEL_PEOPLE.filter((person) => selected.has(person.id)).map((person) => {
		const entry: { id: string; name: string; photo?: string } = {
			id: person.id,
			name: person.name,
		};
		if (person.photo) entry.photo = person.photo;
		return entry;
	});

	setTravelersFn(travelers);
	TRAVELER_SELECT_OPTIONS = '';
	// Travelers live in JS state, outside the tracked form fields.
	markStagedChanges();
	refreshTransportationPersonSelects();
}

/** Open the person dialog used by the wheel's trailing "+" item. */
export function openAddTripPerson(): void {
	const properties = cloneObject(MESSAGE_PROPERTIES);
	properties.title = translate('account.people.new_title');
	properties.containers = getContainersInput();
	properties.fullscreen = true;
	properties.content = getNewTripPersonContent();
	properties.buttons = [
		{ type: 'cancel' },
		{ type: 'confirm', action: () => addTripPerson() },
	];

	displayFullMessage(properties);
	loadNewTripPersonListeners();
}

function getNewTripPersonContent(): string {
	return `
		<div class="people-editor-person">
			<span class="people-editor-avatar-slot" id="trip-person-avatar-slot">${getPersonAvatarHTML(
				{ photo: '' },
				'people-avatar people-editor-person-avatar',
			)}</span>
			<div class="people-editor-fields">
				<input type="text" class="people-editor-name" id="trip-person-name" maxlength="20"
					autocomplete="off"
					placeholder="${escapePeopleHTML(translate('account.people.name_placeholder'))}" />
				<input type="url" class="people-editor-photo" id="trip-person-photo"
					autocomplete="off"
					placeholder="${escapePeopleHTML(translate('account.people.photo_placeholder'))}" />
			</div>
		</div>
		<div class="nice-form-group travelers-save-future">
			<input type="checkbox" id="trip-person-save-future" />
			<label for="trip-person-save-future">${escapePeopleHTML(
				translate('trip.travelers.save_future'),
			)}</label>
			<p class="people-editor-hint">${escapePeopleHTML(
				translate('trip.travelers.save_future_hint'),
			)}</p>
		</div>
		<div class="nice-form-group" id="trip-person-error" style="display: none">
			<span class="red" id="trip-person-error-text"></span>
		</div>
	`;
}

function loadNewTripPersonListeners(): void {
	const nameInput = getID<HTMLInputElement>('trip-person-name');
	const photoInput = getID<HTMLInputElement>('trip-person-photo');
	const avatarSlot = getID('trip-person-avatar-slot');
	if (!nameInput || !photoInput) return;

	// Live avatar preview while the photo link is typed.
	photoInput.addEventListener('input', () => {
		if (!avatarSlot) return;
		avatarSlot.innerHTML = getPersonAvatarHTML(
			{ photo: photoInput.value.trim() },
			'people-avatar people-editor-person-avatar',
		);
	});

	nameInput.focus();
}

/** Validate the new person and add them to the wheel (selected). */
function addTripPerson(): void {
	const nameInput = getID<HTMLInputElement>('trip-person-name');
	const photoInput = getID<HTMLInputElement>('trip-person-photo');
	if (!nameInput || !photoInput) return;

	const name = nameInput.value.trim();
	const photo = photoInput.value.trim();
	const saveForFuture = getID<HTMLInputElement>('trip-person-save-future')?.checked === true;

	if (!name) {
		showTripPersonError(translate('account.people.name_required'));
		nameInput.focus();
		return;
	}
	if (photo && !isHttp(photo)) {
		showTripPersonError(translate('account.people.photo_invalid'));
		photoInput.focus();
		return;
	}
	if (isTripPersonNameTaken(name)) {
		showTripPersonError(translate('account.people.duplicate'));
		nameInput.focus();
		return;
	}

	const person: Person = { id: createTripPersonId(), name, photo };
	EXTRA_PEOPLE.push(person);
	if (saveForFuture) {
		// Registered by the save flow once the trip write succeeds.
		queuePersonRegistration(person);
	}

	closeMessage();

	const selected = getPeopleWheelSelectedIDs(WHEEL_ID);
	selected.push(person.id);
	renderTripTravelersWheel(selected);
	scrollWheelToEnd();
	syncTravelersFromWheel();
}

/** Names must stay unique across the wheel (registry + trip-only people). */
function isTripPersonNameTaken(name: string): boolean {
	const normalized = name.toLowerCase();
	const names = [...getCachedPeople(), ...EXTRA_PEOPLE, ...WHEEL_PEOPLE].map((person) =>
		person.name.toLowerCase(),
	);
	return names.includes(normalized);
}

/** Person id unique against the registry and everyone already in the wheel. */
function createTripPersonId(): string {
	const used = new Set([
		...getCachedPeople().map((person) => person.id),
		...EXTRA_PEOPLE.map((person) => person.id),
	]);
	let id = createPersonId();
	while (used.has(id)) {
		id = createPersonId();
	}
	return id;
}

function showTripPersonError(message: string): void {
	const container = getID('trip-person-error');
	const text = getID('trip-person-error-text');
	if (text) text.textContent = message;
	if (container) container.style.display = 'block';
}

/** Bring the newly added person's circle into view. */
function scrollWheelToEnd(): void {
	const track = getID(WHEEL_ID)?.querySelector<HTMLElement>('[data-wheel-track]');
	if (!track) return;
	requestAnimationFrame(() => track.scrollTo({ left: track.scrollWidth, behavior: 'smooth' }));
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

	const validTravelers = TRAVELERS.filter((traveler) => traveler?.name);
	let travelers = 0;

	if (getCachedPeople().length > 0) {
		// Registered people: circular wheel instead of checkboxes.
		result.insertAdjacentHTML(
			'beforeend',
			getPeopleWheelHTML(
				`${id}-wheel`,
				validTravelers,
				validTravelers.map((traveler) => traveler.id),
			),
		);
		travelers = validTravelers.length;
	} else {
		const fieldset = document.createElement('fieldset');
		fieldset.className = 'double-fieldset';

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
			input.setAttribute('data-name', traveler.name);
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
	}

	return travelers > 1 ? result.outerHTML : '';
}

export function enableAllTravelersFieldset(id) {
	const checkedData = [];
	for (const traveler of TRAVELERS) {
		checkedData.push({ id: traveler.id, name: traveler.name, isPresent: true });
	}
	updateTravelersFieldset(id, checkedData);
}

/** Select/deselect travelers inside either the wheel or the legacy checkboxes. */
export function updateTravelersFieldset(id, checkedData = []) {
	const container = getID(id);
	if (!container) return;

	container.querySelectorAll<HTMLInputElement>('input[type="checkbox"]').forEach((checkbox) => {
		const traveler = checkedData.find((t) => t.id === checkbox.value);

		checkbox.checked =
			traveler?.isPresent === undefined ? INCLUDE_LATE_TRAVELERS : traveler.isPresent;
		checkbox
			.closest<HTMLElement>('.people-wheel-item')
			?.classList.toggle('selected', checkbox.checked);
	});
}

export function getCheckedTravelersIDs(containerID) {
	const container = getID(containerID);
	if (!container) {
		return [];
	}
	const result = [];

	container.querySelectorAll<HTMLInputElement>('input[type="checkbox"]').forEach((checkbox) => {
		const label = checkbox
			.closest('.nice-form-group')
			?.querySelector<HTMLElement>('label.checkbox-label')?.innerText;
		result.push({
			id: checkbox.value,
			name: checkbox.getAttribute('data-name') || label || '',
			isPresent: checkbox.checked,
		});
	});

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

	const container = getID(id);
	const isValid = container
		? Array.from(container.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')).some(
				(checkbox) => checkbox.checked,
			)
		: false;

	if (!isValid) {
		mandatory.style.display = 'inline';
	}

	return isValid;
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
