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
import { ACCOMMODATION_IMAGES, setImageButtonLabel } from './accommodation.js';

let TARGET_INDEX = 0;
let SOURCE_ACCOMMODATIONS: Record<string, any> = {};
let SELECTED_SOURCE_ID = '';
let AVAILABLE_SOURCE_TRIPS: Record<string, any>[] | null = null;
let AVAILABLE_SOURCE_TRIPS_REQUEST: Promise<Record<string, any>[]> | null = null;

/** Toggle every import button after the summaries have been checked once. */
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
	properties.content = getLoadingContent();
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

		if (!trips.length) {
			list.innerHTML = `<div class="wallpaper-import-empty">${translate(
				'trip.accommodation.import.no_trips',
			)}</div>`;
			return;
		}

		list.innerHTML = `<div class="wallpaper-import-group-grid">${trips
			.map((trip) => getTripCard(trip))
			.join('')}</div>`;
		list.addEventListener('click', (event) => {
			const card = (event.target as Element).closest<HTMLElement>('[data-trip-id]');
			const tripId = card?.getAttribute('data-trip-id');
			if (tripId) void loadTripAccommodations(tripId);
		});
	} catch (error) {
		list.innerHTML = `<div class="wallpaper-import-empty">${translate(
			'trip.accommodation.import.load_error',
		)}</div>`;
		console.error('Could not load accommodation import trips:', error);
	}
}

function getAvailableSourceTrips(): Promise<Record<string, any>[]> {
	if (AVAILABLE_SOURCE_TRIPS) return Promise.resolve(AVAILABLE_SOURCE_TRIPS);
	if (!AVAILABLE_SOURCE_TRIPS_REQUEST) {
		AVAILABLE_SOURCE_TRIPS_REQUEST = getUserTrips().then((trips) => {
			AVAILABLE_SOURCE_TRIPS = trips.filter(
				(trip) => trip.id !== DOCUMENT_ID && trip.modules?.accommodations === true,
			);
			return AVAILABLE_SOURCE_TRIPS;
		});
	}
	return AVAILABLE_SOURCE_TRIPS_REQUEST;
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
	list.innerHTML = getLoadingContent();

	try {
		const trip = await getTripRaw(tripId);
		const accommodations = await getTripAccommodations(tripId);
		const source = accommodations.length ? accommodations : trip?.accommodations || [];

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
				${source.map((accommodation) => getAccommodationCard(accommodation, trip)).join('')}
			</div>`;
		list.addEventListener('click', selectSourceAccommodation);
	} catch (error) {
		list.innerHTML = `<div class="wallpaper-import-empty">${translate(
			'trip.accommodation.import.load_error',
		)}</div>`;
		console.error('Could not load source trip accommodations:', error);
	}
}

function getAccommodationCard(accommodation: Record<string, any>, trip: Record<string, any>) {
	const image = accommodation.images?.[0]?.link || trip?.image?.background || '';
	return `
		<button type="button" class="wallpaper-import-card" data-accommodation-id="${accommodation.id}">
			<div class="wallpaper-import-thumb" style="background-image: url('${image}')"></div>
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
	setImageButtonLabel(index);
	markStagedChanges();
	closeMessage();
}

/** Apply source times without touching the target trip's check-in/out days. */
function setImportedTime(inputId: string, date: Record<string, any> | undefined) {
	if (typeof date?.hour !== 'number' || typeof date?.minute !== 'number') return;
	getID(inputId).value =
		`${String(date.hour).padStart(2, '0')}:${String(date.minute).padStart(2, '0')}`;
}

function getLoadingContent() {
	return `
		<div class="wallpaper-import-loading">
			<div class="wallpaper-import-spinner"></div>
			<span>${translate('trip.accommodation.import.loading')}</span>
		</div>
		<div class="wallpaper-import-scroll" id="accommodation-import-list"></div>`;
}
