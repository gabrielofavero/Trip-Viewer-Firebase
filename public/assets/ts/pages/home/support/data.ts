import {
	displayError,
	animateDialogOpen,
	animateDialogClose,
	DIALOG_LEAVE_CLASS,
} from '../../../utils/messages.js';
import {
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
import { isOnDarkMode } from '../../../theme/visibility.js';
import { getDarkerColor, getLighterColor, hexToRgb } from '../../../theme/colors.js';
import { LazyGrid } from '../../../ui/lazy-grid.js';

var INDEX_DATA: Record<string, any> = {};
var CURRENT_TRIPS: any[] = [];
var PREVIOUS_TRIPS: any[] = [];
var NEXT_TRIPS: any[] = [];
var ALL_TRIPS: any[] = []; // Merged for the unified trip view
var SELECTED_TRIP_ID: string | null = null;
var TRIP_UPCOMING_GRID: LazyGrid | null = null;
var TRIP_FINISHED_GRID: LazyGrid | null = null;
var DEST_GRID: LazyGrid | null = null;
var LIST_GRID: LazyGrid | null = null;
var GRIDS_INITIALIZED = false;
var SEARCH_QUERY = '';

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
				// registerIfUserNotPresent() reads users/{uid} (creating it if
				// missing) and returns that document, so reuse it here instead of
				// calling getUserData() again (avoids a duplicate read).
				const userData = await registerIfUserNotPresent();
				setUserData(userData);
				showLoggedView();

				// Read profile fields from the Firestore user document first,
				// falling back to the Auth user only when they're missing.

				const displayName = userData?.name || user.displayName || '';
				const email = userData?.email || user.email || '';
				const photo = userData?.photoURL || user.photoURL || '';
				const photoURL = photo ? `url(${photo})` : '';

				getID('title-name').innerHTML = displayName ? displayName.split(' ')[0] : '';
				getID('greeting-avatar').style.backgroundImage = photoURL;
				getID('greeting-avatar').style.backgroundSize = 'cover';

				getID('settings-user-name').innerHTML = displayName;
				getID('settings-user-email').innerHTML = email;
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

				initGrids();
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
function initGrids() {
	if (GRIDS_INITIALIZED) return;
	GRIDS_INITIALIZED = true;

	TRIP_UPCOMING_GRID = new LazyGrid(
		getID('trip-upcoming-grid'),
		getID('trip-upcoming-sentinel'),
		buildTripCardHTML,
	);
	TRIP_FINISHED_GRID = new LazyGrid(
		getID('trip-finished-grid'),
		getID('trip-finished-sentinel'),
		buildTripCardHTML,
	);
	DEST_GRID = new LazyGrid(getID('dest-grid'), getID('dest-sentinel'), buildDestCardHTML);
	LIST_GRID = new LazyGrid(getID('list-grid'), getID('list-sentinel'), buildListCardHTML);
}

function loadTripsTab() {
	const empty = getID('trips-empty');
	const count = getID('trips-count');

	if (ALL_TRIPS.length === 0) {
		getID('trip-upcoming-section').style.display = 'none';
		getID('trip-finished-section').style.display = 'none';
		TRIP_UPCOMING_GRID?.setItems([]);
		TRIP_FINISHED_GRID?.setItems([]);
		empty.style.display = 'block';
		count.textContent = '';
		return;
	}

	empty.style.display = 'none';
	count.textContent = tripCountLabel(ALL_TRIPS.length);

	const upcoming = ALL_TRIPS.filter((t) => t.category === 'current' || t.category === 'next');
	const finished = ALL_TRIPS.filter((t) => t.category === 'past');

	getID('trip-upcoming-section').style.display = upcoming.length > 0 ? '' : 'none';
	getID('trip-finished-section').style.display = finished.length > 0 ? '' : 'none';

	TRIP_UPCOMING_GRID?.setItems(upcoming);
	TRIP_FINISHED_GRID?.setItems(finished);

	updateTripSectionCounts();
}

function tripCountLabel(n: number): string {
	return n + ' ' + translate('trip.document') + (n === 1 ? '' : 's');
}

function destCountLabel(n: number): string {
	return (
		n + ' ' + (n === 1 ? translate('destination.document') : translate('destination.title'))
	);
}

function listCountLabel(n: number): string {
	return n + ' ' + (n === 1 ? translate('listing.document') : translate('listing.title'));
}

function updateTripSectionCounts() {
	getID('trip-upcoming-count').textContent = TRIP_UPCOMING_GRID
		? String(TRIP_UPCOMING_GRID.getMatchingCount())
		: '';
	getID('trip-finished-count').textContent = TRIP_FINISHED_GRID
		? String(TRIP_FINISHED_GRID.getMatchingCount())
		: '';
}

function buildTripCardHTML(trip): string {
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

	return `
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

	// Custom trip accent — applied to the dialog only (trip-card badge stays as-is)
	const tripColors = trip.colors || {};
	const hasCustomColors = tripColors.active === true && tripColors.light && tripColors.dark;
	const accent = hasCustomColors ? (isOnDarkMode() ? tripColors.dark : tripColors.light) : null;

	const ACCENT_VARS = [
		'--trip-dialog-accent',
		'--trip-dialog-accent-rgb',
		'--trip-dialog-accent-hover',
		'--trip-dialog-accent-soft',
	];
	for (const prop of ACCENT_VARS) dialog.style.removeProperty(prop);

	if (accent) {
		const [r, g, b] = hexToRgb(accent);
		const hoverColor = isOnDarkMode()
			? getDarkerColor(accent, 10)
			: getLighterColor(accent, 10);
		dialog.style.setProperty('--trip-dialog-accent', accent);
		dialog.style.setProperty('--trip-dialog-accent-rgb', `${r}, ${g}, ${b}`);
		dialog.style.setProperty('--trip-dialog-accent-hover', hoverColor);
		dialog.style.setProperty('--trip-dialog-accent-soft', `rgba(${r}, ${g}, ${b}, 0.08)`);
	}

	badge.className = hasCustomColors
		? 'dialog-badge dialog-badge-custom'
		: 'dialog-badge ' + badgeClass;

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

	// Last updated
	getID('trip-dialog-updated').textContent = getLastUpdatedOnText(trip.version?.lastUpdated);

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

	// Show dialog with scroll lock (standardized open animation on the card)
	animateDialogOpen(dialog, 'flex');
	const card = dialog.querySelector<HTMLElement>('.dialog-card');
	if (card) animateDialogOpen(card);
	document.body.classList.add('dialog-open');
}

/** Close an index dialog (overlay + card) with the standardized animation. */
function closeIndexDialog(dialogId: string, onDone?: () => void) {
	const dialog = getID(dialogId);
	if (!dialog || dialog.style.display === 'none') {
		onDone?.();
		return;
	}
	const card = dialog.querySelector<HTMLElement>('.dialog-card');
	if (card) {
		// Fade the backdrop out while the card slides down; hide once it ends.
		dialog.classList.add(DIALOG_LEAVE_CLASS);
		animateDialogClose(card, () => {
			dialog.classList.remove(DIALOG_LEAVE_CLASS);
			dialog.style.display = 'none';
			onDone?.();
		});
	} else {
		animateDialogClose(dialog, onDone);
	}
}

export function closeTripDialog() {
	closeIndexDialog('trip-dialog', () => {
		document.body.classList.remove('dialog-open');
		SELECTED_TRIP_ID = null;
	});
}

function getTripDurationDays(trip: Record<string, any>): number {
	if (!trip.start || !trip.end) return 0;
	const start = new Date(trip.start.year, trip.start.month - 1, trip.start.day);
	const end = new Date(trip.end.year, trip.end.month - 1, trip.end.day);
	return Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
}

/*--------------------------------------------------------------
# Destinations Tab
--------------------------------------------------------------*/
function loadDestinationsTab() {
	const empty = getID('dest-empty');
	const count = getID('dests-count');
	const destinations = getOrderedDocumentByUpdateDate(INDEX_DATA.destinations);

	if (destinations.length === 0) {
		DEST_GRID?.setItems([]);
		empty.style.display = 'block';
		count.textContent = '';
		return;
	}
	empty.style.display = 'none';
	count.textContent = destCountLabel(destinations.length);
	DEST_GRID?.setItems(destinations);
}

function buildDestCardHTML(dest): string {
	const dateStr = getLastUpdatedOnText(dest.version?.lastUpdated);
	const bgImage = dest.image?.active ? dest.image.background || '' : '';
	const imageHTML = bgImage
		? `<div class="dest-card-image" style="background-image: url('${bgImage}')"></div>`
		: `<div class="dest-card-image no-image"><i class="iconify card-image-icon" data-icon="material-symbols:location-on"></i></div>`;

	return `
		<div class="dest-card" data-action="open-dest-dialog" data-dest-id="${dest.id}">
			${imageHTML}
			<div class="dest-card-body">
				<div class="dest-card-title">${dest.title || translate('labels.no_title')}</div>
				<div class="dest-card-meta">
					<i class="iconify" data-icon="material-symbols:schedule" style="font-size:13px"></i>
					${dateStr}
				</div>
			</div>
		</div>`;
}

/*--------------------------------------------------------------
# Lists Tab
--------------------------------------------------------------*/
function loadListsTab() {
	const empty = getID('lists-empty');
	const count = getID('lists-count');
	const listings = getOrderedDocumentByUpdateDate(INDEX_DATA.listings);

	if (listings.length === 0) {
		LIST_GRID?.setItems([]);
		empty.style.display = 'block';
		count.textContent = '';
		return;
	}
	empty.style.display = 'none';
	count.textContent = listCountLabel(listings.length);
	LIST_GRID?.setItems(listings);
}

function buildListCardHTML(list): string {
	const dateStr = getLastUpdatedOnText(list.version?.lastUpdated);
	const bgImage = list.image?.active ? list.image.background || list.image.light || '' : '';
	const imageHTML = bgImage
		? `<div class="list-card-image" style="background-image: url('${bgImage}')"></div>`
		: `<div class="list-card-image no-image"><i class="iconify card-image-icon" data-icon="fluent:list-28-filled"></i></div>`;

	return `
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

/*--------------------------------------------------------------
# Destination Dialog
--------------------------------------------------------------*/
export function openDestDialog(destId) {
	const destinations = getOrderedDocumentByUpdateDate(INDEX_DATA.destinations);
	const dest = destinations.find((d) => d.id === destId);
	if (!dest) return;

	getID('dest-dialog-title').textContent = dest.title || translate('labels.no_title');

	// Image
	const imgDiv = getID('dest-dialog-image');
	const bgImage = dest.image?.active ? dest.image.background || '' : '';
	if (bgImage) {
		imgDiv.style.backgroundImage = `url('${bgImage}')`;
		imgDiv.className = 'dialog-image';
		imgDiv.innerHTML = '';
	} else {
		imgDiv.style.backgroundImage = '';
		imgDiv.className = 'dialog-image no-image';
		imgDiv.innerHTML = `<i class="iconify dialog-image-icon" data-icon="material-symbols:location-on"></i>`;
	}

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

	animateDialogOpen(getID('dest-dialog'), 'flex');
	const destCard = getID('dest-dialog')?.querySelector<HTMLElement>('.dialog-card');
	if (destCard) animateDialogOpen(destCard);
	document.body.classList.add('dialog-open');
}

export function closeDestDialog() {
	closeIndexDialog('dest-dialog', () => {
		document.body.classList.remove('dialog-open');
	});
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

	animateDialogOpen(getID('list-dialog'), 'flex');
	const listCard = getID('list-dialog')?.querySelector<HTMLElement>('.dialog-card');
	if (listCard) animateDialogOpen(listCard);
	document.body.classList.add('dialog-open');
}

export function closeListDialog() {
	closeIndexDialog('list-dialog', () => {
		document.body.classList.remove('dialog-open');
	});
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

/*--------------------------------------------------------------
# Search & Tab Coordination
--------------------------------------------------------------*/
function getActiveTab(): string {
	const active = document.querySelector('.category-tab.active');
	return active?.getAttribute('data-tab') || 'trips';
}

function setSearchBarVisible(visible: boolean) {
	const bar = getID('search-bar');
	if (bar) bar.style.display = visible ? 'flex' : 'none';
}

export function applySearch(query: string) {
	SEARCH_QUERY = (query || '').trim();
	const tab = getActiveTab();

	if (tab === 'settings') {
		setSearchBarVisible(false);
		return;
	}
	setSearchBarVisible(true);

	switch (tab) {
		case 'trips':
			TRIP_UPCOMING_GRID?.setQuery(SEARCH_QUERY);
			TRIP_FINISHED_GRID?.setQuery(SEARCH_QUERY);
			updateTripSectionCounts();
			break;
		case 'destinations':
			DEST_GRID?.setQuery(SEARCH_QUERY);
			break;
		case 'lists':
			LIST_GRID?.setQuery(SEARCH_QUERY);
			break;
	}
}

export function onSearchInput(value: string) {
	const clear = getID('search-clear');
	if (clear) clear.style.display = value ? 'flex' : 'none';
	applySearch(value);
}

export function clearSearch() {
	const input = getID('search-input') as HTMLInputElement | null;
	if (input) input.value = '';
	onSearchInput('');
}

export function onTabChanged() {
	const input = getID('search-input') as HTMLInputElement | null;
	applySearch(input?.value || '');
}
