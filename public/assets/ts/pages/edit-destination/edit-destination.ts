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
import { MYMAPS_KML_ENABLED } from '../../data/services/mymaps-kml.service.js';
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
					translate('placesApi.bulk.options.groupEnrichSub'),
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
		<p class="places-linked-message">${escapeHtml(
			translate('placesApi.bulk.options.message'),
		)}</p>
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
