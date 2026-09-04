// ======= Accommodation importer =======
// Lets an accommodation reuse the non-sensitive details of a stay from one of
// the current user's earlier trips. Trip summaries make the first picker
// inexpensive; the full trip and its accommodation subcollection are fetched
// only after the user chooses a source trip.

import { getUserTrips } from '../../../data/services/auth.service.js';
import { getTripAccommodations, getTripRaw } from '../../../data/services/trip.service.js';
import { DOCUMENT_ID } from '../../../data/state.js';
import { translate } from '../../../i18n/translation.js';
import { cloneObject, getChildIDs, getID, getJ } from '../../../utils/dom.js';
import {
	closeMessage,
	displayFullMessage,
	getContainersInput,
	MESSAGE_PROPERTIES,
} from '../../../utils/messages.js';
import { markStagedChanges } from '../../../ui/fields.js';
import { ACCOMMODATION_IMAGES, renderAccommodationImageCarousel } from './accommodation.js';

let TARGET_INDEX = 0;
let SOURCE_ACCOMMODATIONS: Record<string, any> = {};
let SELECTED_SOURCE_ID = '';
let AVAILABLE_SOURCE_TRIPS: Record<string, any>[] | null = null;
let AVAILABLE_SOURCE_TRIPS_REQUEST: Promise<Record<string, any>[]> | null = null;
let SEARCH_QUERY = '';

/**
 * Show the accommodation import button only when the user actually has other
 * trips with accommodations to import from — hide it otherwise.
 */
export async function refreshAccommodationImportButtons() {
	const trips = await getAvailableSourceTrips();
	for (const childId of getChildIDs('accommodations-box')) {
		const button = getID(`accommodation-import-button-${getJ(childId)}`);
		if (button) button.style.display = trips.length ? '' : 'none';
	}
}

/** Open the source-trip picker for accommodation row `index`. */
export function openAccommodationImport(index: number) {
	TARGET_INDEX = index;
	SOURCE_ACCOMMODATIONS = {};
	SELECTED_SOURCE_ID = '';

	const properties = cloneObject(MESSAGE_PROPERTIES);
	properties.title = translate('trip.accommodation.import.title');
	properties.containers = getContainersInput();
	properties.fullscreen = true;
	// Back arrow (shared #back-icon, hidden until a trip is selected) returns to
	// the trip picker so another source trip can be chosen.
	properties.icons = [{ type: 'goBack', action: goBackToTripPicker }];
	properties.content = `
		<div class="wallpaper-import-loading" id="accommodation-import-loading">
			<div class="wallpaper-import-spinner"></div>
			<span>${translate('trip.accommodation.import.loading_trips')}</span>
		</div>
		<div class="wallpaper-import-search-bar" id="accommodation-import-search-bar">
			<div class="search-bar">
				<i class="iconify search-icon" data-icon="material-symbols:search"></i>
				<input type="text" id="accommodation-import-search" class="search-input"
					placeholder="${translate('trip.accommodation.import.search_placeholder')}" />
				<button class="search-clear" id="accommodation-import-search-clear" style="display:none"
					aria-label="Clear search">
					<i class="iconify" data-icon="material-symbols:close"></i>
				</button>
			</div>
		</div>
		<div class="wallpaper-import-scroll" id="accommodation-import-list"></div>`;
	properties.buttons = [
		{ type: 'cancel' },
		{
			type: 'confirm',
			action: applyAccommodationImport,
			label: 'labels.confirm',
		},
	];
	displayFullMessage(properties);
	(getID('message-confirm') as HTMLButtonElement).disabled = true;

	void loadSourceTrips();
}

async function loadSourceTrips() {
	const list = getID('accommodation-import-list');
	if (!list) return;

	try {
		const trips = await getAvailableSourceTrips();
		hideImportLoading();
		SEARCH_QUERY = '';

		renderTripPicker(list);
		initTripSearch();

		list.addEventListener('click', handleImportListClick);
	} catch (error) {
		hideImportLoading();
		list.innerHTML = `<div class="wallpaper-import-empty">${translate(
			'trip.accommodation.import.load_error',
		)}</div>`;
		console.error('Could not load accommodation import trips:', error);
	}
}

/** Render the trip cards filtered by the current search query. */
function renderTripPicker(list: HTMLElement) {
	const query = SEARCH_QUERY.trim().toLowerCase();
	const filtered = query
		? (AVAILABLE_SOURCE_TRIPS || []).filter((trip) =>
				(trip.title || '').toLowerCase().includes(query),
			)
		: AVAILABLE_SOURCE_TRIPS || [];

	if (!filtered.length) {
		list.innerHTML = `<div class="wallpaper-import-empty">${translate(
			query ? 'trip.accommodation.import.no_matches' : 'trip.accommodation.import.no_trips',
		)}</div>`;
		return;
	}

	list.innerHTML = `<div class="wallpaper-import-group-grid">${filtered
		.map((trip) => getTripCard(trip))
		.join('')}</div>`;
}

/** Wire up the trip-picker search input (clear button mirrors index). */
function initTripSearch() {
	const input = getID('accommodation-import-search') as HTMLInputElement | null;
	const clear = getID('accommodation-import-search-clear');
	const list = getID('accommodation-import-list');
	if (!input || !list) return;

	input.addEventListener('input', () => {
		SEARCH_QUERY = input.value;
		if (clear) clear.style.display = input.value ? 'flex' : 'none';
		renderTripPicker(list);
	});
	if (clear) {
		clear.addEventListener('click', () => {
			input.value = '';
			SEARCH_QUERY = '';
			clear.style.display = 'none';
			renderTripPicker(list);
		});
	}
}

function getAvailableSourceTrips(): Promise<Record<string, any>[]> {
	if (AVAILABLE_SOURCE_TRIPS) return Promise.resolve(AVAILABLE_SOURCE_TRIPS);
	if (!AVAILABLE_SOURCE_TRIPS_REQUEST) {
		AVAILABLE_SOURCE_TRIPS_REQUEST = getUserTrips().then((trips) => {
			// Newest first (older trips last), from the summary's start date.
			AVAILABLE_SOURCE_TRIPS = trips
				.filter((trip) => trip.id !== DOCUMENT_ID && trip.modules?.accommodations === true)
				.sort((a, b) => getTripStartTime(b) - getTripStartTime(a));
			return AVAILABLE_SOURCE_TRIPS;
		});
	}
	return AVAILABLE_SOURCE_TRIPS_REQUEST;
}

/** Timestamp for a trip summary's start date (0 when missing). */
function getTripStartTime(trip: Record<string, any>): number {
	const start = trip?.start;
	if (!start || typeof start.year !== 'number') return 0;
	return new Date(start.year, (start.month || 1) - 1, start.day || 1).getTime();
}

function getTripCard(trip: Record<string, any>) {
	const image = trip.image?.active ? trip.image.background || '' : '';
	return `
		<button type="button" class="wallpaper-import-card" data-trip-id="${trip.id}">
			<div class="wallpaper-import-thumb" style="background-image: url('${image}')"></div>
			<div class="wallpaper-import-name">${trip.title || translate('labels.no_title')}</div>
		</button>`;
}

async function loadTripAccommodations(tripId: string) {
	const list = getID('accommodation-import-list');
	if (!list) return;
	const searchBar = getID('accommodation-import-search-bar');
	if (searchBar) searchBar.style.display = 'none';
	// Show the back arrow so the user can return to the trip picker.
	const back = getID('back-icon');
	if (back) back.style.visibility = 'visible';
	list.innerHTML = '';
	setImportLoading(translate('trip.accommodation.import.loading'));

	try {
		const trip = await getTripRaw(tripId);
		const accommodations = await getTripAccommodations(tripId);
		const source = accommodations.length ? accommodations : trip?.accommodations || [];

		hideImportLoading();

		if (!source.length) {
			list.innerHTML = `<div class="wallpaper-import-empty">${translate(
				'trip.accommodation.import.no_accommodations',
			)}</div>`;
			return;
		}

		SOURCE_ACCOMMODATIONS = Object.fromEntries(
			source.map((accommodation) => [accommodation.id, accommodation]),
		);
		list.innerHTML = `
			<p class="wallpaper-import-subgroup-title">${trip?.title || ''}</p>
			<div class="wallpaper-import-group-grid">
				${source.map((accommodation) => getAccommodationCard(accommodation)).join('')}
			</div>`;
	} catch (error) {
		hideImportLoading();
		list.innerHTML = `<div class="wallpaper-import-empty">${translate(
			'trip.accommodation.import.load_error',
		)}</div>`;
		console.error('Could not load source trip accommodations:', error);
	}
}

function getAccommodationCard(accommodation: Record<string, any>) {
	const image = accommodation.images?.[0]?.link || '';
	const thumb = image
		? `<div class="wallpaper-import-thumb" style="background-image: url('${image}')"></div>`
		: `<div class="wallpaper-import-thumb no-image"><i class="iconify image-picker-icon" data-icon="material-symbols:hotel-outline"></i></div>`;
	return `
		<button type="button" class="wallpaper-import-card" data-accommodation-id="${accommodation.id}">
			${thumb}
			<div class="wallpaper-import-name">${accommodation.name || translate('labels.no_title')}</div>
		</button>`;
}

function selectSourceAccommodation(event: Event) {
	const card = (event.target as Element).closest<HTMLElement>('[data-accommodation-id]');
	const id = card?.getAttribute('data-accommodation-id') || '';
	if (!id || !SOURCE_ACCOMMODATIONS[id]) return;

	SELECTED_SOURCE_ID = id;
	getID('accommodation-import-list')
		?.querySelectorAll('.wallpaper-import-card')
		.forEach((item) => item.classList.toggle('selected', item === card));

	const confirm = getID('message-confirm') as HTMLButtonElement | null;
	if (confirm) confirm.disabled = false;
}

/**
 * Single delegated click handler for the import list — handles both the trip
 * picker (selecting a trip) and the accommodations step (selecting a stay),
 * so listeners don't pile up across back/forward navigation.
 */
function handleImportListClick(event: Event) {
	const tripCard = (event.target as Element).closest<HTMLElement>('[data-trip-id]');
	if (tripCard) {
		const tripId = tripCard.getAttribute('data-trip-id');
		if (tripId) void loadTripAccommodations(tripId);
		return;
	}
	selectSourceAccommodation(event);
}

/** Return from the accommodations list to the trip picker (back arrow). */
function goBackToTripPicker() {
	const back = getID('back-icon');
	if (back) back.style.visibility = 'hidden';

	const searchBar = getID('accommodation-import-search-bar');
	if (searchBar) searchBar.style.display = '';

	const list = getID('accommodation-import-list');
	if (list) renderTripPicker(list);

	SOURCE_ACCOMMODATIONS = {};
	SELECTED_SOURCE_ID = '';
	const confirm = getID('message-confirm') as HTMLButtonElement | null;
	if (confirm) confirm.disabled = true;
}

/** Copy the selected source while retaining fields that belong to this trip. */
function applyAccommodationImport() {
	const source = SOURCE_ACCOMMODATIONS[SELECTED_SOURCE_ID];
	const index = TARGET_INDEX;
	if (!source || !index) return;

	// Do not overwrite the stable target ID, the selected trip's calendar dates,
	// or the protected reservation fields. Payment status intentionally returns
	// to the default so a prior trip's prepaid state is never carried forward.
	getID(`accommodations-breakfast-${index}`).checked = source.breakfast === true;
	getID(`accommodations-name-${index}`).value = source.name || '';
	getID(`accommodations-title-${index}`).innerText =
		source.name || translate('trip.accommodation.accommodation');
	getID(`accommodations-address-${index}`).value = source.address || '';
	getID(`accommodations-description-${index}`).value = source.description || '';
	setImportedTime(`check-in-time-${index}`, source.dates?.checkIn);
	setImportedTime(`check-out-time-${index}`, source.dates?.checkOut);
	getID(`accommodations-payment-status-${index}`).value = '';
	ACCOMMODATION_IMAGES[index] = cloneObject(source.images || []);
	renderAccommodationImageCarousel(index);
	markStagedChanges();
	closeMessage();
}

/** Apply source times without touching the target trip's check-in/out days. */
function setImportedTime(inputId: string, date: Record<string, any> | undefined) {
	if (typeof date?.hour !== 'number' || typeof date?.minute !== 'number') return;
	getID(inputId).value =
		`${String(date.hour).padStart(2, '0')}:${String(date.minute).padStart(2, '0')}`;
}

/** Show the dialog's loading indicator with the given label. */
function setImportLoading(label: string) {
	const loading = getID('accommodation-import-loading');
	if (!loading) return;
	const span = loading.querySelector('span');
	if (span) span.textContent = label;
	loading.style.display = 'flex';
}

/** Hide the dialog's loading indicator once content has rendered. */
function hideImportLoading() {
	const loading = getID('accommodation-import-loading');
	if (loading) loading.style.display = 'none';
}
