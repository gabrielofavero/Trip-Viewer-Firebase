// Text Utils
import { getCurrencies } from '../app/config.js';
import { getState } from '../data/state.js';
import {
	DESTINATIONS,
	TRAVELERS,
	FIRESTORE_DESTINATIONS_DATA,
	FIRESTORE_NEW_DATA,
	FIRESTORE_DESTINATIONS_NEW_DATA,
	ERROR_FROM_GET_REQUEST,
} from '../data/state.js';
import {
	convertFromDateObject,
	getDateRegionalFormat,
	getDateString,
	getTodayDateObject,
} from './dates.js';
import { translate } from '../i18n/translation.js';
import { hideContent } from '../theme/visibility.js';
import { getFlightBoxHTML } from '../pages/trip-detail/categories/transportation-module.js';
import {
	getHospedagensData,
	getHotelBoxHTML,
} from '../pages/trip-detail/categories/accommodation-module.js';
import { getDestinationsAccordionBodyHTML } from '../pages/destination/support/content.js';

export function firstCharToUpperCase(str) {
	return str.charAt(0).toUpperCase() + str.slice(1);
}

export function codifyText(inputString) {
	let lowercaseString = inputString.toLowerCase();
	let validFolderName = lowercaseString.replace(/[^a-z0-9_]/g, '');
	return validFolderName;
}

export function uncodifyText(inputString) {
	return inputString.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
}

export function getRandomID({ idLength = 5, pool = [] } = {}) {
	const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	const array = new Uint32Array(idLength);
	crypto.getRandomValues(array); // native + secure

	let randomId = '';
	for (let i = 0; i < idLength; i++) {
		randomId += characters[array[i] % characters.length];
	}

	// avoid collision
	return pool.includes(randomId) ? getRandomID({ idLength, pool }) : randomId;
}

export function getEmptyChar() {
	return '\u200B';
}

export function getLastUpdatedOnText(date) {
	if (typeof date === 'string') {
		date = new Date(date);
	}
	const dateString = getDateString(date, getDateRegionalFormat());
	return `${translate('labels.last_updated_on')} ${dateString}`;
}

// Object Utils
export function isObject(obj) {
	return obj === Object(obj);
}

export function objectExistsAndHasKeys(obj) {
	return isObject(obj) && obj && Object.keys(obj).length > 0;
}

export function getIdFromObjectDB(dbObject) {
	try {
		const segments = dbObject.data._delegate._key.path.segments;
		return segments[segments.length - 1];
	} catch (e) {
		console.error('Cannot get ID from DB: ' + e.message);
		return;
	}
}

export function printObjectHTML(obj) {
	var str = '<br>';
	for (var key in obj) {
		if (obj.hasOwnProperty(key)) {
			const formattedKey = uncodifyText(key);
			str += `<br><strong>${formattedKey}:</strong> ${obj[key]}`;
		}
	}
	return str;
}

export function cloneObject(object) {
	return JSON.parse(JSON.stringify(object));
}

export function getLocalJSON() {
	return new Promise((resolve, reject) => {
		const input = document.createElement('input');
		input.type = 'file';
		input.accept = 'application/json';

		input.onchange = (event: Event) => {
			const file = (event.target as HTMLInputElement).files[0];
			if (!file) {
				reject('No file selected');
				return;
			}

			const reader = new FileReader();
			reader.onload = (e: ProgressEvent<FileReader>) => {
				try {
					const json = JSON.parse(e.target.result as string);
					resolve(json);
				} catch (err) {
					reject('Invalid JSON file');
				}
			};
			reader.onerror = () => reject('Failed to read file');

			reader.readAsText(file);
		};

		input.click();
	});
}

export function areObjectsEqual(obj1, obj2, ignoredPaths = []) {
	return deepObjectsEqual(obj1, obj2, '', new Set(ignoredPaths));

	function deepObjectsEqual(val1, val2, path, ignored) {
		if (ignored.has(path)) return true;

		if (val1 === val2) return true;

		if (typeof val1 !== 'object' || typeof val2 !== 'object' || val1 === null || val2 === null) {
			return false;
		}

		const keys = new Set([...Object.keys(val1), ...Object.keys(val2)]);

		for (const key of keys) {
			const nextPath = path ? `${path}.${key}` : key;
			if (!deepObjectsEqual(val1[key], val2[key], nextPath, ignored)) {
				return false;
			}
		}

		return true;
	}
}

export function getObjectDiff({ obj1, obj2, ignoredPaths = [], name = 'Object' }) {
	const differences = [];
	const ignored = new Set(ignoredPaths);

	collectObjectDiffs(obj1, obj2, '', ignored, differences);

	return {
		name,
		areEqual: differences.length === 0,
		differences,
	};
}

export function collectObjectDiffs(val1, val2, path, ignored, diffs) {
	if (ignored.has(path)) return;

	if (val1 === val2) return;

	if (typeof val1 !== 'object' || typeof val2 !== 'object' || val1 === null || val2 === null) {
		diffs.push({
			path,
			value1: val1,
			value2: val2,
		});
		return;
	}

	const keys = new Set([...Object.keys(val1), ...Object.keys(val2)]);

	for (const key of keys) {
		const nextPath = path ? `${path}.${key}` : key;
		collectObjectDiffs(val1[key], val2[key], nextPath, ignored, diffs);
	}
}

// Array Utils
export function getReadableArray(arr) {
	if (arr.length <= 1) return arr[0] ?? '';
	const andLabel = translate('labels.and');
	const last = arr.pop();
	return `${arr.join(', ')} ${andLabel} ${last}`;
}

// Element Utils
export function getChildIDs(parentId) {
	var parentElement = getID(parentId);

	if (parentElement) {
		var childElements = parentElement.children;
		var idsArray = [];

		for (var i = 0; i < childElements.length; i++) {
			var elementId = childElements[i].id;
			if (elementId) {
				idsArray.push(elementId);
			}
		}
		return idsArray;
	} else {
		console.error("Element with id '" + parentId + "' not found");
		return null;
	}
}

export function setRequired(id) {
	const div = getID(id);
	if (div) {
		div.setAttribute('required', '');
	}
}

export function removeRequired(id) {
	const div = getID(id);
	if (div) {
		div.removeAttribute('required');
	}
}

export function getOptionsFromSelect(id) {
	const selectElement = getID(id);
	let optionValues = [];

	for (let i = 0; i < selectElement.options.length; i++) {
		optionValues.push(selectElement.options[i].value);
	}
	return optionValues;
}

export function removeChild(type) {
	const div = getID(type);
	div.parentNode.removeChild(div);
}

export function removeChildWithValidation(category, j) {
	const id = getID(`${category}-inner-box-${j}`)
		? `${category}-inner-box-${j}`
		: `${category}-${j}`;
	removeChild(id);
	hideParentIfNoChildren(category);
}

export function hideParentIfNoChildren(category) {
	if (getChildIDs(`${category}-box`).length === 0) {
		getID(`${category}-enabled`).checked = false;
		hideContent(category);
	}
}

export function removeEmptyChild(category) {
	let itens = [];

	switch (category) {
		case 'restaurants':
		case 'snacks':
		case 'nightlife':
		case 'tourism':
		case 'shopping':
		case 'lineup':
			itens = [`${category}-name`];
			break;
		case 'transportation':
			itens = ['departure-point', 'arrival-point'];
			break;
		case 'accommodations':
			itens = [`${category}-name`, `${category}-address`];
			break;
		case 'gallery':
			itens = [`${category}-title`, `link-${category}`];
			break;
	}

	if (itens.length > 0) {
		const j = getFirstJ(`${category}-box`);
		if (j && !hasUserData(itens, j)) {
			removeChild(`${category}-${j}`);
		}
	}

	function hasUserData(itens, j) {
		for (const item of itens) {
			if (getID(`${item}-${j}`).value) {
				return true;
			}
		}
		return false;
	}
}

export function getIDs(divID) {
	const ids = [];
	for (const item of divID.split('-')) {
		if (!isNaN(item)) {
			ids.push(parseInt(item));
		}
	}
	return ids.join('-');
}

export function getJ(id) {
	const jSplit = id.split('-');
	return parseInt(jSplit[jSplit.length - 1]);
}

export function getJs(parentID) {
	const parent = getID(parentID);
	if (!parent) return [];

	return Array.from(parent.querySelectorAll('[id]'))
		.map((el) => {
			const id = el.id;
			const dash = id.lastIndexOf('-');
			return dash === -1 ? NaN : Number(id.slice(dash + 1));
		})
		.filter(Number.isFinite);
}

export function findJFromID(id, type) {
	const js = getJs(`${type}-box`);
	for (const j of js) {
		const result = getID(`${type}-id-${j}`).value;
		if (result === id) {
			return j;
		}
	}
	return 0;
}

export function getFirstJ(parentID) {
	const js = getJs(parentID);
	return js[0];
}

export function getLastJ(parentID) {
	const js = getJs(parentID);
	return js.length === 0 ? 0 : js[js.length - 1];
}

export function getLastUnorderedJ(parentID) {
	const js = getJs(parentID);
	return js.length === 0 ? 0 : Math.max(...js);
}

export function getNextJ(parentID) {
	return getLastUnorderedJ(parentID) + 1;
}

export function getCategoryID(type, j) {
	const js = getJs(`${type}-box`);
	let ids = [];

	for (const innerJ of js) {
		const id = getID(`${type}-id-${innerJ}`).value;
		if (id) ids.push(id);
	}

	const currentID = getID(`${type}-id-${j}`).value;
	if (currentID && !ids.includes(currentID)) {
		return currentID;
	}

	return getRandomID({ pool: ids });
}

export function getOrCreateCategoryID(type, j) {
	const currentID = getID(`${type}-id-${j}`).value;
	return currentID ? currentID : getCategoryID(type, j);
}

// URL Utils
export function getURLParams(): Record<string, string> {
	const urlParams = new URLSearchParams(window.location.search);
	const params: Record<string, string> = {};
	for (const [internalKey, value] of urlParams) {
		params[internalKey] = value;
	}
	return params;
}

export function getURLParam(param) {
	const urlParams = new URLSearchParams(window.location.search);
	return urlParams.get(param);
}

export function setURLParam(key, value) {
	const url = new URL(window.location.href);
	url.searchParams.set(key, value);
	window.history.replaceState({}, '', url);
}

// Document Utils

export function getDataDocument(type) {
	switch (type) {
		case 'trips':
		case 'listings':
			return getState();
		case 'destinations':
			return FIRESTORE_DESTINATIONS_DATA;
		default:
			return null;
	}
}

export function getNewDataDocument(type) {
	switch (type) {
		case 'trips':
		case 'listings':
			return FIRESTORE_NEW_DATA;
		case 'destinations':
			return FIRESTORE_DESTINATIONS_NEW_DATA;
		default:
			return null;
	}
}

export function getTranslatedDocumentLabel(type) {
	switch (type) {
		case 'trips':
			return translate('trip.document');
		case 'trips/protected':
			return translate('trip.protected');
		case 'destinations':
			return translate('destination.document');
		case 'listings':
			return translate('listing.document');
		case 'expenses':
			return translate('trip.expenses.document');
		case 'expenses/protected':
			return translate('trip.expenses.protected');
		case 'protected':
			return translate('labels.protected');
		default:
			return translate('labels.unknown');
	}
}

export function getOrderedDocumentByUpdateDate(data: Record<string, any>): any[] {
	return Object.entries(data)
		.map(([id, v]) => ({ id, ...(v as Record<string, any>) }))
		.sort(
			(a: any, b: any) =>
				new Date(b.version.lastUpdated).getTime() - new Date(a.version.lastUpdated).getTime(),
		);
}

export function getOrderedDocumentByTitle(data: Record<string, any>): any[] {
	return Object.entries(data)
		.map(([id, v]) => ({ id, ...(v as Record<string, any>) }))
		.sort((a: any, b: any) => a.title.localeCompare(b.title));
}

// Destination
export function getAndDestinationTitle(value, destinations = [], placeholder = true) {
	if (!destinations || destinations.length === 0) {
		const placeholderValue = placeholder ? translate('trip.itinerary.title') : '';
		return value || placeholderValue;
	}

	const titles = destinations.map((d) => d.title);
	if (value.includes('departure')) {
		return getReadableArray([translate('trip.transportation.departure'), ...titles]);
	}

	if (value.includes('return')) {
		return getReadableArray([...titles, translate('trip.transportation.return')]);
	}

	return getReadableArray([titles]);
}

export async function normalizeTikTokLink(link) {
	if (!link) return link;

	const isMobile =
		link.startsWith('https://vm.tiktok.com/') || link.startsWith('https://vt.tiktok.com/');

	if (!isMobile) return link;

	try {
		const res = await fetch(`https://www.tiktok.com/oembed?url=${link}`, {
			method: 'GET',
		});

		const data = await res.json();

		if (data.author_unique_id && data.embed_product_id) {
			return `https://www.tiktok.com/@${data.author_unique_id}/video/${data.embed_product_id}`;
		}

		return link;
	} catch (err) {
		return link;
	}
}

export function getDestinationTitle(item) {
	if (item.name && item.emoji) {
		return `${item.name} ${item.emoji}`;
	} else return item.name;
}

export function getDestinationsBoxHTML({
	j,
	item,
	innerItinerary,
	values,
	currency,
	planned,
	editBtn,
}) {
	return `
    <div ${innerItinerary ? '' : `class="accordion-body" id="accordion-body-${j}"`}>
        ${getDestinationsAccordionBodyHTML({ j, item, values: values, currency: currency, planned: planned, editBtn })}
    </div>`;
}

// Itinerary
export function getInnerItineraryTitle(dado: Record<string, any>, viajantes = TRAVELERS) {
	const schedule = dado.label || '';
	const presentes = !dado.travelers
		? []
		: dado.travelers
				.filter((p) => p.isPresent)
				.map((p) => viajantes.find((t) => t.id === p.id)?.name ?? '');

	const travelersText =
		presentes.length === 0 || presentes.length === viajantes.length
			? ''
			: getReadableArray(presentes);

	let time = '';
	if (dado.start && dado.end) {
		time = `${dado.start} - ${dado.end}`;
	} else if (dado.start) {
		time = dado.start;
	}

	if (travelersText && time && schedule) {
		return {
			title: `${time} (${travelersText})`,
			content: schedule,
		};
	}

	if (travelersText && schedule) {
		return {
			title: travelersText,
			content: schedule,
		};
	}

	if (time && schedule) {
		return {
			title: time,
			content: schedule,
		};
	}

	return {
		title: '',
		content: schedule,
	};
}

export function getInnerItineraryTitleHTML(dado, spanClass) {
	const titleObj = getInnerItineraryTitle(dado);
	return titleObj.title
		? `<span class="${spanClass}">${titleObj.title}:</span> ${titleObj.content}`
		: titleObj.content;
}

export function getInnerItinerary(item, destinations) {
	const innerItinerary = {
		type: item?.type,
		title: '',
		content: '',
		media: '',
		container: item?.type === 'destinations' ? 'destinations-container' : 'label-container',
	};
	let index = -1;
	switch (item?.type) {
		case 'transportation':
			if (getState().modules.transportation === true && item.id) {
				index = getState()
					.transportation.data.map((label) => label.id)
					.indexOf(item.id);
				if (index >= 0) {
					const transportation = getState().transportation.data[index];
					innerItinerary.title = `${transportation.points.departure} → ${transportation.points.arrival}`;
					innerItinerary.content = getFlightBoxHTML(index + 1, 'inner-itinerary', true);
				}
			}
			break;
		case 'accommodations':
			if (getState().modules.accommodations === true && item.id) {
				index = getState()
					.accommodations.map((hospedagem) => hospedagem.id)
					.indexOf(item.id);
				if (index >= 0) {
					innerItinerary.title = '';
					innerItinerary.content = getAccommodationsHTML(index, true);
				}
			}
			break;
		case 'destinations':
			if (getState().modules.destinations === true && item.location && item.category && item.id) {
				const destinationIDs = DESTINATIONS.map((d) => d.id);
				index = destinationIDs.indexOf(item.location);

				if (!destinations) {
					destinations = DESTINATIONS?.[index]?.destinations;
				}

				if (!destinations) {
					return;
				}

				const destination = destinations[item.category];
				if (destination && Object.keys(destination).length) {
					const destinationItem = destination[item.id];
					if (destinationItem) {
						innerItinerary.title = getDestinationTitle(destinationItem);
						innerItinerary.content = getDestinationsBoxHTML({
							j: 1,
							item: destinationItem,
							innerItinerary: true,
							values: getDestinationValues(DESTINATIONS[index]),
							currency: destinations.currency,
							planned: undefined as any,
							editBtn: undefined as any,
						});
						innerItinerary.media = destinationItem?.media;
					}
				}
			}
	}

	return innerItinerary;

	function getDestinationValues(destination) {
		const currencyValue = destination?.destinations?.currency || 'BRL';
		const currency = cloneObject(
			getCurrencies().scale[currencyValue] || getCurrencies().scale['BRL'],
		);
		const max = translate('destination.price.max', { value: currency['$$$$'] });
		currency['-'] = translate('destination.price.free');
		currency['default'] = translate('destination.price.default');
		currency['$$$$'] = max;
		return currency;
	}
}

export function getLinkMediaButton(media, type?) {
	if (!media) return;
	const video = translate('trip.itinerary.media_button.video');
	const playlist = translate('trip.itinerary.media_button.playlist');

	let buttonText = `<i class="iconify" data-icon="lets-icons:video-fill"></i>${video}`;

	if (type == 'youtube' || media.includes('youtube') || media.includes('youtu.be')) {
		buttonText = `<i class="iconify" data-icon="mdi:youtube"></i>${video}`;
	} else if (type == 'tiktok' || media.includes('tiktok')) {
		buttonText = `<i class="iconify" data-icon="ic:baseline-tiktok"></i>${video}`;
	} else if (type == 'spotify' || media.includes('spotify')) {
		buttonText = `<i class="iconify" data-icon="mdi:spotify"></i>${playlist}`;
	} else if (type == 'instagram' || media.includes('instagram')) {
		buttonText = `<i class="iconify" data-icon="mdi:instagram"></i> ${video}`;
	}

	return `<div class="button-box">
              <button class="btn btn-secondary btn-format" type="submit" data-action="open-link" data-url="${media}">${buttonText}</button>
            </div>`;
}

// Trips
export function getCurrentTrips(data: Record<string, any>) {
	const today = convertFromDateObject(getTodayDateObject());
	return Object.entries(data)
		.filter(([_, v]: [string, any]) => {
			const start = convertFromDateObject(v.start);
			const end = convertFromDateObject(v.end);
			return start <= today && today <= end;
		})
		.map(([id, v]: [string, any]) => ({ id, ...v }));
}

export function getPreviousTrips(data: Record<string, any>) {
	const today = convertFromDateObject(getTodayDateObject());
	return Object.entries(data)
		.filter(([_, v]: [string, any]) => convertFromDateObject(v.end) < today)
		.map(([id, v]: [string, any]) => ({ id, ...v }))
		.sort(
			(a: any, b: any) =>
				convertFromDateObject(b.end).getTime() - convertFromDateObject(a.end).getTime(),
		);
}

export function getNextTrips(data: Record<string, any>) {
	const today = convertFromDateObject(getTodayDateObject());
	return Object.entries(data)
		.filter(([_, v]: [string, any]) => convertFromDateObject(v.start) > today)
		.map(([id, v]: [string, any]) => ({ id, ...v }))
		.sort(
			(a: any, b: any) =>
				convertFromDateObject(b.start).getTime() - convertFromDateObject(a.start).getTime(),
		);
}

// Accommodation
export function getAccommodationsHTML(i, innerItinerary = false) {
	const original = getState().accommodations[i];
	const hospedagem = {
		id: original.id,
		breakfast: original.breakfast,
		checkIn: getHospedagensData(original.dates.checkIn),
		checkOut: getHospedagensData(original.dates.checkOut),
		reservation: original.reservation,
		description: original.description,
		address: original.address,
		images: original.images,
		link: original.link,
		name: original.name,
	};

	if (innerItinerary) {
		return getHotelBoxHTML(hospedagem, 'inner-itinerary', true);
	}

	const j = i + 1;
	return `<div class="swiper-slide" id="accommodations-slide-${j}">
            <div class="testimonial-item">
              ${getHotelBoxHTML(hospedagem, j)}
            </div>
          </div>`;
}

// Request Utils
export function getErrorFromGetRequestMessage() {
	return ERROR_FROM_GET_REQUEST.message.includes('Missing or insufficient permissions')
		? translate('messages.access_denied.message.default')
		: ERROR_FROM_GET_REQUEST;
}

export function combineDatabaseResponses(responses) {
	if (responses.length === 1) {
		return responses[0];
	}

	const success = !responses.some((response) => response.success === false);
	let message = success
		? translate('messages.operations.success')
		: `${translate('messages.operations.error')}. ${translate('messages.documents.update.error')}`;

	return {
		message: message,
		success: success,
		data: responses,
	};
}

// DOM Selector Utilities

// A pragmatic element type that covers the common DOM properties
// accessed throughout the codebase (value, checked, options, style, etc.)
// without requiring manual type assertions at every call site.
// Callers can still narrow to a specific HTML*Element via getID<HTMLInputElement>(...).
export interface DOMElement extends HTMLElement {
	value?: string;
	checked?: boolean;
	files?: FileList | null;
	options?: HTMLOptionsCollection;
	selectedIndex?: number;
	reportValidity?: () => boolean;
	required?: boolean;
	placeholder?: string;
	swiper?: any;
	href?: string;
	src?: string;
	sheet?: CSSStyleSheet;
	contentWindow?: Window | null;
	hash?: string;
	sortableInstance?: any;
}

export function getID<T extends DOMElement = DOMElement>(id: string): T | null {
	return document.getElementById(id) as T | null;
}

export function select<T extends DOMElement = DOMElement>(el: string, all?: boolean): T | null;
export function select<T extends DOMElement = DOMElement>(el: string, all: true): T[];
export function select<T extends DOMElement = DOMElement>(el: string, all = false): T | null | T[] {
	el = el.trim();
	if (all) {
		return [...document.querySelectorAll(el)] as T[];
	} else {
		return document.querySelector(el) as T | null;
	}
}

export function on(
	type: string,
	el: string | DOMElement,
	listener: EventListenerOrEventListenerObject,
	all = false,
): void {
	if (el === 'document') {
		document.addEventListener(type, listener);
	} else if (el === 'window') {
		window.addEventListener(type, listener);
	} else if (typeof el === 'string') {
		const selectEl: (DOMElement | null)[] = all
			? [...document.querySelectorAll<DOMElement>(el)]
			: [document.querySelector<DOMElement>(el)];
		selectEl.forEach((e) => e && e.addEventListener(type, listener));
	} else {
		el.addEventListener(type, listener);
	}
}

export function onscroll(el, listener) {
	el.addEventListener('scroll', listener);
}
