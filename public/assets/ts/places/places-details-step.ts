// ======= Places API — Step 2: Details (P7) =======
// Renders the fetched place's fields as disabled (read-only) preview inputs,
// each paired with an "Update with this info" checkbox (checked by default).
//
// This module self-registers (at import time):
//   - the 'details' step renderer via registerStepRenderer(),
//   - the 'places-details-continue' / 'places-details-retry' click actions via
//     registerActions() (data-action delegation, see ui/actions.ts).
//
// Behavior (docs/implementation-plans/20260812-places-api-edit-destination.md §5 P7):
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
// - docs/implementation-plans/20260812-places-api-edit-destination.md (§4, P7)
// - places/places-dialog.ts (P5 shell: registerStepRenderer, withDialogLoading)
// - places/places-apply.ts (P3: FIELD_KEYS, PlaceFieldKey, buildClosedState)
// - data/services/places-api.service.ts (P1: getPlace + MOCK fixtures)

import { registerActions } from '../ui/actions.js';
import { getLanguagePackName, translate } from '../i18n/translation.js';
import { getPlace } from '../data/services/places-api.service.js';
import type { PlaceDetails, PlaceSearchResult } from '../models/places-api.model.js';
import { buildClosedState, FIELD_KEYS, type PlaceFieldKey } from './places-apply.js';
import { applyAndClose } from './places-apply-flow.js';
import { INCLUDE_PHOTOS_KEY } from './places-search-step.js';
import {
	getStepData,
	getStepLoadingMessage,
	goTo,
	notifyPlacesLimited,
	registerStepRenderer,
	setStepData,
	withDialogLoading,
} from './places-dialog.js';
import type { PlacesDialogContext } from './places-dialog.js';
import { getID } from '../utils/dom.js';
import { getRegionPills } from '../ui/region-select.js';

/** Cross-step data key for the fetched full place details (P8/P9 read it). */
export const DETAILS_KEY = 'placeDetails';
/** Cross-step data key for the fields the user checked (P9 reads it). */
export const CHECKED_KEY = 'checkedFields';
/**
 * Cross-step data flag: set when the user chose to UPDATE the existing linked
 * place (kept its id). The details route runs WITHOUT photos and the flow
 * skips the photos step (applies directly).
 */
export const UPDATE_EXISTING_KEY = 'updateExisting';
/** Key P6 (search) and the local import step use to store the selected place. */
export const CANDIDATE_KEY = 'placeDetailsCandidate';

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
	// The selected search result (route 1) already carries the full normalized
	// place data, so we reuse it directly and skip the redundant details call
	// (route 2). Route 2 only runs for a previously-saved placeAPI.id (jump
	// straight to details, Open Question 10) where there is no search result.
	const candidate = getStepData<PlaceSearchResult>(CANDIDATE_KEY);
	const placeId = candidate?.id ?? context.placeAPI?.id ?? '';
	if (!placeId) {
		return renderError();
	}

	let details: PlaceDetails | null;
	if (candidate) {
		details = candidate;
	} else {
		try {
			// Updating an existing linked place: refresh its info WITHOUT photos
			// (free main key) — photos are not re-imported on this path.
			details = await withDialogLoading(
				(signal) =>
					getPlace(placeId, {
						signal,
						photos: false,
						onLimited: (limited) => {
							if (limited) notifyPlacesLimited();
						},
					}),
				getStepLoadingMessage('details'),
			);
		} catch (error) {
			// Non-abort failure — surface inline so the user can retry in place.
			console.error('[places-details] Failed to load place', error);
			return renderError(error);
		}

		if (details === null) return ''; // cancelled (dialog closed / X clicked)
	}

	setStepData(DETAILS_KEY, details);
	return renderDetailsHTML(context, details);
}

/** Render the field previews (disabled inputs) + checkboxes + footer. */
function renderDetailsHTML(context: PlacesDialogContext, details: PlaceDetails): string {
	// Show a field only when it carries a non-empty scraped value AND that
	// value differs from what the entry already has — inputs whose data already
	// matches are skipped (there is nothing to update). When every scraped
	// value already matches, an "up to date" message replaces the inputs
	// entirely; when the scraper returned nothing at all, the regular "no data"
	// state is shown. Either way the footer Continue button stays.
	let hadScrapedData = false;
	const rows = FIELD_KEYS.filter((field) => {
		const value = getFieldDisplayValue(details, field);
		if (value === '') return false;
		hadScrapedData = true;
		return fieldDiffers(details, field, context);
	})
		.map((field) => {
			const label = translate(FIELD_LABEL_KEYS[field]);
			const value = getFieldDisplayValue(details, field);
			const caption =
				field === 'description'
					? `<div class="caption">${escapeHtml(getDescriptionCaption(details))}</div>`
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
		})
		.join('');

	const emptyState =
		rows === ''
			? `<p class="places-details-empty">${escapeHtml(
					translate(
						hadScrapedData
							? 'placesApi.details.allUpToDate'
							: 'placesApi.details.noData',
					),
				)}</p>`
			: '';

	return `
	<div class="places-details">
		<div class="places-details-fields">${rows}${emptyState}</div>
		<div class="places-details-footer">
			<button type="button" class="places-details-continue" data-action="places-details-continue">
				${translate('placesApi.details.continue')}
			</button>
		</div>
	</div>`;
}

/** Read the display value for a field from the fetched place ('' when empty). */
function getFieldDisplayValue(details: PlaceDetails, field: PlaceFieldKey): string {
	if (field === 'description') return getDescriptionDisplayValue(details);
	const value = details[field];
	return typeof value === 'string' ? value : '';
}

/**
 * The description text to preview. The local gmaps scraper returns BOTH
 * languages (`descriptions`), so the ACTIVE language is shown — this keeps the
 * preview in sync with the page language even if the request itself went out
 * in the other language. The Places API path returns only the requested
 * language (`description`), which is used as-is.
 */
function getDescriptionDisplayValue(details: PlaceDetails): string {
	const both = details.descriptions;
	const lang = getLanguagePackName();
	if (both && typeof both[lang] === 'string' && both[lang] !== '') return both[lang];
	return typeof details.description === 'string' ? details.description : '';
}

/** Normalize a value for the "already matches" comparison. */
function normalizeForCompare(value: string): string {
	return (value ?? '').trim().toLowerCase();
}

/**
 * Whether the scraped value for a field differs from what the entry already
 * has in the form. Fields that match are hidden (nothing to update).
 */
function fieldDiffers(
	details: PlaceDetails,
	field: PlaceFieldKey,
	context: PlacesDialogContext,
): boolean {
	return (
		normalizeForCompare(getFieldDisplayValue(details, field)) !==
		normalizeForCompare(getCurrentEntryValue(context, field))
	);
}

/** Read the entry's current value for a field from the edit form. */
function getCurrentEntryValue(context: PlacesDialogContext, field: PlaceFieldKey): string {
	const cat = context.category;
	const j = context.j;
	switch (field) {
		case 'name':
			return getInputValue(`${cat}-name-${j}`);
		case 'website':
			return getInputValue(`${cat}-website-${j}`);
		case 'instagram':
			return getInputValue(`${cat}-instagram-${j}`);
		case 'map':
			return getInputValue(`${cat}-map-${j}`);
		case 'emoji':
			return getInputValue(`${cat}-emoji-${j}`);
		case 'region':
			return getRegionPills(`${cat}-regions-${j}`).join(', ');
		case 'rating':
			return getInputValue(`${cat}-rating-${j}`);
		case 'price':
			return getCurrentPriceValue(cat, j);
		case 'description':
			return getInputValue(`${cat}-description-${getLanguagePackName()}-${j}`);
	}
	return '';
}

function getInputValue(id: string): string {
	return getID<HTMLInputElement>(id)?.value?.trim() ?? '';
}

function getSelectValue(id: string): string {
	return getID<HTMLSelectElement>(id)?.value?.trim() ?? '';
}

/** Mirror set-destination.ts: the price select value, or the "other" input. */
function getCurrentPriceValue(cat: string, j: number): string {
	const priceSelect = getID<HTMLSelectElement>(`${cat}-price-${j}`);
	const otherPrice = getID<HTMLInputElement>(`${cat}-other-price-${j}`);
	if (priceSelect?.innerHTML && priceSelect.value !== 'other') return priceSelect.value.trim();
	return otherPrice?.value?.trim() ?? '';
}

/**
 * Caption under the description input. The local gmaps scraper imports the
 * description in BOTH languages — the preview shows the active language but the
 * caption flags that both were imported. The Places API path returns only the
 * requested language, so it keeps the plain "Description in {lang}" caption.
 */
function getDescriptionCaption(details: PlaceDetails): string {
	const both = details.descriptions;
	if (both && both.en && both.pt) {
		return translate('placesApi.details.descriptionBoth');
	}
	const lang = getLanguagePackName();
	return translate('labels.description.lang', {
		lang: translate(`labels.language.${lang}`),
	});
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

	// Closed places branch off to the 'closed' step (P8). Updating an existing
	// linked place skips the photos step (its info was fetched without photos)
	// and applies directly; so does a search with "Include photos" left off —
	// the paid photos key / photos route is NEVER called then. Everything else
	// continues to the photos step (P8).
	const { closed } = buildClosedState(details);
	if (closed) {
		void goTo('closed');
		return;
	}
	if (getStepData<boolean>(UPDATE_EXISTING_KEY)) {
		applyAndClose();
		return;
	}
	if (!getStepData<boolean>(INCLUDE_PHOTOS_KEY)) {
		applyAndClose();
		return;
	}
	void goTo('photos');
}

/** Read which "Update with this info" checkboxes are checked. */
function collectCheckedFields(): PlaceFieldKey[] {
	const checked: PlaceFieldKey[] = [];
	getID('places-dialog')
		?.querySelectorAll<HTMLInputElement>('.places-detail-check-input')
		?.forEach((input) => {
			const field = input.getAttribute('data-field');
			if (input.checked && field && (FIELD_KEYS as readonly string[]).includes(field)) {
				checked.push(field as PlaceFieldKey);
			}
		});
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
