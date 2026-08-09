// ======= Places API — Step 2: Details (P7) =======
// Renders the fetched place's fields as disabled (read-only) preview inputs,
// each paired with an "Update with this info" checkbox (checked by default).
//
// This module self-registers (at import time):
//   - the 'details' step renderer via registerStepRenderer(),
//   - the 'places-details-continue' / 'places-details-retry' click actions via
//     registerActions() (data-action delegation, see ui/actions.ts).
//
// Behavior (docs/ai-analysis/6-places-api-edit-destination.md §5 P7):
//   - On entering the step, the place id is resolved from the selected search
//     result (P6 stores `placeDetailsCandidate`) OR from the entry's
//     pre-existing `placeAPI.id` (Open Question 10 — jump straight to details).
//   - Calls getPlace(id) under the dialog-scoped loading overlay
//     (withDialogLoading); the fetched PlaceDetails is kept in cross-step data
//     for P8 (closed/photos) and P9 (apply/persist).
//   - Renders each FIELD_KEYS field as a disabled input + an "Update with this
//     info" checkbox (all checked by default). Description is displayed as the
//     localized string the API returned for the active language only — no
//     language toggle (the route returns the requested language only).
//   - Back returns to search (handled by the shell's goBack()).
//   - Continue collects the checked field set into cross-step data and
//     advances to the next step ('closed' when the place is no longer
//     operational, else 'photos' — P8 registers those step renderers).
//
// References:
// - docs/ai-analysis/6-places-api-edit-destination.md (§4, P7)
// - places/places-dialog.ts (P5 shell: registerStepRenderer, withDialogLoading)
// - places/places-apply.ts (P3: FIELD_KEYS, PlaceFieldKey, buildClosedState)
// - data/services/places-api.service.ts (P1: getPlace + MOCK fixtures)

import { registerActions } from '../ui/actions.js';
import { getLanguagePackName, translate } from '../i18n/translation.js';
import { getPlace } from '../data/services/places-api.service.js';
import type { PlaceDetails, PlaceSearchResult } from '../models/places-api.model.js';
import { buildClosedState, FIELD_KEYS, type PlaceFieldKey } from './places-apply.js';
import {
	getStepData,
	getStepLoadingMessage,
	goTo,
	registerStepRenderer,
	setStepData,
	withDialogLoading,
} from './places-dialog.js';
import type { PlacesDialogContext } from './places-dialog.js';
import { getID } from '../utils/dom.js';

/** Cross-step data key for the fetched full place details (P8/P9 read it). */
export const DETAILS_KEY = 'placeDetails';
/** Cross-step data key for the fields the user checked (P9 reads it). */
export const CHECKED_KEY = 'checkedFields';
/** Key P6 uses to store the selected search result. */
const CANDIDATE_KEY = 'placeDetailsCandidate';

/** Display label key per entry field (reuses the edit form's labels). */
const FIELD_LABEL_KEYS: Record<PlaceFieldKey, string> = {
	name: 'labels.name',
	website: 'labels.social.website',
	rating: 'labels.priority',
	price: 'labels.cost',
	description: 'labels.description.title',
	emoji: 'labels.emoji',
	map: 'labels.customization.links.map',
	region: 'labels.region',
	instagram: 'labels.social.instagram',
};

// ------------------------------------------------------------------
// Step renderer
// ------------------------------------------------------------------

/**
 * Render the 'details' step: fetch the full place info under the scoped
 * loading overlay, then render the read-only field previews + checkboxes.
 */
async function renderDetailsStep(context: PlacesDialogContext): Promise<string> {
	// Resolve the place id: the selected search result, else the entry's
	// previously-saved placeAPI.id (jump straight to details, Open Question 10).
	const candidate = getStepData<PlaceSearchResult>(CANDIDATE_KEY);
	const placeId = candidate?.id ?? context.placeAPI?.id ?? '';
	if (!placeId) {
		return renderError();
	}

	let details: PlaceDetails | null;
	try {
		// Firebase token + lang are resolved by the service; photos default to
		// true here because the place was just searched (new — no saved id yet).
		details = await withDialogLoading(
			(signal) => getPlace(placeId, { signal }),
			getStepLoadingMessage('details'),
		);
	} catch (error) {
		// Non-abort failure — surface inline so the user can retry in place.
		console.error('[places-details] Failed to load place', error);
		return renderError(error);
	}

	if (details === null) return ''; // cancelled (dialog closed / X clicked)

	setStepData(DETAILS_KEY, details);
	return renderDetailsHTML(details);
}

/** Render the field previews (disabled inputs) + checkboxes + footer. */
function renderDetailsHTML(details: PlaceDetails): string {
	const lang = getLanguagePackName();

	const rows = FIELD_KEYS.map((field) => {
		const label = translate(FIELD_LABEL_KEYS[field]);
		const value = getFieldDisplayValue(details, field);
		const caption =
			field === 'description' && value !== ''
				? `<div class="caption">${escapeHtml(
						translate('labels.description.lang', {
							lang: translate(`labels.language.${lang}`),
						}),
					)}</div>`
				: '';
		return `
		<div class="nice-form-group places-detail-field">
			<label>${escapeHtml(label)}</label>
			<input type="text" class="places-detail-input" value="${escapeAttr(value)}" disabled />
			${caption}
			<label class="places-detail-check">
				<input type="checkbox" class="places-detail-check-input" data-field="${field}" checked />
				<span>${translate('placesApi.details.updateLabel')}</span>
			</label>
		</div>`;
	}).join('');

	return `
	<div class="places-details">
		<div class="places-details-fields">${rows}</div>
		<div class="places-details-footer">
			<button type="button" class="places-details-continue" data-action="places-details-continue">
				${translate('placesApi.details.continue')}
			</button>
		</div>
	</div>`;
}

/** Read the display value for a field from the fetched place ('' when empty). */
function getFieldDisplayValue(details: PlaceDetails, field: PlaceFieldKey): string {
	const value = details[field];
	return typeof value === 'string' ? value : '';
}

/** Render the inline error state (keeps the dialog open for a retry). */
function renderError(error?: unknown): string {
	const message =
		error instanceof Error && error.message ? error.message : translate('placesApi.details.error');
	return `
	<div class="places-detail-error">
		<span>${escapeHtml(message)}</span>
		<button type="button" class="btn btn-basic" data-action="places-details-retry">
			${translate('labels.try_again')}
		</button>
	</div>`;
}

// ------------------------------------------------------------------
// Continue + checked-field tracking
// ------------------------------------------------------------------

/**
 * Collect the fields the user checked ("Update with this info"), store them
 * with the fetched details, and advance to the next step.
 */
function handleContinue(): void {
	const details = getStepData<PlaceDetails>(DETAILS_KEY);
	if (!details) return;

	const checked = collectCheckedFields();
	setStepData(CHECKED_KEY, checked);

	// Closed places branch off to the 'closed' step (P8); everything else
	// continues to the photos step (P8). The shell shows a placeholder until
	// P8 registers those renderers.
	const { closed } = buildClosedState(details);
	void goTo(closed ? 'closed' : 'photos');
}

/** Read which "Update with this info" checkboxes are checked. */
function collectCheckedFields(): PlaceFieldKey[] {
	const checked: PlaceFieldKey[] = [];
	getID('places-dialog')?.querySelectorAll<HTMLInputElement>('.places-detail-check-input')?.forEach(
		(input) => {
			const field = input.getAttribute('data-field');
			if (input.checked && field && (FIELD_KEYS as readonly string[]).includes(field)) {
				checked.push(field as PlaceFieldKey);
			}
		},
	);
	return checked;
}

// ------------------------------------------------------------------
// Event wiring
// ------------------------------------------------------------------

/** Register the delegated click actions + the renderer (runs once on import). */
function registerDetailsActions(): void {
	registerActions({
		'places-details-continue': () => {
			handleContinue();
		},
		'places-details-retry': () => {
			// Re-run the step renderer. goTo('details') while already on
			// 'details' does not push history, so this is a clean re-render.
			void goTo('details');
		},
	});
}

// ------------------------------------------------------------------
// Init (self-registration)
// ------------------------------------------------------------------

registerStepRenderer('details', renderDetailsStep);
registerDetailsActions();

// ------------------------------------------------------------------
// HTML escaping helpers (local copies, same pattern as backup modules)
// ------------------------------------------------------------------

function escapeHtml(value: string): string {
	const div = document.createElement('div');
	div.textContent = value;
	return div.innerHTML;
}

function escapeAttr(value: string): string {
	return escapeHtml(value).replace(/"/g, '&quot;');
}
