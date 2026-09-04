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
import { getID, getErrorFromGetRequestMessage } from '../../utils/dom.js';
import { translate } from '../../i18n/translation.js';
import { stopLoadingScreen } from '../../utils/loading.js';
import { loadActiveCategory, ACTIVE_CATEGORY } from './categories.js';
import { adjustEditVisibility } from './edit-destination.js';
import { getDestinationCardHTML } from './support/card.js';
import { filter } from './support/sort-and-filter/filter.js';
import { sort } from './support/sort-and-filter/sort.js';
import { loadSortAndFilter } from './support/sort-and-filter/sort-and-filter.js';
import { getTripData, loadPlannedDestination, PLANNED_DESTINATION } from './support/trip.js';
import { loadDestinationVisibility } from './support/visibility.js';
import { LazyGrid } from '../../ui/lazy-grid.js';
import { buildMyMapsEmbed } from '../../ui/mymaps-embed.js';

export { ACTIVE_CATEGORY };
export var CONTENT = [];

/**
 * In-memory cache of destination documents fetched in this page session, keyed
 * by destination id. Lets a repeated mount (e.g. the view.html lightbox reopens
 * a destination already viewed, possibly after other destinations in between)
 * render from stored data instead of issuing another Firestore read.
 *
 * Scope & freshness: the cache lives only for the current page load (it resets
 * on reload) and only ever stores data from a *successful* read. It is kept up
 * to date by refreshDestination() after local writes, and can be dropped on
 * demand via invalidateDestinationCache(). Cross-device edits made while the
 * page stays open will surface on the next reload, which is the intended
 * trade-off of trading a network read for instant reopens.
 */
const DESTINATION_CACHE = new Map<string, any>();

/** Drop one cached destination document (e.g. right after a local write). */
export function invalidateDestinationCache(destinationId: string): void {
	if (destinationId) DESTINATION_CACHE.delete(destinationId);
}

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

/** Shared lazy card grid bound to the container + sentinel. */
let GRID: LazyGrid | null = null;

/** True when the sentinel was created dynamically (view.html lightbox path). */
let SENTINEL_CREATED = false;

function getContainer(): HTMLElement {
	return CONTAINER || getID('content');
}

export async function mountDestination(
	container: HTMLElement,
	opts: MountDestinationOptions,
): Promise<(() => void) | null> {
	CONTAINER = container;
	container.innerHTML = '';

	// The component is re-mounted on every view.html lightbox open, and that
	// host clears the DOM on close WITHOUT calling this mount's dispose — so a
	// leftover LazyGrid would stay bound to detached #content/#sentinel nodes
	// and the next mount would render into them (empty grid). Tear down any
	// grid from a previous mount so each mount binds a fresh LazyGrid to the
	// current container/sentinel. (In-page category tab switches call
	// loadDestinationByType directly and keep reusing the live grid.)
	if (GRID) {
		GRID.disconnect();
		GRID = null;
	}
	SENTINEL_CREATED = false;

	setDocumentId(opts.destinationId);

	if (!DOCUMENT_ID) {
		console.warn('[destination] Missing destinationId in opts:', opts);
		throw new Error(translate('messages.errors.missing_data') + ' (no destinationId)');
	}

	const path = `destinations/${DOCUMENT_ID}`;

	// Reopen fast-path: if this destination was fetched earlier in the page
	// session (same or another mount), reuse the stored document and skip the
	// Firestore read. The trip data still comes from opts.data when the host
	// (view.html lightbox) already has it, or a single read on the standalone
	// destination page. Only successful reads populate the cache.
	const cachedData = DESTINATION_CACHE.get(DOCUMENT_ID);

	let tripData: any;
	let destinosData: any;
	if (cachedData) {
		console.log('[destination] Using cached data for:', path);
		destinosData = cachedData;
		tripData = opts.data ? opts.data : await getTripData(opts.tripId);
	} else {
		console.log('[destination] Fetching:', path);
		[tripData, destinosData] = await Promise.all([
			opts.data ? Promise.resolve(opts.data) : getTripData(opts.tripId),
			get(path),
		]);
		if (destinosData) DESTINATION_CACHE.set(DOCUMENT_ID, destinosData);
	}

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
			GRID?.disconnect();
			GRID = null;
			if (SENTINEL_CREATED) {
				getID('destinations-grid-sentinel')?.remove();
				SENTINEL_CREATED = false;
			}
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

	if (activeCategory === 'myMaps') {
		content.classList = 'map-content';
		loadMapDestination(FIRESTORE_DESTINATIONS_DATA?.myMaps);
		if (filterSortContainer) filterSortContainer.style.display = 'none';
		const addContainer = document.querySelector('.add-container') as HTMLElement | null;
		if (addContainer) addContainer.style.display = 'none';
		setSearchBarVisible(false);
		setSentinelVisible(false);
		return;
	}

	content.classList = '';
	if (filterSortContainer) filterSortContainer.style.display = '';
	setSearchBarVisible(true);
	setSentinelVisible(true);

	const destination = FIRESTORE_DESTINATIONS_DATA?.[activeCategory];
	if (!destination) return;

	const keys = Object.keys(destination);
	CONTENT = keys.map((id, index) => ({
		id,
		item: destination[id],
		j: index + 1,
	}));

	loadSortAndFilter();
	applyContent();
	adjustEditVisibility();
	stopLoadingScreen();
}

function loadMapDestination(link) {
	const iframe = buildMyMapsEmbed(link);
	if (!iframe) {
		console.error('Invalid My Maps link.');
		return;
	}
	const container = getContainer();
	container.innerHTML = '';
	container.appendChild(iframe);
}

// Setters
export function applyContent() {
	const ordered = sort(CONTENT);
	const filtered = filter(ordered);
	getGrid()?.setItems(filtered);
	return filtered;
}

function getGrid(): LazyGrid | null {
	if (GRID) return GRID;

	const content = getContainer();
	let sentinel = getID('destinations-grid-sentinel') as HTMLElement | null;
	if (!sentinel) {
		sentinel = document.createElement('div');
		sentinel.id = 'destinations-grid-sentinel';
		sentinel.className = 'grid-sentinel';
		content.insertAdjacentElement('afterend', sentinel);
		SENTINEL_CREATED = true;
	}

	GRID = new LazyGrid(
		content,
		sentinel,
		(entry) => getDestinationCardHTML({ id: entry.id, item: entry.item, j: entry.j }),
		8,
		(entry) => entry.item?.name || '',
	);
	return GRID;
}

function setSearchBarVisible(visible) {
	const bar = getID('destination-search-bar');
	if (bar) bar.style.display = visible ? '' : 'none';
}

function setSentinelVisible(visible) {
	const sentinel = getID('destinations-grid-sentinel');
	if (sentinel) sentinel.style.display = visible ? '' : 'none';
}

export function setSearchQuery(query) {
	GRID?.setQuery(query);
}

export function getDataSet(key) {
	const category = ACTIVE_CATEGORY;
	if (!category) return new Set();

	const data = FIRESTORE_DESTINATIONS_DATA?.[category] ?? {};
	const values: unknown[] = [];
	for (const item of Object.values(data) as any[]) {
		const value = item?.[key];
		if (value === undefined || value === null) continue;
		// `regions` is an array — flatten so each individual region is a member.
		if (Array.isArray(value)) values.push(...value);
		else values.push(value);
	}
	return new Set(values);
}

export function getDestinationID(j) {
	const destination = getID(`destinations-card-${j}`);
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
	const path = `destinations/${DOCUMENT_ID}`;
	const data = await get(path);
	if (!data) return;
	// A local write just landed — refresh the session cache so a later reopen
	// (view.html lightbox) shows the updated document instead of the old copy.
	DESTINATION_CACHE.set(DOCUMENT_ID, data);
	setFirestoreDestinationsData(data);
	loadDestinationByType(ACTIVE_CATEGORY);
}
