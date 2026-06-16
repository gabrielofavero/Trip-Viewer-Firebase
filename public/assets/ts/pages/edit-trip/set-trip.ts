import { getCurrentPreferencePIN, validatePinField } from './categories/basic-data/protected-data.js';
import { setProtectedDataAndExpenses } from './categories/basic-data/set-protected-data.js';
import { getState, DOCUMENT_ID, FIRESTORE_NEW_DATA, setFirestoreNewData } from '../../data/state.js';
import { getChildIDs, getID, setRequired } from '../../utils/dom.js';
import { formattedDateToDateObject } from '../../utils/dates.js';
import { getUID } from '../../data/firebase/auth.js';
import { deleteUnusedImages } from '../../data/firebase/storage.js';
import { translate } from '../../i18n/translation.js';
import { getGalleryObject } from './categories/gallery.js';
import { getItineraryArray } from './categories/itinerary-module/itinerary-module.js';
import { getDestinationsArray } from "./categories/destination.js";
import { getAccommodationArray, getProtectedAccommodationObject } from "./categories/accommodation.js";
import { getProtectedTransportationObject, getTransportationObject } from "./categories/transportation.js";
import { getExpensesObject } from "./categories/expenses.js";
import { setDocumento, addSetResponse } from "../../utils/set.js";
import { IMAGE_UPLOAD_STATUS } from "../../data/firebase/storage.js";
import { TRAVELERS } from '../../data/state.js';

export var FIRESTORE_PROTECTED_NEW_DATA = {};

export var FIRESTORE_EXPENSES_NEW_DATA = {};
export var FIRESTORE_EXPENSES_PROTECTED_NEW_DATA = {};

async function buildTripObject() {
	switch (getCurrentPreferencePIN()) {
		case "all-data":
		setFirestoreNewData(await getUnprotectedTripObject());
			FIRESTORE_PROTECTED_NEW_DATA = await getTripObjectFull(false);
			break;
		case "sensitive-only":
		setFirestoreNewData(await getTripObjectFull(true));
			FIRESTORE_PROTECTED_NEW_DATA = getSensitiveTripObject();
			break;
		default:
		setFirestoreNewData(await getTripObjectFull(false));
			FIRESTORE_PROTECTED_NEW_DATA = {};
	}
}

async function getUnprotectedTripObject() {
	return {
		destinations: getDestinationsArray(),
		sharing: await getSharingObject(),
		colors: getColorsObject(),
		end: getID("end").value
			? formattedDateToDateObject(getID("end").value)
			: "",
		gallery: {},
		accommodations: [],
		image: getImageObject(),
		start: getID("start").value
			? formattedDateToDateObject(getID("start").value)
			: "",
		links: {},
		modules: {},
		currency: getID("currency").value,
		schedules: {},
		people: {},
		title: getID("title").value,
		transportation: getVisibilityObject(),
		version: {
			lastUpdated: new Date().toISOString(),
		},
		visibility: {},
		pin: getCurrentPreferencePIN(),
	};
}

function getSensitiveTripObject() {
	const accommodations = getProtectedAccommodationObject();
	const transportation = getProtectedTransportationObject();

	if (
		Object.keys(accommodations).length === 0 &&
		Object.keys(transportation).length === 0
	) {
		return {};
	}

	return {
		accommodations: accommodations,
		transportation: transportation,
		pin: getCurrentPreferencePIN(),
	};
}

async function getTripObjectFull(protectedReservationCodes = false) {
	return {
		destinations: getDestinationsArray(),
		sharing: await getSharingObject(),
		colors: getColorsObject(),
		end: getID("end").value
			? formattedDateToDateObject(getID("end").value)
			: "",
		gallery: getGalleryObject(),
		accommodations: getAccommodationArray(protectedReservationCodes),
		image: getImageObject(),
		start: getID("start").value
			? formattedDateToDateObject(getID("start").value)
			: "",
		links: getLinksObject(),
		modules: getModulesObject(),
		currency: getID("currency").value,
		schedules: getItineraryArray(),
		people: TRAVELERS,
		title: getID("title").value,
		transportation: getTransportationObject(protectedReservationCodes),
		version: {
			lastUpdated: new Date().toISOString(),
		},
		visibility: getVisibilityObject(),
		pin: getCurrentPreferencePIN(),
	};
}

async function buildExpensesObject() {
	switch (getCurrentPreferencePIN()) {
		case "all-data":
		case "sensitive-only":
			FIRESTORE_EXPENSES_PROTECTED_NEW_DATA = await getExpensesObject();
			FIRESTORE_EXPENSES_NEW_DATA = {};
			break;
		default:
			FIRESTORE_EXPENSES_NEW_DATA = await getExpensesObject(false);
			FIRESTORE_PROTECTED_NEW_DATA = {};
	}
}

function getModulesObject() {
	return {
		accommodations: getID("accommodations-enabled").checked,
		destinations: getID("destinations-enabled").checked,
		expenses: getID("enabled-expenses").checked,
		itinerary: getID("itinerary-enabled").checked,
		summary: true,
		transportation: getID("transportation-enabled").checked,
		gallery: getID("gallery-enabled").checked,
	};
}

function getColorsObject() {
	return {
		active: getID("colors-enabled").checked,
		light: getID("light-color").value,
		dark: getID("dark-color").value,
	};
}

export async function getSharingObject() {
	return {
		active: true,
		owner:
			getState() && Object.keys(getState()).length > 0
				? getState().sharing.owner
				: await getUID(),
		editors: [],
	};
}

function getImageObject() {
	return {
		active: getID("images-enabled").checked,
		background: getID("link-background").value || "",
		light: getID("link-logo-light").value || "",
		dark: getID("link-logo-dark").value || "",
	};
}

function getLinksObject() {
	return {
		active: getID("links-enabled").checked,
		attachments: getID("link-attachments").value || "",
		drive: getID("link-drive").value || "",
		maps: getID("link-maps").value || "",
		pdf: getID("link-pdf").value || "",
		ppt: getID("link-ppt").value || "",
		sheet: getID("link-sheet").value || "",
		vaccine: getID("link-vaccine").value || "",
	};
}

export function getVisibilityObject() {
	return {
		light: getID("dark-and-light").checked || getID("light-exclusive").checked,
		dark: getID("dark-and-light").checked || getID("dark-exclusive").checked,
	};
}

function verifyImageUploads(type) {
	if (DOCUMENT_ID && !IMAGE_UPLOAD_STATUS.hasErrors) {
		const path = `${type}/${DOCUMENT_ID}`;

		const documentLinks = [];

		if (FIRESTORE_NEW_DATA.image.background) {
			documentLinks.push(FIRESTORE_NEW_DATA.image.background);
		}

		if (FIRESTORE_NEW_DATA.image.light) {
			documentLinks.push(FIRESTORE_NEW_DATA.image.light);
		}

		if (FIRESTORE_NEW_DATA.image.dark) {
			documentLinks.push(FIRESTORE_NEW_DATA.image.dark);
		}

if (type == "trips") {
	const data: Record<string, any> =
				getCurrentPreferencePIN() === "all-data"
					? FIRESTORE_PROTECTED_NEW_DATA
					: FIRESTORE_NEW_DATA;
			const accommodations = data.accommodations || [];
			const accommodationLinks = (accommodations ?? []).flatMap((accommodation) =>
				(accommodation?.images ?? [])
					.map((image) => image?.link)
					.filter(Boolean),
			);

			const images = data?.gallery?.images || [];
			documentLinks.push(...accommodationLinks);
			documentLinks.push(...images);
		}

		deleteUnusedImages(path, documentLinks);
	}

	addSetResponse(
		translate("labels.image.check"),
		!IMAGE_UPLOAD_STATUS.hasErrors,
	);
}

export async function setTripData() {
	if (getID("destinations-enabled").checked) {
		for (const child of getChildIDs("has-destinations")) {
			const i = parseInt(child.split("-")[2]);
			setRequired(`select-destinations-${i}`);
		}
	}

	const type = "trips";
	const checks = [validatePinField];
	const dataBuildingFunctions = [buildTripObject, buildExpensesObject];
	const batchFunctions = [setProtectedDataAndExpenses];

	await setDocumento({ type, checks, dataBuildingFunctions, batchFunctions });
}
