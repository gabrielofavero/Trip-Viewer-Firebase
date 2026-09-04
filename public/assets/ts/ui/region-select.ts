// ======= Multi-Region Select Helper =======
// Shared UI helper for editing a destination entry's `regions` array.
//
// Replaces the old single-value region dynamic-select with a pill-based
// editor: known regions are offered in an <select> adder; picking one (or
// typing a custom value) appends a removable pill. The pills are the source
// of truth — read them with getRegionPills() when building the saved object.
//
// Used by:
//   - edit/destination.html (pages/edit-destination)
//   - destination.html built-in editor (pages/destination)
//
// ID convention:
//   select  `${prefix}-region-select-${j}`  →  pills `${prefix}-regions-${j}`
//   input   `${prefix}-region-input-${j}`
// (`prefix` is the category on the edit page, and `edit` on destination.html.)

import { getID } from '../utils/dom.js';
import { translate } from '../i18n/translation.js';

interface RegionSelectBinding {
	selectId: string;
	inputId: string;
	containerId: string;
	// True while the adder is showing its free-text input (the user picked
	// "Other", or there are no known regions to offer as options yet).
	inputMode: boolean;
}

const BINDINGS: RegionSelectBinding[] = [];
let KNOWN_VALUES: Set<string> = new Set();

/** Select value that opens the free-text input. */
const OTHER_VALUE = 'other';

function containerIdFromSelect(selectId: string): string {
	return selectId.replace('-region-select-', '-regions-');
}

function escapeHtml(value: string): string {
	return String(value)
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

// -----------------------------------------------------------
// Registry
// -----------------------------------------------------------

/** Reset all bindings + known values (call once on page load). */
export function resetRegionSelects(): void {
	BINDINGS.length = 0;
	KNOWN_VALUES = new Set();
}

/** Register a select + free-text input as a region adder. */
export function registerRegionSelect(selectId: string, inputId: string): void {
	const containerId = containerIdFromSelect(selectId);
	BINDINGS.push({ selectId, inputId, containerId, inputMode: false });

	const select = getID<HTMLSelectElement>(selectId);
	const input = getID<HTMLInputElement>(inputId);
	if (!select || !input) return;

	select.addEventListener('change', () => {
		const value = select.value;
		if (value === OTHER_VALUE) {
			// Free-text mode — stay on the input so a custom region can be
			// typed (the rebuild must not immediately re-hide it).
			setInputMode(selectId, true);
			buildRegionSelects();
			input.focus();
		} else if (value) {
			addRegionPill(containerId, value);
			addKnownValue(value);
			setInputMode(selectId, false);
			buildRegionSelects();
		}
	});

	input.addEventListener('change', () => commitAdderInput(select, input, containerId));
	input.addEventListener('keydown', (event: KeyboardEvent) => {
		if (event.key === 'Enter') {
			event.preventDefault();
			commitAdderInput(select, input, containerId);
		}
	});
}

/** Mark a binding as showing its free-text input (or not). */
function setInputMode(selectId: string, inputMode: boolean): void {
	const binding = BINDINGS.find((b) => b.selectId === selectId);
	if (binding) binding.inputMode = inputMode;
}

function commitAdderInput(
	select: HTMLSelectElement,
	input: HTMLInputElement,
	containerId: string,
): void {
	const value = (input.value || '').trim();
	if (value) {
		addRegionPill(containerId, value);
		addKnownValue(value);
	}
	// Back to the known-values select — unless no known regions exist, in
	// which case buildRegionSelects() keeps the free-text input visible.
	setInputMode(select.id, false);
	buildRegionSelects();
}

/** Remove a binding (when its accordion item is removed/moved). */
export function unregisterRegionSelect(selectId: string): void {
	const index = BINDINGS.findIndex((binding) => binding.selectId === selectId);
	if (index >= 0) BINDINGS.splice(index, 1);
}

// -----------------------------------------------------------
// Known values (adder options)
// -----------------------------------------------------------

export function addKnownValue(value: unknown): void {
	if (typeof value === 'string' && value.trim()) {
		KNOWN_VALUES.add(value.trim());
	}
}

export function addKnownValues(values: unknown): void {
	if (Array.isArray(values)) {
		for (const value of values) addKnownValue(value);
	} else {
		addKnownValue(values);
	}
}

/** Rebuild every adder's options from the known-value set. */
export function buildRegionSelects(): void {
	const optionsHTML = buildOptionsHTML();
	const hasKnownValues = KNOWN_VALUES.size > 0;
	for (const binding of BINDINGS) {
		const { selectId, inputId } = binding;
		const select = getID<HTMLSelectElement>(selectId);
		if (!select) continue;
		const input = getID<HTMLInputElement>(inputId);

		select.innerHTML = optionsHTML;
		select.value = '';

		// Free-text mode: the user picked "Other", or there are no known
		// regions to list — a select holding only "Other" is useless, so show
		// the input directly instead.
		if (binding.inputMode || !hasKnownValues) {
			select.style.display = 'none';
			if (input) input.style.display = 'block';
			continue;
		}

		select.style.display = 'block';
		if (input) {
			input.value = '';
			input.style.display = 'none';
		}
	}
}

function buildOptionsHTML(): string {
	let html = `<option value="">${translate('labels.select')}</option>`;
	for (const value of Array.from(KNOWN_VALUES).sort((a, b) => a.localeCompare(b))) {
		html += `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`;
	}
	html += `<option value="${OTHER_VALUE}">${translate('labels.other')}</option>`;
	return html;
}

// -----------------------------------------------------------
// Pills
// -----------------------------------------------------------

/** Read the current region pills in a container (source of truth on save). */
export function getRegionPills(containerId: string): string[] {
	const container = getID<HTMLElement>(containerId);
	if (!container) return [];
	return Array.from(container.querySelectorAll<HTMLElement>('.region-pill'))
		.map((pill) => pill.getAttribute('data-region') || '')
		.map((value) => value.trim())
		.filter(Boolean);
}

/** Render pills for a container. A delegated click handles removal. */
export function renderRegionPills(containerId: string, regions: unknown): void {
	const container = getID<HTMLElement>(containerId);
	if (!container) return;

	const list = Array.isArray(regions) ? regions : [regions];
	const values = list
		.map((value) => (value == null ? '' : String(value).trim()))
		.filter(Boolean);

	container.innerHTML = values
		.map(
			(value) => `
        <span class="region-pill" data-region="${escapeHtml(value)}">
          ${escapeHtml(value)}
          <button type="button" class="region-pill-remove" data-region="${escapeHtml(value)}" aria-label="${escapeHtml(value)}">×</button>
        </span>`,
		)
		.join('');

	// Delegated removal — survives innerHTML re-renders without stacking.
	container.onclick = (event: MouseEvent) => {
		const target = event.target as HTMLElement | null;
		const removeBtn = target?.closest<HTMLElement>('.region-pill-remove');
		if (!removeBtn) return;
		event.stopPropagation();
		removeRegionPill(containerId, removeBtn.getAttribute('data-region') || '');
	};
}

export function addRegionPill(containerId: string, value: string): string[] {
	const regions = getRegionPills(containerId);
	const trimmed = (value || '').trim();
	if (trimmed && !regions.includes(trimmed)) regions.push(trimmed);
	renderRegionPills(containerId, regions);
	return regions;
}

export function removeRegionPill(containerId: string, value: string): string[] {
	const regions = getRegionPills(containerId).filter((region) => region !== value);
	renderRegionPills(containerId, regions);
	return regions;
}
