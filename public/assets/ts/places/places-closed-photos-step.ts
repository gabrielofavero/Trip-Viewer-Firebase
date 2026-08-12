// ======= Places API — Step 3: Closed + Photos (P8) =======
// Handles the closed-place notice/options and the conditional photo import
// for the "Fetch Info With Maps" dialog.
//
// This module self-registers (at import time):
//   - the 'closed' step renderer via registerStepRenderer(),
//   - the 'photos' step renderer via registerStepRenderer(),
//   - the closed-option / photos-continue / photos-retry click actions via
//     registerActions() (data-action delegation, see ui/actions.ts),
//   - a 'change' listener scoped to the photos-import checkbox.
//
// Flow (docs/ai-analysis/6-places-api-edit-destination.md §5 P8):
//   - 'closed' (reached from P7 when the place is no longer operational):
//     shows a notice + 3 options:
//       * Delete item      -> stores closedDecision 'delete'  -> 'done'
//       * Ignore           -> stores closedDecision 'ignore'  -> 'done'
//       * Add [Closed]     -> stores closedDecision 'label'   -> 'photos' (continues normal flow)
//     The actual delete/label application is P9's job (apply/persist).
//   - 'photos' (normal flow): shows the "Photos can be imported" option as an
//     "Import photos" checkbox (checked by default). When enabled, calls
//     getPlacePhotos() under the dialog-scoped loading overlay, takes the
//     first 3 photos, and previews them mapped to { description: '', link: url }.
//     The local gmaps-scraper import pre-populates SCRAPER_PHOTOS_KEY with its
//     direct image URLs and the Places API photos are merged on top (deduped).
//     Every preview thumbnail is a toggle — clicking deselects it (dimmed) and
//     updates the count badge; when the last photo is deselected the import
//     toggle turns off automatically. The preview scrolls internally after
//     two rows so all photos stay visible. If the user unchecks the box, no
//     photos are applied. Decisions are stored in cross-step data so P9 can
//     apply/persist them.
//
// References:
// - docs/ai-analysis/6-places-api-edit-destination.md (§4, P8)
// - places/places-dialog.ts (P5 shell: registerStepRenderer, withDialogLoading)
// - places/places-details-step.ts (P7 stores the fetched details under 'placeDetails')
// - data/services/places-api.service.ts (P1: getPlacePhotos + MOCK fixtures)

import { registerActions } from '../ui/actions.js';
import { translate } from '../i18n/translation.js';
import { getPlacePhotos } from '../data/services/places-api.service.js';
import type { PlaceDetails } from '../models/places-api.model.js';
import type { PlaceImage } from '../models/schema.js';
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
import { applyAndClose } from './places-apply-flow.js';
import { UPDATE_EXISTING_KEY } from './places-details-step.js';
import { INCLUDE_PHOTOS_KEY } from './places-search-step.js';
import { getID } from '../utils/dom.js';

/** Cross-step data key where P7 stores the fetched full place details. */
export const DETAILS_KEY = 'placeDetails';
/** Cross-step data key for the closed-place decision (P9 reads it). */
export const CLOSED_DECISION_KEY = 'closedDecision';
/** Cross-step data key: whether the user opted to import photos (P9 reads it). */
export const IMPORT_PHOTOS_KEY = 'importPhotos';
/** Cross-step data key: the imported photos mapped to { description, link } (P9 reads it). */
export const IMPORTED_PHOTOS_KEY = 'importedPhotos';
/**
 * Cross-step data key: the local gmaps-scraper's direct image URLs, kept
 * separate from IMPORTED_PHOTOS_KEY so Places API photos can be merged on top
 * without losing them across a photos-toggle re-render.
 */
export const SCRAPER_PHOTOS_KEY = 'scraperPhotos';
/** Cross-step data key: whether the Places API photos route has already run. */
export const API_PHOTOS_FETCHED_KEY = 'apiPhotosFetched';
/**
 * Cross-step data key: the photo links the user kept selected for import
 * (subset of IMPORTED_PHOTOS_KEY). Clicking a preview thumbnail toggles its
 * selection and the count badge next to "Import photos" reflects it; when the
 * last photo is deselected the import toggle turns off automatically.
 */
export const SELECTED_PHOTOS_KEY = 'selectedPhotos';

/** Max photos imported from the photos route (route returns ≤ 3; defensive cap). */
const MAX_PHOTOS = 3;

/** Closed-place decision values stored in cross-step data for P9. */
export type ClosedDecision = 'delete' | 'ignore' | 'label';

// ------------------------------------------------------------------
// Step renderer: closed
// ------------------------------------------------------------------

/**
 * Render the 'closed' step: notice that the place is no longer operational,
 * with 3 options (Delete item / Ignore / Add [Closed] label).
 */
function renderClosedStep(_context: PlacesDialogContext): string {
	const details = getStepData<PlaceDetails>(DETAILS_KEY);
	if (!details) return renderError('closed');

	return `
	<div class="places-closed">
		<div class="places-closed-icon">
			<i class="iconify" data-icon="material-symbols-light:storefront"></i>
		</div>
		<h3 class="places-closed-title">${escapeHtml(translate('placesApi.closed.title'))}</h3>
		<p class="places-closed-message">${escapeHtml(translate('placesApi.closed.message'))}</p>
		<div class="places-closed-options">
			<button type="button" class="places-closed-option places-closed-option-danger"
				data-action="places-closed-delete">${escapeHtml(
					translate('placesApi.closed.option.delete'),
				)}</button>
			<button type="button" class="places-closed-option"
				data-action="places-closed-ignore">${escapeHtml(
					translate('placesApi.closed.option.ignore'),
				)}</button>
			<button type="button" class="places-closed-option"
				data-action="places-closed-label">${escapeHtml(
					translate('placesApi.closed.option.label'),
				)}</button>
		</div>
	</div>`;
}

// ------------------------------------------------------------------
// Step renderer: photos
// ------------------------------------------------------------------

/**
 * Render the 'photos' step: an "Import photos" checkbox (checked by default)
 * plus a preview area. When import is enabled, the photos route is called
 * under the scoped loading overlay and the first 3 photos are previewed.
 */
async function renderPhotosStep(_context: PlacesDialogContext): Promise<string> {
	const details = getStepData<PlaceDetails>(DETAILS_KEY);
	if (!details) return renderError();

	// Preserve the user's choice across re-renders (default: enabled).
	const importPhotos = getStepData<boolean>(IMPORT_PHOTOS_KEY) ?? true;
	let imported = getStepData<PlaceImage[]>(IMPORTED_PHOTOS_KEY) ?? [];

	// Fetch the Places API photos (by official id) once and merge them with the
	// scraper images the local import pre-populated. A flag keeps the fetch
	// idempotent across re-renders (retry via uncheck/recheck).
	const canFetchApi = Boolean(details.id);
	const alreadyFetchedApi = getStepData<boolean>(API_PHOTOS_FETCHED_KEY) ?? false;
	if (importPhotos && canFetchApi && !alreadyFetchedApi) {
		const base = getStepData<PlaceImage[]>(SCRAPER_PHOTOS_KEY) ?? [];
		try {
			// uid + lang are resolved by the service (getUID + active language pack).
			const merged = await fetchAndMergeApiPhotos(details);
			if (merged === null) return ''; // cancelled (dialog closed / X clicked)
			imported = merged;
			setStepData(IMPORT_PHOTOS_KEY, true);
			setStepData(IMPORTED_PHOTOS_KEY, imported);
			setStepData(API_PHOTOS_FETCHED_KEY, true);
		} catch (error) {
			// Non-abort failure: fall back to the scraper images when present
			// (local import), otherwise surface the error so the user can retry.
			console.error('[places-photos] Failed to load API photos', error);
			if (base.length > 0) {
				imported = base;
				setStepData(IMPORT_PHOTOS_KEY, true);
				setStepData(IMPORTED_PHOTOS_KEY, imported);
				setStepData(API_PHOTOS_FETCHED_KEY, true);
			} else {
				return renderError(error);
			}
		}
	}

	// First time the photos list is materialized, default-select every photo so
	// the preview shows them as imported. Later re-renders (back/forward or a
	// toggle) keep the user's per-photo selection.
	if (getStepData<string[]>(SELECTED_PHOTOS_KEY) === undefined) {
		selectAllPhotos(imported);
	}
	const selected = getSelectedSet();
	const html = renderPhotosHTML(importPhotos, imported, selected);
	// Cap the preview at two rows and scroll internally when there are more
	// photos than fit (the gmaps-scraper can return many) — keeps the Continue
	// button in view instead of scrolling the whole dialog step.
	requestAnimationFrame(() => {
		const preview = getID('places-photos-preview');
		if (preview) applyPreviewScroll(preview, imported.length);
	});
	return html;
}

/**
 * Fetch the Places API photos (by official place id) and merge them with the
 * scraper images already carried in SCRAPER_PHOTOS_KEY, deduped by URL. Returns
 * the merged list, or null when cancelled. Throws on a non-abort failure. When
 * the place has no official id, the scraper images are returned as-is.
 */
async function fetchAndMergeApiPhotos(details: PlaceDetails): Promise<PlaceImage[] | null> {
	const base = getStepData<PlaceImage[]>(SCRAPER_PHOTOS_KEY) ?? [];
	if (!details.id) return base;

	const photos = await withDialogLoading(
		(signal) =>
			getPlacePhotos(details.id, {
				signal,
				onLimited: (limited) => {
					if (limited) notifyPlacesLimited();
				},
			}),
		getStepLoadingMessage('photos'),
	);
	if (photos === null) return null; // cancelled

	const merged = [...base];
	const seen = new Set(merged.map((image) => image.link));
	for (const photo of photos.slice(0, MAX_PHOTOS)) {
		if (!seen.has(photo.url)) {
			seen.add(photo.url);
			merged.push({ description: '', link: photo.url });
		}
	}
	return merged;
}

/** Render the photos step shell: checkbox + count badge + preview area + footer. */
function renderPhotosHTML(
	importPhotos: boolean,
	imported: PlaceImage[],
	selected: ReadonlySet<string>,
): string {
	return `
	<div class="places-photos">
		<p class="places-photos-hint">${escapeHtml(translate('placesApi.photos.canImport'))}</p>
		<label class="places-photos-import">
			<input type="checkbox" id="places-photos-import-input" class="places-photos-import-input"
				${importPhotos ? 'checked' : ''} />
			<span>${escapeHtml(translate('placesApi.photos.import'))}</span>
			<span id="places-photos-import-count" class="places-photos-import-count"
				aria-label="${escapeAttr(translate('placesApi.photos.count', { count: selected.size }))}">
				${selected.size}
			</span>
		</label>
		<div id="places-photos-preview" class="places-photos-preview" aria-live="polite">
			${renderPreviewItems(imported, selected)}
		</div>
		<div class="places-details-footer">
			<button type="button" class="places-details-continue" data-action="places-photos-continue">
				${escapeHtml(translate('placesApi.details.continue'))}
			</button>
		</div>
	</div>`;
}

/**
 * Render the photo preview thumbnails (or the empty state). Each thumbnail is
 * a toggle: selected photos (default) show their index and will be imported;
 * clicking deselects it (dimmed + ✕) and updates the count badge.
 */
function renderPreviewItems(photos: PlaceImage[], selected: ReadonlySet<string>): string {
	if (photos.length === 0) {
		return `<p class="places-photos-empty">${escapeHtml(
			translate('placesApi.photos.none'),
		)}</p>`;
	}
	return photos
		.map((photo, index) => {
			const isSelected = selected.has(photo.link);
			return `
			<figure class="places-photos-preview-item${isSelected ? '' : ' is-deselected'}"
				data-action="places-photos-toggle" data-index="${index}" role="button" tabindex="0"
				aria-pressed="${isSelected}">
				<img src="${escapeAttr(photo.link)}" alt="${escapeAttr(photo.description || '')}"
					loading="lazy" />
				<figcaption>${isSelected ? index + 1 : '✕'}</figcaption>
			</figure>`;
		})
		.join('');
}

// ------------------------------------------------------------------
// Photo selection
// ------------------------------------------------------------------

/** Read the current photo-selection set (links) from cross-step data. */
function getSelectedSet(): Set<string> {
	return new Set(getStepData<string[]>(SELECTED_PHOTOS_KEY) ?? []);
}

/** Persist the selection set (links) into cross-step data. */
function setSelectedSet(selected: Set<string>): void {
	setStepData(SELECTED_PHOTOS_KEY, [...selected]);
}

/** Select every photo (used when the imported list is (re)materialized). */
function selectAllPhotos(photos: PlaceImage[]): void {
	setStepData(SELECTED_PHOTOS_KEY, photos.map((photo) => photo.link));
}

/**
 * Toggle one preview thumbnail's selection. Updates the count badge and, when
 * the last photo is deselected, automatically turns the "Import photos" toggle
 * off (re-selecting any photo turns it back on).
 */
function togglePhoto(index: number): void {
	const imported = getStepData<PlaceImage[]>(IMPORTED_PHOTOS_KEY) ?? [];
	const photo = imported[index];
	if (!photo) return;

	const selected = getSelectedSet();
	if (selected.has(photo.link)) {
		selected.delete(photo.link);
	} else {
		selected.add(photo.link);
	}
	setSelectedSet(selected);

	const importEnabled = selected.size > 0;
	setStepData(IMPORT_PHOTOS_KEY, importEnabled);
	const checkbox = getID<HTMLInputElement>('places-photos-import-input');
	if (checkbox) checkbox.checked = importEnabled;

	// Update the clicked thumbnail in place (no full re-render).
	const item = getID('places-photos-preview')?.querySelector<HTMLElement>(
		`.places-photos-preview-item[data-index="${index}"]`,
	);
	if (item) {
		const nowSelected = selected.has(photo.link);
		item.classList.toggle('is-deselected', !nowSelected);
		item.setAttribute('aria-pressed', String(nowSelected));
		const caption = item.querySelector('figcaption');
		if (caption) caption.textContent = nowSelected ? String(index + 1) : '✕';
	}

	updateCountBadge(selected.size);
}

/** Sync the selected-photo count badge next to the "Import photos" label. */
function updateCountBadge(count: number): void {
	const badge = getID('places-photos-import-count');
	if (!badge) return;
	badge.textContent = String(count);
	badge.setAttribute('aria-label', translate('placesApi.photos.count', { count }));
}

/**
 * Cap the photo preview at two rows and scroll it internally when there are
 * more photos than fit (the gmaps-scraper can return many). Keeps the
 * Continue button visible instead of scrolling the whole dialog step.
 */
function applyPreviewScroll(preview: HTMLElement, photoCount: number): void {
	const MAX_ROWS = 2;
	const columns =
		getComputedStyle(preview).gridTemplateColumns.split(' ').filter(Boolean).length || 3;
	if (photoCount <= MAX_ROWS * columns) {
		preview.style.maxHeight = '';
		preview.style.overflowY = '';
		preview.classList.remove('places-photos-preview--scroll');
		return;
	}
	const item = preview.querySelector<HTMLElement>('.places-photos-preview-item');
	if (!item) return;
	const gap = 10; // matches .places-photos-preview gap
	const rowHeight = item.getBoundingClientRect().height;
	preview.style.maxHeight = `${rowHeight * MAX_ROWS + gap * (MAX_ROWS - 1)}px`;
	preview.style.overflowY = 'auto';
	preview.classList.add('places-photos-preview--scroll');
}

// ------------------------------------------------------------------
// Photos import toggle
// ------------------------------------------------------------------

/** Toggle photo import: fetch + preview when checked, clear when unchecked. */
function handlePhotosImportToggle(): void {
	const checkbox = getID<HTMLInputElement>('places-photos-import-input');
	if (!checkbox) return;

	if (checkbox.checked) {
		setStepData(IMPORT_PHOTOS_KEY, true);
		// Reset the fetch flag so re-checking re-runs the (API) photo fetch.
		setStepData(API_PHOTOS_FETCHED_KEY, false);
		void loadAndRenderPhotos();
	} else {
		setStepData(IMPORT_PHOTOS_KEY, false);
		setStepData(IMPORTED_PHOTOS_KEY, []);
		setStepData(SELECTED_PHOTOS_KEY, []);
		setStepData(API_PHOTOS_FETCHED_KEY, false);
		const preview = getID('places-photos-preview');
		if (preview) preview.innerHTML = '';
		updateCountBadge(0);
	}
}

/** Fetch the place's photos and render the previews into the preview area. */
async function loadAndRenderPhotos(): Promise<void> {
	const details = getStepData<PlaceDetails>(DETAILS_KEY);
	const preview = getID('places-photos-preview');
	if (!details || !preview) return;
	const base = getStepData<PlaceImage[]>(SCRAPER_PHOTOS_KEY) ?? [];

	try {
		const merged = await fetchAndMergeApiPhotos(details);
		if (merged === null) return; // cancelled
		setStepData(IMPORT_PHOTOS_KEY, true);
		setStepData(IMPORTED_PHOTOS_KEY, merged);
		selectAllPhotos(merged);
		setStepData(API_PHOTOS_FETCHED_KEY, true);
		preview.innerHTML = renderPreviewItems(merged, getSelectedSet());
		applyPreviewScroll(preview, merged.length);
		updateCountBadge(merged.length);
	} catch (error) {
		console.error('[places-photos] Failed to load photos', error);
		// Fall back to the scraper images when present (local import).
		if (base.length > 0) {
			setStepData(IMPORT_PHOTOS_KEY, true);
			setStepData(IMPORTED_PHOTOS_KEY, base);
			selectAllPhotos(base);
			setStepData(API_PHOTOS_FETCHED_KEY, true);
			preview.innerHTML = renderPreviewItems(base, getSelectedSet());
			applyPreviewScroll(preview, base.length);
			updateCountBadge(base.length);
		} else {
			const message =
				error instanceof Error && error.message
					? error.message
					: translate('placesApi.apply.error');
			preview.innerHTML = `<p class="places-photos-empty">${escapeHtml(message)}</p>`;
		}
	}
}

// ------------------------------------------------------------------
// Action handlers
// ------------------------------------------------------------------

/** Delete option — record the decision and apply it (deletes the item + closes). */
function handleClosedDelete(): void {
	setStepData(CLOSED_DECISION_KEY, 'delete' satisfies ClosedDecision);
	applyAndClose();
}

/** Ignore option — record the decision and apply the checked fields (+ close). */
function handleClosedIgnore(): void {
	setStepData(CLOSED_DECISION_KEY, 'ignore' satisfies ClosedDecision);
	applyAndClose();
}

/** Add [Closed] label option — record the decision and continue the normal flow. */
function handleClosedLabel(): void {
	setStepData(CLOSED_DECISION_KEY, 'label' satisfies ClosedDecision);
	// Skip the photos step when updating an existing linked place OR when the
	// user left "Include photos" off on search — never touch the photos route.
	if (
		getStepData<boolean>(UPDATE_EXISTING_KEY) ||
		!getStepData<boolean>(INCLUDE_PHOTOS_KEY)
	) {
		applyAndClose();
		return;
	}
	void goTo('photos');
}

/** Finish the photos step: apply only the selected photos, then close. */
function handlePhotosContinue(): void {
	const checkbox = getID<HTMLInputElement>('places-photos-import-input');
	const selected = getSelectedSet();
	const all = getStepData<PlaceImage[]>(IMPORTED_PHOTOS_KEY) ?? [];
	if (checkbox && !checkbox.checked) {
		setStepData(IMPORT_PHOTOS_KEY, false);
		setStepData(IMPORTED_PHOTOS_KEY, []);
	} else {
		// Apply exactly the photos the user kept selected.
		const photosToImport = all.filter((photo) => selected.has(photo.link));
		setStepData(IMPORT_PHOTOS_KEY, photosToImport.length > 0);
		setStepData(IMPORTED_PHOTOS_KEY, photosToImport);
	}
	applyAndClose();
}

// ------------------------------------------------------------------
// Error state
// ------------------------------------------------------------------

/** Render the inline error state (keeps the dialog open for a retry). */
function renderError(step: 'closed' | 'photos' = 'photos', error?: unknown): string {
	const message =
		error instanceof Error && error.message
			? error.message
			: translate('placesApi.apply.error');
	const retryAction = step === 'closed' ? 'places-closed-retry' : 'places-photos-retry';
	return `
	<div class="places-detail-error">
		<span>${escapeHtml(message)}</span>
		<button type="button" class="btn btn-basic" data-action="${retryAction}">
			${escapeHtml(translate('labels.try_again'))}
		</button>
	</div>`;
}

// ------------------------------------------------------------------
// Event wiring
// ------------------------------------------------------------------

/** 'change' on the photos-import checkbox (delegated, scoped to the dialog). */
function handlePhotosChange(event: Event): void {
	const target = event.target as Element | null;
	if (!target || !target.closest('#places-photos-import-input')) return;
	if (!getID('places-dialog')) return;
	handlePhotosImportToggle();
}

/** Enter/Space on a preview thumbnail toggles it (same as clicking). */
function handlePhotosKeydown(event: KeyboardEvent): void {
	if (event.key !== 'Enter' && event.key !== ' ') return;
	const target = event.target as Element | null;
	const item = target?.closest<HTMLElement>('.places-photos-preview-item');
	if (!item) return;
	if (!getID('places-dialog')) return;
	event.preventDefault();
	const index = Number(item.getAttribute('data-index'));
	if (!Number.isNaN(index)) togglePhoto(index);
}

/** Register the delegated click actions + the renderers (runs once on import). */
function registerClosedPhotosActions(): void {
	registerActions({
		'places-closed-delete': () => {
			handleClosedDelete();
		},
		'places-closed-ignore': () => {
			handleClosedIgnore();
		},
		'places-closed-label': () => {
			handleClosedLabel();
		},
		'places-photos-continue': () => {
			handlePhotosContinue();
		},
		'places-photos-toggle': (element) => {
			const index = Number((element as HTMLElement).getAttribute('data-index'));
			if (!Number.isNaN(index)) togglePhoto(index);
		},
		'places-photos-retry': () => {
			// Re-run the photos step renderer. goTo('photos') while already on
			// 'photos' does not push history, so this is a clean re-render.
			void goTo('photos');
		},
		'places-closed-retry': () => {
			// Re-run the closed step renderer (no fetch — just re-render).
			void goTo('closed');
		},
	});
}

// ------------------------------------------------------------------
// Init (self-registration)
// ------------------------------------------------------------------

registerStepRenderer('closed', renderClosedStep);
registerStepRenderer('photos', renderPhotosStep);
registerClosedPhotosActions();
document.addEventListener('change', handlePhotosChange);
document.addEventListener('keydown', handlePhotosKeydown);

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
