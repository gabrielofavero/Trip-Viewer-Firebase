/**
 * places.js — raw Google Places (New) client.
 *
 * Returns RAW Google JSON; normalization is applied by normalize.js (P3) and
 * routing/error envelopes by index.js (P4). Every call:
 *   - carries `X-Goog-Api-Key: <apiKey>` + `X-Goog-FieldMask`
 *   - uses a 30s timeout (`AbortSignal.timeout`)
 *   - throws typed `UpstreamError` (429/502/503) on non-2xx; `getPlace` maps
 *     Google 404 → `NotFoundError`
 *
 * The caller picks the apiKey via `config.apiKeyFor(config, photos)` — the
 * main key when `photos=false`, the dedicated photos key otherwise (see
 * config.js; media endpoint is photo traffic → always the photos key).
 */

import { LANG_MAP } from './config.js';
import { NotFoundError, UpstreamError } from './errors.js';

const BASE_URL = 'https://places.googleapis.com/v1';
const TIMEOUT_MS = 30_000;

/**
 * Shared field list (no `photos`); `photos` is appended only when requested
 * (§5.1/§5.2, §6.4).
 */
const GET_FIELDS = [
	'id',
	'displayName',
	'shortFormattedAddress',
	'postalAddress',
	'primaryTypeDisplayName',
	'types',
	'rating',
	'priceLevel',
	'priceRange',
	'googleMapsUri',
	'websiteUri',
	'reviewSummary',
	'editorialSummary',
	'businessStatus',
];

/**
 * Build the `X-Goog-FieldMask` value.
 * @param {{photos?: boolean, search?: boolean}} opts - `search` prefixes with `places.` (§5.2).
 * @returns {string}
 */
function fieldMask({ photos = false, search = false } = {}) {
	const prefix = search ? 'places.' : '';
	const fields = GET_FIELDS.map((f) => `${prefix}${f}`);
	if (photos) fields.push(`${prefix}photos`);
	return fields.join(',');
}

/**
 * Map a Google response status to the worker-facing status and throw a typed
 * `UpstreamError` (index maps 429/502/503).
 * @param {Response} res
 * @returns {never}
 */
async function throwUpstreamError(res) {
	const status = res.status === 429 ? 429 : res.status >= 500 ? 503 : 502;
	let detail = '';
	try {
		const body = await res.json();
		detail = body?.error?.message ?? '';
	} catch {
		// Non-JSON upstream body — keep the generic message.
	}
	const message = detail
		? `Google Places API error: ${detail}`
		: `Upstream Google Places error (HTTP ${res.status})`;
	throw new UpstreamError(status, message);
}

/**
 * Text search (route 1). `POST /places:searchText`, ≤ 20 results (pageSize max
 * per request — cost is per request, not per result, so more results is free).
 * @param {string} query - The text query (`q`).
 * @param {{apiKey: string, lang?: string, photos?: boolean}} opts
 * @returns {Promise<Record<string, unknown>>} Raw Google JSON body.
 */
export async function searchText(query, { apiKey, lang = 'en', photos = false } = {}) {
	const languageCode = LANG_MAP[lang] ?? LANG_MAP.en;
	const res = await fetch(`${BASE_URL}/places:searchText`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'X-Goog-Api-Key': apiKey,
			'X-Goog-FieldMask': fieldMask({ photos, search: true }),
		},
		body: JSON.stringify({ textQuery: query, pageSize: 20, languageCode }),
		signal: AbortSignal.timeout(TIMEOUT_MS),
	});
	if (!res.ok) await throwUpstreamError(res);
	return res.json();
}

/**
 * Place details (routes 2/3). `GET /places/{placeId}`.
 * Google 404 / unknown → typed `NotFoundError`.
 * @param {string} placeId - Google Place ID.
 * @param {{apiKey: string, lang?: string, photos?: boolean}} opts
 * @returns {Promise<Record<string, unknown>>} Raw Google JSON body.
 */
export async function getPlace(placeId, { apiKey, lang = 'en', photos = false } = {}) {
	const languageCode = LANG_MAP[lang] ?? LANG_MAP.en;
	const url = `${BASE_URL}/places/${encodeURIComponent(placeId)}`;
	const res = await fetch(url, {
		method: 'GET',
		headers: {
			'Accept-Language': languageCode,
			'X-Goog-Api-Key': apiKey,
			'X-Goog-FieldMask': fieldMask({ photos }),
		},
		signal: AbortSignal.timeout(TIMEOUT_MS),
	});
	if (res.status === 404) throw new NotFoundError();
	if (!res.ok) await throwUpstreamError(res);
	return res.json();
}

/**
 * Resolve a photo `name` ref to Google's stable, keyless CDN `photoUri`
 * (`lh3.googleusercontent.com/…`) via the media endpoint with
 * `skipHttpRedirect=true`. Caller passes the photos key (media = photo traffic).
 *
 * If `skipHttpRedirect` is unavailable, falls back to following the 302
 * redirect's `Location` header.
 * @param {string} photoName - e.g. `places/{placeId}/photos/{photoRef}`.
 * @param {{apiKey: string, maxWidthPx?: number}} opts
 * @returns {Promise<string>} Stable CDN `photoUri`.
 */
export async function getPhotoUri(photoName, { apiKey, maxWidthPx = 1600 } = {}) {
	const url = `${BASE_URL}/${photoName}/media?maxWidthPx=${maxWidthPx}&skipHttpRedirect=true&key=${encodeURIComponent(apiKey)}`;
	const res = await fetch(url, {
		method: 'GET',
		signal: AbortSignal.timeout(TIMEOUT_MS),
	});

	if (res.ok) {
		const data = await res.json();
		if (data?.photoUri) return data.photoUri;
	}

	// Fallback: Google returns a 302 to the image when skipHttpRedirect isn't honored.
	if (res.status === 302) {
		const location = res.headers.get('Location');
		if (location) return location;
	}

	await throwUpstreamError(res);
}
