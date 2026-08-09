/**
 * index.js — TripViewer Places API worker entry (P4).
 *
 * Composes P1 (config/data), P2 (request gates) and P3 (Places data logic)
 * into a single `fetch` handler serving local / dev / prd from ONE deployed
 * route (backend contract §6.5). The environment is NEVER chosen by the
 * client: it is derived server-side from the Origin header (`getMode`) and
 * enforced during token verification by the `aud`/`iss` claims.
 *
 * Flow per request:
 *   CORS/preflight → origin check → (mode + config) → route match
 *     → auth (verifyBearer → verifyToken → isUidAllowed → rate-limit)
 *     → Places handler (search / details / photos)
 *     → JSON envelope response (§10.1)
 *
 * Photos: routes 1/2 pick the key via `apiKeyFor(config, photos)` (main key
 * when `photos=false`, dedicated photos key otherwise); route 3 always uses
 * `config.placesPhotosApiKey` (both the details call and each media call).
 *
 * Route 4 (byte proxy) is REMOVED — v1 resolves stable keyless CDN `photoUri`s
 * (photoUri strategy; see docs/ai-analysis/8 §Deviation). No PHOTO_URL_SECRET,
 * no HMAC.
 */
import { apiKeyFor, getMode, isAllowedOrigin, readEnv } from './config.js';
import { verifyBearer, verifyToken } from './auth.js';
import { isUidAllowed } from './permissions.js';
import { createRateLimiter } from './rate-limit.js';
import {
	ApiError,
	BadRequestError,
	NotFoundError,
	PermissionError,
	jsonResponse,
	toEnvelope,
	toStatus,
} from './errors.js';
import { normalizePlace } from './normalize.js';
import { getPlace, searchText } from './places.js';
import { photoUriFor } from './photo-url.js';

// In-memory per-UID limiter, module-scoped → per-isolate (best-effort only;
// see rate-limit.js). Shared across every request hitting this isolate.
const rateLimiter = createRateLimiter({ limit: 60, windowMs: 60_000 });

/**
 * Build CORS headers echoing the request origin — only for allowlisted
 * origins (local / dev / prd hosts). Returns `null` when the origin is
 * unknown or missing (→ 403).
 * @param {string|null|undefined} origin - The request Origin header.
 * @returns {Record<string, string>|null}
 */
function buildCorsHeaders(origin) {
	if (!isAllowedOrigin(origin)) return null;
	return {
		'Access-Control-Allow-Origin': origin,
		'Access-Control-Allow-Methods': 'GET, OPTIONS',
		'Access-Control-Allow-Headers': 'Authorization, Content-Type',
		'Vary': 'Origin',
	};
}

export default {
	/**
	 * Worker entry.
	 * @param {Request} request
	 * @param {Record<string, string|undefined>} env - Worker bindings (secrets etc.).
	 * @returns {Promise<Response>}
	 */
	async fetch(request, env) {
		const url = new URL(request.url);
		const origin = request.headers.get('Origin');
		const corsHeaders = buildCorsHeaders(origin);

		// CORS preflight — allowlisted origins only; else 403.
		if (request.method === 'OPTIONS') {
			if (!corsHeaders) {
				return jsonResponse(403, toEnvelope(new PermissionError('Origin not allowed')), null);
			}
			return new Response(null, { status: 204, headers: corsHeaders });
		}

		try {
			if (!corsHeaders) throw new PermissionError('Origin not allowed');
			if (request.method !== 'GET') {
				throw new ApiError(405, 'places/method-not-allowed', 'Method not allowed');
			}
			return await route(request, url, env, corsHeaders, origin);
		} catch (err) {
			// Every thrown error → envelope + status (§10).
			return jsonResponse(toStatus(err), toEnvelope(err), corsHeaders);
		}
	},
};

/**
 * Route a GET request. Auth gates run on every JSON route before its handler.
 * @param {Request} request
 * @param {URL} url
 * @param {Record<string, string|undefined>} env
 * @param {Record<string, string>} corsHeaders
 * @param {string|null|undefined} origin
 * @returns {Promise<Response>}
 */
async function route(request, url, env, corsHeaders, origin) {
	const mode = getMode(origin); // non-null here: guaranteed by buildCorsHeaders
	const config = readEnv(env); // throws (500) when Google keys missing & not mock

	const segments = url.pathname.split('/').filter(Boolean);
	if (segments[0] !== 'places') throw new NotFoundError('Route not found');

	let placeId;
	let handler;
	if (segments.length === 2 && segments[1] === 'search') {
		handler = handleSearch;
	} else if (segments.length === 2) {
		placeId = segments[1];
		handler = handleDetails;
	} else if (segments.length === 3 && segments[2] === 'photos') {
		placeId = segments[1];
		handler = handlePhotos;
	} else {
		throw new NotFoundError('Route not found');
	}

	// Auth middleware (all JSON routes): 401 → 403 → 429.
	await authenticate(request, { mode, config, env });

	const body = await handler(url, placeId, { config });
	return jsonResponse(200, body, corsHeaders);
}

/**
 * Auth + permission + rate-limit chain for JSON routes (contract §6.1).
 * @param {Request} request
 * @param {{mode: 'local'|'dev'|'prd', config: ReturnType<typeof readEnv>, env: Record<string, string|undefined>}} opts
 * @returns {Promise<{uid: string, aud: string}>}
 */
async function authenticate(request, { mode, config, env }) {
	const token = verifyBearer(request.headers.get('Authorization'));
	const identity = await verifyToken(token, { mode, emulatorHost: config.emulatorHost });
	if (!(await isUidAllowed(identity.uid, env))) {
		throw new PermissionError('Not allowed to use Places API');
	}
	if (!rateLimiter.check(identity.uid)) {
		throw new ApiError(429, 'places/rate-limit', 'Rate limit exceeded');
	}
	return identity;
}

// --- Route handlers -------------------------------------------------------

/**
 * Route 1: `GET /places/search?q&lang&photos` → `{ results }` (≤ 5).
 * @param {URL} url
 * @param {string|undefined} _placeId
 * @param {{config: ReturnType<typeof readEnv>}} opts
 * @returns {Promise<{results: Record<string, unknown>[]}>}
 */
async function handleSearch(url, _placeId, { config }) {
	const q = url.searchParams.get('q');
	if (!q || !q.trim()) {
		throw new BadRequestError('places/missing-q', 'Missing required query parameter: q');
	}
	const lang = parseLang(url);
	const photos = parsePhotos(url);
	const apiKey = apiKeyFor(config, photos);
	const data = await searchText(q.trim(), { apiKey, lang, photos });
	const results = (data?.places ?? []).map((place) => normalizePlace(place, { photos }));
	return { results };
}

/**
 * Route 2: `GET /places/{placeId}?lang&photos` → `{ place }`.
 * @param {URL} url
 * @param {string} placeId - Google Place ID.
 * @param {{config: ReturnType<typeof readEnv>}} opts
 * @returns {Promise<{place: Record<string, unknown>}>}
 */
async function handleDetails(url, placeId, { config }) {
	const lang = parseLang(url);
	const photos = parsePhotos(url);
	const apiKey = apiKeyFor(config, photos);
	const raw = await getPlace(placeId, { apiKey, lang, photos });
	return { place: normalizePlace(raw, { photos }) };
}

/**
 * Route 3: `GET /places/{placeId}/photos?lang` → `{ photos: [{ name, photoUri }] }`.
 *
 * Always uses the dedicated photos key (details call + each media call). The
 * returned `photoUri`s are keyless CDN URLs the frontend stores on the
 * Firestore `placeAPI` doc and hotlinks in `<img>` — end users never call the
 * worker for photos. No photos → `{ photos: [] }` (200).
 * @param {URL} url
 * @param {string} placeId - Google Place ID.
 * @param {{config: ReturnType<typeof readEnv>}} opts
 * @returns {Promise<{photos: {name: string, photoUri: string}[]}>}
 */
async function handlePhotos(url, placeId, { config }) {
	const lang = parseLang(url);
	const apiKey = config.placesPhotosApiKey;
	const raw = await getPlace(placeId, { apiKey, lang, photos: true });
	const photos = [];
	for (const photo of (raw?.photos ?? []).slice(0, 3)) {
		if (typeof photo?.name !== 'string' || photo.name.length === 0) continue;
		const photoUri = await photoUriFor({ apiKey, photoName: photo.name });
		photos.push({ name: photo.name, photoUri });
	}
	return { photos };
}

// --- Query param parsing --------------------------------------------------

/**
 * Parse `lang`: `en` (default) or `pt`; anything else → 400.
 * @param {URL} url
 * @returns {'en'|'pt'}
 */
export function parseLang(url) {
	const raw = url.searchParams.get('lang');
	if (raw === null) return 'en';
	const lang = String(raw).toLowerCase();
	if (lang !== 'en' && lang !== 'pt') {
		throw new BadRequestError('places/invalid-lang', 'lang must be "en" or "pt"');
	}
	return lang;
}

/**
 * Parse `photos`: `true|false` (default `false`); anything else → `false`.
 * @param {URL} url
 * @returns {boolean}
 */
export function parsePhotos(url) {
	const raw = url.searchParams.get('photos');
	if (raw === null) return false;
	return String(raw).toLowerCase() === 'true';
}
