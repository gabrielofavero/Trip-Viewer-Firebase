// ============================================================
// Static Export — Data Gathering
// ============================================================
// Builds the local `data.json` bundle (§5.2 of the static-export plan) from
// the shared document-bundle builders. `paths` keys are the exact Firestore
// paths the app requests at runtime, so the static-mode store
// (`static-mode.ts`) can serve them with a plain `paths[key]` lookup.
// ============================================================

import { buildExportDocument } from '../backup/document-bundle.js';
import type { DocType } from '../backup/document-bundle.js';
import { getUID } from '../data/firebase/auth.js';
import { translate } from '../i18n/translation.js';

export type ExportStaticMode = 'light' | 'complete';

/** Progress reporter: translated step message + 0–100 bar value. */
export type ExportStaticProgress = (message: string, progress: number) => void;

const DESTINATION_CATEGORIES = ['restaurants', 'snacks', 'nightlife', 'tourism', 'shopping'];

// ============================================================
// Public API
// ============================================================

/**
 * Build the local data bundle for a single document.
 *
 * Protected-data PINs are resolved automatically from the owner-readable
 * `protected/{tripId}` lookup doc, so no PIN prompt is required.
 */
export async function buildStaticData(
	type: DocType,
	id: string,
	pin: string = '',
	mode: ExportStaticMode = 'light',
	onProgress?: ExportStaticProgress,
): Promise<Record<string, any> | null> {
	onProgress?.(translate('account.export_static.loading.gathering'), 5);

	const bundle = await buildExportDocument(id, type, pin);
	if (!bundle) return null;

	onProgress?.(translate('account.export_static.loading.gathering'), 30);

	const paths: Record<string, any> = {};
	const imageUrls = new Set<string>();
	let title = '';
	let ownerUid = '';

	if (type === 'trip') {
		const trip = bundle.trip;
		title = trip?.title || id;

		// The PIN is auto-resolved from the owner-readable `protected/{tripId}`
		// lookup doc inside buildExportDocument; prefer that resolved value so
		// the bundle paths match the real Firestore paths at runtime.
		const resolvedPin = bundle.protected?.pin || pin;

		paths[`trips/${id}`] = trip;

		if (bundle.accommodations) {
			paths[`trips/${id}/accommodations`] = collectionToMap(bundle.accommodations);
		}
		if (bundle.transportation) {
			paths[`trips/${id}/transportation`] = transportationToMap(bundle.transportation);
		}
		if (bundle.itinerary) {
			paths[`trips/${id}/itinerary`] = collectionToMap(bundle.itinerary);
		}
		if (bundle.expenses) {
			paths[`expenses/${id}`] = bundle.expenses;
		}
		if (bundle.destinations) {
			for (const [destId, destData] of Object.entries(bundle.destinations)) {
				paths[`destinations/${destId}`] = destData;
			}
		}
		if (bundle.protected?.trip) {
			paths[`trips/protected/${resolvedPin}/${id}`] = bundle.protected.trip;
		}
		if (bundle.protected?.expenses) {
			paths[`expenses/protected/${resolvedPin}/${id}`] = bundle.protected.expenses;
		}
		if (resolvedPin && trip?.pin && trip.pin !== 'no-pin') {
			paths[`protected/${id}`] = { pin: resolvedPin, sharing: trip?.sharing || {} };
		}

		if (mode === 'complete') {
			collectImageUrls(trip).forEach((url) => imageUrls.add(url));
			collectAccommodationImages(bundle.accommodations).forEach((url) => imageUrls.add(url));
			Object.values(bundle.destinations || {}).forEach((destData: any) => {
				collectImageUrls(destData).forEach((url) => imageUrls.add(url));
			});
		}
	} else if (type === 'destination') {
		const destination = bundle.destination;
		title = destination?.title || id;

		paths[`destinations/${id}`] = destination;

		if (mode === 'complete') {
			collectImageUrls(destination).forEach((url) => imageUrls.add(url));
		}
	} else {
		const listing = bundle.listing;
		title = listing?.title || id;

		paths[`listings/${id}`] = listing;

		if (bundle.destinations) {
			for (const [destId, destData] of Object.entries(bundle.destinations)) {
				paths[`destinations/${destId}`] = destData;
			}
		}

		if (mode === 'complete') {
			collectImageUrls(listing).forEach((url) => imageUrls.add(url));
			Object.values(bundle.destinations || {}).forEach((destData: any) => {
				collectImageUrls(destData).forEach((url) => imageUrls.add(url));
			});
		}
	}

	const images: Record<string, string> = {};
	for (const url of imageUrls) {
		images[url] = `images/${hashString(url)}.${extensionFromUrl(url)}`;
	}

	ownerUid = (await getUID()) || '';

	onProgress?.(translate('account.export_static.loading.gathering'), 40);

	return {
		meta: {
			version: 1,
			type,
			sourceId: id,
			title,
			exportedAt: new Date().toISOString(),
			ownerUid,
			mode,
			images,
		},
		paths,
	};
}

// ============================================================
// Image Inventory
// ============================================================

/**
 * Collect image URLs from a document's known image-bearing fields only:
 * trip `image.background` + `gallery.images[].link`, destination
 * `image.background` + entry `images[].link`, listing `image.background`,
 * plus any `logo` field on the document or its category entries.
 */
export function collectImageUrls(doc: Record<string, any> | null | undefined): string[] {
	const urls: string[] = [];
	if (!doc || typeof doc !== 'object') return urls;

	pushUrl(urls, doc.image?.background);
	pushUrl(urls, doc.logo);

	const gallery = doc.gallery?.images;
	if (Array.isArray(gallery)) {
		gallery.forEach((img: any) => pushUrl(urls, img?.link));
	}

	for (const category of DESTINATION_CATEGORIES) {
		const entries = doc[category];
		if (!entries || typeof entries !== 'object') continue;
		Object.values(entries).forEach((entry: any) => {
			if (!entry || typeof entry !== 'object') return;
			const entryImages = entry.images;
			if (Array.isArray(entryImages)) {
				entryImages.forEach((img: any) => pushUrl(urls, img?.link));
			}
			pushUrl(urls, entry.logo);
		});
	}

	return urls;
}

// ============================================================
// Helpers
// ============================================================

/** Convert a Firestore collection map (`{ docId: data }`) into the
 *  reader-shaped map the static store returns (`{ docId: { id, ...data } }`). */
function collectionToMap(collection: Record<string, any> | undefined): Record<string, any> {
	const result: Record<string, any> = {};
	for (const [key, data] of Object.entries(collection || {})) {
		result[key] = { id: key, ...(data || {}) };
	}
	return result;
}

/** Transportation keeps `_settings` unshaped and legs shaped like the reader. */
function transportationToMap(collection: Record<string, any> | undefined): Record<string, any> {
	const result: Record<string, any> = {};
	for (const [key, data] of Object.entries(collection || {})) {
		result[key] = key === '_settings' ? data : { id: key, ...(data || {}) };
	}
	return result;
}

function collectAccommodationImages(
	accommodations: Record<string, any> | undefined,
): string[] {
	const urls: string[] = [];
	for (const acc of Object.values(accommodations || {})) {
		if (!acc || typeof acc !== 'object') continue;
		const images = acc.images;
		if (Array.isArray(images)) {
			images.forEach((img: any) => pushUrl(urls, img?.link));
		}
		pushUrl(urls, acc.logo);
	}
	return urls;
}

function pushUrl(urls: string[], value: unknown) {
	if (typeof value === 'string' && /^https?:\/\//i.test(value)) {
		urls.push(value);
	}
}

function extensionFromUrl(url: string): string {
	try {
		const pathname = new URL(url).pathname;
		const match = pathname.match(/\.([a-zA-Z0-9]{2,5})(?:[?#]|$)/);
		if (match) return match[1].toLowerCase();
	} catch {
		// fall through to the default below
	}
	return 'jpg';
}

/** Deterministic 12-char hex fingerprint for a URL (stable across builds). */
function hashString(str: string): string {
	let h1 = 0x811c9dc5;
	let h2 = 0x01000193;
	for (let i = 0; i < str.length; i++) {
		const c = str.charCodeAt(i);
		h1 ^= c;
		h1 = Math.imul(h1, 0x01000193) >>> 0;
		h2 = (Math.imul(h2, 33) + c) >>> 0;
	}
	return (h1.toString(16).padStart(8, '0') + h2.toString(16).padStart(8, '0')).slice(0, 12);
}
