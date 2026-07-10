import {
	getCurrentPreferencePIN,
	validatePinField,
} from './categories/basic-data/protected-data.js';
import { setProtectedDataAndExpenses } from './categories/basic-data/set-protected-data.js';
import {
	getState,
	DOCUMENT_ID,
	FIRESTORE_NEW_DATA,
	setFirestoreNewData,
} from '../../data/state.js';
import { getChildIDs, getID, setRequired } from '../../utils/dom.js';
import { formattedDateToDateObject } from '../../utils/dates.js';
import { getUID } from '../../data/firebase/auth.js';
import { deleteUnusedImages } from '../../data/firebase/storage.js';
import { translate } from '../../i18n/translation.js';
import { getGalleryObject } from './categories/gallery.js';
import { getItineraryArray } from './categories/itinerary-module/itinerary-module.js';
import { getDestinationsArray } from './categories/destination.js';
import {
	getAccommodationArray,
	getProtectedAccommodationObject,
} from './categories/accommodation.js';
import {
	getProtectedTransportationObject,
	getTransportationObject,
} from './categories/transportation.js';
import { getExpensesObject } from './categories/expenses.js';
import { setDocumento, addSetResponse } from '../../utils/set.js';
import { IMAGE_UPLOAD_STATUS } from '../../data/firebase/storage.js';
import { TRAVELERS } from '../../data/state.js';

export var FIRESTORE_PROTECTED_NEW_DATA = {};

export var FIRESTORE_EXPENSES_NEW_DATA = {};
export var FIRESTORE_EXPENSES_PROTECTED_NEW_DATA = {};

/** Subcollection data (written to trips/{id}/accommodations, /transportation, /itinerary) */
export var FIRESTORE_ACCOMMODATIONS_NEW_DATA: any[] = [];
export var FIRESTORE_TRANSPORTATION_NEW_DATA: { data: any[]; viewMode: string } = { data: [], viewMode: 'simple' };
export var FIRESTORE_ITINERARY_NEW_DATA: any[] = [];

async function buildTripObject() {
	let fullTripObject: Record<string, any>;

	switch (getCurrentPreferencePIN()) {
		case 'all-data':
			setFirestoreNewData(await getUnprotectedTripObject());
			fullTripObject = await getTripObjectFull(false);
			FIRESTORE_PROTECTED_NEW_DATA = fullTripObject;
			break;
		case 'sensitive-only':
			fullTripObject = await getTripObjectFull(true);
			setFirestoreNewData(stripSubcollections(fullTripObject));
			FIRESTORE_PROTECTED_NEW_DATA = getSensitiveTripObject();
			break;
		default:
			fullTripObject = await getTripObjectFull(false);
			setFirestoreNewData(stripSubcollections(fullTripObject));
			FIRESTORE_PROTECTED_NEW_DATA = {};
	}

	// Store subcollection data for separate batch write
	FIRESTORE_ACCOMMODATIONS_NEW_DATA = fullTripObject.accommodations || [];
	FIRESTORE_TRANSPORTATION_NEW_DATA = fullTripObject.transportation || { data: [], viewMode: 'simple' };
	FIRESTORE_ITINERARY_NEW_DATA = fullTripObject.itinerary || [];
}

/** Remove fields that now live in subcollections from the main document. */
function stripSubcollections(tripObject: Record<string, any>): Record<string, any> {
	const { accommodations, transportation, itinerary, ...rest } = tripObject;
	return rest;
}

async function getUnprotectedTripObject() {
	return {
		destinationRefs: getDestinationsArray(),
		sharing: await getSharingObject(),
		colors: getColorsObject(),
		end: getID('end').value ? formattedDateToDateObject(getID('end').value) : '',
		gallery: {},
		accommodations: [],
		image: getImageObject(),
		start: getID('start').value ? formattedDateToDateObject(getID('start').value) : '',
		links: {},
		modules: {},
		currency: getID('currency').value,
		itinerary: [],
		travelers: [],
		title: getID('title').value,
		transportation: { data: [], viewMode: 'simple' },
		version: {
			lastUpdated: new Date().toISOString(),
		},
		visibility: getVisibilityObject(),
		pin: getCurrentPreferencePIN(),
	};
}

function getSensitiveTripObject() {
	const accommodations = getProtectedAccommodationObject();
	const transportation = getProtectedTransportationObject();

	if (Object.keys(accommodations).length === 0 && Object.keys(transportation).length === 0) {
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
		destinationRefs: getDestinationsArray(),
		sharing: await getSharingObject(),
		colors: getColorsObject(),
		end: getID('end').value ? formattedDateToDateObject(getID('end').value) : '',
		gallery: getGalleryObject(),
		accommodations: getAccommodationArray(protectedReservationCodes),
		image: getImageObject(),
		start: getID('start').value ? formattedDateToDateObject(getID('start').value) : '',
		links: getLinksObject(),
		modules: getModulesObject(),
		currency: getID('currency').value,
		itinerary: getItineraryArray(),
		travelers: TRAVELERS,
		title: getID('title').value,
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
		case 'all-data':
		case 'sensitive-only':
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
		accommodations: getID('accommodations-enabled').checked,
		destinations: getID('destinations-enabled').checked,
		expenses: getID('expenses-enabled').checked,
		itinerary: getID('itinerary-enabled').checked,
		summary: true,
		transportation: getID('transportation-enabled').checked,
		gallery: getID('gallery-enabled').checked,
	};
}

function getColorsObject() {
	return {
		active: getID('colors-enabled').checked,
		light: getID('light-color').value,
		dark: getID('dark-color').value,
	};
}

export async function getSharingObject() {
	return {
		active: true,
		owner:
			getState() && Object.keys(getState()).length > 0 ? getState().sharing.owner : await getUID(),
		editors: [],
	};
}

function getImageObject() {
	return {
		active: getID('images-enabled').checked,
		background: getID('link-background').value || '',
		light: getID('link-logo-light').value || '',
		dark: getID('link-logo-dark').value || '',
	};
}

function getLinksObject() {
	return {
		active: getID('links-enabled').checked,
		attachments: getID('link-attachments').value || '',
		drive: getID('link-drive').value || '',
		maps: getID('link-maps').value || '',
		pdf: getID('link-pdf').value || '',
		ppt: getID('link-ppt').value || '',
		sheet: getID('link-sheet').value || '',
		vaccine: getID('link-vaccine').value || '',
	};
}

export function getVisibilityObject() {
	return {
		light: getID('dark-and-light').checked || getID('light-exclusive').checked,
		dark: getID('dark-and-light').checked || getID('dark-exclusive').checked,
	};
}

function verifyImageUploads(type) {
	if (DOCUMENT_ID && !IMAGE_UPLOAD_STATUS.hasErrors) {
		const path = `${type}/${DOCUMENT_ID}`;

		const documentLinks = [];

		if (FIRESTORE_NEW_DATA.image?.background) {
			documentLinks.push(FIRESTORE_NEW_DATA.image.background);
		}

		if (FIRESTORE_NEW_DATA.image?.light) {
			documentLinks.push(FIRESTORE_NEW_DATA.image.light);
		}

		if (FIRESTORE_NEW_DATA.image?.dark) {
			documentLinks.push(FIRESTORE_NEW_DATA.image.dark);
		}

		if (type == 'trips') {
			const accommodationLinks = FIRESTORE_ACCOMMODATIONS_NEW_DATA.flatMap((acc) =>
				(acc?.images ?? []).map((image: any) => image?.link).filter(Boolean),
			);

			const galleryImages = FIRESTORE_NEW_DATA.gallery?.images || [];
			documentLinks.push(...accommodationLinks);
			documentLinks.push(...galleryImages);
		}

		deleteUnusedImages(path, documentLinks);
	}

	addSetResponse(translate('labels.image.check'), !IMAGE_UPLOAD_STATUS.hasErrors);
}

/** Build a day ID from the day's date field, matching the migration format (YYYYMMDD). */
function buildDayId(day: Record<string, any>, index: number): string {
	const date = day.date;
	if (
		date &&
		typeof date === 'object' &&
		typeof date.year === 'number' &&
		typeof date.month === 'number' &&
		typeof date.day === 'number'
	) {
		const y = String(date.year);
		const m = String(date.month).padStart(2, '0');
		const d = String(date.day).padStart(2, '0');
		return `${y}${m}${d}`;
	}
	return `day-${index + 1}`;
}

/** Write accommodations, transportation, and itinerary to subcollections. */
function writeTripSubcollections(ops: any) {
	const tripId = DOCUMENT_ID;
	if (!tripId) return;

	// Accommodations → trips/{id}/accommodations/{accId}
	for (const acc of FIRESTORE_ACCOMMODATIONS_NEW_DATA) {
		if (acc.id) {
			ops.set(`trips/${tripId}/accommodations/${acc.id}`, acc);
		}
	}

	// Transportation legs → trips/{id}/transportation/{legId}
	const { data: legs, viewMode } = FIRESTORE_TRANSPORTATION_NEW_DATA;
	if (Array.isArray(legs)) {
		for (const leg of legs) {
			if (leg.id) {
				ops.set(`trips/${tripId}/transportation/${leg.id}`, leg);
			}
		}
	}
	// Settings → trips/{id}/transportation/_settings
	ops.set(`trips/${tripId}/transportation/_settings`, { viewMode: viewMode || 'simple' });

	// Itinerary days → trips/{id}/itinerary/{dayId}
	const usedIds = new Set<string>();
	FIRESTORE_ITINERARY_NEW_DATA.forEach((day, i) => {
		let dayId = buildDayId(day, i);
		// Avoid collisions (e.g. two days with same date but different content)
		if (usedIds.has(dayId)) {
			const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
			const arr = new Uint32Array(3);
			crypto.getRandomValues(arr);
			let suffix = '';
			for (let j = 0; j < 3; j++) suffix += chars[arr[j] % chars.length];
			dayId = `${dayId}-${suffix}`;
		}
		usedIds.add(dayId);
		ops.set(`trips/${tripId}/itinerary/${dayId}`, day);
	});
}

export async function setTripData() {
	if (getID('destinations-enabled').checked) {
		for (const child of getChildIDs('has-destinations')) {
			const i = parseInt(child.split('-')[2]);
			setRequired(`select-destinations-${i}`);
		}
	}

	const type = 'trips';
	const checks = [validatePinField];
	const dataBuildingFunctions = [buildTripObject, buildExpensesObject];
	const batchFunctions = [setProtectedDataAndExpenses, writeTripSubcollections];

	await setDocumento({ type, checks, dataBuildingFunctions, batchFunctions });
}
