// ======= Places API — Apply (per-item) (P9) =======
// Applies the fetched place info to the entry and closes the dialog. It is
// called directly when the "Fetch Info With Maps" flow finishes (photos step
// or a closed-place decision) — there is NO separate confirmation step. It:
//
//   1. Always saves the fetched info into the entry's `placeAPI`
//      (applyPlaceData persistence rule — see docs/implementation-plans/20260812-places-api-edit-destination.md §1.3).
//   2. Overrides the entry values only for the fields the user checked.
//   3. Applies the closed-place decision (delete / ignore / add [Closed] label).
//   4. Replaces `entry.images` with the imported photos (first 3) when chosen.
//   5. Updates the edit form DOM and refreshes the pending destination data —
//      NO immediate Firestore write. The page's normal Save button persists
//      everything; the dialog only stages the data locally.
//
// Reads cross-step data produced by the earlier steps:
//   - P7 (places-details-step): DETAILS_KEY / CHECKED_KEY
//   - P8 (places-closed-photos-step): CLOSED_DECISION_KEY / IMPORT_PHOTOS_KEY / IMPORTED_PHOTOS_KEY
//   - P3 (places-apply): applyPlaceData(), FIELD_KEYS, getClosedLabel()
//
// References:
// - docs/implementation-plans/20260812-places-api-edit-destination.md (§4, §5 P9)
// - places/places-dialog.ts (P5 shell: getStepData, closeDialog, …)

import { getLanguagePackName, translate } from '../i18n/translation.js';
import { getID, getOrCreateCategoryID, removeChildWithValidation } from '../utils/dom.js';
import { displayError, openToast } from '../utils/messages.js';
import {
	addKnownValues,
	buildRegionSelects,
	renderRegionPills,
	unregisterRegionSelect,
} from '../ui/region-select.js';
import { FIRESTORE_DESTINATIONS_DATA, FIRESTORE_DESTINATIONS_NEW_DATA } from '../data/state.js';
import {
	setDescription,
	updateDescriptionButtonLabel,
} from '../pages/edit-destination/categories/description.js';
import { loadCurrencyValueAndVisibility } from '../pages/edit-destination/categories/price.js';
import {
	DESTINATION_IMAGES,
	removeDestinationImages,
	setDestinationImageButtonLabel,
} from '../pages/edit-destination/categories/image.js';
import { applyPlaceData, getClosedLabel, type PlaceFieldKey } from './places-apply.js';
import { updatePlacesFetchButtonLabel } from '../pages/edit-destination/new-destination.js';
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
	showDialogLoading,
} from './places-dialog.js';
import { CHECKED_KEY, DETAILS_KEY } from './places-details-step.js';
import {
	CLOSED_DECISION_KEY,
	IMPORTED_PHOTOS_KEY,
	IMPORT_PHOTOS_KEY,
	type ClosedDecision,
} from './places-closed-photos-step.js';
import { LOCAL_SOURCE_URL_KEY } from './places-local-step.js';
import type { PlaceDetails } from '../models/places-api.model.js';
import type { PlaceAPI, PlaceImage, PlaceItem } from '../models/schema.js';


// ------------------------------------------------------------------
// Apply (called directly at the end of the flow — no confirmation step)
// ------------------------------------------------------------------

/**
 * Apply the fetched place to the entry, update the form + pending data, and
 * close the dialog. Nothing is written to Firestore here — the page's Save
 * button persists it. Exported so the photos/closed step (P8) calls it when
 * the user finishes the flow.
 */
export function applyAndClose(): void {
	const context = getDialogContext();
	if (!context) return;

	const details = getStepData<PlaceDetails>(DETAILS_KEY);
	const checked = getStepData<PlaceFieldKey[]>(CHECKED_KEY) ?? [];
	const closedDecision = getStepData<ClosedDecision>(CLOSED_DECISION_KEY);
	const importPhotos = getStepData<boolean>(IMPORT_PHOTOS_KEY) ?? false;
	const importedPhotos = getStepData<PlaceImage[]>(IMPORTED_PHOTOS_KEY) ?? [];

	if (!details) {
		displayError(new Error(translate('placesApi.apply.error')), false, false);
		return;
	}

	const category = context.category;
	const j = context.j;

	const id = getOrCreateCategoryID(category, j);
	// Make the generated id sticky so a later Save uses the same entry id.
	const idInput = getID(`${category}-id-${j}`);
	if (idInput && !idInput.value) idInput.value = id;

	showDialogLoading(translate('placesApi.loading.applying'));

	try {
		// Closed-place "delete" decision: remove the item locally.
		if (closedDecision === 'delete') {
			deleteItem(category, j, id);
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

		// Local (gmaps scraper) imports persist the canonical Maps link so the
		// entry stays refreshable even when the scraper left `id` blank.
		const sourceUrl = getStepData<string>(LOCAL_SOURCE_URL_KEY);
		if (sourceUrl) {
			entry.placeAPI = { ...entry.placeAPI, sourceUrl } as PlaceAPI;
		}

		// "[Closed]" label decision → flag + title marker.
		let applyClosedLabel = false;
		if (closedDecision === 'label') {
			entry.placeAPI = { ...entry.placeAPI, closed: true } as PlaceAPI;
			applyClosedLabel = true;
		}

		// Photos import → replace the entry's images with exactly the imported
		// photos the user previewed + kept selected in the photos step (no
		// hidden cap — the photos route returns ≤ 3, the scraper returns all
		// of its images).
		const photosToApply = importPhotos ? importedPhotos : [];
		const applyPhotos = photosToApply.length > 0;
		if (applyPhotos) {
			entry.images = photosToApply;
		}

		// Update the edit form DOM so the entry reflects the applied data.
		updateFormEntry(category, j, entry, checked, applyClosedLabel, applyPhotos);

		// Refresh the pending destination data (same keys buildDestinationCategoryObject uses).
		// No Firestore write here — the page's Save button persists everything.
		refreshPendingData(category, id, entry);

		// The entry is now linked to a Google place — flip its button label to
		// "Update with Maps" without needing a page reload.
		updatePlacesFetchButtonLabel(category, j);

		closeDialog();
		void refreshBulkButton();
		openToast(translate('placesApi.apply.success'));
	} catch (error) {
		console.error('[places-apply] Failed to apply place info', error);
		hideDialogLoading();
		displayError(error instanceof Error ? error : new Error(translate('placesApi.apply.error')), false, false);
	}
}

// ------------------------------------------------------------------
// Delete handling (local-only)
// ------------------------------------------------------------------

/**
 * Apply the "delete" closed decision: remove the entry from the form and the
 * in-memory data. No Firestore write happens here — the page's Save button
 * persists the removal.
 */
function deleteItem(category: string, j: number, id: string): void {
	// Remove the accordion item + its dynamic selectors + staged images.
	removeChildWithValidation(category, j);
	unregisterRegionSelect(`${category}-region-select-${j}`);
	removeDestinationImages(category, j);

	// Remove from in-memory data.
	if (FIRESTORE_DESTINATIONS_DATA?.[category]) delete FIRESTORE_DESTINATIONS_DATA[category][id];
	if (FIRESTORE_DESTINATIONS_NEW_DATA?.[category])
		delete FIRESTORE_DESTINATIONS_NEW_DATA[category][id];

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
				renderRegionPills(`${category}-regions-${j}`, entry.regions);
				addKnownValues(entry.regions);
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
		buildRegionSelects();
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
