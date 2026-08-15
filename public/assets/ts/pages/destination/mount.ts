// ======= Destination Mount Component =======
// Pure render component for destination content. Shared by:
//   - destination.html (standalone bootstrap → mountDestination)
//   - view.html destination-detail lightbox (workstream D — dynamic import)
//
// Contract (see docs/implementation-plans/20260812-iframe-to-components.md):
//   - Never reads URL params, never touches window.parent, never reads/writes
//     localStorage, never creates page-level iframes.
//   - Renders into the provided container (clears it first).
//   - Returns a dispose function; safe to re-mount.

import { get, haveErrorFromGetRequest } from '../../data/firebase/database.js';
import { displayError } from '../../utils/messages.js';
import {
	setState,
	DOCUMENT_ID,
	FIRESTORE_DESTINATIONS_DATA,
	setDocumentId,
	setFirestoreDestinationsData,
} from '../../data/state.js';
import { getID, getJs, getErrorFromGetRequestMessage } from '../../utils/dom.js';
import { translate } from '../../i18n/translation.js';
import { stopLoadingScreen } from '../../utils/loading.js';
import { loadActiveCategory, ACTIVE_CATEGORY } from './categories.js';
import { adjustEditVisibility, restoreIfEditing } from './edit-destination.js';
import { getDestinationsHTML } from './support/content.js';
import {
	adjustInstagramMedia,
	loadEmbed,
	loadMedia,
	unloadMedia,
	unloadMedias,
	MEDIA_HYPERLINKS,
} from './support/media-embed.js';
import { loadSortAndFilter } from './support/sort-and-filter/sort-and-filter.js';
import { adjustDrawer } from './support/sort-and-filter/support/drawer.js';
import { getTripData, loadPlannedDestination, PLANNED_DESTINATION } from './support/trip.js';
import { applyDestinationsMediaHeight, loadDestinationVisibility } from './support/visibility.js';

export { ACTIVE_CATEGORY };
export var CONTENT = [];

export interface MountDestinationOptions {
	/** Destination document ID (required). */
	destinationId: string;
	/** Trip document ID (optional — drives planned destinations). */
	tripId?: string;
	/** Initial destination category (English id, e.g. 'restaurants'). */
	type?: string;
	/** Reserved for the view.html embedding flow (workstream D). */
	visibility?: string;
	/** Pre-loaded trip data — avoids a duplicate Firestore read when the host already has it. */
	data?: any;
}

/** The container currently being rendered into. Defaults to #content on the standalone page. */
let CONTAINER: HTMLElement | null = null;

function getContainer(): HTMLElement {
	return CONTAINER || getID('content');
}

export async function mountDestination(
	container: HTMLElement,
	opts: MountDestinationOptions,
): Promise<(() => void) | null> {
	CONTAINER = container;
	container.innerHTML = '';

	setDocumentId(opts.destinationId);

	if (!DOCUMENT_ID) {
		console.warn('[destination] Missing destinationId in opts:', opts);
		throw new Error(translate('messages.errors.missing_data') + ' (no destinationId)');
	}

	const path = `destinations/${DOCUMENT_ID}`;
	console.log('[destination] Fetching:', path);
	const [tripData, destinosData] = await Promise.all([
		opts.data ? Promise.resolve(opts.data) : getTripData(opts.tripId),
		get(path),
	]);

	// ── Access guard ──
	// If the Firestore read was denied (e.g. the user is unauthenticated and the
	// document isn't public), surface the proper access-denied message up front
	// and abort the load. Without this the page would proceed with `undefined`
	// data and crash mid-flow (e.g. `can't access property "currency" of
	// undefined`), only showing a generic error afterwards.
	if (haveErrorFromGetRequest() && !destinosData) {
		displayError(getErrorFromGetRequestMessage(), true);
		stopLoadingScreen();
		return null;
	}

	if (!destinosData) {
		console.warn('[destination] Document not found at path:', path);
		throw new Error(translate('messages.errors.missing_data') + ` (not found: ${path})`);
	}

	setFirestoreDestinationsData(destinosData);
	setState(tripData);

	loadPlannedDestination();
	loadActiveCategory({ type: opts.type });

	await loadDestinationVisibility();

	if (
		ACTIVE_CATEGORY &&
		(ACTIVE_CATEGORY === 'map' ||
			(FIRESTORE_DESTINATIONS_DATA[ACTIVE_CATEGORY] &&
				Object.keys(FIRESTORE_DESTINATIONS_DATA[ACTIVE_CATEGORY]).length > 0))
	) {
		loadDestinationByType(ACTIVE_CATEGORY);
		return () => {
			unloadMedias(undefined);
			container.innerHTML = '';
		};
	}

	throw new Error(translate('messages.errors.missing_data'));
}

export function loadDestinationByType(activeCategory) {
	const content = getContainer();
	const filterSortContainer = getID('filter-sort-container');

	content.innerHTML = '';
	CONTENT = [];
	// Clear MEDIA_HYPERLINKS in-place (imported bindings are read-only)
	for (const key of Object.keys(MEDIA_HYPERLINKS)) {
		delete MEDIA_HYPERLINKS[key];
	}

	if (activeCategory === 'myMaps') {
		content.classList = 'map-content';
		loadMapDestination(FIRESTORE_DESTINATIONS_DATA?.myMaps);
		if (filterSortContainer) filterSortContainer.style.display = 'none';
		const addContainer = document.querySelector('.add-container') as HTMLElement | null;
		if (addContainer) addContainer.style.display = 'none';
		return;
	} else {
		content.classList = '';
		if (filterSortContainer) filterSortContainer.style.display = '';
	}

	const destination = FIRESTORE_DESTINATIONS_DATA?.[activeCategory];
	if (!destination) return;
	const keys = Object.keys(destination);
	for (let j = 1; j <= keys.length; j++) {
		const id = keys[j - 1];
		const item = destination[id];
		const innerHTML = getDestinationsHTML({ j, id, item });
		loadEmbed(item?.media, j);
		CONTENT.push({ id, innerHTML });
	}

	loadSortAndFilter();
	applyContent();
	applyDestinationsMediaHeight();
	adjustInstagramMedia();
	adjustEditVisibility();
	stopLoadingScreen();
}

function loadMapDestination(link) {
	if (!link || !link.includes('mid=')) {
		console.error('Invalid My Maps link.');
		return;
	}
	const mid = link.split('mid=')[1].split('&')[0];
	getContainer().innerHTML =
		`<iframe class="map-iframe" src="https://www.google.com/maps/d/embed?mid=${mid}&ehbc=2E312F" width="640" height="480"></iframe>`;
}

// Setters
export function applyContent() {
	const div = getContainer();
	div.innerHTML = '';
	for (const content of CONTENT) {
		if (content.filtered) {
			continue;
		}
		div.innerHTML += content.innerHTML;
	}
}

// Actions
export function processAccordion(j) {
	restoreIfEditing(j);
	adjustDrawer();
	toggleMedia(j);
	unloadMedias(j);
	closeAccordions(j);
	adjustEditVisibility(j);
}

function toggleMedia(j) {
	const button = getID(`destinations-title-${j}`);
	const media = `media-${j}`;
	if (button.classList.contains('collapsed')) {
		unloadMedia(media);
	} else {
		loadMedia(media);
		applyDestinationsMediaHeight();
	}
}

function closeAccordions(exclude) {
	for (const j of getJs('content')) {
		if (j !== exclude) {
			$(`#collapse-destinations-${j}`).collapse('hide');
		}
	}
}

export function getDataSet(key) {
	const category = ACTIVE_CATEGORY;
	if (!category) return new Set();

	const data = FIRESTORE_DESTINATIONS_DATA?.[category] ?? {};
	return new Set(
		Object.values(data)
			.map((item) => item?.[key])
			.filter((v) => v !== undefined && v !== null),
	);
}

export function getDestinationID(j) {
	const destination = getID(`destinations-${j}`);
	return destination.getAttribute('data-id');
}

export function getItemFromJ(j) {
	const id = getDestinationID(j);
	return getItem(id);
}

export function getItem(id) {
	return FIRESTORE_DESTINATIONS_DATA?.[ACTIVE_CATEGORY]?.[id];
}

export function isPlanned(id) {
	const value = PLANNED_DESTINATION?.[ACTIVE_CATEGORY]?.[id];
	return value && Object.keys(value).length > 0;
}

export async function refreshDestination() {
	const data = await get(`destinations/${DOCUMENT_ID}`);
	if (!data) return;
	setFirestoreDestinationsData(data);
	loadDestinationByType(ACTIVE_CATEGORY);
}
