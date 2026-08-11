// ======= Places API — Linked-place decision (P6b) =======
// Shown when the entry is already linked to a Google place (has `placeAPI.id`).
// Lets the user choose between:
//   - "Update this place"      → keeps the id, fetches details WITHOUT photos
//                                (free main key) and applies directly.
//   - "Find a different place" → goes through the normal search flow.
//
// This module self-registers (at import time):
//   - the 'linked' step renderer via registerStepRenderer(),
//   - the 'places-linked-update' / 'places-linked-search' click actions via
//     registerActions() (data-action delegation, see ui/actions.ts).
//
// References:
// - docs/ai-analysis/6-places-api-edit-destination.md (§4, P6)
// - places/places-dialog.ts (P5 shell: registerStepRenderer, goTo)
// - places/places-details-step.ts (P7: UPDATE_EXISTING_KEY)

import { registerActions } from '../ui/actions.js';
import { translate } from '../i18n/translation.js';
import { goTo, registerStepRenderer, setStepData } from './places-dialog.js';
import type { PlacesDialogContext } from './places-dialog.js';
import { UPDATE_EXISTING_KEY } from './places-details-step.js';

// ------------------------------------------------------------------
// Step renderer
// ------------------------------------------------------------------

/** Render the 'linked' step: update this place vs find a different place. */
function renderLinkedStep(_context: PlacesDialogContext): string {
	return `
	<div class="places-linked">
		<p class="places-linked-message">${escapeHtml(translate('placesApi.linked.message'))}</p>
		<div class="places-linked-options">
			<button type="button" class="places-linked-option" data-action="places-linked-update">
				<span class="places-linked-option-title">${escapeHtml(translate('placesApi.linked.update'))}</span>
				<span class="places-linked-option-caption">${escapeHtml(translate('placesApi.linked.updateHint'))}</span>
			</button>
			<button type="button" class="places-linked-option" data-action="places-linked-search">
				<span class="places-linked-option-title">${escapeHtml(translate('placesApi.linked.search'))}</span>
				<span class="places-linked-option-caption">${escapeHtml(translate('placesApi.linked.searchHint'))}</span>
			</button>
		</div>
	</div>`;
}

// ------------------------------------------------------------------
// Actions
// ------------------------------------------------------------------

/** Keep the linked id: refresh its info (details, no photos) + apply. */
function handleLinkedUpdate(): void {
	setStepData(UPDATE_EXISTING_KEY, true);
	void goTo('details');
}

/** Map to a different place: go through the normal search flow. */
function handleLinkedSearch(): void {
	void goTo('search');
}

// ------------------------------------------------------------------
// Event wiring
// ------------------------------------------------------------------

/** Register the delegated click actions + the renderer (runs once on import). */
function registerLinkedActions(): void {
	registerActions({
		'places-linked-update': () => handleLinkedUpdate(),
		'places-linked-search': () => handleLinkedSearch(),
	});
}

// ------------------------------------------------------------------
// Init (self-registration)
// ------------------------------------------------------------------

registerStepRenderer('linked', renderLinkedStep);
registerLinkedActions();

// ------------------------------------------------------------------
// HTML escaping helpers (local copies, same pattern as backup modules)
// ------------------------------------------------------------------

function escapeHtml(value: string): string {
	const div = document.createElement('div');
	div.textContent = value;
	return div.innerHTML;
}
