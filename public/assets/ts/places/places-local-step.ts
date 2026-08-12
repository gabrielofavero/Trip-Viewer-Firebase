// ======= Places — Local import step (gmaps scraper) =======
// The "Local (gmaps scraper)" import path. Instead of a search bar the user
// pastes a Google Maps link (validated with the same isValidMapLink() the edit
// form uses), we call the local scraper route once, get the fully-normalized
// place, and hand it to the existing 'details' step for field selection.
//
// This module self-registers (at import time):
//   - the 'local' step renderer via registerStepRenderer(),
//   - the 'places-local-run' click action + an Enter-key handler scoped to the
//     link input.
//
// Refresh strategy: the scraper may or may not return the official Google
// place id. When it does (a real `ChI...` id) it lands in `place.id` and the
// normal Places API refresh works. When it doesn't, `place.id` is '' (left
// blank) — but the canonical Maps link is stored (LOCAL_SOURCE_URL_KEY →
// placeAPI.sourceUrl), so the entry can always be re-scraped by link later
// (per-item: pre-filled in this input; bulk: the local bulk path).
//
// Photos: the scraper returns direct image URLs. The photos route is NOT used
// (it needs an official place id), so INCLUDE_PHOTOS_KEY is set false to skip
// the photos step, while IMPORT_PHOTOS_KEY/IMPORTED_PHOTOS_KEY carry the
// scraper images straight into the apply step.
//
// References:
// - places/places-dialog.ts (P5 shell: registerStepRenderer, withDialogLoading)
// - data/services/gmaps-scraper.service.ts (scrapePlaces)
// - places/places-details-step.ts (P7: reads placeDetailsCandidate)
// - places/places-closed-photos-step.ts (P8: IMPORT_PHOTOS_KEY / IMPORTED_PHOTOS_KEY)

import { registerActions } from '../ui/actions.js';
import { getLanguagePackName, translate } from '../i18n/translation.js';
import { isValidMapLink } from '../ui/fields.js';
import { scrapePlaces } from '../data/services/gmaps-scraper.service.js';
import {
	getStepLoadingMessage,
	goTo,
	registerStepRenderer,
	setStepData,
	withDialogLoading,
} from './places-dialog.js';
import type { PlacesDialogContext } from './places-dialog.js';
import { CANDIDATE_KEY } from './places-details-step.js';
import { INCLUDE_PHOTOS_KEY } from './places-search-step.js';
import { IMPORTED_PHOTOS_KEY, IMPORT_PHOTOS_KEY } from './places-closed-photos-step.js';
import { getID } from '../utils/dom.js';
import type { PlaceImage } from '../models/schema.js';

/** Cross-step data key: the canonical Maps link to re-scrape this entry later. */
export const LOCAL_SOURCE_URL_KEY = 'localSourceUrl';

// ------------------------------------------------------------------
// Step renderer
// ------------------------------------------------------------------

/** Render the 'local' step: Maps-link input (pre-filled when already linked). */
function renderLocalStep(context: PlacesDialogContext): string {
	// Pre-fill from a previous local import so refreshing is one click.
	const prefill = context.placeAPI?.sourceUrl ?? context.placeAPI?.map ?? '';

	return `
	<div class="places-local">
		<p class="places-local-message">${escapeHtml(translate('placesApi.local.message'))}</p>
		<div class="nice-form-group">
			<label for="places-local-input">${escapeHtml(translate('placesApi.local.title'))}</label>
			<div class="places-search-bar">
				<input id="places-local-input" class="places-search-input" type="url"
					placeholder="${escapeAttr(translate('placesApi.local.placeholder'))}"
					value="${escapeAttr(prefill)}" autocomplete="off" />
				<button id="places-local-submit" class="places-search-submit" type="button"
					data-action="places-local-run">${escapeHtml(translate('placesApi.local.import'))}</button>
			</div>
		</div>
		<div id="places-local-status" class="places-local-status" aria-live="polite"></div>
	</div>`;
}

// ------------------------------------------------------------------
// Import
// ------------------------------------------------------------------

/** Render the inline status/error message inside the local step. */
function renderStatus(message: string, error = false): void {
	const status = getID('places-local-status');
	if (!status) return;
	status.innerHTML = `<p class="${error ? 'places-search-error' : 'places-local-status'}">${escapeHtml(
		message,
	)}</p>`;
}

/**
 * Import the place from the pasted Maps link: validate → scrape → stash the
 * normalized place + scraper images as cross-step data → continue to 'details'.
 */
async function runLocalImport(): Promise<void> {
	if (!getID('places-dialog')) return;
	const input = getID<HTMLInputElement>('places-local-input');
	if (!input) return;
	const link = input.value.trim();
	if (!link) return;

	if (!isValidMapLink(link)) {
		renderStatus(translate('placesApi.errors.invalidMapLink'), true);
		return;
	}

	try {
		// One request → everything (normalized server-side to PlaceDetails).
		const results = await withDialogLoading(
			(signal) =>
				scrapePlaces([link], {
					signal,
					lang: getLanguagePackName(),
				}),
			getStepLoadingMessage('local'),
		);
		if (results === null) return; // cancelled (dialog closed / X clicked)

		const place = results[0];
		if (!place) {
			renderStatus(translate('placesApi.local.notFound'), true);
			return;
		}

		// Stash the normalized place as the details-step candidate (it reuses it
		// directly — no extra fetch, no official id needed).
		setStepData(CANDIDATE_KEY, place);
		// Skip the photos step entirely (the photos route needs an official id).
		setStepData(INCLUDE_PHOTOS_KEY, false);
		// The scraper gives direct image URLs — carry them into the apply step.
		const images: PlaceImage[] = (place.imageUrls ?? []).map((url) => ({
			description: '',
			link: url,
		}));
		setStepData(IMPORT_PHOTOS_KEY, images.length > 0);
		setStepData(IMPORTED_PHOTOS_KEY, images);
		// Canonical link → persisted as placeAPI.sourceUrl for later refresh.
		setStepData(LOCAL_SOURCE_URL_KEY, place.sourceUrl || link);

		void goTo('details');
	} catch (error) {
		if ((error as Error)?.name === 'AbortError') return;
		console.error('[places-local] Import failed', error);
		const message =
			error instanceof Error && error.message
				? error.message
				: translate('placesApi.errors.scraperFailed');
		renderStatus(message, true);
	}
}

// ------------------------------------------------------------------
// Event wiring
// ------------------------------------------------------------------

/** Enter key in the Maps-link input triggers the import (same as the button). */
function handleLocalKeydown(event: KeyboardEvent): void {
	if (event.key !== 'Enter') return;
	const target = event.target as Element | null;
	if (!target || !target.closest('.places-local')) return;
	if (!getID('places-dialog')) return;
	event.preventDefault();
	void runLocalImport();
}

/** Register the delegated click action + the renderer (runs once on import). */
function registerLocalActions(): void {
	registerActions({
		'places-local-run': () => {
			void runLocalImport();
		},
	});
}

// ------------------------------------------------------------------
// Init (self-registration)
// ------------------------------------------------------------------

registerStepRenderer('local', renderLocalStep);
registerLocalActions();
document.addEventListener('keydown', handleLocalKeydown);

// ------------------------------------------------------------------
// HTML escaping helpers (local copies, same pattern as the step modules)
// ------------------------------------------------------------------

function escapeHtml(value: string): string {
	const div = document.createElement('div');
	div.textContent = value;
	return div.innerHTML;
}

function escapeAttr(value: string): string {
	return escapeHtml(value).replace(/"/g, '&quot;');
}
