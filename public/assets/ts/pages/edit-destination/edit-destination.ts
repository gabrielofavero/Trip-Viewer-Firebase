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
	getID,
	getLastJ,
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
import { loadVisibilityIndex } from '../home/support/visibility.js';
import { loadEditDestinationListeners } from './support/event-listeners.js';
import { getVisibility } from '../../theme/theme.js';
import { populateExistingDestinationForm } from './existing-destination.js';
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
// Places API — bulk "Update with Maps" (P10 hand-off to P11, run in parallel).
// P11 (places/places-bulk.ts) exports the contract used here:
//   export async function runBulkUpdate(): Promise<void> — bulk fetch + report
//   export function countLinkedItems(): number           — linked-item count
// runBulkUpdate() owns the dialog-scoped loading, the per-linked-item
// getPlace() fetches, and the report rendering (see docs/implementation-plans/20260812-places-api-edit-destination.md §5 P11).
// countBulkEligibleEntries() decides whether the bulk button opens the source
// prompt or routes straight to the My Maps import; runBulkLocalUpdate() is the
// bulk gmaps-scraper path.
import {
	countLinkedItems,
	countUnlinkedItems,
	runBulkLocalUpdate,
	runBulkUpdate,
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
import { openMymapsImportDialog, openMymapsReimportDialog } from './support/mymaps-import.js';

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
		} else {
			removeRequired('map-link');
		}
	});
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
	getID('link-background').addEventListener('change', () => validateImageLink('link-background'));

	getID('save-btn').addEventListener('click', () => {
		startLoadingScreen();
		const type = 'destinations';
		const dataBuildingFunctions = [buildDestinationObject, updateTikTokLinks];

		setDocument({ type, dataBuildingFunctions });
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
}

// ============================================================
// Places API — bulk "Enrich Data" (P1 restructure)
// ============================================================

/** Bulk "Enrich Data" option-card action names. */
const BULK_REFRESH_ACTION = 'places-bulk-refresh';
const BULK_ENRICH_ACTION = 'places-bulk-enrich';
const BULK_ENRICH_SCRAPER_ACTION = 'places-bulk-enrich-scraper';
const BULK_MYMAPS_IMPORT_ACTION = 'places-bulk-mymaps-import';
const BULK_MYMAPS_REIMPORT_ACTION = 'places-bulk-mymaps-reimport';

/**
 * Whether this destination has already completed a My Maps import (P5).
 * Reads the `myMapsImported` marker persisted on the destination doc when a
 * My Maps import completes (mymaps-import.ts writeImports). Legacy
 * destinations without the marker default to "not imported" (no backfill).
 */
function isMyMapsImported(): boolean {
	return FIRESTORE_DESTINATIONS_DATA?.myMapsImported === true;
}

/**
 * Whether any bulk option applies (plan decision #10 — hide the button when
 * there's nothing to refresh, enrich, or import). The My Maps term keeps the
 * button visible in practice: import (URL/KML) or re-import is always offered,
 * so the "nothing applies" state is only reachable once P5 can suppress both
 * My Maps cards.
 */
function hasBulkOptions(): boolean {
	return countLinkedItems() > 0 || countUnlinkedItems() > 0 || true;
}

/**
 * Show/hide the bulk "Enrich Data" button. Visible only when running on a
 * LOCAL environment (HARD CHECK — PLACES_API_ENABLED), the user holds the
 * canUsePlacesAPI permission, AND at least one bulk option applies.
 * Called on page load, and re-called after per-item applies (P9) / bulk apply
 * (P12) so the button stays in sync with the form.
 */
export function refreshPlacesBulkButton(): void {
	const button = getID<HTMLButtonElement>('places-bulk-btn');
	if (!button) return;
	const visible =
		PLACES_API_ENABLED === true &&
		PERMISSIONS?.canUsePlacesAPI === true &&
		hasBulkOptions();
	button.style.display = visible ? '' : 'none';
}

/**
 * Bulk "Enrich Data" entry point (P1). Shows the import/integration option
 * cards, each with its own visibility condition:
 *   - "Refresh enriched items"  (only when ≥1 item has a Google Place ID)
 *   - "Enrich pending items"    (only when ≥1 item has no Google Place ID)
 *   - "Import from My Maps"     (only when NOT already imported)
 *   - "Re-import from My Maps"  (only when already imported)
 * plus the existing "Local (gmaps scraper)" card on local dev machines.
 * The old "nothing linked → straight to My Maps" shortcut is gone — the user
 * always picks from the options (plan P1).
 */
function openPlacesBulkDialog(): void {
	if (PLACES_API_ENABLED !== true) {
		displayError(new Error(translate('placesApi.errors.localOnly')), false, false);
		return;
	}
	if (PERMISSIONS?.canUsePlacesAPI !== true) {
		displayError(new Error(translate('placesApi.noPermission')));
		return;
	}

	const properties = cloneObject(MESSAGE_PROPERTIES);
	properties.title = translate('placesApi.dialog.title');
	properties.content = getBulkOptionsHTML();
	properties.containers = getContainersInput();
	properties.buttons = [];
	displayFullMessage(properties);
}

/** Render the bulk option cards per their visibility conditions. */
function getBulkOptionsHTML(): string {
	const linked = countLinkedItems();
	const unlinked = countUnlinkedItems();
	const imported = isMyMapsImported();

	// The "Local (gmaps scraper)" card only exists on local dev machines — the
	// scraper route (127.0.0.1:8788) doesn't run on deployed hosts.
	const localCard = GMAPS_SCRAPER_ENABLED
		? bulkOptionCard(
				SOURCE_LOCAL_BULK_ACTION,
				translate('placesApi.source.local'),
				translate('placesApi.source.localHint'),
			)
		: '';

	const refreshCard =
		linked > 0
			? bulkOptionCard(
					BULK_REFRESH_ACTION,
					translate('placesApi.bulk.options.refreshTitle'),
					translate('placesApi.bulk.options.refreshSub', { count: String(linked) }),
					// Each linked item = 1 Google Places details request.
					translate('placesApi.bulk.options.apiRequests', { count: String(linked) }),
				)
			: '';

	const enrichCard =
		unlinked > 0
			? bulkOptionCard(
					BULK_ENRICH_ACTION,
					translate('placesApi.bulk.options.enrichTitle'),
					translate('placesApi.bulk.options.enrichSub', { count: String(unlinked) }),
					// Each unlinked item = 1 Google Places text-search request.
					translate('placesApi.bulk.options.apiRequests', { count: String(unlinked) }),
				)
			: '';

	// P9: the same unlinked-item flow via the LOCAL gmaps-scraper (dev only).
	// Scraper matches always go to review for manual confirmation.
	const enrichScraperCard =
		GMAPS_SCRAPER_ENABLED && unlinked > 0
			? bulkOptionCard(
					BULK_ENRICH_SCRAPER_ACTION,
					translate('placesApi.bulk.options.enrichLocalTitle'),
					translate('placesApi.bulk.options.enrichLocalSub', {
						count: String(unlinked),
					}),
				)
			: '';

	const mymapsImportCard = !imported
		? bulkOptionCard(
				BULK_MYMAPS_IMPORT_ACTION,
				translate('placesApi.source.mymaps'),
				translate('placesApi.source.mymapsHint'),
			)
		: '';

	const mymapsReimportCard = imported
		? bulkOptionCard(
				BULK_MYMAPS_REIMPORT_ACTION,
				translate('placesApi.bulk.options.reimportTitle'),
				translate('placesApi.bulk.options.reimportSub'),
			)
		: '';

	return `
	<div class="places-source">
		<p class="places-linked-message">${escapeHtml(
			translate('placesApi.bulk.options.message'),
		)}</p>
		<div class="places-linked-options">
			${localCard}
			${refreshCard}
			${enrichCard}
			${enrichScraperCard}
			${mymapsImportCard}
			${mymapsReimportCard}
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

/** HTML-escape a string for safe interpolation (same pattern as the step modules). */
function escapeHtml(value: string): string {
	const div = document.createElement('div');
	div.textContent = value;
	return div.innerHTML;
}

/**
 * Bulk "Update with Maps" confirm dialog (P10, Places API source). Asks the
 * user to confirm fetching fresh info for all linked entries; on confirm,
 * hands off to P11's runBulkUpdate() which owns the bulk loading + report.
 */
function openPlacesBulkConfirm(): void {
	const count = countLinkedItems();
	if (count <= 0) {
		// No linked items — shouldn't happen while the button is hidden; guard anyway.
		refreshPlacesBulkButton();
		return;
	}

	const properties = cloneObject(MESSAGE_PROPERTIES);
	properties.title = translate('placesApi.bulk.options.refreshTitle');
	properties.content = `${escapeHtml(
		translate('placesApi.bulk.confirm', { count: String(count) }),
	)}<p class="places-bulk-option-tag">${escapeHtml(
		translate('placesApi.bulk.options.apiRequests', { count: String(count) }),
	)}</p>`;
	properties.containers = getContainersInput();
	properties.buttons = [
		{ type: 'cancel' },
		{
			type: 'confirm',
			// Close the confirm modal, then start the bulk flow (P11 owns it).
			action: () => {
				closeMessage();
				void runBulkUpdate();
			},
		},
	];
	displayFullMessage(properties);
}

// Bulk "Enrich Data" option actions (P1). Choosing an option closes this
// prompt and starts the corresponding flow.
registerActions({
	// "Local (gmaps scraper)" — existing bulk local scrape.
	[SOURCE_LOCAL_BULK_ACTION]: () => {
		closeMessage();
		void runBulkLocalUpdate();
	},
	// "Refresh enriched items" — existing Places API bulk refresh.
	[BULK_REFRESH_ACTION]: () => {
		closeMessage();
		openPlacesBulkConfirm();
	},
	// "Enrich pending items" — owned by places/places-pending.ts (P3), which
	// registers the same 'places-bulk-enrich' action and overrides any stub.
	// "Import from My Maps" — existing My Maps import.
	[BULK_MYMAPS_IMPORT_ACTION]: () => {
		closeMessage();
		void openMymapsImportDialog();
	},
	// "Re-import from My Maps" — P6: add only newly discovered placemarks.
	[BULK_MYMAPS_REIMPORT_ACTION]: () => {
		closeMessage();
		void openMymapsReimportDialog();
	},
});

export function addListenerToRemoveDestination(category, j) {
	getID(`remove-${category}-${j}`).addEventListener('click', () => {
		unregisterRegionSelect(`${category}-region-select-${j}`);
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
	properties.botoes = [
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
			instagram: getID(`${category}-instagram-${j}`).value,
			regions: getRegionPills(`${category}-regions-${j}`),
			price: getID(`${category}-price-${j}`).value,
			media: getID(`${category}-media-${j}`).value,
			rating: getID(`${category}-rating-${j}`).value,
			images: DESTINATION_IMAGES[`${category}-${j}`] || [],
		};

		const newJ = getLastJ(`${newCategory}-box`) + 1;

		addDestination(newCategory);
		addDestinationHTML(newCategory, newJ, destination);
		setDescription(newCategory, newJ, description);
		removeChildWithValidation(category, j);

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
	properties.botoes = [
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
