// ======= Places — Import source selection (first step) =======
// The FIRST screen of the "Import with maps" dialog. Asks the user how they
// want to import the place:
//   - "Local (gmaps scraper)"  → the local import step (paste a Maps link).
//   - "Via Places API"         → the existing flow (search, or the 'linked'
//                                decision when the entry already has a place id).
//
// Styling reuses the 'linked' step option cards (.places-linked-options /
// .places-linked-option) so this prompt looks exactly like the "update this
// place vs find a different one" screen — same visual language.
//
// This module self-registers (at import time):
//   - the 'source' step renderer via registerStepRenderer(),
//   - the 'places-source-local' / 'places-source-api' click actions.
//
// The same markup is exported as getSourceOptionsHTML() so the bulk "Update
// all" flow (edit-destination.ts) can show the identical prompt with its own
// actions — one source of truth for the option cards.
//
// The "My Maps" card is BULK-ONLY (it's a batch operation, not a per-item
// import): getSourceOptionsHTML() renders it only when the caller passes the
// optional `mymapsAction`. The per-item dialog never passes it.

import { registerActions } from '../ui/actions.js';
import { translate } from '../i18n/translation.js';
import { getDialogContext, goTo, registerStepRenderer } from './places-dialog.js';
import type { PlacesDialogContext } from './places-dialog.js';

/** Per-item dialog action names (registered here). */
export const SOURCE_LOCAL_ACTION = 'places-source-local';
export const SOURCE_API_ACTION = 'places-source-api';
/** Bulk "Update all" prompt action names (registered in edit-destination.ts). */
export const SOURCE_LOCAL_BULK_ACTION = 'places-source-local-bulk';
export const SOURCE_API_BULK_ACTION = 'places-source-api-bulk';
export const SOURCE_MYMAPS_BULK_ACTION = 'places-source-mymaps-bulk';

/**
 * The source-selection option cards. `localAction`/`apiAction` point the
 * buttons at the caller's handlers — the per-item dialog uses the defaults,
 * the bulk flow passes bulk-specific actions. `mymapsAction` is OPTIONAL and
 * BULK-ONLY: the "My Maps" card (a batch operation) is rendered only when the
 * caller passes an action — the per-item dialog must never show it.
 */
export function getSourceOptionsHTML(
	localAction = SOURCE_LOCAL_ACTION,
	apiAction = SOURCE_API_ACTION,
	mymapsAction?: string,
): string {
	return `
	<div class="places-source">
		<p class="places-linked-message">${escapeHtml(translate('placesApi.source.message'))}</p>
		<div class="places-linked-options">
			<button type="button" class="places-linked-option" data-action="${localAction}">
				<span class="places-linked-option-title">${escapeHtml(
					translate('placesApi.source.local'),
				)}</span>
				<span class="places-linked-option-caption">${escapeHtml(
					translate('placesApi.source.localHint'),
				)}</span>
			</button>
			<button type="button" class="places-linked-option" data-action="${apiAction}">
				<span class="places-linked-option-title">${escapeHtml(
					translate('placesApi.source.api'),
				)}</span>
				<span class="places-linked-option-caption">${escapeHtml(
					translate('placesApi.source.apiHint'),
				)}</span>
			</button>
			${
				mymapsAction
					? `<button type="button" class="places-linked-option" data-action="${mymapsAction}">
				<span class="places-linked-option-title">${escapeHtml(
					translate('placesApi.source.mymaps'),
				)}</span>
				<span class="places-linked-option-caption">${escapeHtml(
					translate('placesApi.source.mymapsHint'),
				)}</span>
			</button>`
					: ''
			}
		</div>
	</div>`;
}

/** Render the 'source' step (per-item dialog). */
function renderSourceStep(_context: PlacesDialogContext): string {
	return getSourceOptionsHTML();
}

/** "Local (gmaps scraper)" → the maps-link import step. */
function handleSourceLocal(): void {
	void goTo('local');
}

/** "Via Places API" → linked decision when an id exists, else search. */
function handleSourceApi(): void {
	const context = getDialogContext();
	if (context?.placeAPI?.id) {
		void goTo('linked');
	} else {
		void goTo('search');
	}
}

// ------------------------------------------------------------------
// Init (self-registration)
// ------------------------------------------------------------------

registerStepRenderer('source', renderSourceStep);
registerActions({
	[SOURCE_LOCAL_ACTION]: () => handleSourceLocal(),
	[SOURCE_API_ACTION]: () => handleSourceApi(),
});

// ------------------------------------------------------------------
// HTML escaping helpers (local copies, same pattern as the step modules)
// ------------------------------------------------------------------

function escapeHtml(value: string): string {
	const div = document.createElement('div');
	div.textContent = value;
	return div.innerHTML;
}
