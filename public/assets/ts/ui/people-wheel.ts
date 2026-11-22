// ======= People Wheel =======
//
// Reusable circular-avatar selector used wherever the app lets the owner pick
// people: the trip editor's travelers dialog and the itinerary entry dialog.
// Selection is backed by real checkbox inputs, so existing form-reading code
// keeps working and keyboard/AT users get native checkbox semantics.

import { getID } from '../utils/dom.js';
import { translate } from '../i18n/translation.js';
import { escapePeopleHTML, getPersonAvatarHTML } from '../utils/people-avatars.js';
import type { Person } from '../data/services/people.service.js';

export { getPersonAvatarHTML };

const escapeHTML = escapePeopleHTML;

function escapeStyleURL(value: any): string {
	return String(value ?? '')
		.replace(/["'\\\n\r]/g, '')
		.trim();
}

/** Trailing "+" item rendered inside the wheel track. */
export interface PeopleWheelAddItem {
	/** Visible label (also used as the accessible name). */
	label: string;
	/** data-action fired by the delegated click handler. */
	action: string;
}

/**
 * HTML for a wheel of people. `id` is the wheel container id — call
 * `initPeopleWheel(id)` after inserting the markup into the DOM.
 *
 * When `addItem` is provided, a "+" circle is appended after the people so the
 * same wheel can also create new people (trip editor).
 */
export function getPeopleWheelHTML(
	id: string,
	people: Person[],
	selectedIds: string[] = [],
	selectable = true,
	addItem?: PeopleWheelAddItem,
): string {
	if (!people?.length && !addItem) return '';

	const selected = new Set(selectedIds);
	const items = people
		.map((person) => {
			const checked = selected.has(person.id);
			const photo = escapeStyleURL(person.photo);
			const style = photo ? ` style="background-image: url('${photo}')"` : '';
			const check = selectable
				? `<span class="people-wheel-check"><i class="iconify" data-icon="material-symbols:check"></i></span>`
				: '';

			return `
				<label class="people-wheel-item${checked ? ' selected' : ''}" data-person-id="${escapeHTML(person.id)}" title="${escapeHTML(person.name)}">
					${selectable ? `<input type="checkbox" value="${escapeHTML(person.id)}" data-name="${escapeHTML(person.name)}"${checked ? ' checked' : ''}>` : ''}
					<span class="people-wheel-avatar${photo ? ' has-photo' : ''}"${style}>
						${check}
					</span>
					<span class="people-wheel-name">${escapeHTML(person.name)}</span>
				</label>
			`;
		})
		.join('');

	const addButton = addItem
		? `
				<button type="button" class="people-wheel-item people-wheel-add" data-action="${escapeHTML(addItem.action)}"
					aria-label="${escapeHTML(addItem.label)}" title="${escapeHTML(addItem.label)}">
					<span class="people-wheel-add-circle"><i class="iconify" data-icon="material-symbols:add"></i></span>
					<span class="people-wheel-name">${escapeHTML(addItem.label)}</span>
				</button>
			`
		: '';

	return `
		<div class="people-wheel" id="${escapeHTML(id)}" role="group" aria-label="${escapeHTML(translate('trip.travelers.title'))}">
			<button type="button" class="people-wheel-spin" data-wheel-scroll="-1" aria-label="${escapeHTML(translate('trip.travelers.previous'))}">
				<i class="iconify" data-icon="material-symbols:chevron-left"></i>
			</button>
			<div class="people-wheel-track" data-wheel-track>
				${items}${addButton}
			</div>
			<button type="button" class="people-wheel-spin" data-wheel-scroll="1" aria-label="${escapeHTML(translate('trip.travelers.next'))}">
				<i class="iconify" data-icon="material-symbols:chevron-right"></i>
			</button>
		</div>
	`;
}

/** Wire the wheel's spin buttons and keep the selected state in sync. */
export function initPeopleWheel(id: string): void {
	const wheel = getID(id) as HTMLElement | null;
	if (!wheel || wheel.dataset.wheelReady === 'true') return;
	wheel.dataset.wheelReady = 'true';

	const track = wheel.querySelector<HTMLElement>('[data-wheel-track]');
	if (!track) return;

	wheel.querySelectorAll<HTMLElement>('[data-wheel-scroll]').forEach((button) => {
		button.addEventListener('click', () => {
			const direction = Number(button.dataset.wheelScroll) || 1;
			track.scrollBy({ left: direction * Math.max(120, track.clientWidth * 0.7), behavior: 'smooth' });
		});
	});

	track.addEventListener('change', (event) => {
		const input = (event.target as Element)?.closest<HTMLInputElement>('input[type="checkbox"]');
		if (!input) return;
		input.closest<HTMLElement>('.people-wheel-item')?.classList.toggle('selected', input.checked);
	});

	updatePeopleWheelSpinState(wheel);
	track.addEventListener('scroll', () => updatePeopleWheelSpinState(wheel), { passive: true });
}

function updatePeopleWheelSpinState(wheel: HTMLElement): void {
	const track = wheel.querySelector<HTMLElement>('[data-wheel-track]');
	if (!track) return;

	const prev = wheel.querySelector<HTMLButtonElement>('[data-wheel-scroll="-1"]');
	const next = wheel.querySelector<HTMLButtonElement>('[data-wheel-scroll="1"]');
	const atStart = track.scrollLeft <= 2;
	const atEnd = track.scrollLeft + track.clientWidth >= track.scrollWidth - 2;

	if (prev) prev.disabled = atStart;
	if (next) next.disabled = atEnd;
}

/** Selected person ids in wheel order. */
export function getPeopleWheelSelectedIDs(id: string): string[] {
	const wheel = getID(id);
	if (!wheel) return [];
	return Array.from(wheel.querySelectorAll<HTMLInputElement>('input[type="checkbox"]:checked')).map(
		(input) => input.value,
	);
}

/** Select exactly the given person ids in the wheel. */
export function setPeopleWheelSelectedIDs(id: string, ids: string[]): void {
	const wheel = getID(id);
	if (!wheel) return;
	const selected = new Set(ids);
	wheel.querySelectorAll<HTMLInputElement>('input[type="checkbox"]').forEach((input) => {
		input.checked = selected.has(input.value);
		input.closest<HTMLElement>('.people-wheel-item')?.classList.toggle('selected', input.checked);
	});
}
