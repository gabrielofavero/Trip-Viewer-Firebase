import { startLoadingScreen, stopLoadingScreen } from '../../utils/loading.js';
import {
	setState,
	getState,
	DOCUMENT_ID,
	DESTINATIONS,
	TRAVELERS,
	SUCCESSFUL_SAVE,
	FIRESTORE_NEW_DATA,
	setDocumentId,
	setDestinations,
	setSuccessfulSaveFn,
} from '../../data/state.js';
import {
	getDateTitle,
	getTodayFormatted,
	getTomorrowFormatted,
	jsDateToKey,
} from '../../utils/dates.js';
import { cloneObject, getID, getURLParam } from '../../utils/dom.js';
import { canAccessEditPage } from '../../utils/access.js';
import {
	deleteUserObjectDB,
	deleteSubcollection,
	getPermissions,
	getSingleData,
	getTripDataWithDestinations,
	getTransportation,
	getAccommodations,
	getItinerary,
	getUserDestinationSummaries,
	get,
	deleteDocument,
	SUBCOLLECTION,
	COLLECTION,
} from '../../data/firebase/database.js';
import { loadDraggablesWithAccordions } from '../../ui/sortable.js';
import { getUserData, getUID, setUserData, USER_DATA } from '../../data/firebase/auth.js';
import {
	deleteUserObjectStorage,
	loadImageSelector,
	loadLogoSelector,
	setPermissions,
} from '../../data/firebase/storage.js';
import { snapshotFormState } from '../../ui/fields.js';
import { loadEditModule } from '../../theme/visibility.js';
import { buildColorPresets } from './categories/customization.js';
import { translate } from '../../i18n/translation.js';
import { displayFullMessage, MESSAGE_PROPERTIES } from '../../utils/messages.js';
import { loadPinData, PIN } from './categories/basic-data/protected-data.js';
import {
	DATAS,
	loadNewTrip,
	addTransportation,
	addAccommodations,
	loadDestinations,
	loadItinerarySchedule,
} from './new-trip.js';
import { initGalleryModule } from './categories/gallery.js';
import { loadTripData } from './existing-trip.js';
import { loadEventListeners } from './support/event-listeners.js';
import { loadVisibilityIndex } from '../home/support/visibility.js';
import { loadUploadSelector } from '../../data/firebase/storage.js';
import { initEditTabs } from '../../ui/edit-tabs.js';
import { DateRangePicker } from '../../ui/date-range-picker.js';
import { enhanceAllColorPickers } from '../../ui/color-picker-hex.js';
import {
	FIRESTORE_PROTECTED_NEW_DATA,
	FIRESTORE_EXPENSES_NEW_DATA,
	FIRESTORE_EXPENSES_PROTECTED_NEW_DATA,
} from './set-trip.js';

export var FIRESTORE_PROTECTED_DATA: Record<string, any> = {};
export var FIRESTORE_EXPENSES_DATA: Record<string, any> = {};
export function setExpensesData(val: any) {
	FIRESTORE_EXPENSES_DATA = val;
}

export function setSuccessfulSave(val) {
	setSuccessfulSaveFn(val);
}
export var NEW_TRIP = false;

const TODAY = getTodayFormatted();
const TOMORROW = getTomorrowFormatted();

startLoadingScreen();

export async function loadEditTripPage() {
	setDocumentId(getURLParam('t'));
	populateDevPage();

	// ── Access guard: block unauthenticated users and non-owners ──
	// Firestore rules also enforce this server-side; this prevents the edit
	// form from even loading for users without edit permission.
	// For existing trips the guard returns the fetched trip doc, which loadTrip()
	// reuses so trips/{id} is not read twice on page load.
	const existingTrip = await canAccessEditPage(COLLECTION.TRIPS, DOCUMENT_ID);
	if (!existingTrip) {
		return;
	}

	setPermissions(await getPermissions());

	loadVisibilityIndex();
	initEditTabs();
	loadEnabled();
	loadDraggablesWithAccordions(['transportation', 'accommodations']);

	setUserData(await getUserData());
	const destSummaries = await getUserDestinationSummaries(await getUID());
	setDestinations(destSummaries.sort((a: any, b: any) => a.title.localeCompare(b.title)));

	if (DOCUMENT_ID) {
		// canAccessEditPage only returns an object for existing docs, so this is
		// the same trip document already fetched for the ownership check.
		await loadTrip(true, existingTrip as Record<string, any>);
	} else {
		NEW_TRIP = true;
		loadNewTrip();
	}

	loadImageSelector('background');
	loadLogoSelector();

	loadEventListeners();
	buildColorPresets();
	stopLoadingScreen();
	snapshotFormState();

	// Initialize enhanced UI components
	initDateRangePickers();
	enhanceAllColorPickers();

	$('body').css('overflow', 'auto');

	populateDevPage();
}

function loadEnabled() {
	loadEditModule('images');
	loadEditModule('theme');
	loadEditModule('colors', () => {});
	loadEditModule('links');
	loadEditModule('expenses');
	loadEditModule('transportation', addTransportation);
	loadEditModule('accommodations', addAccommodations);
	loadEditModule('itinerary', loadItinerarySchedule);
	loadEditModule('destinations', loadDestinations);
	initGalleryModule();
}

function loadUploadSelectors() {
	loadUploadSelector('background');
	loadUploadSelector('logo');
}

async function loadTrip(stripped = false, preloadedTripData?: Record<string, any>) {
	getID('delete-text').style.display = 'block';
	startLoadingScreen();

	await loadPinData();

	if (PIN.current) {
		FIRESTORE_PROTECTED_DATA = await get(
			`trips/protected/${PIN.current}/${DOCUMENT_ID}`,
			true,
			true,
		);
	}

	switch (FIRESTORE_PROTECTED_DATA?.pin) {
		case 'all-data':
			setState(
				stripped
					? FIRESTORE_PROTECTED_DATA
					: await getTripDataWithDestinations(FIRESTORE_PROTECTED_DATA),
			);
			break;
		case 'sensitive-only':
			setState(await getMergedTripObject(await getTravelDocument(stripped, preloadedTripData)));
			break;
		default:
			setState(
				await fetchSubcollectionsIfNeeded(await getTravelDocument(stripped, preloadedTripData)),
			);
	}

	await loadTripData();
	stopLoadingScreen();
	populateDevPage();
}

export function deleteTrip() {
	let trip = getID('title').value;
	trip = trip ? ` "${trip}"` : '';

	const properties = cloneObject(MESSAGE_PROPERTIES);
	properties.title = translate('trip.delete.title');
	properties.content = translate('trip.delete.message', { name: trip });
	properties.buttons = [
		{
			type: 'cancel',
		},
		{
			type: 'confirm',
			action: 'deleteTripAction()',
		},
	];

	displayFullMessage(properties);
}

export async function deleteTripAction() {
	if (!DOCUMENT_ID) return;

	// Delete trip subcollections (transportation, accommodations, itinerary)
	const subTasks: Promise<any>[] = [
		deleteSubcollection(`${COLLECTION.TRIPS}/${DOCUMENT_ID}/${SUBCOLLECTION.TRANSPORTATION}`),
		deleteSubcollection(`${COLLECTION.TRIPS}/${DOCUMENT_ID}/${SUBCOLLECTION.ACCOMMODATIONS}`),
		deleteSubcollection(`${COLLECTION.TRIPS}/${DOCUMENT_ID}/${SUBCOLLECTION.ITINERARY}`),
	];

	// Delete trip summary from user subcollection
	const uid = await getUID();
	if (uid) {
		subTasks.push(
			deleteDocument(
				`${COLLECTION.USERS}/${uid}/${SUBCOLLECTION.TRIP_SUMMARIES}/${DOCUMENT_ID}`,
				true,
			),
		);
	}

	const tasks = [
		deleteUserObjectDB(DOCUMENT_ID, 'trips'),
		deleteUserObjectStorage(),
		deleteDocument(`expenses/${DOCUMENT_ID}`, true),
		...subTasks,
	];

	if (PIN.current) {
		tasks.push(
			deleteDocument(`protected/${DOCUMENT_ID}`, true),
			deleteDocument(`trips/protected/${PIN.current}/${DOCUMENT_ID}`, true),
			deleteDocument(`expenses/protected/${PIN.current}/${DOCUMENT_ID}`, true),
		);
	}

	await Promise.all(tasks);
	setSuccessfulSaveFn(true);
	window.location.href = '../index.html';
}

export function getDataSelectOptions(j) {
	const values = DATAS.map((data) => jsDateToKey(data));
	const labels = DATAS.map((data) => getDateTitle(data, 'mini'));
	let result = j ? '' : `<option value="" selected>${translate('datetime.select_date')}</option>`;

	for (let i = 0; i < values.length; i++) {
		result += `<option value="${values[i]}" ${j && i + 1 === j ? 'selected' : ''}>${labels[i]}</option>`;
	}

	return result;
}

async function getTravelDocument(stripped = false, preloadedTripData?: Record<string, any>) {
	// Reuse the trip document already fetched by the access guard
	// (canAccessEditPage) so trips/{id} isn't read twice on page load.
	if (preloadedTripData) return preloadedTripData;
	return stripped ? await get(`trips/${DOCUMENT_ID}`) : await getSingleData('trips');
}

/**
 * Fetch subcollections (transportation, accommodations, itinerary) for a trip
 * if they aren't already embedded in the trip document. This is needed for trips
 * created via the import feature or migrated to the subcollection architecture.
 */
async function fetchSubcollectionsIfNeeded(tripData: Record<string, any>) {
	if (!tripData) return tripData;

	if (!tripData.transportation?.data?.length) {
		const transport = await getTransportation(DOCUMENT_ID);
		tripData.transportation = {
			data: transport.legs || [],
			viewMode: transport.settings?.viewMode || 'simple',
		};
	}

	if (!tripData.accommodations?.length) {
		tripData.accommodations = await getAccommodations(DOCUMENT_ID);
	}

	if (!tripData.itinerary?.length) {
		tripData.itinerary = await getItinerary(DOCUMENT_ID);
	}

	return tripData;
}

async function getMergedTripObject(tripData) {
	// After migration, transportation/accommodations live in subcollections.
	// Fetch them if not already embedded (old format compatibility).
	if (!tripData.transportation?.data?.length) {
		const transport = await getTransportation(DOCUMENT_ID);
		tripData.transportation = {
			data: transport.legs || [],
			viewMode: transport.settings?.viewMode || 'simple',
		};
	}

	for (let i = 0; i < tripData.transportation.data.length; i++) {
		const id = tripData.transportation.data[i].id;
		tripData.transportation.data[i].reservation =
			FIRESTORE_PROTECTED_DATA.transportation?.[id]?.reservation || '';
		tripData.transportation.data[i].link =
			FIRESTORE_PROTECTED_DATA.transportation?.[id]?.link || '';
	}

	if (!tripData.accommodations?.length) {
		tripData.accommodations = await getAccommodations(DOCUMENT_ID);
	}

	for (let i = 0; i < tripData.accommodations.length; i++) {
		const id = tripData.accommodations[i].id;
		tripData.accommodations[i].reservation =
			FIRESTORE_PROTECTED_DATA.accommodations?.[id]?.reservation || '';
		tripData.accommodations[i].link = FIRESTORE_PROTECTED_DATA.accommodations?.[id]?.link || '';
	}

	// After migration 13, itinerary lives in trips/{tripId}/itinerary subcollection.
	if (!tripData.itinerary?.length) {
		tripData.itinerary = await getItinerary(DOCUMENT_ID);
	}

	return tripData;
}

/** Initialize date range picker components on the edit trip page */
function initDateRangePickers() {
	const tripDateRange = getID('trip-date-range');
	if (tripDateRange) {
		const picker = new DateRangePicker(tripDateRange);
		// If hidden inputs already have values (from existing trip load), update display
		const start = getID('start') as HTMLInputElement;
		const end = getID('end') as HTMLInputElement;
		if (start?.value && end?.value) {
			picker.setRange(start.value, end.value);
		}
	}
}

/** Populate dev.page.* with useful references (only on localhost). */
function populateDevPage() {
	const dev = (window as any).dev;
	if (!dev?.isEnabled) return;
	const page = dev.page;

	page.type = 'edit-trip';
	page.docId = DOCUMENT_ID;
	page.isNewTrip = NEW_TRIP;

	// ── Raw data fetched from Firestore (existing trip + subcollections) ──
	page.state = getState();
	page.protectedData = FIRESTORE_PROTECTED_DATA;
	page.expensesData = FIRESTORE_EXPENSES_DATA;

	// ── Reference data ──
	page.destinations = DESTINATIONS;
	page.travelers = TRAVELERS;

	// ── New data objects built on save (live getters so they reflect latest values) ──
	Object.defineProperty(page, 'newData', {
		get() {
			return FIRESTORE_NEW_DATA;
		},
		enumerable: true,
		configurable: true,
	});
	Object.defineProperty(page, 'protectedNewData', {
		get() {
			return FIRESTORE_PROTECTED_NEW_DATA;
		},
		enumerable: true,
		configurable: true,
	});
	Object.defineProperty(page, 'expensesNewData', {
		get() {
			return FIRESTORE_EXPENSES_NEW_DATA;
		},
		enumerable: true,
		configurable: true,
	});
	Object.defineProperty(page, 'expensesProtectedNewData', {
		get() {
			return FIRESTORE_EXPENSES_PROTECTED_NEW_DATA;
		},
		enumerable: true,
		configurable: true,
	});

	page.successfulSave = SUCCESSFUL_SAVE;

	console.log(
		'%c[DEV]%c dev.page populated for edit-trip — type %cdev.page%c to explore',
		'color:#f0c040;font-weight:bold;',
		'',
		'font-weight:bold;',
		'',
	);
}
