import { displayError } from '../../../utils/messages.js';
import {
	getUserData,
	registerIfUserNotPresent,
	setUserData,
	USER_DATA,
	getUID,
} from '../../../data/firebase/auth.js';
import {
	getCurrentTrips,
	getID,
	getLastUpdatedOnText,
	getNextTrips,
	getOrderedDocumentByUpdateDate,
	getPreviousTrips,
} from '../../../utils/dom.js';
import { translate, translatePage } from '../../../i18n/translation.js';
import { stopLoadingScreen } from '../../../utils/loading.js';
import { dateObjectToString } from '../../../utils/dates.js';
import {
	getUserTripSummaries,
	getUserDestinationSummaries,
	getUserListingSummaries,
} from '../../../data/firebase/database.js';
import {
	viewTrip,
	editTrip,
	viewDestination,
	editDestination,
	viewListing,
	editListing,
} from './navigation.js';

var INDEX_DATA: Record<string, any> = {};
var CURRENT_TRIPS: any[] = [];
var PREVIOUS_TRIPS: any[] = [];
var NEXT_TRIPS: any[] = [];
var ALL_TRIPS: any[] = []; // Merged for the unified trip view
var SELECTED_TRIP_ID: string | null = null;

/** Convert an array of { id, ...data } to a Record<string, data> for compatibility with legacy helpers */
function arrayToRecord<T extends { id: string }>(arr: T[]): Record<string, Omit<T, 'id'>> {
	const record: Record<string, any> = {};
	for (const item of arr) {
		const { id, ...rest } = item;
		record[id] = rest;
	}
	return record;
}

export async function loadUserIndex() {
	try {
		firebase.auth().onAuthStateChanged(async (user) => {
			if (user) {
				await registerIfUserNotPresent();
				showLoggedView();

				setUserData(await getUserData(user.uid));

			const displayName = user.displayName || '';
			const photo = user.photoURL || '';
				const photoURL = photo ? 'url(' + photo + ')' : '';

				getID('title-name').innerHTML = displayName ? displayName.split(' ')[0] : '';
				getID('greeting-avatar').style.backgroundImage = photoURL;
				getID('greeting-avatar').style.backgroundSize = 'cover';

				getID('settings-user-name').innerHTML = displayName;
				getID('settings-avatar').style.backgroundImage = photoURL;
				getID('settings-avatar').style.backgroundSize = 'cover';

				getID('profile-icon').style.backgroundImage = photoURL;
				getID('profile-icon').style.backgroundSize = 'cover';

				// Load summaries from subcollections (post-migration 14)
				const uid = await getUID();
				const [tripSummaries, destSummaries, listSummaries] = await Promise.all([
					getUserTripSummaries(uid),
					getUserDestinationSummaries(uid),
					getUserListingSummaries(uid),
				]);

				INDEX_DATA = {
					trips: arrayToRecord(tripSummaries),
					destinations: arrayToRecord(destSummaries),
					listings: arrayToRecord(listSummaries),
				};

				CURRENT_TRIPS = getCurrentTrips(INDEX_DATA.trips);
				PREVIOUS_TRIPS = getPreviousTrips(INDEX_DATA.trips);
				NEXT_TRIPS = getNextTrips(INDEX_DATA.trips);

				// Build ALL_TRIPS: current first, then next, then previous
				ALL_TRIPS = [
					...CURRENT_TRIPS.map((t) => ({ ...t, category: 'current' })),
					...NEXT_TRIPS.map((t) => ({ ...t, category: 'next' })),
					...PREVIOUS_TRIPS.map((t) => ({ ...t, category: 'past' })),
				];

				loadTripsTab();
				loadDestinationsTab();
				loadListsTab();
				translatePage();

				// Expose key variables for dev mode (localhost only)
				if (typeof dev !== 'undefined') {
					dev.page.INDEX_DATA = INDEX_DATA;
					dev.page.CURRENT_TRIPS = CURRENT_TRIPS;
					dev.page.PREVIOUS_TRIPS = PREVIOUS_TRIPS;
					dev.page.NEXT_TRIPS = NEXT_TRIPS;
					dev.page.ALL_TRIPS = ALL_TRIPS;
					dev.page.SELECTED_TRIP_ID = SELECTED_TRIP_ID;
					dev.page.USER_DATA = USER_DATA;
				}
			} else {
				showUnloggedView();
			}
		});
	} catch (error) {
		stopLoadingScreen();
		displayError(error);
		throw error;
	}
	stopLoadingScreen();
}

function showLoggedView() {
	getID('unlogged-view').style.display = 'none';
	getID('logged-view').style.display = 'block';
	getID('profile-icon').style.display = 'flex';
}

function showUnloggedView() {
	getID('logged-view').style.display = 'none';
	getID('unlogged-view').style.display = 'block';
	getID('profile-icon').style.display = 'none';
}

/*--------------------------------------------------------------
# Trips Tab
--------------------------------------------------------------*/
function loadTripsTab() {
	const grid = getID('trip-grid');
	const empty = getID('trips-empty');
	const count = getID('trips-count');

	if (ALL_TRIPS.length === 0) {
		grid.innerHTML = '';
		empty.style.display = 'block';
		count.textContent = '';
		return;
	}
	empty.style.display = 'none';
	count.textContent =
		ALL_TRIPS.length +
		' ' +
		(ALL_TRIPS.length === 1 ? translate('trip.document') : translate('trip.document') + 's');

	let html = '';
	for (const trip of ALL_TRIPS) {
		const bgImage = getTripBackgroundImage(trip);
		const badgeClass =
			trip.category === 'current'
				? 'badge-current'
				: trip.category === 'next'
					? 'badge-next'
					: 'badge-past';
		const badgeLabel =
			trip.category === 'current'
				? translate('index.active')
				: trip.category === 'next'
					? translate('index.upcoming')
					: translate('index.finished');
		const dateStr = dateObjectToString(trip.start) + ' – ' + dateObjectToString(trip.end);

		const imageHTML = bgImage
			? `<div class="trip-card-image" style="background-image: url('${bgImage}')"></div>`
			: `<div class="trip-card-image no-image"><i class="iconify card-image-icon" data-icon="tabler:plane-departure"></i></div>`;

		html += `
			<div class="trip-card" data-action="open-trip-dialog" data-trip-id="${trip.id}">
				<span class="trip-card-badge ${badgeClass}">${badgeLabel}</span>
				${imageHTML}
				<div class="trip-card-body">
					<div class="trip-card-title">${trip.title || translate('labels.no_title')}</div>
					<div class="trip-card-meta">
						<i class="iconify" data-icon="material-symbols:calendar-month" style="font-size:13px"></i>
						${dateStr}
					</div>
				</div>
			</div>`;
	}
	grid.innerHTML = html;
}

function getTripBackgroundImage(trip) {
	if (!trip.image || !trip.image.active) return null;
	return trip.image.background || trip.image.light || trip.image.dark || null;
}

/*--------------------------------------------------------------
# Trip Dialog
--------------------------------------------------------------*/
export function openTripDialog(tripId) {
	const trip = ALL_TRIPS.find((t) => t.id === tripId);
	if (!trip) return;
	SELECTED_TRIP_ID = tripId;

	const dialog = getID('trip-dialog');
	const bgImage = getTripBackgroundImage(trip);

	// Image
	const imgDiv = getID('trip-dialog-image');
	if (bgImage) {
		imgDiv.style.backgroundImage = `url('${bgImage}')`;
		imgDiv.className = 'dialog-image';
		imgDiv.innerHTML = '';
	} else {
		imgDiv.style.backgroundImage = '';
		imgDiv.className = 'dialog-image no-image';
		imgDiv.innerHTML = `<i class="iconify dialog-image-icon" data-icon="tabler:plane-departure"></i>`;
	}

	// Title
	getID('trip-dialog-title').textContent = trip.title || translate('labels.no_title');

	// Badge
	const badge = getID('trip-dialog-badge');
	const badgeClass =
		trip.category === 'current'
			? 'badge-current'
			: trip.category === 'next'
				? 'badge-next'
				: 'badge-past';
	const badgeLabel =
		trip.category === 'current'
			? translate('index.active')
			: trip.category === 'next'
				? translate('index.upcoming')
				: translate('index.finished');
	badge.textContent = badgeLabel;
	badge.className = 'dialog-badge ' + badgeClass;

	// Dates
	getID('trip-dialog-dates').textContent =
		dateObjectToString(trip.start) + ' – ' + dateObjectToString(trip.end);

	// Duration
	const durRow = getID('trip-dialog-duration-row');
	const duration = getTripDurationDays(trip);
	if (duration > 0) {
		durRow.style.display = 'flex';
		getID('trip-dialog-duration').textContent =
			duration + ' ' + (duration === 1 ? translate('index.day') : translate('index.days'));
	} else {
		durRow.style.display = 'none';
	}

	// Destinations
	const destRow = getID('trip-dialog-dest-row');
	const destCount = getTripDestinationCount(trip);
	if (destCount > 0) {
		destRow.style.display = 'flex';
		getID('trip-dialog-dests').textContent =
			destCount + ' ' + translate('destination.title').toLowerCase();
	} else {
		destRow.style.display = 'none';
	}

	// Modules
	const modulesDiv = getID('trip-dialog-modules');
	const moduleNames = {
		destinations: translate('destination.title'),
		accommodations: translate('trip.accommodation.title'),
		transportation: translate('trip.transportation.title'),
		itinerary: translate('trip.itinerary.title'),
		expenses: translate('trip.expenses.title'),
		gallery: translate('trip.gallery.title'),
		summary: translate('labels.overview'),
	};
	let modulesHTML = '';
	if (trip.modules) {
		for (const [key, active] of Object.entries(trip.modules)) {
			if (active && moduleNames[key]) {
				modulesHTML += `<span class="module-pill">${moduleNames[key]}</span>`;
			}
		}
	}
	modulesDiv.innerHTML = modulesHTML || `<span class="module-pill">—</span>`;

	// Buttons
	getID('trip-dialog-view').onclick = function () {
		viewTrip(trip.id);
	};
	getID('trip-dialog-edit').onclick = function () {
		editTrip(trip.id);
	};

	// Show dialog with scroll lock
	dialog.style.display = 'flex';
	document.body.classList.add('dialog-open');
}

export function closeTripDialog() {
	getID('trip-dialog').style.display = 'none';
	document.body.classList.remove('dialog-open');
	SELECTED_TRIP_ID = null;
}

function getTripDurationDays(trip: Record<string, any>): number {
	if (!trip.start || !trip.end) return 0;
	const start = new Date(trip.start.year, trip.start.month - 1, trip.start.day);
	const end = new Date(trip.end.year, trip.end.month - 1, trip.end.day);
	return Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
}

function getTripDestinationCount(trip) {
	// This is a rough count — we don't have destinations linked at this level,
	// but we can check if the trip has destinations module active
	if (!trip.modules || !trip.modules.destinations) return 0;
	// Count destinations from USER_DATA that might be linked (if we had linkage)
	// For now, just indicate if destinations module is active
	return trip.modules.destinations ? 1 : 0;
}

/*--------------------------------------------------------------
# Destinations Tab
--------------------------------------------------------------*/
export function loadDestinationsTab() {
	const grid = getID('dest-grid');
	const empty = getID('dest-empty');
	const count = getID('dests-count');
	const destinations = getOrderedDocumentByUpdateDate(INDEX_DATA.destinations);

	if (destinations.length === 0) {
		grid.innerHTML = '';
		empty.style.display = 'block';
		count.textContent = '';
		return;
	}
	empty.style.display = 'none';
	count.textContent =
		destinations.length +
		' ' +
		(destinations.length === 1
			? translate('destination.document')
			: translate('destination.title'));

	let html = '';
	for (const dest of destinations) {
		const dateStr = getLastUpdatedOnText(dest.version?.lastUpdated);
		html += `
			<div class="dest-card" data-action="open-dest-dialog" data-dest-id="${dest.id}">
				<div class="dest-card-image no-image">
					<i class="iconify card-image-icon" data-icon="material-symbols:location-on"></i>
				</div>
				<div class="dest-card-body">
					<div class="dest-card-title">${dest.title || translate('labels.no_title')}</div>
					<div class="dest-card-meta">
						<i class="iconify" data-icon="material-symbols:schedule" style="font-size:13px"></i>
						${dateStr}
					</div>
				</div>
			</div>`;
	}
	grid.innerHTML = html;
}

/*--------------------------------------------------------------
# Lists Tab
--------------------------------------------------------------*/
export function loadListsTab() {
	const grid = getID('list-grid');
	const empty = getID('lists-empty');
	const count = getID('lists-count');
	const listings = getOrderedDocumentByUpdateDate(INDEX_DATA.listings);

	if (listings.length === 0) {
		grid.innerHTML = '';
		empty.style.display = 'block';
		count.textContent = '';
		return;
	}
	empty.style.display = 'none';
	count.textContent =
		listings.length +
		' ' +
		(listings.length === 1 ? translate('listing.document') : translate('listing.title'));

	let html = '';
	for (const list of listings) {
		const dateStr = getLastUpdatedOnText(list.version?.lastUpdated);
		const bgImage = list.image?.active ? list.image.background || list.image.light || '' : '';
		const imageHTML = bgImage
			? `<div class="list-card-image" style="background-image: url('${bgImage}')"></div>`
			: `<div class="list-card-image no-image"><i class="iconify card-image-icon" data-icon="fluent:list-28-filled"></i></div>`;

		html += `
			<div class="list-card" data-action="open-list-dialog" data-list-id="${list.id}">
				${imageHTML}
				<div class="list-card-body">
					<div class="list-card-title">${list.title || translate('labels.no_title')}</div>
					<div class="list-card-meta">
						<i class="iconify" data-icon="material-symbols:schedule" style="font-size:13px"></i>
						${dateStr}
					</div>
				</div>
			</div>`;
	}
	grid.innerHTML = html;
}

/*--------------------------------------------------------------
# Destination Dialog
--------------------------------------------------------------*/
export function openDestDialog(destId) {
	const destinations = getOrderedDocumentByUpdateDate(INDEX_DATA.destinations);
	const dest = destinations.find((d) => d.id === destId);
	if (!dest) return;

	getID('dest-dialog-title').textContent = dest.title || translate('labels.no_title');

	// Currency
	const currRow = getID('dest-dialog-currency-row');
	if (dest.currency) {
		currRow.style.display = 'flex';
		getID('dest-dialog-currency').textContent = translate('currency.title') + ': ' + dest.currency;
	} else {
		currRow.style.display = 'none';
	}

	// Updated
	getID('dest-dialog-updated').textContent = getLastUpdatedOnText(dest.version?.lastUpdated);

	// Buttons
	getID('dest-dialog-view').onclick = function () {
		closeDestDialog();
		viewDestination(dest.id);
	};
	getID('dest-dialog-edit').onclick = function () {
		closeDestDialog();
		editDestination(dest.id);
	};

	getID('dest-dialog').style.display = 'flex';
	document.body.classList.add('dialog-open');
}

export function closeDestDialog() {
	getID('dest-dialog').style.display = 'none';
	document.body.classList.remove('dialog-open');
}

/*--------------------------------------------------------------
# List Dialog
--------------------------------------------------------------*/
export function openListDialog(listId) {
	const listings = getOrderedDocumentByUpdateDate(INDEX_DATA.listings);
	const list = listings.find((l) => l.id === listId);
	if (!list) return;

	getID('list-dialog-title').textContent = list.title || translate('labels.no_title');

	// Subtitle
	const subRow = getID('list-dialog-subtitle-row');
	if (list.subtitle) {
		subRow.style.display = 'flex';
		getID('list-dialog-subtitle').textContent = list.subtitle;
	} else {
		subRow.style.display = 'none';
	}

	// Updated
	getID('list-dialog-updated').textContent = getLastUpdatedOnText(list.version?.lastUpdated);

	// Image
	const imgDiv = getID('list-dialog-image');
	const bgImage = list.image?.active ? list.image.background || list.image.light || '' : '';
	if (bgImage) {
		imgDiv.style.backgroundImage = `url('${bgImage}')`;
		imgDiv.className = 'dialog-image';
		imgDiv.innerHTML = '';
	} else {
		imgDiv.style.backgroundImage = '';
		imgDiv.className = 'dialog-image no-image';
		imgDiv.innerHTML = `<i class="iconify dialog-image-icon" data-icon="fluent:list-28-filled"></i>`;
	}

	// Buttons
	getID('list-dialog-view').onclick = function () {
		closeListDialog();
		viewListing(list.id);
	};
	getID('list-dialog-edit').onclick = function () {
		closeListDialog();
		editListing(list.id);
	};

	getID('list-dialog').style.display = 'flex';
	document.body.classList.add('dialog-open');
}

export function closeListDialog() {
	getID('list-dialog').style.display = 'none';
	document.body.classList.remove('dialog-open');
}

/*--------------------------------------------------------------
# Dialog overlay click to close
--------------------------------------------------------------*/
document.addEventListener('click', function (e: MouseEvent) {
	const target = e.target as HTMLElement;
	if (target.classList.contains('dialog-overlay')) {
		if (target.id === 'trip-dialog') closeTripDialog();
		if (target.id === 'dest-dialog') closeDestDialog();
		if (target.id === 'list-dialog') closeListDialog();
	}
});

document.addEventListener('keydown', function (e) {
	if (e.key === 'Escape') {
		if (getID('trip-dialog').style.display === 'flex') closeTripDialog();
		if (getID('dest-dialog').style.display === 'flex') closeDestDialog();
		if (getID('list-dialog').style.display === 'flex') closeListDialog();
	}
});
