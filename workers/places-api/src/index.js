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
 * (photoUri strategy; see docs/implementation-plans/20260809-places-api-worker-build-prompts.md §Deviation). No PHOTO_URL_SECRET,
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
	QuotaExceededError,
	UpstreamError,
	jsonResponse,
	toEnvelope,
	toStatus,
} from './errors.js';
import { normalizePlace } from './normalize.js';
import { getPlace, searchText } from './places.js';
import { photoUriFor } from './photo-url.js';
import { createQuotaTracker } from './quota.js';

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

	// Monthly call-budget ledger (quota.js). Created per request, but its state
	// is shared: Cloudflare KV when the `PLACES_QUOTA` namespace is bound, else
	// the module-scoped in-memory map. Used to block/degrade before charges.
	const quota = createQuotaTracker({
		kv: env?.PLACES_QUOTA ?? null,
		budgets: config.budgets,
		degradeRatio: config.quotaDegradeRatio,
	});

	const segments = url.pathname.split('/').filter(Boolean);
	if (segments[0] !== 'places') throw new NotFoundError('Route not found');

	let placeId;
	let handler;
	let raw = false;
	if (segments.length === 2 && segments[1] === 'search') {
		handler = handleSearch;
	} else if (segments.length === 2 && segments[1] === 'kml') {
		handler = handleKml;
		raw = true;
	} else if (segments.length === 2) {
		placeId = segments[1];
		handler = handleDetails;
	} else if (segments.length === 3 && segments[2] === 'photos') {
		placeId = segments[1];
		handler = handlePhotos;
	} else {
		throw new NotFoundError('Route not found');
	}

	// Auth middleware (all routes): 401 → 403 → 429.
	await authenticate(request, { mode, config, env });

	// Raw (non-JSON) routes build their own Response (e.g. KML text).
	if (raw) {
		return await handler(url, placeId, { config, corsHeaders });
	}
	const body = await handler(url, placeId, { config, quota });
	return jsonResponse(200, body, corsHeaders);
}

/**
 * Resolve the monthly quota for a request that may involve photos.
 *
 * - A `photos=true` request runs on the paid photos key: when that bucket is
 *   DISABLED (budget 0) or ≥ degradeRatio spent, it degrades to `photos=false`
 *   (free main key) and the response is tagged `limited: true`.
 * - A `photos=false` request runs on the free main key: when that bucket is
 *   disabled or fully spent there is no fallback → hard block (429
 *   places/quota-exceeded).
 * @param {ReturnType<typeof createQuotaTracker>} quota
 * @param {boolean} photosRequested - The raw `photos` query param.
 * @param {boolean} photosEnabled - The `PLACES_PHOTOS_ENABLED` master switch.
 * @returns {Promise<{photos: boolean, limited: boolean}>}
 */
async function resolveQuota(quota, photosRequested, photosEnabled) {
	let photos = photosRequested;
	let limited = false;
	if (photos && !photosEnabled) {
		// PHOTOS MASTER SWITCH off (PLACES_PHOTOS_ENABLED=false) — never touch
		// the paid photos key; degrade to the free main key and tag `limited`
		// so the frontend shows "photos temporarily disabled".
		photos = false;
		limited = true;
	}
	if (photos) {
		const state = await quota.check('photos');
		if (!state.allowed) throw new QuotaExceededError();
		if (state.disabled || state.limited) {
			photos = false; // photos off — run on the free main key
			limited = true;
		}
	}
	if (!photos) {
		const state = await quota.check('main');
		if (state.disabled || !state.allowed) throw new QuotaExceededError();
		if (state.limited) limited = true;
	}
	return { photos, limited };
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
 * Route 1: `GET /places/search?q&lang&photos&biasLat&biasLng&biasRadius`
 * → `{ results }` (≤ 20).
 *
 * Optional location bias (`biasLat`/`biasLng`, required together; `biasRadius`
 * meters, default 5000) is forwarded to Google as `locationBias.circle` — a
 * soft ranking hint used by the My Maps import enrichment, not a hard filter.
 *
 * Quota: a `photos=true` request runs on the real (paid) photos key; when that
 * budget is ≥ 90% spent the worker degrades it to `photos=false` (free trial
 * main key) and tags the response `limited: true`. Once a budget is fully spent
 * the request is hard-blocked with 429 places/quota-exceeded.
 * @param {URL} url
 * @param {string|undefined} _placeId
 * @param {{config: ReturnType<typeof readEnv>, quota: ReturnType<typeof createQuotaTracker>}} opts
 * @returns {Promise<{results: Record<string, unknown>[], limited?: boolean}>}
 */
async function handleSearch(url, _placeId, { config, quota }) {
	const q = url.searchParams.get('q');
	if (!q || !q.trim()) {
		throw new BadRequestError('places/missing-q', 'Missing required query parameter: q');
	}
	const lang = parseLang(url);
	const bias = parseBias(url);
	const { photos, limited } = await resolveQuota(quota, parsePhotos(url), config.photosEnabled);
	const apiKey = apiKeyFor(config, photos);
	const data = await searchText(q.trim(), { apiKey, lang, photos, bias });
	const results = (data?.places ?? []).map((place) => normalizePlace(place, { photos }));
	await quota.record(photos ? 'photos' : 'main');
	return limited ? { results, limited: true } : { results };
}

/**
 * Route 2: `GET /places/{placeId}?lang&photos` → `{ place }`.
 *
 * Same quota behavior as route 1: `photos=true` degrades to `photos=false`
 * when the photos budget is ≥ 90% spent (tagged `limited: true`), and a fully
 * spent budget hard-blocks with 429 places/quota-exceeded.
 * @param {URL} url
 * @param {string} placeId - Google Place ID.
 * @param {{config: ReturnType<typeof readEnv>, quota: ReturnType<typeof createQuotaTracker>}} opts
 * @returns {Promise<{place: Record<string, unknown>, limited?: boolean}>}
 */
async function handleDetails(url, placeId, { config, quota }) {
	const lang = parseLang(url);
	const { photos, limited } = await resolveQuota(quota, parsePhotos(url), config.photosEnabled);
	const apiKey = apiKeyFor(config, photos);
	const raw = await getPlace(placeId, { apiKey, lang, photos });
	const place = normalizePlace(raw, { photos });
	await quota.record(photos ? 'photos' : 'main');
	return limited ? { place, limited: true } : { place };
}

/**
 * Route 3: `GET /places/{placeId}/photos?lang` → `{ photos: [{ name, photoUri }] }`.
 *
 * Always uses the dedicated photos key (details call + each media call). The
 * returned `photoUri`s are keyless CDN URLs the frontend stores on the
 * Firestore `placeAPI` doc and hotlinks in `<img>` — end users never call the
 * worker for photos. No photos → `{ photos: [] }` (200).
 *
 * Quota: route 3 is pure photos-key traffic. When the photos budget is ≥ 90%
 * spent it returns `{ photos: [], limited: true }` WITHOUT calling Google (the
 * frontend shows "photos temporarily disabled"); a fully spent budget
 * hard-blocks with 429 places/quota-exceeded.
 * @param {URL} url
 * @param {string} placeId - Google Place ID.
 * @param {{config: ReturnType<typeof readEnv>, quota: ReturnType<typeof createQuotaTracker>}} opts
 * @returns {Promise<{photos: {name: string, photoUri: string}[], limited?: boolean}>}
 */
async function handlePhotos(url, placeId, { config, quota }) {
	const lang = parseLang(url);
	const state = await quota.check('photos');
	if (!config.photosEnabled || state.disabled || state.limited) {
		// Photos master switch off (PLACES_PHOTOS_ENABLED=false), key disabled
		// (budget 0), or nearly spent — no Google calls at all; tag so the
		// frontend can show "photos temporarily disabled" without breaking
		// the flow.
		return { photos: [], limited: true };
	}
	if (!state.allowed) {
		throw new QuotaExceededError();
	}
	const apiKey = config.placesPhotosApiKey;
	const raw = await getPlace(placeId, { apiKey, lang, photos: true });
	await quota.record('photos');
	const photos = [];
	for (const photo of (raw?.photos ?? []).slice(0, 1)) {
		if (typeof photo?.name !== 'string' || photo.name.length === 0) continue;
		const photoUri = await photoUriFor({ apiKey, photoName: photo.name });
		await quota.record('photos');
		photos.push({ name: photo.name, photoUri });
	}
	return { photos };
}

/**
 * Route 5: `GET /places/kml?mid&lid` → raw KML for a Google My Maps map.
 *
 * Proxies Google's My Maps KML export (`forcekml=1`) server-side — Google
 * sends no CORS headers on that endpoint, so the browser can't fetch it
 * directly. NOT a Places API call (no Google key, no quota tracking), but
 * still gated by the same auth/permission/rate-limit chain.
 * @param {URL} url
 * @param {string|undefined} _placeId
 * @param {{corsHeaders: Record<string, string>|null}} opts
 * @returns {Promise<Response>}
 */
async function handleKml(url, _placeId, { corsHeaders }) {
	const mid = url.searchParams.get('mid');
	if (!mid || !mid.trim()) {
		throw new BadRequestError('places/missing-mid', 'Missing required query parameter: mid');
	}
	const lid = (url.searchParams.get('lid') ?? '').trim();
	const kml = await fetchMyMapsKml(mid.trim(), lid);
	return new Response(kml, {
		status: 200,
		headers: {
			'Content-Type': 'application/vnd.google-earth.kml+xml; charset=utf-8',
			'Cache-Control': 'no-store',
			...(corsHeaders ?? {}),
		},
	});
}

const MYMAPS_KML_BASE = 'https://www.google.com/maps/d/kml';

/**
 * Hard cap on a single Google KML fetch. Google's My Maps KML endpoint can
 * hang indefinitely for private/slow maps, and workerd has no default fetch
 * timeout — without this a stuck map blocks the isolate and the frontend
 * spins on "Fetching your My Maps map..." forever. On timeout the worker
 * returns a clean 504 and the frontend falls back to the upload path.
 */
const MYMAPS_FETCH_TIMEOUT_MS = 15_000;

/**
 * Fetch a My Maps KML, following multi-layer `<NetworkLink>`s when present.
 * @param {string} mid - My Maps map id.
 * @param {string} lid - Optional layer id (skips the NetworkLink pass).
 * @returns {Promise<string>}
 */
async function fetchMyMapsKml(mid, lid) {
	if (lid) {
		return await fetchKmlUrl(buildKmlUrl(mid, lid));
	}
	const first = await fetchKmlUrl(buildKmlUrl(mid));
	if (!/<NetworkLink\b/i.test(first)) return first;
	return expandNetworkLinks(first);
}

/**
 * @param {string} mid
 * @param {string} [lid]
 * @returns {string}
 */
function buildKmlUrl(mid, lid = '') {
	const params = new URLSearchParams({ mid, forcekml: '1' });
	if (lid) params.set('lid', lid);
	return `${MYMAPS_KML_BASE}?${params.toString()}`;
}

/**
 * Server-side fetch of a Google KML URL (no CORS constraints on the worker).
 * @param {string} url
 * @returns {Promise<string>}
 */
async function fetchKmlUrl(url) {
	const signal = AbortSignal.timeout(MYMAPS_FETCH_TIMEOUT_MS);
	let res;
	try {
		res = await fetch(url, { signal });
		if (res.status === 404) {
			throw new NotFoundError('My Maps map not found or not publicly shared');
		}
		if (!res.ok) {
			throw new UpstreamError(
				res.status >= 500 ? 503 : 502,
				`Google My Maps KML fetch failed (HTTP ${res.status})`,
			);
		}
		return await res.text();
	} catch (error) {
		// Re-throw errors we intentionally raised (404 / non-ok upstream).
		if (error instanceof ApiError) throw error;
		// Timeout (AbortSignal.timeout) or network error → clean 502/504 so the
		// frontend can fall back to the upload path instead of hanging forever.
		const timedOut = error?.name === 'TimeoutError' || error?.name === 'AbortError';
		throw new UpstreamError(
			timedOut ? 504 : 502,
			timedOut
				? 'Google My Maps KML fetch timed out'
				: `Google My Maps KML fetch failed: ${error?.message ?? 'network error'}`,
		);
	}
}

/**
 * Multi-layer maps return a `<NetworkLink>` per layer. Fetch each layer's KML
 * and merge its placemarks, wrapping each layer in a `<Folder name=…>` so the
 * layer name is preserved for downstream category mapping.
 * @param {string} firstKml - The initial `mid`-only KML (contains NetworkLinks).
 * @returns {Promise<string>}
 */
async function expandNetworkLinks(firstKml) {
	const links = extractNetworkLinks(firstKml);
	if (links.length === 0) return firstKml;

	const folders = [];
	for (const link of links) {
		if (!link.href) continue;
		const layerKml = await fetchKmlUrl(link.href);
		const placemarks = extractPlacemarks(layerKml);
		const name = escapeXml(link.name || `Layer ${folders.length + 1}`);
		folders.push(`<Folder><name>${name}</name>${placemarks.join('')}</Folder>`);
	}

	return (
		'<?xml version="1.0" encoding="UTF-8"?>\n' +
		'<kml xmlns="http://www.opengis.net/kml/2.2">\n' +
		'<Document>' +
		folders.join('') +
		'</Document>\n' +
		'</kml>'
	);
}

/**
 * Extract `{ name, href }` pairs from `<NetworkLink>` blocks.
 * @param {string} kml
 * @returns {{name: string, href: string}[]}
 */
function extractNetworkLinks(kml) {
	const links = [];
	const blockRegex = /<NetworkLink\b[\s\S]*?<\/NetworkLink>/gi;
	const nameRegex = /<name>([\s\S]*?)<\/name>/i;
	const hrefRegex = /<href>([\s\S]*?)<\/href>/i;
	let block;
	while ((block = blockRegex.exec(kml)) !== null) {
		const hrefMatch = hrefRegex.exec(block[0]);
		if (!hrefMatch?.[1]) continue;
		const nameMatch = nameRegex.exec(block[0]);
		links.push({
			name: nameMatch?.[1] ? decodeXmlEntities(nameMatch[1].trim()) : '',
			href: hrefMatch[1].trim(),
		});
	}
	return links;
}

/**
 * @param {string} kml
 * @returns {string[]}
 */
function extractPlacemarks(kml) {
	return kml.match(/<Placemark\b[\s\S]*?<\/Placemark>/gi) ?? [];
}

/**
 * @param {string} text
 * @returns {string}
 */
function decodeXmlEntities(text) {
	return text
		.replace(/&amp;/g, '&')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&quot;/g, '"')
		.replace(/&apos;/g, "'")
		.replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
		.replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)));
}

/**
 * @param {string} text
 * @returns {string}
 */
function escapeXml(text) {
	return text
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&apos;');
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

/**
 * Parse the optional Text Search location bias (route 1): `biasLat`,
 * `biasLng`, `biasRadius` (meters, default 5000). Both coordinates are
 * required together and must be finite; a malformed pair → 400. Returns
 * `null` when no bias params are present.
 * @param {URL} url
 * @returns {{latitude: number, longitude: number, radius: number}|null}
 */
export function parseBias(url) {
	const latRaw = url.searchParams.get('biasLat');
	const lngRaw = url.searchParams.get('biasLng');
	if (latRaw === null && lngRaw === null) return null;
	if (latRaw === null || lngRaw === null) {
		throw new BadRequestError(
			'places/invalid-bias',
			'biasLat and biasLng must be provided together',
		);
	}
	const latitude = Number(latRaw);
	const longitude = Number(lngRaw);
	if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
		throw new BadRequestError('places/invalid-bias', 'biasLat and biasLng must be valid numbers');
	}
	const radiusRaw = url.searchParams.get('biasRadius');
	let radius = 5000;
	if (radiusRaw !== null) {
		radius = Number(radiusRaw);
		if (!Number.isFinite(radius) || radius <= 0) {
			throw new BadRequestError('places/invalid-bias', 'biasRadius must be a positive number');
		}
	}
	return { latitude, longitude, radius };
}
