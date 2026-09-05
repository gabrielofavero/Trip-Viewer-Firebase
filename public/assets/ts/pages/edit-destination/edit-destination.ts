import { startLoadingScreen, stopLoadingScreen } from '../../utils/loading.js';
import {
	closeMessage,
	displayError,
	displayFullMessage,
	getContainersInput,
} from '../../utils/messages.js';
import { getTodayFormatted, getTomorrowFormatted } from '../../utils/dates.js';
import {
	cloneObject,
	firstCharToUpperCase,
	getChildIDs,
	getID,
	getJ,
	getNextJ,
	getURLParam,
	removeChildWithValidation,
	removeRequired,
	setRequired,
} from '../../utils/dom.js';
import {
	buildRegionSelects,
	getRegionPills,
	resetRegionSelects,
	unregisterRegionSelect,
} from '../../ui/region-select.js';
import { destroyMapLinksEditor } from '../../ui/map-links-editor.js';
import {
	hasStagedChanges,
	hasUnsavedChanges,
	snapshotFormState,
	validateImageLink,
	validateInstagramLink,
	validateLink,
	validateMapLink,
	validateMediaLink,
} from '../../ui/fields.js';
import { hideContent, loadEditModule, showContent } from '../../theme/visibility.js';
import { closeAccordions, openLastAccordion } from '../../ui/accordion.js';
import { translate } from '../../i18n/translation.js';
import { deleteUserObjectDB, getPermissions, getSingleData } from '../../data/firebase/database.js';
import { loadImageSelector, PERMISSIONS, setPermissions } from '../../data/firebase/storage.js';
import { PLACES_API_ENABLED } from '../../data/services/places-api.service.js';
import { GMAPS_SCRAPER_ENABLED } from '../../data/services/gmaps-scraper.service.js';
import { MYMAPS_KML_ENABLED } from '../../data/services/mymaps-kml.service.js';
import { loadVisibilityIndex } from '../home/support/visibility.js';
import { loadEditDestinationListeners } from './support/event-listeners.js';
import { getVisibility } from '../../theme/theme.js';
import { populateExistingDestinationForm } from './existing-destination.js';
import { initMapPreview, updateMapPreview, clearMapPreview } from './map-preview.js';
import { getDescription } from './categories/description.js';
import { setDescription } from './categories/description.js';
import { updateDescriptionButtonLabel } from './categories/description.js';
import { loadCurrencySelects } from './categories/price.js';
import { DESTINATION_IMAGES, removeDestinationImages } from './categories/image.js';
import { addDestination } from './existing-destination.js';
import { addDestinationHTML } from './existing-destination.js';
import { addSnacks } from './new-destination.js';
import { addShopping } from './new-destination.js';
import { addRestaurants } from './new-destination.js';
import { addNightlife } from './new-destination.js';
import { addTourism } from './new-destination.js';
import { updateRatingBadge } from './new-destination.js';
import { setDocument } from '../../utils/set.js';
import { buildDestinationObject, updateTikTokLinks } from './set-destination.js';
import {
	FIRESTORE_DESTINATIONS_DATA,
	FIRESTORE_DESTINATIONS_NEW_DATA,
	SUCCESSFUL_SAVE,
	DOCUMENT_ID,
	setDocumentId,
	setFirestoreDestinationsData,
	getState,
} from '../../data/state.js';
import { MESSAGE_PROPERTIES } from '../../utils/messages.js';
import { initEditTabs } from '../../ui/edit-tabs.js';
import { refreshImagePickers } from '../../ui/image-picker.js';
// Places API dialog shell (P5). Imported here so it's part of the edit page
// bundle; `populateDevPage` exposes it for console testing until P4 wires the
// real accordion button.
import { openPlacesDialog } from '../../places/places-dialog.js';
// Places API step 1 — search (P6). Side-effect import: self-registers the
// 'search' step renderer + actions on import.
import '../../places/places-search-step.js';
// Places API — linked-place decision (P6b). Side-effect import: self-registers
// the 'linked' step renderer + actions on import.
import '../../places/places-linked-step.js';
// Places API step 2 — details (P7). Side-effect import: self-registers the
// 'details' step renderer + actions on import.
import '../../places/places-details-step.js';
// Places API step 3 — closed + photos (P8). Side-effect import: self-registers
// the 'closed' and 'photos' step renderers + actions on import.
import '../../places/places-closed-photos-step.js';
// Places API apply & persist (P9). Side-effect import: self-registers the
// 'done' step renderer + the apply/confirm action on import.
import '../../places/places-apply-flow.js';
// Places API — bulk "Enrich pending items" (P3). Side-effect import:
// registers the 'places-bulk-enrich' card action + the pending dialog flow.
import '../../places/places-pending.js';
import { runEnrichPending } from '../../places/places-pending.js';
// Places API — bulk "Update with Maps" (P10 hand-off to P11, run in parallel).
// P11 (places/places-bulk.ts) exports the contract used here:
//   export async function runBulkPlacesUpdate(): Promise<void> — bulk fetch + report
//   export function countLinkedItems(): number               — linked-item count
// runBulkPlacesUpdate() owns the dialog-scoped loading, the per-linked-item
// getPlace() fetches, and the report rendering (see docs/implementation-plans/20260812-places-api-edit-destination.md §5 P11).
// countBulkEligibleEntries() decides whether the bulk button opens the source
// prompt or routes straight to the My Maps import; runBulkLocalUpdate() is the
// bulk gmaps-scraper path.
import {
	countLinkedItems,
	countUnlinkedItems,
	runBulkLocalUpdate,
	runBulkPlacesUpdate,
} from '../../places/places-bulk.js';
// Places API — import source selection + local (gmaps scraper) step. The
// source step module self-registers its 'source' step renderer + per-item
// actions on import; the local step registers the maps-link import step.
// Only the bulk "Local (gmaps scraper)" card action is reused here (P1) — the
// per-item dialog still renders getSourceOptionsHTML() internally.
import { SOURCE_LOCAL_BULK_ACTION } from '../../places/places-source-step.js';
import '../../places/places-local-step.js';
import { registerActions } from '../../ui/actions.js';
// My Maps import (P4). Side-effect import: self-registers the
// 'mymaps-import' action + the review/write dialog flow on import, and joins
// the edit-destination bundle (esbuild follows the import). Also used directly
// for the bulk source-step "My Maps" option below.
import { openMymapsReimportDialog } from './support/mymaps-import.js';

const TODAY = getTodayFormatted();
const TOMORROW = getTomorrowFormatted();

var SCHEDULE = {};

export async function loadEditDestinationPage() {
	loadEditDestinationListeners();

	setDocumentId(getURLParam('d'));
	populateDevPage();

	setPermissions(await getPermissions());

	loadVisibilityIndex();
	initEditTabs();
	loadEnabled();
	resetRegionSelects();

	if (DOCUMENT_ID) {
		await loadDestinations();
	}

	loadImageSelector('background');

	loadEventListeners();

	// Render the wallpaper picker card (value is set while loading the doc).
	refreshImagePickers();
	stopLoadingScreen();
	snapshotFormState();
	$('body').css('overflow', 'auto');

	populateDevPage();
}

function loadEnabled() {
	loadEditModule('images');
	loadEditModule('restaurants');
	loadEditModule('snacks');
	loadEditModule('nightlife');
	loadEditModule('tourism');
	loadEditModule('shopping');
	loadEditModule('map');

	const mapCheckbox = getID('map-enabled');
	mapCheckbox.addEventListener('change', function () {
		if (mapCheckbox.checked) {
			setRequired('map-link');
			// Re-render in case a valid link was already typed before enabling.
			updateMapPreview();
		} else {
			removeRequired('map-link');
			clearMapPreview();
		}
	});

	// Live My Maps preview under the link field: refreshes as the value
	// changes and renders once on load (existing destinations dispatch an
	// `input` event after populating the field — see existing-destination.ts).
	initMapPreview();
}

// ============================================================
// Item ordering (edit destination page) — VISUAL ONLY.
// The sort mode is shared across every category and persisted in
// localStorage (per-user preference). Reordering never changes the
// saved document: set-destination.ts always stores items in
// creation-date order (see buildDestinationCategoryObject).
// ============================================================

/** Categories whose accordion boxes support the on-page sort control. */
const SORTABLE_CATEGORIES = ['restaurants', 'snacks', 'nightlife', 'tourism', 'shopping'];

/** localStorage key holding the user's chosen sort mode. */
const DESTINATION_SORT_STORAGE_KEY = 'tripviewer:destinationEditSort';

/** Valid sort modes, in the same order as the `<select>` options. */
const DESTINATION_SORT_MODES = ['createdAsc', 'createdDesc', 'alpha', 'priority'];

/** Default sort mode — creation date, oldest first (matches load order). */
const DESTINATION_SORT_DEFAULT = 'createdAsc';

/** FLIP slide duration (ms) when items are re-sorted after an accordion closes. */
const DESTINATION_SORT_FLIP_MS = 250;

/** Priority rank for sorting — higher is more important; unset goes last. */
function getPriorityRank(rating: string): number {
	const value = parseInt(rating, 10);
	return Number.isFinite(value) && value >= 1 && value <= 5 ? value : 0;
}

/** Numeric createdAt (ms) for an entry; +Infinity when missing (unsaved = newest). */
function getEntryDateValue(category: string, j: number): number {
	const value = getID<HTMLInputElement>(`${category}-createdAt-${j}`)?.value;
	return value ? new Date(value).getTime() : Number.POSITIVE_INFINITY;
}

/** Compare two category items under the given sort mode. */
function compareCategoryItems(category: string, a: HTMLElement, b: HTMLElement, mode: string): number {
	const jA = getJ(a.id);
	const jB = getJ(b.id);

	switch (mode) {
		case 'createdDesc':
			return getEntryDateValue(category, jB) - getEntryDateValue(category, jA);
		case 'createdAsc':
			return getEntryDateValue(category, jA) - getEntryDateValue(category, jB);
		case 'alpha': {
			const nameA = getID<HTMLInputElement>(`${category}-name-${jA}`)?.value ?? '';
			const nameB = getID<HTMLInputElement>(`${category}-name-${jB}`)?.value ?? '';
			return nameA.localeCompare(nameB);
		}
		case 'priority':
			return (
				getPriorityRank(getID<HTMLSelectElement>(`${category}-rating-${jB}`)?.value ?? '') -
				getPriorityRank(getID<HTMLSelectElement>(`${category}-rating-${jA}`)?.value ?? '')
			);
		default:
			return 0;
	}
}

/**
 * FLIP reorder: reorder `box`'s accordion items by `mode`, then slide each
 * item that changed position to its new spot. Used after an entry's accordion
 * collapses so edits (renames, priorities) visibly fall into place. Skips the
 * animation when the user prefers reduced motion.
 */
function reorderCategoryWithFlip(box: HTMLElement, category: string, mode: string): void {
	const children = Array.from(box.children) as HTMLElement[];

	// Clear any stale transform/transition from a previously interrupted FLIP.
	for (const item of children) {
		if (item.style.transform || item.style.transition) {
			item.style.transform = '';
			item.style.transition = '';
		}
	}

	const ordered = [...children].sort((a, b) => compareCategoryItems(category, a, b, mode));

	// Nothing moved — no animation needed.
	const alreadyOrdered = ordered.every((item, index) => item === children[index]);
	if (alreadyOrdered) return;

	// Reduced motion: still reorder, just skip the slide.
	if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
		for (const item of ordered) box.appendChild(item);
		return;
	}

	// First: snapshot where each item sits before the DOM reorder.
	const boxTop = box.getBoundingClientRect().top;
	const previousTops = new Map<HTMLElement, number>();
	for (const item of children) {
		previousTops.set(item, item.getBoundingClientRect().top - boxTop);
	}

	// Last: apply the reorder and measure the new positions.
	for (const item of ordered) {
		box.appendChild(item);
	}

	// Invert: translate each moved item back to its previous spot...
	const moved: HTMLElement[] = [];
	for (const item of ordered) {
		const previousTop = previousTops.get(item) ?? 0;
		const deltaY = previousTop - (item.getBoundingClientRect().top - boxTop);
		if (Math.abs(deltaY) < 0.5) continue;
		moved.push(item);
		item.style.transition = 'none';
		item.style.transform = `translateY(${deltaY}px)`;
	}

	if (!moved.length) return;

	// ...force a reflow so the inverted transforms are committed first...
	void box.offsetHeight;

	// ...then Play: animate each item back to its natural position.
	for (const item of moved) {
		item.style.transition = `transform ${DESTINATION_SORT_FLIP_MS}ms ease`;
		item.style.transform = '';
		item.addEventListener('transitionend', function onReorderEnd(event) {
			if (event.propertyName !== 'transform') return;
			item.removeEventListener('transitionend', onReorderEnd);
			item.style.transition = '';
		});
	}
}

/** Reorder a category's accordion items by the selected mode (visual only). */
function sortDestinationCategory(category: string, mode: string, animate = false): void {
	const box = getID(`${category}-box`);
	if (!box) return;

	if (animate) {
		reorderCategoryWithFlip(box, category, mode);
		return;
	}

	const items = Array.from(box.children) as HTMLElement[];
	items.sort((a, b) => compareCategoryItems(category, a, b, mode));
	for (const item of items) {
		box.appendChild(item);
	}
}

/** Read the persisted sort mode, validated against the known modes. */
function loadDestinationSortMode(): string {
	try {
		const saved = window.localStorage.getItem(DESTINATION_SORT_STORAGE_KEY);
		return saved && DESTINATION_SORT_MODES.includes(saved) ? saved : DESTINATION_SORT_DEFAULT;
	} catch {
		// Storage unavailable (private mode, quota, blocked cookies).
		return DESTINATION_SORT_DEFAULT;
	}
}

/** Persist the chosen sort mode (ignore storage failures). */
function storeDestinationSortMode(mode: string): void {
	try {
		window.localStorage.setItem(DESTINATION_SORT_STORAGE_KEY, mode);
	} catch {
		// Ignore — the sort still applies for the current session.
	}
}

/** Apply a sort mode to every category (selects + accordion boxes). */
function applyDestinationSortMode(mode: string): void {
	for (const category of SORTABLE_CATEGORIES) {
		const select = getID<HTMLSelectElement>(`${category}-sort`);
		if (select) select.value = mode;
		sortDestinationCategory(category, mode);
	}
}

/** Persist + apply a newly chosen sort mode (shared across all categories). */
function setDestinationSortMode(mode: string): void {
	storeDestinationSortMode(mode);
	applyDestinationSortMode(mode);
}

/** Wire a category's sort select to update the shared sort mode. */
function initCategorySort(category: string): void {
	const select = getID<HTMLSelectElement>(`${category}-sort`);
	if (!select) return;
	select.addEventListener('change', () => setDestinationSortMode(select.value));
}

/**
 * Category of a collapsed element (`collapse-<category>-<j>`) when it belongs
 * to a sortable destination box; '' otherwise.
 */
function getSortableCategoryFromCollapse(collapseEl: HTMLElement): string {
	const match = /^collapse-(.+)-(\d+)$/.exec(collapseEl.id || '');
	if (!match) return '';
	return SORTABLE_CATEGORIES.includes(match[1]) ? match[1] : '';
}

/**
 * Re-sort a category after one of its accordions collapses, so values edited
 * while the entry was expanded (name, priority, creation date) fall into
 * place. When the whole box is quiet (nothing else collapsing/expanding) the
 * items slide to their new spots (FLIP); otherwise the reorder happens
 * instantly to avoid fighting an in-progress collapse transition.
 */
function initSortOnAccordionClose(): void {
	document.addEventListener('hidden.bs.collapse', (event) => {
		const collapseEl = event.target as HTMLElement | null;
		if (!collapseEl) return;
		const category = getSortableCategoryFromCollapse(collapseEl);
		if (!category) return;

		const box = getID(`${category}-box`);
		if (!box) return;

		const mode =
			getID<HTMLSelectElement>(`${category}-sort`)?.value || loadDestinationSortMode();
		const animatingSibling = box.querySelector('.collapsing, .show');
		sortDestinationCategory(category, mode, !animatingSibling);
	});
}

// ============================================================
// Item filtering (edit destination page) — VISUAL ONLY.
// Unlike the sort control, the filter is NOT persisted: every
// page load starts at "none" (all items shown, no value select),
// and each category keeps an independent filter that only affects
// its own accordion box. Toggling item visibility never changes
// the saved document — set-destination.ts always reads the full box.
// ============================================================

/** Standard price tiers — the values stored in an entry's `price`. */
const DESTINATION_PRICE_TIERS = ['$', '$$', '$$$', '$$$$'];

/** Read an entry's stored price the same way set-destination.ts does. */
function getEntryStoredPrice(category: string, j: number): string {
	const priceSelect = getID<HTMLSelectElement>(`${category}-price-${j}`);
	if (!priceSelect) return '';
	return priceSelect.innerHTML && priceSelect.value !== 'other'
		? priceSelect.value
		: (getID<HTMLInputElement>(`${category}-other-price-${j}`)?.value ?? '');
}

/** The cost bucket an entry's stored price falls into (matches the options). */
function getPriceFilterBucket(raw: string): string {
	if (raw === '' || raw === 'default') return 'unknown';
	if (raw === '-' || raw === 'free') return 'free';
	if (DESTINATION_PRICE_TIERS.includes(raw)) return raw;
	return 'custom';
}

/** Whether `item` should stay visible under the category's current filter. */
function entryMatchesDestinationFilter(
	category: string,
	item: HTMLElement,
	mode: string,
	value: string,
): boolean {
	if (mode === 'none' || value === '') return true;
	const j = getJ(item.id);

	switch (mode) {
		case 'region':
			return getRegionPills(`${category}-regions-${j}`).includes(value);
		case 'cost':
			return getPriceFilterBucket(getEntryStoredPrice(category, j)) === value;
		case 'priority': {
			// The form stores "priority not set" as '?' (or '' on legacy items).
			const rating = getID<HTMLSelectElement>(`${category}-rating-${j}`)?.value ?? '';
			return rating === value || (value === '?' && rating === '');
		}
		default:
			return true;
	}
}

/** Show/hide a category's items according to its filter selects. */
function applyDestinationCategoryFilter(category: string): void {
	const box = getID(`${category}-box`);
	const filterSelect = getID<HTMLSelectElement>(`${category}-filter`);
	const valueSelect = getID<HTMLSelectElement>(`${category}-filter-value`);
	if (!box || !filterSelect) return;

	const mode = filterSelect.value;
	const value = valueSelect?.value ?? '';

	for (const item of Array.from(box.children) as HTMLElement[]) {
		item.style.display = entryMatchesDestinationFilter(category, item, mode, value)
			? ''
			: 'none';
	}
}

/** A single option for a category's filter value subselect. */
type DestinationFilterOption = { value: string; label: string; disabled: boolean };

/** Options for the value subselect of a category's current filter mode. */
function buildDestinationFilterOptions(category: string): DestinationFilterOption[] {
	const mode = getID<HTMLSelectElement>(`${category}-filter`)?.value ?? 'none';
	const options: DestinationFilterOption[] = [
		{ value: '', label: translate('labels.all'), disabled: false },
	];

	if (mode === 'region') {
		// "All the possible options" = the distinct regions currently used by
		// this category's items (source of truth: the region pills).
		const regions = new Set<string>();
		for (const item of getID(`${category}-box`)?.children ?? []) {
			const j = getJ((item as HTMLElement).id);
			for (const region of getRegionPills(`${category}-regions-${j}`)) {
				if (region) regions.add(region);
			}
		}
		if (regions.size === 0) {
			options.push({
				value: '',
				label: translate('destination.filter.region.none'),
				disabled: true,
			});
		}
		for (const region of Array.from(regions).sort((a, b) => a.localeCompare(b))) {
			options.push({ value: region, label: region, disabled: false });
		}
	} else if (mode === 'cost') {
		// The standard tiers, plus Free / Unknown price and a Custom bucket
		// that groups every other (free-text) price.
		for (const tier of DESTINATION_PRICE_TIERS) {
			options.push({ value: tier, label: tier, disabled: false });
		}
		options.push({
			value: 'free',
			label: translate('destination.price.free'),
			disabled: false,
		});
		options.push({
			value: 'unknown',
			label: translate('destination.price.default'),
			disabled: false,
		});
		options.push({
			value: 'custom',
			label: translate('destination.filter.custom'),
			disabled: false,
		});
	} else if (mode === 'priority') {
		for (const score of ['5', '4', '3', '2', '1']) {
			options.push({
				value: score,
				label: `${score} - ${translate(`destination.scores.${score}`)}`,
				disabled: false,
			});
		}
		options.push({
			value: '?',
			label: translate('destination.scores.default'),
			disabled: false,
		});
	}

	return options;
}

/** Rebuild the value subselect for a category. The subselect is never
 *  hidden — when the dimension is "None" it just sits disabled with an
 *  "All" placeholder so the toolbar layout doesn't shift. */
function refreshDestinationFilterValue(category: string): void {
	const filterSelect = getID<HTMLSelectElement>(`${category}-filter`);
	const valueSelect = getID<HTMLSelectElement>(`${category}-filter-value`);
	if (!filterSelect || !valueSelect) return;

	const mode = filterSelect.value;
	const previous = valueSelect.value;

	valueSelect.innerHTML = '';
	if (mode === 'none') {
		valueSelect.disabled = true;
		const all = document.createElement('option');
		all.value = '';
		all.textContent = translate('labels.all');
		all.disabled = true;
		valueSelect.appendChild(all);
		applyDestinationCategoryFilter(category);
		return;
	}

	valueSelect.disabled = false;
	const options = buildDestinationFilterOptions(category);
	for (const option of options) {
		const el = document.createElement('option');
		el.value = option.value;
		el.textContent = option.label;
		el.disabled = option.disabled;
		valueSelect.appendChild(el);
	}

	// Preserve the previous choice when it's still a valid option (e.g. after
	// an item was removed and the Region options were rebuilt); else "All".
	if (options.some((option) => option.value === previous && !option.disabled)) {
		valueSelect.value = previous;
	}

	applyDestinationCategoryFilter(category);
}

/** Wire a category's filter selects (dimension + value). */
function initCategoryFilterControl(category: string): void {
	const filterSelect = getID<HTMLSelectElement>(`${category}-filter`);
	const valueSelect = getID<HTMLSelectElement>(`${category}-filter-value`);
	if (!filterSelect || !valueSelect) return;

	filterSelect.addEventListener('change', () => refreshDestinationFilterValue(category));
	valueSelect.addEventListener('change', () => applyDestinationCategoryFilter(category));

	// Never persisted — every page load starts at "none": the dimension
	// select shows "None" and the value select is present but disabled
	// (see refreshDestinationFilterValue).
	filterSelect.value = 'none';
	valueSelect.disabled = true;
	refreshDestinationFilterValue(category);
}

/** Clear a category's filter (used when a brand-new item is added). */
function resetCategoryDestinationFilter(category: string): void {
	const filterSelect = getID<HTMLSelectElement>(`${category}-filter`);
	if (!filterSelect || filterSelect.value === 'none') return;
	filterSelect.value = 'none';
	refreshDestinationFilterValue(category);
}

function loadEventListeners() {
	getID('restaurants-add').addEventListener('click', () => {
		closeAccordions('restaurants');
		addRestaurants();
		openLastAccordion('restaurants');
		buildRegionSelects();
	});

	getID('snacks-add').addEventListener('click', () => {
		closeAccordions('snacks');
		addSnacks();
		openLastAccordion('snacks');
		buildRegionSelects();
	});

	getID('nightlife-add').addEventListener('click', () => {
		closeAccordions('nightlife');
		addNightlife();
		openLastAccordion('nightlife');
		buildRegionSelects();
	});

	getID('tourism-add').addEventListener('click', () => {
		closeAccordions('tourism');
		addTourism();
		openLastAccordion('tourism');
		buildRegionSelects();
	});

	getID('shopping-add').addEventListener('click', () => {
		closeAccordions('shopping');
		addShopping();
		openLastAccordion('shopping');
		buildRegionSelects();
	});

	// Image Validation in Customization module
	getID('link-background').addEventListener('change', () => void validateImageLink('link-background'));

	getID('save-btn').addEventListener('click', () => {
		void handleDestinationSave();
	});

	getID('cancel-btn').addEventListener('click', () => {
		window.location.href = `../index?visibility=${getVisibility()}`;
	});

	// Places API — bulk "Update with Maps" (P10). Hidden by default;
	// refreshPlacesBulkButton() shows it when the user holds canUsePlacesAPI and
	// at least one entry has a linked Google Place. Click opens the confirm
	// dialog, which hands off to the bulk flow (P11).
	getID('places-bulk-btn').addEventListener('click', openPlacesBulkDialog);

	getID('currency').addEventListener('change', () => {
		if (getID('currency').value == 'other') {
			getID('other-currency').style.display = 'block';
		} else {
			getID('other-currency').style.display = 'none';
		}
		loadCurrencySelects();
	});

	getID('other-currency').addEventListener('change', () => {
		loadCurrencySelects();
	});

	window.addEventListener('beforeunload', (event) => {
		if ((hasUnsavedChanges() || hasStagedChanges()) && !SUCCESSFUL_SAVE) {
			event.preventDefault();
			event.returnValue = translate('messages.exit_confirmation');
		}
	});

	// Form is populated by now (loaded + newly added entries) — sync the bulk
	// button visibility. Re-called after per-item applies (P9) / bulk apply (P12).
	refreshPlacesBulkButton();

	// Per-category ordering controls (destination items) — shared sort mode,
	// persisted in localStorage. Items exist by now (loaded + newly added).
	for (const category of SORTABLE_CATEGORIES) {
		initCategorySort(category);
	}
	applyDestinationSortMode(loadDestinationSortMode());

	// Keep the on-page order in sync when an entry's accordion is collapsed
	// after an edit (name/priority/created date) — re-sorts that category.
	initSortOnAccordionClose();

	// Per-category filter controls (destination items) — independent per
	// category and NOT persisted: every page load starts at "none" (shows
	// everything, value subselect hidden). Items exist by now.
	for (const category of SORTABLE_CATEGORIES) {
		initCategoryFilterControl(category);
	}

	// Adding a brand-new entry should always reveal it, so clear that
	// category's filter first (a fresh item can't match an active filter yet).
	for (const category of SORTABLE_CATEGORIES) {
		getID(`${category}-add`)?.addEventListener('click', () =>
			resetCategoryDestinationFilter(category),
		);
	}
}

// ============================================================
// "Recently added" save guard (existing destinations)
// ============================================================

/** A destination row flagged "Recently added" that pre-dates this edit. */
type RecentlyAddedRef = { category: string; j: number };

/** How the user answered the "Recently added" save prompt. */
type RecentlyAddedChoice = 'keep' | 'clear';

/**
 * Ask whether to clear the "Recently added" mark on `count` previously-saved
 * rows before this save. Resolves with the choice, or null when the user
 * dismisses the dialog (X / Escape / Cancel) to abort the save entirely.
 */
function promptClearRecentlyAdded(count: number): Promise<RecentlyAddedChoice | null> {
	return new Promise((resolve) => {
		const properties = cloneObject(MESSAGE_PROPERTIES);
		properties.title = translate('destination.recentSavePrompt.title');
		properties.content = getRecentlyAddedPromptHTML(count);
		properties.containers = getContainersInput();
		// The X icon, the bottom Cancel button, and Escape all abort the save
		// (resolve null), so the awaited flow never hangs on a bare close. The
		// two option cards resolve with the chosen behavior.
		properties.icons = [{ type: 'close', action: () => finish(null) }];
		properties.buttons = [{ type: 'cancel', action: () => finish(null) }];
		displayFullMessage(properties);

		const finish = (choice: RecentlyAddedChoice | null) => () => {
			closeMessage();
			resolve(choice);
		};
		getID<HTMLButtonElement>('recent-save-keep')?.addEventListener('click', finish('keep'));
		getID<HTMLButtonElement>('recent-save-clear')?.addEventListener('click', finish('clear'));
	});
}

/** Content for the prompt — message plus the two option cards (keep vs clear). */
function getRecentlyAddedPromptHTML(count: number): string {
	return `
	<div class="places-source">
		<p class="places-linked-message">${escapeHtml(
			translate('destination.recentSavePrompt.message', { count: String(count) }),
		)}</p>
		<div class="places-linked-options">
			<button type="button" class="places-linked-option" id="recent-save-keep">
				<span class="places-linked-option-title">${escapeHtml(
					translate('destination.recentSavePrompt.keep'),
				)}</span>
				<span class="places-linked-option-caption">${escapeHtml(
					translate('destination.recentSavePrompt.keep_hint'),
				)}</span>
			</button>
			<button type="button" class="places-linked-option" id="recent-save-clear">
				<span class="places-linked-option-title">${escapeHtml(
					translate('destination.recentSavePrompt.clear'),
				)}</span>
				<span class="places-linked-option-caption">${escapeHtml(
					translate('destination.recentSavePrompt.clear_hint'),
				)}</span>
			</button>
		</div>
	</div>`;
}

/**
 * Rows that were already marked "Recently added" when the document loaded and
 * are STILL checked in the form. Matched by Firestore id against the loaded
 * document (`FIRESTORE_DESTINATIONS_DATA`), so rows the user flagged during
 * this session — and brand-new, unsaved rows — are never treated as stale.
 */
function findPreviouslyNewRows(): RecentlyAddedRef[] {
	const refs: RecentlyAddedRef[] = [];
	if (!DOCUMENT_ID || !FIRESTORE_DESTINATIONS_DATA) return refs;

	for (const category of SORTABLE_CATEGORIES) {
		const loadedCategory = FIRESTORE_DESTINATIONS_DATA?.[category];
		if (!loadedCategory) continue;

		const childIDs = getChildIDs(`${category}-box`) || [];
		for (const childID of childIDs) {
			const j = getJ(childID);
			const itemId = getID<HTMLInputElement>(`${category}-id-${j}`)?.value;
			// Unsaved rows (no id yet) and rows that weren't flagged in the
			// loaded document aren't "previously marked" — leave them alone.
			if (!itemId || loadedCategory[itemId]?.isNew !== true) continue;
			if (getID<HTMLInputElement>(`${category}-isNew-${j}`)?.checked) {
				refs.push({ category, j });
			}
		}
	}
	return refs;
}

/**
 * Uncheck the "Recently added" switch on the given rows and refresh their
 * title icon. The switches themselves are NOT disabled — they stay fully
 * interactive, so the user can re-flag a row after saving if they change
 * their mind.
 */
function clearRecentlyAddedMarks(refs: RecentlyAddedRef[]): void {
	for (const { category, j } of refs) {
		const toggle = getID<HTMLInputElement>(`${category}-isNew-${j}`);
		if (!toggle) continue;
		toggle.checked = false;
		updateDestinationsTitle(j, category);
	}
}

/** Runs the actual document save (loading screen + data build + commit). */
function runDestinationSave(): void {
	startLoadingScreen();
	const type = 'destinations';
	const dataBuildingFunctions = [buildDestinationObject, updateTikTokLinks];

	void setDocument({ type, dataBuildingFunctions });
}

/**
 * Save entry point. On an existing destination whose previously-saved rows are
 * still flagged "Recently added", ask whether to clear those old marks before
 * committing — a fresh save is a natural point to stop showing them as new.
 */
async function handleDestinationSave(): Promise<void> {
	if (DOCUMENT_ID) {
		const previouslyNew = findPreviouslyNewRows();
		if (previouslyNew.length > 0) {
			const choice = await promptClearRecentlyAdded(previouslyNew.length);
			if (choice === null) return; // dismissed — abort the save
			if (choice === 'clear') clearRecentlyAddedMarks(previouslyNew);
			// choice === 'keep' → save exactly as the form shows
		}
	}
	runDestinationSave();
}

// ============================================================
// Places API — bulk "Enrich Data" (P1 restructure)
// ============================================================

/** Bulk "Enrich Data" option-card action names. */
const BULK_REFRESH_ACTION = 'places-bulk-refresh';
const BULK_ENRICH_ACTION = 'places-bulk-enrich';
const BULK_ENRICH_SCRAPER_ACTION = 'places-bulk-enrich-scraper';
/** Grouped cards open a "Which source?" sub-prompt (Enrich/Refresh). */
const BULK_ENRICH_SOURCE_ACTION = 'places-bulk-enrich-source';
const BULK_REFRESH_SOURCE_ACTION = 'places-bulk-refresh-source';
const BULK_MYMAPS_REIMPORT_ACTION = 'places-bulk-mymaps-reimport';

/** Whether the destination has a My Maps link set (drives the "Add" card). */
function hasMymapsLink(): boolean {
	return Boolean(getID('map-link')?.value?.trim());
}

/**
 * Whether any bulk option applies (hide the button when there's nothing to
 * refresh, enrich, or add). "Add" (My Maps) is offered whenever the
 * destination has a My Maps link.
 */
function hasBulkOptions(): boolean {
	return countLinkedItems() > 0 || countUnlinkedItems() > 0 || hasMymapsLink();
}

/**
 * Show/hide the bulk "Enrich Data" button. Visible only when at least one
 * data source is enabled (Places API / local scraper / My Maps — the button
 * is hidden when ALL of them are disabled), the user holds the canUsePlacesAPI
 * permission, AND at least one bulk option applies.
 * Called on page load, and re-called after per-item applies (P9) / bulk apply
 * (P12) so the button stays in sync with the form.
 */
export function refreshPlacesBulkButton(): void {
	const button = getID<HTMLButtonElement>('places-bulk-btn');
	if (!button) return;
	const anySource =
		PLACES_API_ENABLED === true ||
		GMAPS_SCRAPER_ENABLED === true ||
		MYMAPS_KML_ENABLED === true;
	const visible = anySource && PERMISSIONS?.canUsePlacesAPI === true && hasBulkOptions();
	button.style.display = visible ? '' : 'none';
}

/**
 * Bulk "Enrich Data" entry point. Shows the 3 grouped option cards:
 *   - Add      — My Maps import of every unused placemark (hidden if no My
 *                Maps link is available).
 *   - Enrich   — link the items without a place (hidden when none, or when no
 *                source can enrich them).
 *   - Refresh  — update the items already enriched (hidden when none, or when
 *                no source can refresh them).
 * Enrich/Refresh lead to a "Which source?" sub-prompt (Google Places vs Local
 * scraper) that auto-collapses to the only available source.
 */
function openPlacesBulkDialog(): void {
	if (PERMISSIONS?.canUsePlacesAPI !== true) {
		displayError(new Error(translate('placesApi.noPermission')));
		return;
	}
	const anySource =
		PLACES_API_ENABLED === true ||
		GMAPS_SCRAPER_ENABLED === true ||
		MYMAPS_KML_ENABLED === true;
	if (!anySource) {
		displayError(new Error(translate('placesApi.errors.localOnly')), false, false);
		return;
	}

	const properties = cloneObject(MESSAGE_PROPERTIES);
	properties.title = translate('placesApi.dialog.title');
	properties.content = getBulkOptionsHTML();
	properties.containers = getContainersInput();
	properties.buttons = [];
	displayFullMessage(properties);
}

/** Render the 3 grouped bulk option cards (Add / Enrich / Refresh). */
function getBulkOptionsHTML(): string {
	const linked = countLinkedItems();
	const unlinked = countUnlinkedItems();
	const hasApi = PLACES_API_ENABLED === true;
	const hasLocal = GMAPS_SCRAPER_ENABLED === true;

	// Add — My Maps: hidden when the destination has no My Maps link.
	const addCard = hasMymapsLink()
		? bulkOptionCard(
				BULK_MYMAPS_REIMPORT_ACTION,
				translate('placesApi.bulk.options.groupAddTitle'),
				translate('placesApi.bulk.options.groupAddSub'),
			)
		: '';

	// Enrich — hidden when there's nothing to enrich or no source available.
	const enrichCard =
		unlinked > 0 && (hasApi || hasLocal)
			? bulkOptionCard(
					BULK_ENRICH_SOURCE_ACTION,
					translate('placesApi.bulk.options.groupEnrichTitle'),
					translate('placesApi.bulk.options.groupEnrichSub', {
						count: String(unlinked),
					}),
				)
			: '';

	// Refresh — hidden when there's nothing to refresh or no source available.
	const refreshCard =
		linked > 0 && (hasApi || hasLocal)
			? bulkOptionCard(
					BULK_REFRESH_SOURCE_ACTION,
					translate('placesApi.bulk.options.groupRefreshTitle'),
					translate('placesApi.bulk.options.groupRefreshSub', {
						count: String(linked),
					}),
				)
			: '';

	return `
	<div class="places-source">
		<div class="places-linked-options">
			${addCard}
			${enrichCard}
			${refreshCard}
		</div>
	</div>`;
}

/** One bulk option card (same visual language as the linked/source options). */
function bulkOptionCard(
	action: string,
	title: string,
	caption: string,
	tag?: string,
): string {
	return `<button type="button" class="places-linked-option" data-action="${action}">
			<span class="places-linked-option-title">${escapeHtml(title)}</span>
			<span class="places-linked-option-caption">${escapeHtml(caption)}</span>
			${tag ? `<span class="places-bulk-option-tag">${escapeHtml(tag)}</span>` : ''}
		</button>`;
}

/**
 * "Which source?" sub-prompt — shown when both Google Places and the local
 * scraper can handle the operation. The cards reuse the option-card visual
 * language; their data-actions start the actual flow (which replaces this
 * prompt with its own dialog).
 */
function showSourceChoice(opts: {
	title: string;
	options: Array<{ action: string; title: string; caption: string; tag?: string }>;
}): void {
	const properties = cloneObject(MESSAGE_PROPERTIES);
	properties.title = opts.title;
	properties.content = `
	<div class="places-source">
		<p class="places-linked-message">${escapeHtml(
			translate('placesApi.bulk.options.sourceMessage'),
		)}</p>
		<div class="places-linked-options">
			${opts.options.map((o) => bulkOptionCard(o.action, o.title, o.caption, o.tag)).join('')}
		</div>
	</div>`;
	properties.containers = getContainersInput();
	properties.buttons = [];
	displayFullMessage(properties);
}

/**
 * "Enrich" grouped card → pick the source. Goes straight to the only
 * available source; shows the sub-prompt when both are available.
 */
function openEnrichSourcePrompt(): void {
	const unlinked = countUnlinkedItems();
	if (unlinked <= 0) {
		refreshPlacesBulkButton();
		return;
	}
	const api = PLACES_API_ENABLED === true;
	const local = GMAPS_SCRAPER_ENABLED === true;
	if (api && !local) {
		void runEnrichPending('api');
		return;
	}
	if (local && !api) {
		void runEnrichPending('scraper');
		return;
	}
	showSourceChoice({
		title: translate('placesApi.bulk.options.groupEnrichTitle'),
		options: [
			{
				action: BULK_ENRICH_ACTION,
				title: translate('placesApi.bulk.options.sourceGoogleTitle'),
				caption: translate('placesApi.bulk.options.sourceGoogleSub'),
				// Each unlinked item = 1 Places API text-search request.
				tag: translate('placesApi.bulk.options.apiRequests', {
					count: String(unlinked),
				}),
			},
			{
				action: BULK_ENRICH_SCRAPER_ACTION,
				title: translate('placesApi.source.local'),
				caption: translate('placesApi.bulk.options.sourceLocalSub'),
			},
		],
	});
}

/**
 * "Refresh" grouped card → pick the source. Goes straight to the only
 * available source; shows the sub-prompt when both are available.
 */
function openRefreshSourcePrompt(): void {
	const linked = countLinkedItems();
	if (linked <= 0) {
		refreshPlacesBulkButton();
		return;
	}
	const api = PLACES_API_ENABLED === true;
	const local = GMAPS_SCRAPER_ENABLED === true;
	if (api && !local) {
		void runBulkPlacesUpdate();
		return;
	}
	if (local && !api) {
		void runBulkLocalUpdate();
		return;
	}
	showSourceChoice({
		title: translate('placesApi.bulk.options.groupRefreshTitle'),
		options: [
			{
				action: BULK_REFRESH_ACTION,
				title: translate('placesApi.bulk.options.sourceGoogleTitle'),
				caption: translate('placesApi.bulk.options.sourceGoogleSub'),
				// Each linked item = 1 Places API details request.
				tag: translate('placesApi.bulk.options.apiRequests', {
					count: String(linked),
				}),
			},
			{
				action: SOURCE_LOCAL_BULK_ACTION,
				title: translate('placesApi.source.local'),
				caption: translate('placesApi.bulk.options.sourceLocalSub'),
			},
		],
	});
}

/** HTML-escape a string for safe interpolation (same pattern as the step modules). */
function escapeHtml(value: string): string {
	const div = document.createElement('div');
	div.textContent = value;
	return div.innerHTML;
}

// Bulk "Enrich Data" option actions. Choosing a grouped card closes this
// prompt and starts the flow (Enrich/Refresh may show the "Which source?"
// sub-prompt first; its cards trigger the actions below).
registerActions({
	// "Local (gmaps scraper)" — Refresh via the local scraper.
	[SOURCE_LOCAL_BULK_ACTION]: () => {
		void runBulkLocalUpdate();
	},
	// "Refresh" → Google Places — straight to the bulk fetch (no separate
	// confirm; the report + apply step gives the user control before staging).
	[BULK_REFRESH_ACTION]: () => {
		void runBulkPlacesUpdate();
	},
	// "Enrich" grouped card → source sub-prompt (auto-collapse when one source).
	[BULK_ENRICH_SOURCE_ACTION]: () => {
		void openEnrichSourcePrompt();
	},
	// "Refresh" grouped card → source sub-prompt (auto-collapse when one source).
	[BULK_REFRESH_SOURCE_ACTION]: () => {
		void openRefreshSourcePrompt();
	},
	// "Add" — My Maps import of every unused placemark.
	[BULK_MYMAPS_REIMPORT_ACTION]: () => {
		void openMymapsReimportDialog();
	},
});

/** Parse the hidden `{ region: url }` JSON of a per-region map field. */
function parseHiddenRegionMaps(value?: string): Record<string, string> {
	if (!value) return {};
	try {
		const parsed = JSON.parse(value);
		return parsed && typeof parsed === 'object' ? parsed : {};
	} catch {
		return {};
	}
}

export function addListenerToRemoveDestination(category, j) {
	getID(`remove-${category}-${j}`).addEventListener('click', () => {
		unregisterRegionSelect(`${category}-region-select-${j}`);
		destroyMapLinksEditor(`${category}-${j}`);
		removeChildWithValidation(category, j);
		buildRegionSelects();
		removeDestinationImages(category, j);
	});
}

async function loadDestinations() {
	getID('delete-text').style.display = 'block';
	startLoadingScreen();

	const singleData = await getSingleData('destinations');
	setFirestoreDestinationsData(singleData);

	populateExistingDestinationForm();
	stopLoadingScreen();
	populateDevPage();
}

// Listeners
export function addDestinationsListeners(category, j) {
	// Interactive Title
	getID(`${category}-name-${j}`).addEventListener('change', () =>
		updateDestinationsTitle(j, category),
	);
	getID(`${category}-emoji-${j}`).addEventListener('change', () =>
		updateDestinationsTitle(j, category),
	);
	getID(`${category}-isNew-${j}`).addEventListener('click', () =>
		updateDestinationsTitle(j, category),
	);

	// Priority badge — refresh the circle on the accordion button.
	getID(`${category}-rating-${j}`).addEventListener('change', () =>
		updateRatingBadge(category, j),
	);

	// Emoji Validation
	getID(`${category}-emoji-${j}`).addEventListener('input', () => emojisOnInputAction(j, category));

	// Price
	getID(`${category}-price-${j}`).addEventListener('change', () =>
		priceListenerAction(j, category),
	);

	// Region

	// Links
	getID(`${category}-website-${j}`).addEventListener('change', () =>
		validateLink(`${category}-website-${j}`),
	);
	getID(`${category}-map-${j}`).addEventListener('change', () =>
		validateMapLink(`${category}-map-${j}`),
	);
	getID(`${category}-instagram-${j}`).addEventListener('change', () =>
		validateInstagramLink(`${category}-instagram-${j}`),
	);
	getID(`${category}-media-${j}`).addEventListener('change', () =>
		validateMediaLink(`${category}-media-${j}`),
	);
}

function priceListenerAction(j, category) {
	const price = getID(`${category}-price-${j}`);
	const otherPrice = getID(`${category}-other-price-${j}`);

	if (price.value == 'other') {
		otherPrice.style.display = 'block';
		otherPrice.required = true;
	} else {
		otherPrice.style.display = 'none';
		otherPrice.required = false;
	}
}

export function updateDestinationsTitle(j, category) {
	const titleDiv = getID(`${category}-title-text-${j}`);
	const emojiDiv = getID(`${category}-emoji-${j}`);

	const name = getID(`${category}-name-${j}`).value;
	const emoji = emojiDiv.value ? emojiDiv.value.replace(/[a-zA-Z0-9\s!-\/:-@\[-`{-~]/g, '') : '';

	if (emoji && name) {
		titleDiv.innerText = `${name} ${emoji}`;
	} else if (name) {
		titleDiv.innerText = name;
	}

	getID(`${category}-title-icon-${j}`).style.display = getID(`${category}-isNew-${j}`).checked
		? 'block'
		: 'none';
}

export function emojisOnInputAction(j, category) {
	const emojiDiv = getID(`${category}-emoji-${j}`);
	const emojiUntreated = emojiDiv.value;
	const emojiTreated = emojiUntreated
		? emojiUntreated.replace(/[a-zA-Z0-9\s!-\/:-@\[-`{-~]/g, '')
		: '';

	if (emojiTreated && emojiUntreated && emojiTreated !== emojiUntreated) {
		emojiDiv.value = emojiTreated;
	} else if (!emojiTreated && emojiUntreated) {
		emojiDiv.value = '';
		emojiDiv.placeholder = translate('destination.errors.invalid_emoji');
	}
}

export function openMoveDestinationModal(j, category) {
	const properties = cloneObject(MESSAGE_PROPERTIES);

	properties.title =
		getID(`${category}-name-${j}`).value ||
		translate('destination.move.title', {
			category: firstCharToUpperCase(category),
		});
	properties.containers = getContainersInput();
	properties.buttons = [
		{
			type: 'cancel',
		},
		{
			type: 'confirm',
			action: `moveDestination(${j}, '${category}')`,
		},
	];

	const options: Record<string, string> = {};
	for (const cat of ['restaurants', 'snacks', 'nightlife', 'tourism', 'shopping']) {
		options[cat] = translate(`destination.${cat}.title`);
	}

	let optionsString = '';

	for (const option in options) {
		if (option != category) {
			optionsString += `<option value="${option}">${options[option]}</option>`;
		}
	}

	properties.content = `
  <div class="nice-form-group"">
    <label>${translate('destination.move.label')}</label>
      <select class="edit-select" id="move-select">
        ${optionsString}
      </select>
  </div>`;

	displayFullMessage(properties);
}

export function moveDestination(j, category) {
	const newCategory = getID('move-select').value;
	const description = getDescription(category, j);

	if (category != newCategory) {
		const destination = {
			isNew: getID(`${category}-isNew-${j}`).checked,
			name: getID(`${category}-name-${j}`).value,
			emoji: getID(`${category}-emoji-${j}`).value,
			website: getID(`${category}-website-${j}`).value,
			map: getID(`${category}-map-${j}`).value,
			mapsPerRegion: getID(`${category}-map-strategy-${j}`)?.value === 'per-region',
			regionMaps: parseHiddenRegionMaps(getID(`${category}-region-maps-${j}`)?.value),
			instagram: getID(`${category}-instagram-${j}`).value,
			regions: getRegionPills(`${category}-regions-${j}`),
			price: getID(`${category}-price-${j}`).value,
			media: getID(`${category}-media-${j}`).value,
			rating: getID(`${category}-rating-${j}`).value,
			images: DESTINATION_IMAGES[`${category}-${j}`] || [],
		};

		// `addDestination()` appends a fresh blank entry and numbers it with
		// `getNextJ()` (max index + 1). Reuse that same index here so we always
		// fill the entry we just created. Using `getLastJ() + 1` drifted when
		// the target box was re-sorted (visual-only sort reorders the DOM) or
		// had index gaps, which left a stray blank entry behind.
		const newJ = getNextJ(`${newCategory}-box`);

		addDestination(newCategory);
		addDestinationHTML(newCategory, newJ, destination);
		setDescription(newCategory, newJ, description);
		removeChildWithValidation(category, j);
		destroyMapLinksEditor(`${category}-${j}`);

		unregisterRegionSelect(`${category}-region-select-${j}`);
		buildRegionSelects();

		updateDescriptionButtonLabel(newCategory, newJ);

		if (getID(`${newCategory}-enabled-content`).children.length === 1) {
			getID(`${newCategory}-enabled`).checked = true;
			showContent(newCategory);
		}

		if (getID(`${category}-enabled-content`).children.length === 0) {
			getID(`${category}-enabled`).checked = false;
			hideContent(category);
		}
	}

	closeMessage();
}

export function deleteDestination() {
	const name = getID('title').value;

	const properties = cloneObject(MESSAGE_PROPERTIES);
	properties.title = translate('destination.delete.title');
	properties.content = translate('destination.delete.message', { name });
	properties.buttons = [
		{
			type: 'cancel',
		},
		{
			type: 'confirm',
			action: 'deleteDestinationAction()',
		},
	];

	displayFullMessage(properties);
}

export async function deleteDestinationAction() {
	if (DOCUMENT_ID) {
		await deleteUserObjectDB(DOCUMENT_ID, 'destinations');
		window.location.href = `../index?visibility=${getVisibility()}`;
	}
}

function getDestinationID(category, j) {
	return getID(`${category}-id-${j}`).value;
}

/** Populate dev.page.* with useful references (only on localhost). */
function populateDevPage() {
	const dev = (window as any).dev;
	if (!dev?.isEnabled) return;
	const page = dev.page;

	page.type = 'edit-destination';
	page.docId = DOCUMENT_ID;

	// ── Raw data fetched from Firestore (existing destination) ──
	page.state = getState();
	page.destinationsData = FIRESTORE_DESTINATIONS_DATA;

	// ── New data object built on save ──
	page.newData = FIRESTORE_DESTINATIONS_NEW_DATA;

	// Places API dialog (P5) — TEMP dev hook: console-open the dialog for an
	// entry, e.g. dev.page.openPlacesDialog('restaurants', 1). Remove when P4
	// wires the real "Fetch Info With Maps" accordion button.
	page.openPlacesDialog = openPlacesDialog;

	// Places API bulk (P10) — dev hook: console-open the bulk confirm dialog,
	// e.g. dev.page.openPlacesBulkDialog(). Remove when the toolbar button is final.
	page.openPlacesBulkDialog = openPlacesBulkDialog;

	page.successfulSave = SUCCESSFUL_SAVE;

	console.log(
		'%c[DEV]%c dev.page populated for edit-destination — type %cdev.page%c to explore',
		'color:#f0c040;font-weight:bold;',
		'',
		'font-weight:bold;',
		'',
	);
}
