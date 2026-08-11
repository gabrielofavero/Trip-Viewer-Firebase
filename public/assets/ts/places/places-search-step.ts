// ======= Places API — Step 1: Search (P6) =======
// Renders the search bar + result list for the "Fetch Info With Maps" dialog.
//
// This module self-registers (at import time):
//   - the 'search' step renderer via registerStepRenderer(),
//   - the 'places-search-run' / 'places-search-select' click actions via
//     registerActions() (data-action delegation, see ui/actions.ts),
//   - an Enter-key handler scoped to the search input.
//
// Behavior (docs/ai-analysis/6-places-api-edit-destination.md §5 P6):
//   - Search bar + Search button; NO auto-search — the user presses Search.
//   - The query is pre-filled with "<entry name> <destination title>" when the
//     entry already has a name, else blank.
//   - On Search: calls searchPlaces() under the dialog-scoped loading overlay
//     (withDialogLoading) and renders up to 5 results (name, region, rating,
//     price, emoji).
//   - Empty / no-results / error states are handled inline so the user can
//     retry without leaving the dialog. Selecting a result stores it as
//     `placeDetailsCandidate` (cross-step data) and advances to 'details'.
//
// References:
// - docs/ai-analysis/6-places-api-edit-destination.md (§4, P6)
// - places/places-dialog.ts (P5 shell: registerStepRenderer, withDialogLoading)
// - data/services/places-api.service.ts (P1: searchPlaces + MOCK fixtures)

import { registerActions } from '../ui/actions.js';
import { translate } from '../i18n/translation.js';
import { searchPlaces } from '../data/services/places-api.service.js';
import type { PlaceSearchResult } from '../models/places-api.model.js';
import {
	getStepLoadingMessage,
	goTo,
	notifyPlacesLimited,
	registerStepRenderer,
	setStepData,
	withDialogLoading,
} from './places-dialog.js';
import type { PlacesDialogContext } from './places-dialog.js';
import { getID } from '../utils/dom.js';

/** Cross-step data key where the selected search result is stored (P7 reads it). */
const CANDIDATE_KEY = 'placeDetailsCandidate';

/**
 * Cross-step data key: whether the user checked "Include photos" on search.
 * When `false`, the flow skips the photos step entirely so the photos route /
 * paid photos key is NEVER called (P7 and P8 read it).
 */
export const INCLUDE_PHOTOS_KEY = 'includePhotos';

/** Max results rendered (the route returns ≤ 20; defensive cap). */
const MAX_RESULTS = 20;

/** Results of the most recent search, indexed by `data-index` in the DOM. */
let _results: PlaceSearchResult[] = [];

// ------------------------------------------------------------------
// Step renderer
// ------------------------------------------------------------------

/** Render the 'search' step: search bar (pre-filled) + empty results area. */
function renderSearchStep(context: PlacesDialogContext): string {
	_results = [];
	const initialQuery = context.entryName
		? `${context.entryName} ${context.destinationTitle}`.trim()
		: '';

	return `
	<div class="places-search">
		<div class="nice-form-group">
			<label for="places-search-input">${translate('placesApi.search.title')}</label>
			<div class="places-search-bar">
				<input id="places-search-input" class="places-search-input" type="search"
					placeholder="${escapeAttr(translate('placesApi.search.placeholder'))}"
					value="${escapeAttr(initialQuery)}" autocomplete="off" />
				<button id="places-search-submit" class="places-search-submit" type="button"
					data-action="places-search-run">${translate('placesApi.search.button')}</button>
			</div>
			<label class="places-search-photos">
				<input type="checkbox" id="places-search-photos-input" class="places-search-photos-input" />
				<span>${escapeHtml(translate('placesApi.search.includePhotos'))}</span>
			</label>
		</div>
		<div id="places-search-results" class="places-search-results" aria-live="polite"></div>
	</div>`;
}

// ------------------------------------------------------------------
// Search + results
// ------------------------------------------------------------------

/** Run the search from the current input value, under the scoped loading. */
async function runSearch(): Promise<void> {
	// Only act while the search step is actually rendered inside the dialog.
	if (!getID('places-dialog')) return;
	if (!getID('places-search-input')) return;

	const query = getID<HTMLInputElement>('places-search-input')?.value.trim() ?? '';
	// "Include photos" toggle (default OFF): off → photos:false runs on the FREE
	// main key and the photos step is SKIPPED entirely (never touches the paid
	// photos key / photos route); on → photos:true uses the paid photos key and
	// the photos step is offered (import up to 3 photos by place id).
	const includePhotos =
		getID<HTMLInputElement>('places-search-photos-input')?.checked ?? false;
	// Persist across steps so P7/P8 know whether to offer/skip the photos step.
	setStepData(INCLUDE_PHOTOS_KEY, includePhotos);

	let results: PlaceSearchResult[] | null;
	try {
		// uid + lang are resolved by the service (getUID + active language pack).
		results = await withDialogLoading(
			(signal) =>
				searchPlaces(query, {
					signal,
					photos: includePhotos,
					onLimited: (limited) => {
						if (limited) notifyPlacesLimited();
					},
				}),
			getStepLoadingMessage('search'),
		);
	} catch (error) {
		// Non-abort failure — surface inline so the user can retry in-place.
		console.error('[places-search] Search failed', error);
		renderError(error);
		return;
	}

	if (results === null) return; // cancelled (dialog closed / X clicked)

	renderResults(results);
}

/** Render the result list (or the "no results" empty state) for a search. */
function renderResults(results: PlaceSearchResult[]): void {
	const container = getID('places-search-results');
	if (!container) return;

	_results = results.slice(0, MAX_RESULTS);

	if (_results.length === 0) {
		container.innerHTML = `<p class="places-search-empty">${escapeHtml(
			translate('placesApi.search.noResults'),
		)}</p>`;
		return;
	}

	container.innerHTML = _results
		.map(
			(place, index) => `
			<button type="button" class="places-search-result" data-action="places-search-select"
				data-index="${index}">
				<span class="places-search-result-emoji">${place.emoji ? escapeHtml(place.emoji) : ''}</span>
				<span class="places-search-result-info">
					<span class="places-search-result-name">${escapeHtml(place.name)}</span>
					${place.region ? `<span class="places-search-result-region">${escapeHtml(place.region)}</span>` : ''}
				</span>
				<span class="places-search-result-meta">
					${place.rating ? `<span class="places-search-result-rating">${escapeHtml(place.rating)}</span>` : ''}
					${place.price ? `<span class="places-search-result-price">${escapeHtml(place.price)}</span>` : ''}
				</span>
			</button>`,
		)
		.join('');
}

/** Render the inline error state (keeps the dialog open for a retry). */
function renderError(error?: unknown): void {
	const container = getID('places-search-results');
	if (!container) return;
	const message =
		error instanceof Error && error.message ? error.message : translate('placesApi.search.error');
	container.innerHTML = `<p class="places-search-error">${escapeHtml(message)}</p>`;
}

// ------------------------------------------------------------------
// Selection
// ------------------------------------------------------------------

/** Store the selected result and advance to the 'details' step. */
function selectResult(index: number): void {
	const result = _results[index];
	if (!result) return;
	setStepData(CANDIDATE_KEY, result);
	void goTo('details');
}

// ------------------------------------------------------------------
// Event wiring
// ------------------------------------------------------------------

/** Enter key in the search input triggers the search (same as clicking Search). */
function handleSearchKeydown(event: KeyboardEvent): void {
	if (event.key !== 'Enter') return;
	const target = event.target as Element | null;
	if (!target || !target.closest('.places-search-input')) return;
	if (!getID('places-dialog')) return;
	event.preventDefault();
	void runSearch();
}

/** Register the delegated click actions + the renderer (runs once on import). */
function registerSearchActions(): void {
	registerActions({
		'places-search-run': () => {
			void runSearch();
		},
		'places-search-select': (element) => {
			const index = Number((element as HTMLElement).getAttribute('data-index'));
			if (!Number.isNaN(index)) selectResult(index);
		},
	});
}

// ------------------------------------------------------------------
// Init (self-registration)
// ------------------------------------------------------------------

registerStepRenderer('search', renderSearchStep);
registerSearchActions();
document.addEventListener('keydown', handleSearchKeydown);

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
