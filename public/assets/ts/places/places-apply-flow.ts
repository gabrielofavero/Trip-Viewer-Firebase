// ======= Places API — Apply & Persist (per-item) (P9) =======
// The final "done" step of the "Fetch Info With Maps" dialog. Renders a short
// summary of what will be applied and an Apply button; on confirm it:
//
//   1. Always saves the fetched info into the entry's `placeAPI`
//      (applyPlaceData persistence rule — see docs/ai-analysis/6-places-api-edit-destination.md §1.3).
//   2. Overrides the entry values only for the fields the user checked.
//   3. Applies the closed-place decision (delete / ignore / add [Closed] label).
//   4. Replaces `entry.images` with the imported photos (first 3) when chosen.
//   5. Updates the edit form DOM, refreshes the pending destination data, and
//      persists immediately via a dot-path `updateDestination()` so the dialog's
//      work is never lost (plan §5 P9 step 3 — default: immediate update).
//
// This module self-registers (at import time):
//   - the 'done' step renderer via registerStepRenderer(),
//   - the 'places-apply-confirm' click action via registerActions()
//     (data-action delegation, see ui/actions.ts).
//
// Reads cross-step data produced by the earlier steps:
//   - P7 (places-details-step): DETAILS_KEY / CHECKED_KEY
//   - P8 (places-closed-photos-step): CLOSED_DECISION_KEY / IMPORT_PHOTOS_KEY / IMPORTED_PHOTOS_KEY
//   - P3 (places-apply): applyPlaceData(), FIELD_KEYS, getClosedLabel()
//
// References:
// - docs/ai-analysis/6-places-api-edit-destination.md (§4, §5 P9)
// - places/places-dialog.ts (P5 shell: registerStepRenderer, getStepData, closeDialog, …)
// - data/services/destination.service.ts (updateDestination dot-path)

import { registerActions } from '../ui/actions.js';
import { getLanguagePackName, translate } from '../i18n/translation.js';
import { getID, getOrCreateCategoryID, removeChildWithValidation } from '../utils/dom.js';
import { displayError, openToast } from '../utils/messages.js';
import { buildDS, removeSelectorDS, updateValueDS } from '../ui/dynamic-select.js';
import { DOCUMENT_ID, FIRESTORE_DESTINATIONS_DATA, FIRESTORE_DESTINATIONS_NEW_DATA } from '../data/state.js';
import { updateDestination } from '../data/services/destination.service.js';
import { setDescription, updateDescriptionButtonLabel } from '../pages/edit-destination/categories/description.js';
import { loadCurrencyValueAndVisibility } from '../pages/edit-destination/categories/price.js';
import {
	DESTINATION_IMAGES,
	removeDestinationImages,
	setDestinationImageButtonLabel,
} from '../pages/edit-destination/categories/image.js';
import { applyPlaceData, getClosedLabel, type PlaceFieldKey } from './places-apply.js';
// Places API bulk "Update with Maps" (P11). Side-effect import: guarantees the
// bulk module (runBulkUpdate + report) is part of the edit-destination bundle.
// Loaded here (P9's file) so it does NOT touch P10's files (edit-destination.ts
// / destination.html) while P10 runs in parallel.
import './places-bulk.js';
import {
	closeDialog,
	getDialogContext,
	getStepData,
	hideDialogLoading,
	registerStepRenderer,
	showDialogLoading,
} from './places-dialog.js';
import type { PlacesDialogContext } from './places-dialog.js';
import { CHECKED_KEY, DETAILS_KEY } from './places-details-step.js';
import {
	CLOSED_DECISION_KEY,
	IMPORTED_PHOTOS_KEY,
	IMPORT_PHOTOS_KEY,
	type ClosedDecision,
} from './places-closed-photos-step.js';
import type { PlaceDetails } from '../models/places-api.model.js';
import type { PlaceAPI, PlaceImage, PlaceItem } from '../models/schema.js';

/** Max photos imported from the photos route (route returns ≤ 3; defensive cap). */
const MAX_PHOTOS = 3;

// ------------------------------------------------------------------
// Step renderer: done
// ------------------------------------------------------------------

/**
 * Render the 'done' step: a summary of what will be applied + an Apply button.
 * Reached from P8 via goTo('done') — the back button returns to the previous
 * step (photos / closed) so the user can still change their mind.
 */
function renderDoneStep(_context: PlacesDialogContext): string {
	const details = getStepData<PlaceDetails>(DETAILS_KEY);
	const checked = getStepData<PlaceFieldKey[]>(CHECKED_KEY) ?? [];
	const closedDecision = getStepData<ClosedDecision>(CLOSED_DECISION_KEY);
	const importPhotos = getStepData<boolean>(IMPORT_PHOTOS_KEY) ?? false;
	const importedPhotos = getStepData<PlaceImage[]>(IMPORTED_PHOTOS_KEY) ?? [];

	if (!details) {
		return `<div class="places-dialog-error">${escapeHtml(
			translate('placesApi.apply.error'),
		)}</div>`;
	}

	const lines: string[] = [];

	if (closedDecision === 'delete') {
		lines.push(escapeHtml(translate('placesApi.apply.deleteItem')));
	} else {
		lines.push(escapeHtml(translate('placesApi.apply.fields', { count: String(checked.length) })));
		if (closedDecision === 'label') {
			lines.push(escapeHtml(translate('placesApi.apply.closedLabel')));
		}
		if (importPhotos && importedPhotos.length > 0) {
			lines.push(
				escapeHtml(translate('placesApi.apply.photos', { count: String(importedPhotos.length) })),
			);
		}
	}

	return `
	<div class="places-apply">
		<div class="places-apply-icon">
			<i class="iconify" data-icon="material-symbols-light:check_circle"></i>
		</div>
		<h3 class="places-apply-title">${escapeHtml(translate('placesApi.apply.title'))}</h3>
		<ul class="places-apply-summary">
			${lines.map((line) => `<li>${line}</li>`).join('')}
		</ul>
		<div class="places-details-footer">
			<button type="button" class="places-details-continue" data-action="places-apply-confirm">
				${escapeHtml(translate('placesApi.apply.confirm'))}
			</button>
		</div>
	</div>`;
}

// ------------------------------------------------------------------
// Confirm handler (apply + persist)
// ------------------------------------------------------------------

/**
 * Apply the fetched place to the entry, update the form, refresh the pending
 * data, and persist immediately via dot-path updateDestination().
 */
async function handleApplyConfirm(): Promise<void> {
	const context = getDialogContext();
	if (!context) return;

	const details = getStepData<PlaceDetails>(DETAILS_KEY);
	const checked = getStepData<PlaceFieldKey[]>(CHECKED_KEY) ?? [];
	const closedDecision = getStepData<ClosedDecision>(CLOSED_DECISION_KEY);
	const importPhotos = getStepData<boolean>(IMPORT_PHOTOS_KEY) ?? false;
	const importedPhotos = getStepData<PlaceImage[]>(IMPORTED_PHOTOS_KEY) ?? [];

	if (!details) {
		displayError(new Error(translate('placesApi.apply.error')));
		return;
	}

	const category = context.category;
	const j = context.j;

	// Whether the entry already exists in Firestore: the hidden id input is
	// populated for loaded destinations, empty for brand-new, never-saved
	// entries. Only existing entries are written to the DB immediately — new
	// entries are staged in the form + pending data and created by the page's
	// normal Save flow (which reuses this id, made sticky below).
	const hadExistingId = Boolean(getID(`${category}-id-${j}`)?.value);

	const id = getOrCreateCategoryID(category, j);
	// Make the generated id sticky so a later Save uses the same entry id.
	const idInput = getID(`${category}-id-${j}`);
	if (idInput && !idInput.value) idInput.value = id;

	showDialogLoading(translate('placesApi.loading.applying'));

	try {
		// Closed-place "delete" decision: remove the item everywhere.
		if (closedDecision === 'delete') {
			await deleteItem(category, j, id, hadExistingId);
			return;
		}

		const lang = getLanguagePackName();

		// Start from the live loaded entry (preserves app-managed fields like
		// isNew/createdAt/media), falling back to a fresh object for new entries.
		const existing = FIRESTORE_DESTINATIONS_DATA?.[category]?.[id] ?? {};
		const entry = applyPlaceData({
			entry: existing as PlaceItem,
			newPlace: details,
			fieldsToApply: checked,
			lang,
		});

		// "[Closed]" label decision → flag + title marker.
		let applyClosedLabel = false;
		if (closedDecision === 'label') {
			entry.placeAPI = { ...entry.placeAPI, closed: true } as PlaceAPI;
			applyClosedLabel = true;
		}

		// Photos import → replace the entry's images with the first 3 imported.
		const photosToApply = importPhotos ? importedPhotos.slice(0, MAX_PHOTOS) : [];
		const applyPhotos = photosToApply.length > 0;
		if (applyPhotos) {
			entry.images = photosToApply;
		}

		// Update the edit form DOM so the entry reflects the applied data.
		updateFormEntry(category, j, entry, checked, applyClosedLabel, applyPhotos);

		// Refresh the pending destination data (same keys buildDestinationCategoryObject uses).
		refreshPendingData(category, id, entry);

		// Persist immediately (dot-path update) so the dialog's work is never lost.
		if (hadExistingId) {
			await persistEntry(category, id, entry, checked, applyPhotos);
		}

		closeDialog();
		void refreshBulkButton();
		openToast(translate('placesApi.apply.success'));
	} catch (error) {
		console.error('[places-apply] Failed to apply place info', error);
		hideDialogLoading();
		displayError(error instanceof Error ? error : new Error(translate('placesApi.apply.error')));
	}
}

// ------------------------------------------------------------------
// Persistence (dot-path update / delete)
// ------------------------------------------------------------------

/**
 * Persist the entry via a single dot-path update on destinations/{id}:
 * placeAPI is always written; checked fields override the entry values; images
 * are written only when photos were imported.
 */
async function persistEntry(
	category: string,
	id: string,
	entry: PlaceItem,
	fieldsToApply: readonly PlaceFieldKey[],
	applyPhotos: boolean,
): Promise<void> {
	if (!DOCUMENT_ID) {
		throw new Error(translate('placesApi.apply.error'));
	}

	const base = `${category}.${id}`;
	const updates: Record<string, unknown> = {
		[`${base}.placeAPI`]: entry.placeAPI,
	};

	for (const field of fieldsToApply) {
		if (field === 'description') {
			updates[`${base}.description`] = entry.description;
		} else {
			updates[`${base}.${field}`] = entry[field];
		}
	}

	if (applyPhotos) {
		updates[`${base}.images`] = entry.images;
	}

	const result = await updateDestination(DOCUMENT_ID, updates);
	if (!result?.success) {
		throw new Error(result?.message || translate('placesApi.apply.error'));
	}
}

/**
 * Apply the "delete" closed decision: remove the entry from the form, the
 * in-memory data, and (when it was already persisted) from Firestore.
 */
async function deleteItem(
	category: string,
	j: number,
	id: string,
	hadExistingId: boolean,
): Promise<void> {
	// Persist the deletion first, so a DB failure leaves the form intact.
	if (hadExistingId && DOCUMENT_ID) {
		const result = await updateDestination(DOCUMENT_ID, {
			[`${category}.${id}`]: firebase.firestore.FieldValue.delete(),
		});
		if (!result?.success) {
			throw new Error(result?.message || translate('placesApi.apply.error'));
		}
	}

	// Remove the accordion item + its dynamic selectors + staged images.
	removeChildWithValidation(category, j);
	removeSelectorDS('region', `${category}-region-select-${j}`);
	removeDestinationImages(category, j);

	// Remove from in-memory data.
	if (FIRESTORE_DESTINATIONS_DATA?.[category]) delete FIRESTORE_DESTINATIONS_DATA[category][id];
	if (FIRESTORE_DESTINATIONS_NEW_DATA?.[category]) delete FIRESTORE_DESTINATIONS_NEW_DATA[category][id];

	closeDialog();
	void refreshBulkButton();
	openToast(translate('placesApi.apply.success'));
}

/**
 * Refresh the edit page's bulk "Update with Maps" button after a per-item
 * apply/delete changed the number of linked entries (P10 integration).
 * Dynamic import avoids a circular dependency (edit-destination → apply-flow).
 */
async function refreshBulkButton(): Promise<void> {
	try {
		// Note: from places/ the edit-destination module is one level up
		// (../pages/...), not two (../../pages/... would resolve to public/assets/pages).
		const { refreshPlacesBulkButton } = await import(
			'../pages/edit-destination/edit-destination.js'
		);
		refreshPlacesBulkButton();
	} catch {
		// Not on the edit page (or module unavailable) — nothing to refresh.
	}
}

// ------------------------------------------------------------------
// Form DOM + pending-data updates
// ------------------------------------------------------------------

/**
 * Update the edit form so it reflects the applied entry. Only the checked
 * fields are written to their inputs; the description button label, staged
 * images and the accordion title are kept in sync.
 *
 * Exported so the bulk flow (P12) reuses the exact same DOM-sync logic.
 */
export function updateFormEntry(
	category: string,
	j: number,
	entry: PlaceItem,
	fieldsToApply: readonly PlaceFieldKey[],
	applyClosedLabel: boolean,
	applyPhotos: boolean,
): void {
	const fieldsToApplyList = Array.from(fieldsToApply);
	let regionApplied = false;

	// Description is stored in hidden per-language inputs + the button label.
	if (fieldsToApplyList.includes('description')) {
		setDescription(category, j, entry.description);
		updateDescriptionButtonLabel(category, j);
	}

	for (const field of fieldsToApplyList) {
		switch (field) {
			case 'name':
				setInputValue(`${category}-name-${j}`, entry.name);
				break;
			case 'emoji':
				setInputValue(`${category}-emoji-${j}`, entry.emoji);
				break;
			case 'website':
				setInputValue(`${category}-website-${j}`, entry.website);
				break;
			case 'instagram':
				setInputValue(`${category}-instagram-${j}`, entry.instagram);
				break;
			case 'map':
				setInputValue(`${category}-map-${j}`, entry.map);
				break;
			case 'region':
				setInputValue(`${category}-region-${j}`, entry.region);
				updateValueDS('region', entry.region, `${category}-region-select-${j}`);
				regionApplied = true;
				break;
			case 'rating':
				setInputValue(`${category}-rating-${j}`, entry.rating);
				break;
			case 'price':
				setPriceValue(category, j, entry.price);
				break;
			default:
				break;
		}
	}

	// Rebuild the region dynamic-selects so a newly-applied region option is
	// available across all categories (same pattern as loading a destination).
	if (regionApplied) {
		buildDS('region');
	}

	// Photos replace the entry's staged images (first 3 imported).
	if (applyPhotos) {
		DESTINATION_IMAGES[`${category}-${j}`] = (entry.images ?? []).map((image) => ({
			description: image.description ?? '',
			link: image.link ?? '',
		}));
		setDestinationImageButtonLabel(category, j);
	}

	// Refresh the accordion title (name + emoji) and apply the [Closed] marker.
	updateAccordionTitle(category, j, applyClosedLabel);
}

/**
 * Refresh FIRESTORE_DESTINATIONS_NEW_DATA for the edited entry using the same
 * paths buildDestinationCategoryObject() uses (category → id → entry). The
 * entry includes placeAPI, which the form-only builder can't represent.
 *
 * Exported so the bulk flow (P12) reuses the exact same pending-data sync.
 */
export function refreshPendingData(category: string, id: string, entry: PlaceItem): void {
	const newData = FIRESTORE_DESTINATIONS_NEW_DATA ?? {};
	if (!newData[category]) newData[category] = {};
	newData[category][id] = { ...(newData[category][id] ?? {}), ...entry };
}

// ------------------------------------------------------------------
// Small form helpers (mirror the edit page's own field handling)
// ------------------------------------------------------------------

function setInputValue(id: string, value: string): void {
	const input = getID<HTMLInputElement>(id);
	if (input) input.value = value ?? '';
}

/**
 * Set the price into the price select, falling back to the "other" input when
 * the value isn't one of the currency-scaled options (reuses the edit page's
 * loadCurrencyValueAndVisibility + keeps the other-input required state in sync).
 */
function setPriceValue(category: string, j: number, price: string): void {
	const priceSelect = getID<HTMLSelectElement>(`${category}-price-${j}`);
	const otherPrice = getID<HTMLInputElement>(`${category}-other-price-${j}`);
	if (!priceSelect || !otherPrice) return;

	loadCurrencyValueAndVisibility(price, category, j);
	otherPrice.required = priceSelect.value === 'other';
}

/**
 * Refresh the accordion title (name + emoji), optionally prefixing the
 * translatable "[Closed]" label. Mirrors updateDestinationsTitle().
 */
function updateAccordionTitle(category: string, j: number, applyClosedLabel = false): void {
	const titleDiv = getID(`${category}-title-text-${j}`);
	if (!titleDiv) return;

	const name = getID<HTMLInputElement>(`${category}-name-${j}`)?.value ?? '';
	const emojiInput = getID<HTMLInputElement>(`${category}-emoji-${j}`)?.value ?? '';
	const emoji = emojiInput ? emojiInput.replace(/[a-zA-Z0-9\s!-\/:-@\[-`{-~]/g, '') : '';

	let text = name;
	if (emoji && name) text = `${name} ${emoji}`;
	if (applyClosedLabel) {
		text = `${getClosedLabel()} ${text}`.trim();
	}
	titleDiv.innerText = text;

	// Mirror updateDestinationsTitle()'s isNew icon visibility.
	const icon = getID(`${category}-title-icon-${j}`);
	if (icon) {
		icon.style.display = getID<HTMLInputElement>(`${category}-isNew-${j}`)?.checked
			? 'block'
			: 'none';
	}
}

// ------------------------------------------------------------------
// Event wiring
// ------------------------------------------------------------------

/** Register the 'done' step renderer + the confirm action (runs once on import). */
function registerApplyFlow(): void {
	registerStepRenderer('done', renderDoneStep);
	registerActions({
		'places-apply-confirm': () => {
			void handleApplyConfirm();
		},
	});
}

// ------------------------------------------------------------------
// Init (self-registration)
// ------------------------------------------------------------------

registerApplyFlow();

// ------------------------------------------------------------------
// HTML escaping helpers (local copies, same pattern as backup modules)
// ------------------------------------------------------------------

function escapeHtml(value: string): string {
	const div = document.createElement('div');
	div.textContent = value;
	return div.innerHTML;
}
