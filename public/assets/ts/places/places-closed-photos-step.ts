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
//     If the user unchecks the box, no photos are applied. Decisions are stored
//     in cross-step data so P9 can apply/persist them.
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
import { getID } from '../utils/dom.js';

/** Cross-step data key where P7 stores the fetched full place details. */
export const DETAILS_KEY = 'placeDetails';
/** Cross-step data key for the closed-place decision (P9 reads it). */
export const CLOSED_DECISION_KEY = 'closedDecision';
/** Cross-step data key: whether the user opted to import photos (P9 reads it). */
export const IMPORT_PHOTOS_KEY = 'importPhotos';
/** Cross-step data key: the imported photos mapped to { description, link } (P9 reads it). */
export const IMPORTED_PHOTOS_KEY = 'importedPhotos';

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

	// Only fetch when import is enabled and we haven't fetched yet.
	if (importPhotos && imported.length === 0) {
		try {
			// uid + lang are resolved by the service (getUID + active language pack).
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
			if (photos === null) return ''; // cancelled (dialog closed / X clicked)
			imported = photos.slice(0, MAX_PHOTOS).map((photo) => ({
				description: '',
				link: photo.url,
			}));
			setStepData(IMPORT_PHOTOS_KEY, true);
			setStepData(IMPORTED_PHOTOS_KEY, imported);
		} catch (error) {
			// Non-abort failure — surface inline so the user can retry in place.
			console.error('[places-photos] Failed to load photos', error);
			return renderError(error);
		}
	}

	return renderPhotosHTML(importPhotos, imported);
}

/** Render the photos step shell: checkbox + preview area + footer. */
function renderPhotosHTML(importPhotos: boolean, imported: PlaceImage[]): string {
	return `
	<div class="places-photos">
		<p class="places-photos-hint">${escapeHtml(translate('placesApi.photos.canImport'))}</p>
		<label class="places-photos-import">
			<input type="checkbox" id="places-photos-import-input" class="places-photos-import-input"
				${importPhotos ? 'checked' : ''} />
			<span>${escapeHtml(translate('placesApi.photos.import'))}</span>
		</label>
		<div id="places-photos-preview" class="places-photos-preview" aria-live="polite">
			${renderPreviewItems(imported)}
		</div>
		<div class="places-details-footer">
			<button type="button" class="places-details-continue" data-action="places-photos-continue">
				${escapeHtml(translate('placesApi.details.continue'))}
			</button>
		</div>
	</div>`;
}

/** Render the photo preview thumbnails (or the empty state). */
function renderPreviewItems(photos: PlaceImage[]): string {
	if (photos.length === 0) {
		return `<p class="places-photos-empty">${escapeHtml(
			translate('placesApi.photos.none'),
		)}</p>`;
	}
	return photos
		.map(
			(photo, index) => `
			<figure class="places-photos-preview-item">
				<img src="${escapeAttr(photo.link)}" alt="${escapeAttr(photo.description || '')}"
					loading="lazy" />
				<figcaption>${index + 1}</figcaption>
			</figure>`,
		)
		.join('');
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
		void loadAndRenderPhotos();
	} else {
		setStepData(IMPORT_PHOTOS_KEY, false);
		setStepData(IMPORTED_PHOTOS_KEY, []);
		const preview = getID('places-photos-preview');
		if (preview) preview.innerHTML = '';
	}
}

/** Fetch the place's photos and render the previews into the preview area. */
async function loadAndRenderPhotos(): Promise<void> {
	const details = getStepData<PlaceDetails>(DETAILS_KEY);
	const preview = getID('places-photos-preview');
	if (!details || !preview) return;

	try {
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
		if (photos === null) return; // cancelled
		const imported = photos
			.slice(0, MAX_PHOTOS)
			.map((photo) => ({ description: '', link: photo.url }));
		setStepData(IMPORT_PHOTOS_KEY, true);
		setStepData(IMPORTED_PHOTOS_KEY, imported);
		preview.innerHTML = renderPreviewItems(imported);
	} catch (error) {
		console.error('[places-photos] Failed to load photos', error);
		const message =
			error instanceof Error && error.message ? error.message : translate('placesApi.apply.error');
		preview.innerHTML = `<p class="places-photos-empty">${escapeHtml(message)}</p>`;
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
	// Updating an existing linked place skips the photos step → apply directly.
	if (getStepData<boolean>(UPDATE_EXISTING_KEY)) {
		applyAndClose();
		return;
	}
	void goTo('photos');
}

/** Finish the photos step: sync the checkbox state, then apply + close. */
function handlePhotosContinue(): void {
	const checkbox = getID<HTMLInputElement>('places-photos-import-input');
	if (checkbox && !checkbox.checked) {
		setStepData(IMPORT_PHOTOS_KEY, false);
		setStepData(IMPORTED_PHOTOS_KEY, []);
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
