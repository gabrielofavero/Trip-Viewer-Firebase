// ======= People Manager (Settings) =======
//
// Account-level registry of people (name + photo). New people can only be
// registered here — the trip editor simply picks from this list.
//
// The Settings tab renders that registry as a wheel of circular avatars: tap
// a circle to edit that person alone, or the "+" circle at the end to add a
// new one. Each person is saved individually from its own dialog.

import {
	createPersonId,
	getCachedPeople,
	type Person,
	savePeople,
	seedPeople,
} from '../../../data/services/people.service.js';
import { translate } from '../../../i18n/translation.js';
import { isHttp } from '../../../ui/fields.js';
import { getPersonAvatarHTML } from '../../../ui/people-wheel.js';
import { cloneObject, getID } from '../../../utils/dom.js';
import {
	closeMessage,
	displayError,
	displayFullMessage,
	displayPrompt,
	getContainersInput,
	MESSAGE_PROPERTIES,
	openToast,
} from '../../../utils/messages.js';

function escapeHTML(value: unknown): string {
	return String(value ?? '')
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

/** Render the people wheel inline in the Settings tab. */
export function loadSettingsPeople(): void {
	const grid = getID('settings-people-grid');
	if (!grid) return;

	const cards = getCachedPeople().map((person) => getPersonCardHTML(person)).join('');
	grid.innerHTML = `${cards}${getAddPersonCardHTML()}`;
}

function getPersonCardHTML(person: Person): string {
	return `
		<button type="button" class="people-editor-card" data-action="edit-person"
			data-person-id="${escapeHTML(person.id)}"
			aria-label="${escapeHTML(person.name)}" title="${escapeHTML(person.name)}">
			${getPersonAvatarHTML(person, 'people-avatar people-editor-avatar')}
			<span class="people-editor-card-name">${escapeHTML(person.name)}</span>
		</button>
	`;
}

/** Trailing "+" card used to register one new person at a time. */
function getAddPersonCardHTML(): string {
	return `
		<button type="button" class="people-editor-card people-editor-add" data-action="add-person"
			aria-label="${escapeHTML(translate('account.people.add'))}"
			title="${escapeHTML(translate('account.people.add'))}">
			<span class="people-editor-add-circle"><i class="iconify" data-icon="material-symbols:add"></i></span>
			<span class="people-editor-card-name">${escapeHTML(translate('labels.add'))}</span>
		</button>
	`;
}

/** Open the single-person dialog (also used to add a new person). */
export function openPersonDialog(personId: string | null, draft?: Person): void {
	const existing = personId ? getCachedPeople().find((person) => person.id === personId) : undefined;
	const person: Person = draft ?? existing ?? { id: createPersonId(), name: '', photo: '' };

	const properties = cloneObject(MESSAGE_PROPERTIES);
	properties.title = translate(existing ? 'account.people.edit_title' : 'account.people.new_title');
	properties.containers = getContainersInput();
	properties.fullscreen = true;
	properties.content = getPersonEditorContent(person);
	properties.buttons = [
		...(existing ? [{ type: 'delete', action: () => confirmRemovePerson(person) }] : []),
		{ type: 'cancel' },
		{ type: 'confirm', action: () => savePerson(person) },
	];

	displayFullMessage(properties);
	loadPersonEditorListeners(!existing);
}

function getPersonEditorContent(person: Person): string {
	return `
		<div class="people-editor-person">
			<span class="people-editor-avatar-slot" id="people-editor-avatar-slot">${getPersonAvatarHTML(
				person,
				'people-avatar people-editor-person-avatar',
			)}</span>
			<div class="people-editor-fields">
				<input type="text" class="people-editor-name" id="people-editor-name" maxlength="20"
					autocomplete="off"
					placeholder="${escapeHTML(translate('account.people.name_placeholder'))}"
					value="${escapeHTML(person.name)}" />
				<input type="url" class="people-editor-photo" id="people-editor-photo"
					autocomplete="off"
					placeholder="${escapeHTML(translate('account.people.photo_placeholder'))}"
					value="${escapeHTML(person.photo)}" />
			</div>
		</div>
		<div class="nice-form-group" id="people-editor-error" style="display: none">
			<span class="red" id="people-editor-error-text"></span>
		</div>
		<p class="people-editor-hint">${translate('account.people.hint')}</p>
	`;
}

function loadPersonEditorListeners(focusName: boolean): void {
	const nameInput = getID<HTMLInputElement>('people-editor-name');
	const photoInput = getID<HTMLInputElement>('people-editor-photo');
	const avatarSlot = getID('people-editor-avatar-slot');
	if (!nameInput || !photoInput) return;

	// Live avatar preview while the photo link is typed.
	photoInput.addEventListener('input', () => {
		if (!avatarSlot) return;
		avatarSlot.innerHTML = getPersonAvatarHTML(
			{ photo: photoInput.value.trim() },
			'people-avatar people-editor-person-avatar',
		);
	});

	if (focusName) nameInput.focus();
}

/** Validate and persist the single person being edited. */
async function savePerson(person: Person): Promise<void> {
	const nameInput = getID<HTMLInputElement>('people-editor-name');
	const photoInput = getID<HTMLInputElement>('people-editor-photo');
	if (!nameInput || !photoInput) return;

	const name = nameInput.value.trim();
	const photo = photoInput.value.trim();

	if (!name) {
		showPeopleEditorError(translate('account.people.name_required'));
		nameInput.focus();
		return;
	}
	if (photo && !isHttp(photo)) {
		showPeopleEditorError(translate('account.people.photo_invalid'));
		photoInput.focus();
		return;
	}

	const people = getCachedPeople();
	const duplicated = people.some(
		(other) => other.id !== person.id && other.name.toLowerCase() === name.toLowerCase(),
	);
	if (duplicated) {
		showPeopleEditorError(translate('account.people.duplicate'));
		nameInput.focus();
		return;
	}

	const entry: Person = { id: person.id, name, photo };
	const exists = people.some((other) => other.id === person.id);
	const next = exists
		? people.map((other) => (other.id === person.id ? entry : other))
		: [...people, entry];

	try {
		const success = await savePeople(next);
		if (!success) {
			// savePeople updates the session cache before the write — roll it
			// back so the grid never shows an unsaved person.
			seedPeople(people);
			showPeopleEditorError(translate('account.people.error_save'));
			return;
		}

		loadSettingsPeople();
		closeMessage();
		openToast(translate('account.people.saved'));
	} catch (error) {
		seedPeople(people);
		displayError(error);
	}
}

/** Ask for confirmation before deleting a registered person. */
function confirmRemovePerson(person: Person): void {
	const draft = readPersonEditorDraft(person);
	displayPrompt({
		title: translate('account.people.remove_title'),
		content: translate('account.people.remove_message', { name: escapeHTML(draft.name) }),
		critical: true,
		yesAction: () => removePerson(person.id),
		noAction: () => openPersonDialog(person.id, draft),
	});
}

/** Current field values, kept when the delete prompt is dismissed. */
function readPersonEditorDraft(person: Person): Person {
	const nameInput = getID<HTMLInputElement>('people-editor-name');
	const photoInput = getID<HTMLInputElement>('people-editor-photo');
	return {
		id: person.id,
		name: (nameInput?.value ?? person.name).trim(),
		photo: (photoInput?.value ?? person.photo).trim(),
	};
}

async function removePerson(personId: string): Promise<void> {
	const previous = getCachedPeople();
	const next = previous.filter((person) => person.id !== personId);

	try {
		const success = await savePeople(next);
		if (!success) {
			seedPeople(previous);
			openPersonDialog(personId);
			showPeopleEditorError(translate('account.people.error_save'));
			return;
		}

		loadSettingsPeople();
		closeMessage();
		openToast(translate('account.people.removed'));
	} catch (error) {
		seedPeople(previous);
		displayError(error);
	}
}

function showPeopleEditorError(message: string): void {
	const container = getID('people-editor-error');
	const text = getID('people-editor-error-text');
	if (text) text.textContent = message;
	if (container) container.style.display = 'block';
}
