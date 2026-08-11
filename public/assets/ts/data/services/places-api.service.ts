// ======= Places API (New) — Service Layer =======
// Wraps the Google Places API (New) Cloudflare routes (deployed worker).
// PLACES_API_BASE_URL resolves per environment by hostname (same pattern as
// firebase-config.js): localhost → wrangler dev (:8787); dev/prd → the single
// deployed worker route. Mock fixtures are only used while PLACES_API_MOCK is
// true (local development without the worker running).
//
// Every request sends the Firebase ID token (`Authorization: Bearer <token>`)
// plus `lang` and `photos`; Cloudflare derives the `uid` from the verified
// token (see docs/ai-analysis/7-places-api-backend-contract.md §6.1). The
// client never sends `uid` — a raw uid is spoofable, the token is not.
// Every function throws a friendly, translatable Error on failure; callers
// should surface it via displayError() from utils/messages.ts.
//
// References:
// - docs/ai-analysis/6-places-api-edit-destination.md (§3, P1)
// - docs/ai-analysis/7-places-api-backend-contract.md (worker contract)
// - models/places-api.model.ts (types + response envelopes)

import { getLanguagePackName, translate } from '../../i18n/translation.js';
import type {
	PlaceDetails,
	PlaceDetailsResponse,
	PlacePhoto,
	PlacePhotosResponse,
	PlaceSearchResponse,
	PlaceSearchResult,
} from '../../models/places-api.model.js';
import { getFirebaseIdToken } from '../firebase/auth.js';

/** Deployed Cloudflare worker route (dev + prd share this one URL). */
const WORKER_DEPLOYED_URL = 'https://trip-viewer-places-api.gabriel-o-favero.workers.dev';
/** Local worker via `wrangler dev` (worker/README.md → Run locally). */
const WORKER_LOCAL_URL = 'http://localhost:8787';

/**
 * Hostnames that count as a LOCAL development environment.
 *
 * The Places API feature is HARD-GATED to local environments only: on any
 * deployed host (dev/prd) the buttons never render and every service call
 * throws a friendly error — regardless of the `canUsePlacesAPI` permission.
 * This is a deliberate safety gate (the worker proxies real Google Places
 * calls) — see docs/ai-analysis/7-places-api-backend-contract.md.
 */
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

/**
 * Whether the app is running on a local development environment
 * (localhost / 127.0.0.1 / [::1]).
 * @returns {boolean}
 */
export function isLocalEnv(): boolean {
	const hostname = window?.location?.hostname || '';
	return LOCAL_HOSTS.has(hostname);
}

/**
 * HARD CHECK — the edit-destination Places feature is enabled ONLY on local
 * environments. `false` on any deployed host, so the whole feature is
 * unreachable there. Used by the buttons (UI) and the service calls (thrown
 * guard). Mirrors `isLocalEnv()` and drives `resolveApiBaseUrl()`.
 */
export const PLACES_API_ENABLED = isLocalEnv();

/**
 * Resolve the worker base URL per environment by hostname (same pattern as
 * firebase-config.js): localhost → wrangler dev; any deployed Firebase host →
 * the single deployed route.
 */
function resolveApiBaseUrl(): string {
	return isLocalEnv() ? WORKER_LOCAL_URL : WORKER_DEPLOYED_URL;
}

/** Cloudflare worker base URL, resolved per environment by hostname. */
export const PLACES_API_BASE_URL = resolveApiBaseUrl();
/** Mock mode — off: the Cloudflare routes are live. */
export const PLACES_API_MOCK = false;

/** Options shared by every Places API call. */
export interface PlacesApiOptions {
	/**
	 * Include photo references in the response. `true` when building a NEW place
	 * (no place id yet — e.g. search); `false` when refreshing an existing place
	 * (e.g. bulk update). Defaults to `true`.
	 */
	photos?: boolean;
	/** Language pack name ('en' | 'pt'). */
	lang?: string;
	/** AbortSignal so callers can cancel in-flight requests (e.g. dialog close). */
	signal?: AbortSignal;
	/**
	 * Called with `true` when the worker returns a degraded response (monthly
	 * Places quota nearly reached — photos disabled, search/details still
	 * returned). Use it to show a "search has been limited" toast on the modal.
	 */
	onLimited?: (limited: boolean) => void;
}

/**
 * Error carrying the worker's machine-readable `places/*` code (error envelope
 * §10.1), so callers can distinguish a quota block from a generic failure.
 */
export class PlacesApiError extends Error {
	constructor(
		public readonly code: string,
		message: string,
	) {
		super(message);
		this.name = 'PlacesApiError';
	}
}

/** True when an error is the worker's hard quota block (429 places/quota-exceeded). */
export function isQuotaExceededError(error: unknown): boolean {
	return error instanceof PlacesApiError && error.code === 'places/quota-exceeded';
}

/**
 * Resolve lang + Firebase ID token defaults when the caller didn't provide them.
 * lang comes from the active language pack; the token comes from
 * getFirebaseIdToken() and is sent as `Authorization: Bearer <token>`. The
 * token fetch is best-effort (mock mode / unauthenticated → empty string).
 */
async function resolveOptions(
	options: PlacesApiOptions = {},
): Promise<{ lang: string; token: string }> {
	const lang = options.lang ?? getLanguagePackName();
	let token = '';
	try {
		token = await getFirebaseIdToken();
	} catch {
		// Unauthenticated (or mock): no token. In production the worker returns 401.
	}
	return { lang, token };
}

/** Resolve the `photos` flag (default `true` — new-place fetch, no id yet). */
function resolvePhotos(options: PlacesApiOptions = {}): boolean {
	return options.photos ?? true;
}

/** Build a GET URL with query params, skipping empty values. */
function buildUrl(basePath: string, params: Record<string, string>): string {
	const searchParams = new URLSearchParams();
	for (const [key, value] of Object.entries(params)) {
		if (value !== undefined && value !== null && value !== '') {
			searchParams.set(key, value);
		}
	}
	const query = searchParams.toString();
	return query ? `${basePath}?${query}` : basePath;
}

/** Throw AbortError if the caller cancelled the request. */
function throwIfAborted(signal?: AbortSignal): void {
	if (signal?.aborted) {
		throw new DOMException('The operation was aborted.', 'AbortError');
	}
}

/** Guard against shipping with the placeholder URL (no backend yet). */
function assertConfigured(): void {
	if (PLACES_API_MOCK) return;
	if (!PLACES_API_BASE_URL || PLACES_API_BASE_URL.includes('PLACEHOLDER')) {
		throw new Error(translate('placesApi.errors.routeNotConfigured'));
	}
}

/**
 * HARD CHECK — the Places API is enabled only on local environments.
 * Throws a friendly, translatable error on any deployed host, so even a
 * direct programmatic call (console, stray button) can't reach the worker.
 */
function assertLocalOnly(): void {
	if (!PLACES_API_ENABLED) {
		throw new Error(translate('placesApi.errors.localOnly'));
	}
}

/** Shared fetch wrapper: returns typed JSON or throws a friendly error. */
async function request<T>(url: string, token: string, options: PlacesApiOptions = {}): Promise<T> {
	const { signal, onLimited } = options;
	let response: Response;
	try {
		const headers = new Headers();
		if (token) headers.set('Authorization', `Bearer ${token}`);
		response = await fetch(url, { signal, headers });
	} catch (error) {
		// Let callers handle cancellation themselves (e.g. dialog close button).
		if ((error as Error)?.name === 'AbortError') throw error;
		throw new Error(translate('placesApi.errors.network'));
	}
	if (!response.ok) {
		// The worker's envelope is `{ error: { code, message } }` — read the code
		// so a quota block (429 places/quota-exceeded) is treated distinctly.
		let code = '';
		try {
			const body = (await response.json()) as { error?: { code?: string } };
			code = body?.error?.code ?? '';
		} catch {
			// Non-JSON error body — fall through to the generic network error.
		}
		if (code === 'places/quota-exceeded') {
			throw new PlacesApiError(code, translate('placesApi.errors.quotaExceeded'));
		}
		throw new Error(`${translate('placesApi.errors.network')} (${response.status})`);
	}
	const body = (await response.json()) as T;
	// The worker tags 200 responses with `limited: true` when it degraded the
	// request (quota nearly reached) — notify the caller so it can show a toast.
	if (onLimited && (body as { limited?: boolean })?.limited === true) {
		onLimited(true);
	}
	return body;
}

/**
 * Route 1 — name search. Returns up to 5 results with all needed data.
 * @param query Free-text name to search for.
 */
export async function searchPlaces(
	query: string,
	options: PlacesApiOptions = {},
): Promise<PlaceSearchResult[]> {
	assertLocalOnly(); // HARD CHECK — local environments only
	const { lang, token } = await resolveOptions(options);
	const photos = resolvePhotos(options); // new place — no id yet → photos on

	if (PLACES_API_MOCK) {
		throwIfAborted(options.signal);
		return mockSearch(query);
	}

	assertConfigured();
	const params: Record<string, string> = {
		q: query,
		lang,
		photos: photos ? 'true' : 'false',
	};
	const url = buildUrl(`${PLACES_API_BASE_URL}/places/search`, params);
	const data = await request<PlaceSearchResponse>(url, token, options);
	return data.results ?? [];
}

/**
 * Route 2 — full place info by Google Place ID.
 * @param id Google Place ID.
 */
export async function getPlace(id: string, options: PlacesApiOptions = {}): Promise<PlaceDetails> {
	assertLocalOnly(); // HARD CHECK — local environments only
	const { lang, token } = await resolveOptions(options);
	const photos = resolvePhotos(options); // false on refresh (e.g. bulk); true when building a new place

	if (PLACES_API_MOCK) {
		throwIfAborted(options.signal);
		return mockGetPlace(id);
	}

	assertConfigured();
	const params: Record<string, string> = { lang, photos: photos ? 'true' : 'false' };
	const url = buildUrl(`${PLACES_API_BASE_URL}/places/${encodeURIComponent(id)}`, params);
	const data = await request<PlaceDetailsResponse>(url, token, options);
	return data.place;
}

/**
 * Route 3 — direct URLs for the place's photos (first 3).
 * @param id Google Place ID.
 */
export async function getPlacePhotos(
	id: string,
	options: PlacesApiOptions = {},
): Promise<PlacePhoto[]> {
	assertLocalOnly(); // HARD CHECK — local environments only
	const { lang, token } = await resolveOptions(options);

	if (PLACES_API_MOCK) {
		throwIfAborted(options.signal);
		return mockGetPhotos(id);
	}

	assertConfigured();
	// Route 3 is the dedicated photos route — it always returns photo URLs,
	// so the `photos` flag does not apply here.
	const params: Record<string, string> = { lang };
	const url = buildUrl(`${PLACES_API_BASE_URL}/places/${encodeURIComponent(id)}/photos`, params);
	const data = await request<PlacePhotosResponse>(url, token, options);
	// The worker returns `photoUri` (a keyless CDN URL); the app consumes `url`.
	return (data.photos ?? []).map((photo) => ({
		name: photo.name,
		url: photo.photoUri ?? '',
	}));
}

// ============================================================
// MOCK fixtures (used while PLACES_API_MOCK === true)
// ============================================================
// A few fake places so every downstream prompt is testable without a backend.
// Includes one CLOSED_PERMANENTLY place and several photo references.

const MOCK_PLACES: PlaceSearchResult[] = [
	{
		id: 'mock-place-pizzeria',
		name: 'Pizzeria Bella Napoli',
		description: 'Authentic Neapolitan wood-fired pizza in the historic center.',
		region: 'Historic Center',
		website: 'https://example.com/bella-napoli',
		instagram: 'bellanapoli.pizza',
		rating: '4',
		price: '$$',
		emoji: '🍕',
		map: 'https://maps.google.com/?q=Pizzeria+Bella+Napoli',
		businessStatus: 'OPERATIONAL',
		photos: [
			{ name: 'mock-photo-pizzeria-1' },
			{ name: 'mock-photo-pizzeria-2' },
			{ name: 'mock-photo-pizzeria-3' },
		],
	},
	{
		id: 'mock-place-museum',
		name: 'Museum of Modern Art',
		description: 'Contemporary art exhibitions and a rooftop café.',
		region: 'Downtown',
		website: 'https://example.com/museum',
		instagram: 'museum.modern',
		rating: '5',
		price: '$$$',
		emoji: '🖼️',
		map: 'https://maps.google.com/?q=Museum+of+Modern+Art',
		businessStatus: 'OPERATIONAL',
		photos: [{ name: 'mock-photo-museum-1' }, { name: 'mock-photo-museum-2' }],
	},
	{
		id: 'mock-place-coffee',
		name: 'Corner Coffee',
		description: 'Specialty coffee and homemade pastries.',
		region: 'Riverside',
		website: 'https://example.com/corner-coffee',
		instagram: 'cornercoffee',
		rating: '4',
		price: '$',
		emoji: '☕',
		map: 'https://maps.google.com/?q=Corner+Coffee',
		businessStatus: 'OPERATIONAL',
	},
	{
		id: 'mock-place-gelato',
		name: 'Gelato & Co',
		description: 'Handcrafted gelato with seasonal flavors.',
		region: 'Beachfront',
		rating: '3',
		price: '$',
		emoji: '🍦',
		map: 'https://maps.google.com/?q=Gelato+and+Co',
		businessStatus: 'OPERATIONAL',
	},
	{
		id: 'mock-place-closed',
		name: 'Old Nightclub',
		description: 'Former live-music venue.',
		region: 'Industrial District',
		rating: '-',
		price: '$$',
		emoji: '🎸',
		map: 'https://maps.google.com/?q=Old+Nightclub',
		businessStatus: 'CLOSED_PERMANENTLY',
		photos: [{ name: 'mock-photo-closed-1' }],
	},
];

function mockSearch(query: string): PlaceSearchResult[] {
	const q = query.trim().toLowerCase();
	// Blank query returns everything so the demo always has results to show.
	if (!q) return [...MOCK_PLACES].slice(0, 5);
	return MOCK_PLACES.filter((place) => place.name.toLowerCase().includes(q)).slice(0, 5);
}

function mockGetPlace(id: string): PlaceDetails {
	const place = MOCK_PLACES.find((p) => p.id === id);
	if (!place) {
		throw new Error(translate('placesApi.errors.notFound'));
	}
	return { ...place };
}

function mockGetPhotos(id: string): PlacePhoto[] {
	const place = MOCK_PLACES.find((p) => p.id === id);
	if (!place) return [];
	return (place.photos ?? []).map((photo) => ({
		name: photo.name,
		url: `https://picsum.photos/seed/${encodeURIComponent(photo.name)}/600/400`,
	}));
}
