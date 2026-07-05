import { startLoadingScreen, stopLoadingScreen } from '../../utils/loading.js';
import { setState, DOCUMENT_ID, DESTINATIONS, SUCCESSFUL_SAVE, setDocumentId, setDestinations, setSuccessfulSaveFn } from '../../data/state.js';
import { getDateTitle, getTodayFormatted, getTomorrowFormatted, jsDateToKey } from '../../utils/dates.js';
import { cloneObject, getID, getOrderedDocumentByTitle, getURLParam } from '../../utils/dom.js';
import { deleteUserObjectDB, getPermissions, getSingleData, getTripDataWithDestinations, get, deleteDocument } from '../../data/firebase/database.js';
import { loadDraggablesWithAccordions } from '../../ui/sortable.js';
import { newDynamicSelect } from '../../ui/dynamic-select.js';
import { getUserData, setUserData, USER_DATA } from '../../data/firebase/auth.js';
import { deleteUserObjectStorage, loadImageSelector, loadLogoSelector, setPermissions } from '../../data/firebase/storage.js';
import { snapshotFormState } from '../../ui/fields.js';
import { loadEditModule } from '../../theme/visibility.js';
import { translate } from '../../i18n/translation.js';
import { displayFullMessage, MESSAGE_PROPERTIES } from '../../utils/messages.js';
import { loadPinData, PIN } from './categories/basic-data/protected-data.js';
import { DATAS, loadNewTrip, addTransportation, addAccommodations, loadDestinations, addGallery, loadItinerarySchedule } from './new-trip.js';
import { loadTripData } from './existing-trip.js';
import { loadEventListeners } from './support/event-listeners.js';
import { loadVisibilityIndex } from '../home/support/visibility.js';
import { loadUploadSelector } from "../../data/firebase/storage.js";
import { initEditTabs } from "../../ui/edit-tabs.js";
import { DateRangePicker } from "../../ui/date-range-picker.js";
import { enhanceAllColorPickers } from "../../ui/color-picker-hex.js";

export var FIRESTORE_PROTECTED_DATA: Record<string, any> = {};
export var FIRESTORE_EXPENSES_DATA: Record<string, any> = {};
export function setExpensesData(val: any) { FIRESTORE_EXPENSES_DATA = val; }

export function setSuccessfulSave(val) { setSuccessfulSaveFn(val); }
export var NEW_TRIP = false;

const TODAY = getTodayFormatted();
const TOMORROW = getTomorrowFormatted();

startLoadingScreen();

export async function loadEditTripPage() {
	setDocumentId(getURLParam("t"));
	setPermissions(await getPermissions());

	loadVisibilityIndex();
	initEditTabs();
	loadEnabled();
	loadDraggablesWithAccordions(["transportation", "accommodations"]);
	newDynamicSelect("gallery-category");
	newDynamicSelect("transportation-person");

	setUserData(await getUserData());
	setDestinations(getOrderedDocumentByTitle(USER_DATA?.destinations || []));

	if (DOCUMENT_ID) {
		await loadTrip(true);
	} else {
		NEW_TRIP = true;
		loadNewTrip();
	}

	loadImageSelector("background");
	loadLogoSelector();

	loadEventListeners();
	stopLoadingScreen();
	snapshotFormState();

	// Initialize enhanced UI components
	initDateRangePickers();
	enhanceAllColorPickers();

	$("body").css("overflow", "auto");
}

function loadEnabled() {
	loadEditModule("images");
	loadEditModule("colors");
	loadEditModule("links");
	loadEditModule("expenses");
	loadEditModule("transportation", addTransportation);
	loadEditModule("accommodations", addAccommodations);
	loadEditModule("itinerary", loadItinerarySchedule);
	loadEditModule("destinations", loadDestinations);
	loadEditModule("gallery", addGallery);
}

function loadUploadSelectors() {
	loadUploadSelector("background");
	loadUploadSelector("logo");
}

async function loadTrip(stripped = false) {
	getID("delete-text").style.display = "block";
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
		case "all-data":
			setState(stripped
				? FIRESTORE_PROTECTED_DATA
				: await getTripDataWithDestinations(FIRESTORE_PROTECTED_DATA));
			break;
		case "sensitive-only":
			setState(getMergedTripObject(await getTravelDocument(stripped)));
			break;
		default:
			setState(await getTravelDocument(stripped));
	}

	await loadTripData();
	stopLoadingScreen();
}

export function deleteTrip() {
	let trip = getID("title").value;
	trip = trip ? ` "${trip}"` : "";

	const properties = cloneObject(MESSAGE_PROPERTIES);
	properties.title = translate("trip.delete.title");
	properties.content = translate("trip.delete.message", { name: trip });
	properties.buttons = [
		{
			type: "cancel",
		},
		{
			type: "confirm",
			action: "deleteTripAction()",
		},
	];

	displayFullMessage(properties);
}

export async function deleteTripAction() {
	if (!DOCUMENT_ID) return;

	const tasks = [
		deleteUserObjectDB(DOCUMENT_ID, "trips"),
		deleteUserObjectStorage(),
		deleteDocument(`expenses/${DOCUMENT_ID}`, true),
	];

	if (PIN.current) {
		tasks.push(
			deleteDocument(`protected/${DOCUMENT_ID}`, true),
			deleteDocument(`trips/protected/${PIN.current}/${DOCUMENT_ID}`, true),
			deleteDocument(`expenses/protected/${PIN.current}/${DOCUMENT_ID}`, true),
		);
	}

	await Promise.all(tasks);
	window.location.href = "../index.html";
}

export function getDataSelectOptions(j) {
	const values = DATAS.map((data) => jsDateToKey(data));
	const labels = DATAS.map((data) => getDateTitle(data, "mini"));
	let result = j
		? ""
		: `<option value="" selected>${translate("datetime.select_date")}</option>`;

	for (let i = 0; i < values.length; i++) {
		result += `<option value="${values[i]}" ${j && i + 1 === j ? "selected" : ""}>${labels[i]}</option>`;
	}

	return result;
}

async function getTravelDocument(stripped = false) {
	return stripped
		? await get(`trips/${DOCUMENT_ID}`)
		: await getSingleData("trips");
}

function getMergedTripObject(tripData) {
	for (let i = 0; i < tripData.transportation.data.length; i++) {
		const id = tripData.transportation.data[i].id;
		tripData.transportation.data[i].reservation =
			FIRESTORE_PROTECTED_DATA.transportation[id]?.reservation || "";
		tripData.transportation.data[i].link =
			FIRESTORE_PROTECTED_DATA.transportation[id]?.link || "";
	}

	for (let i = 0; i < tripData.accommodations.length; i++) {
		const id = tripData.accommodations[i].id;
		tripData.accommodations[i].reservation =
			FIRESTORE_PROTECTED_DATA.accommodations[id]?.reservation || "";
		tripData.accommodations[i].link =
			FIRESTORE_PROTECTED_DATA.accommodations[id]?.link || "";
	}

	return tripData;
}

/** Initialize date range picker components on the edit trip page */
function initDateRangePickers() {
	const tripDateRange = getID("trip-date-range");
	if (tripDateRange) {
		const picker = new DateRangePicker(tripDateRange);
		// If hidden inputs already have values (from existing trip load), update display
		const start = getID("start") as HTMLInputElement;
		const end = getID("end") as HTMLInputElement;
		if (start?.value && end?.value) {
			picker.setRange(start.value, end.value);
		}
	}
}
