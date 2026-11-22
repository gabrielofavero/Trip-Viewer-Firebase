// ======= Trip & Accommodation Templates =======
//
// Account-level templates stored inside the signed-in user's document
// (`users/{uid}.tripTemplates`). Two kinds share the same array:
//
//   - 'trip'          → trip skeleton: colors, background image, logos,
//                       theme/visibility and the associated destination.
//   - 'accommodation' → stay details: name, address, description, check-in /
//                       check-out times and photos.
//
// Every template is associated with one or MORE destinations. That association
// is what the trip editor uses to offer the templates already relevant to the
// trip; templates from other destinations can still be applied (the
// destinations are linked on demand).
//
// Templates never carry trip-specific data: dates, reservation codes/links,
// payment status and breakfast change from booking to booking.

import { get, update, COLLECTION } from '../firebase/database.js';
import { getUID, USER_DATA, setUserData } from '../firebase/auth.js';

export type TripTemplateType = 'trip' | 'accommodation';

export interface TripTemplateColors {
	active: boolean;
	light: string;
	dark: string;
}

export interface TripTemplateImage {
	active: boolean;
	background: string;
	light: string;
	dark: string;
}

export interface TripTemplateVisibility {
	light: boolean;
	dark: boolean;
}

export interface TripTemplatePhoto {
	description: string;
	link: string;
}

export interface TripTemplateBase {
	id: string;
	type: TripTemplateType;
	name: string;
	destinationIds: string[];
	sourceTripId: string;
	createdAt: string;
}

export interface TripSkeletonTemplate extends TripTemplateBase {
	type: 'trip';
	colors: TripTemplateColors;
	image: TripTemplateImage;
	visibility: TripTemplateVisibility;
}

export interface AccommodationTemplateData {
	name: string;
	address: string;
	description: string;
	times: { checkIn: string; checkOut: string };
	images: TripTemplatePhoto[];
}

export interface AccommodationTemplate extends TripTemplateBase {
	type: 'accommodation';
	sourceAccommodationId: string;
	accommodation: AccommodationTemplateData;
}

export type TripTemplate = TripSkeletonTemplate | AccommodationTemplate;

const DEFAULT_COLORS: TripTemplateColors = { active: false, light: '', dark: '' };
const DEFAULT_IMAGE: TripTemplateImage = { active: false, background: '', light: '', dark: '' };
const DEFAULT_VISIBILITY: TripTemplateVisibility = { light: true, dark: true };
const DEFAULT_ACCOMMODATION: AccommodationTemplateData = {
	name: '',
	address: '',
	description: '',
	times: { checkIn: '', checkOut: '' },
	images: [],
};

/** Templates cached for the current page session (seeded from the user doc). */
let CACHED_TEMPLATES: TripTemplate[] = [];
let LOADED = false;

function toText(value: any): string {
	return String(value ?? '').trim();
}

/** `HH:MM` coercion — anything unparseable becomes ''. */
function toTime(value: any): string {
	const text = toText(value);
	const match = text.match(/^(\d{1,2}):(\d{2})/);
	if (!match) return '';
	const hours = Math.min(23, Math.max(0, parseInt(match[1], 10)));
	const minutes = Math.min(59, Math.max(0, parseInt(match[2], 10)));
	return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function normalizeColors(raw: any): TripTemplateColors {
	return {
		active: raw?.active === true,
		light: toText(raw?.light),
		dark: toText(raw?.dark),
	};
}

function normalizeImage(raw: any): TripTemplateImage {
	return {
		active: raw?.active === true,
		background: toText(raw?.background),
		light: toText(raw?.light),
		dark: toText(raw?.dark),
	};
}

function normalizeVisibility(raw: any): TripTemplateVisibility {
	// Missing visibility means "both themes allowed" (dynamic).
	return {
		light: raw?.light !== false,
		dark: raw?.dark !== false,
	};
}

function normalizePhotos(raw: any): TripTemplatePhoto[] {
	if (!Array.isArray(raw)) return [];
	const photos: TripTemplatePhoto[] = [];
	for (const entry of raw) {
		if (!entry || typeof entry !== 'object') continue;
		const link = toText(entry.link);
		if (!link) continue;
		photos.push({ description: toText(entry.description), link });
	}
	return photos;
}

/**
 * Destination ids of a template. Documents written before the multi-destination
 * support carry a single `destinationId` — keep reading it as a one-item list.
 */
function normalizeDestinationIds(rawList: any, legacyId: any): string[] {
	const source = Array.isArray(rawList) ? rawList : [legacyId];
	const ids: string[] = [];
	for (const value of source) {
		const id = toText(value);
		if (id && !ids.includes(id)) ids.push(id);
	}
	return ids;
}

function normalizeAccommodation(raw: any): AccommodationTemplateData {
	return {
		name: toText(raw?.name),
		address: toText(raw?.address),
		description: toText(raw?.description),
		times: {
			checkIn: toTime(raw?.times?.checkIn),
			checkOut: toTime(raw?.times?.checkOut),
		},
		images: normalizePhotos(raw?.images),
	};
}

/** Coerce raw Firestore data into a clean, deduplicated template array. */
export function normalizeTripTemplates(raw: any): TripTemplate[] {
	if (!Array.isArray(raw)) return [];

	const seenIds = new Set<string>();
	const templates: TripTemplate[] = [];

	for (const entry of raw) {
		if (!entry || typeof entry !== 'object') continue;

		const id = toText(entry.id);
		const name = toText(entry.name);
		if (!id || !name || seenIds.has(id)) continue;
		seenIds.add(id);

		const type: TripTemplateType = entry.type === 'accommodation' ? 'accommodation' : 'trip';
		const base = {
			id,
			name,
			destinationIds: normalizeDestinationIds(entry.destinationIds, entry.destinationId),
			sourceTripId: toText(entry.sourceTripId),
			createdAt: toText(entry.createdAt),
		};

		if (type === 'accommodation') {
			templates.push({
				...base,
				type,
				sourceAccommodationId: toText(entry.sourceAccommodationId),
				accommodation: normalizeAccommodation(entry.accommodation),
			});
			continue;
		}

		templates.push({
			...base,
			type,
			colors: normalizeColors(entry.colors),
			image: normalizeImage(entry.image),
			visibility: normalizeVisibility(entry.visibility),
		});
	}

	return templates;
}

/** Seed the session cache from an already-fetched user document. */
export function seedTripTemplates(raw: any): TripTemplate[] {
	CACHED_TEMPLATES = normalizeTripTemplates(raw);
	LOADED = true;
	return CACHED_TEMPLATES;
}

/** Template list for the current page session (no network read). */
export function getCachedTripTemplates(): TripTemplate[] {
	return CACHED_TEMPLATES;
}

/** Read `users/{uid}.tripTemplates` from Firestore and cache it. */
export async function loadTripTemplates(force = false): Promise<TripTemplate[]> {
	if (LOADED && !force) return CACHED_TEMPLATES;

	const uid = await getUID();
	if (!uid) return seedTripTemplates([]);

	const userData = await get(`${COLLECTION.USERS}/${uid}`);
	return seedTripTemplates(userData?.tripTemplates);
}

/** Persist the template list to `users/{uid}` and refresh the session cache. */
export async function saveTripTemplates(templates: TripTemplate[]): Promise<boolean> {
	const uid = await getUID();
	if (!uid) return false;

	const normalized = normalizeTripTemplates(templates);
	CACHED_TEMPLATES = normalized;
	LOADED = true;

	const result = await update(`${COLLECTION.USERS}/${uid}`, {
		tripTemplates: normalized,
	});

	// Keep the in-memory user profile in sync for later reads of USER_DATA.
	if (USER_DATA) {
		setUserData({ ...USER_DATA, tripTemplates: normalized });
	}

	return result?.success !== false;
}

/** Id for a newly created template (unique within the cached list). */
export function createTripTemplateId(type: TripTemplateType): string {
	const prefix = type === 'accommodation' ? 'a' : 't';
	const pool = CACHED_TEMPLATES.map((template) => template.id);
	let id = '';
	do {
		id = `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
	} while (pool.includes(id));
	return id;
}

/** Every trip skeleton template (page-session cache). */
export function getTripSkeletonTemplates(): TripSkeletonTemplate[] {
	return CACHED_TEMPLATES.filter(
		(template): template is TripSkeletonTemplate => template.type === 'trip',
	);
}

/** Every accommodation template (page-session cache). */
export function getAccommodationTemplates(): AccommodationTemplate[] {
	return CACHED_TEMPLATES.filter(
		(template): template is AccommodationTemplate => template.type === 'accommodation',
	);
}

/**
 * Templates of a given type associated with at least one of `destinationIds`.
 * An empty `destinationIds` list matches every template (used by "show all").
 */
export function filterTemplatesByDestinations<T extends TripTemplate>(
	templates: T[],
	destinationIds: string[],
): T[] {
	if (!destinationIds.length) return templates;
	const wanted = new Set(destinationIds);
	return templates.filter(
		(template) =>
			!template.destinationIds.length ||
			template.destinationIds.some((id) => wanted.has(id)),
	);
}

export { DEFAULT_COLORS, DEFAULT_IMAGE, DEFAULT_VISIBILITY, DEFAULT_ACCOMMODATION };
