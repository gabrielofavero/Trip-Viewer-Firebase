/**
 * config.js — environment + origin→mode detection for the TripViewer Places worker.
 *
 * The worker serves local / dev / prd from ONE deployed route. The environment is
 * NEVER chosen by the client (a client `env` param is spoofable → auth bypass).
 * Instead it is derived server-side from the request Origin header (see backend
 * contract §6.5). The Firebase ID token's `aud` claim then picks the exact project
 * during verification (see auth.js, P2).
 */

/**
 * Firebase project the worker verifies ID tokens against (single project:
 * `trip-viewer-prd`). The Firebase ID token's `aud` claim picks the project
 * during verification (see auth.js, P2).
 */
export const PROJECTS = ['trip-viewer-prd'];

/**
 * Deployed hosts allowed to call the API. Local (`localhost` / `127.0.0.1`, any
 * port) is handled separately by getMode()/isAllowedOrigin().
 */
export const ALLOWED_ORIGINS = [
	'trip-viewer-prd.firebaseapp.com',
];

/**
 * App language code → Google Places API languageCode.
 */
export const LANG_MAP = {
	en: 'en',
	pt: 'pt-BR',
};

/**
 * Map an Origin header to the worker mode.
 * @param {string|null|undefined} origin - The request Origin header.
 * @returns {'local'|'dev'|'prd'|null} null when the origin is unknown/missing.
 */
export function getMode(origin) {
	const host = parseHost(origin);
	if (host === 'localhost' || host === '127.0.0.1') return 'local';
	if (host === 'trip-viewer-prd.firebaseapp.com') return 'prd';
	return null;
}

/**
 * Whether an Origin header is allowed to call the API.
 * Local is allowed when the host is localhost / 127.0.0.1 (any port).
 * @param {string|null|undefined} origin
 * @returns {boolean}
 */
export function isAllowedOrigin(origin) {
	return getMode(origin) !== null;
}

/**
 * Parse the hostname out of an Origin header (e.g. `https://host:port` → `host`).
 * @param {string|null|undefined} origin
 * @returns {string|null}
 */
function parseHost(origin) {
	if (!origin) return null;
	try {
		return new URL(origin).hostname;
	} catch {
		// Not a valid URL — treat as unknown origin.
		return null;
	}
}

/**
 * Read + validate worker env.
 *
 * Returns a validated config object. Throws when `placesApiKey` or
 * `placesPhotosApiKey` are missing in non-mock use (i.e. unless
 * `PLACES_API_MOCK` is truthy, which lets you smoke-test the auth/permission
 * gates locally before wiring real Google keys — mirrors the frontend's
 * `PLACES_API_MOCK`).
 *
 * Two Google keys (user decision 2026-08-09):
 *   - `PLACES_API_KEY`        — main key (FREE / trial); used when `photos=false`.
 *   - `PLACES_PHOTOS_API_KEY` — dedicated photos key (REAL / paid); used for any
 *     request that touches photos (`photos=true` on routes 1/2 and route 3 incl.
 *     the media endpoint). The `photos` param picks the key via `apiKeyFor()`.
 *
 * Quota / budget protection (quota.js): the worker self-accounts monthly calls
 * per key. Budgets are env-configurable (see `PLACES_MAIN_BUDGET` /
 * `PLACES_PHOTOS_BUDGET` / `PLACES_QUOTA_DEGRADE_RATIO`) — set `PLACES_PHOTOS_BUDGET`
 * to the real key's monthly limit so the worker can stop before charges accrue.
 *
 * Note: `PHOTO_URL_SECRET` was dropped (photoUri strategy — no HMAC/byte proxy
 * in v1; see docs/implementation-plans/20260809-places-api-worker-build-prompts.md §Deviation).
 *
 * @param {Record<string, string|undefined>} env - The worker `env` bindings.
 * @returns {{placesApiKey: string, placesPhotosApiKey: string, allowedUidsJson: string, emulatorHost: string, isMock: boolean, photosEnabled: boolean, budgets: {main: number, photos: number}, quotaDegradeRatio: number}}
 */
export function readEnv(env) {
	const isMock = Boolean(env?.PLACES_API_MOCK);
	const placesApiKey = env?.PLACES_API_KEY ?? '';
	const placesPhotosApiKey = env?.PLACES_PHOTOS_API_KEY ?? '';
	const allowedUidsJson = env?.ALLOWED_UIDS_JSON ?? '';
	const emulatorHost = env?.FIREBASE_AUTH_EMULATOR_HOST ?? '127.0.0.1:9099';

	// PHOTOS MASTER SWITCH — `PLACES_PHOTOS_ENABLED=false` disables ALL photo
	// API usage (routes 1/2 never request photos, route 3 returns `[]`), so the
	// paid photos key is never called regardless of budget. Default `true`.
	// Easiest toggle: a plain variable in the Cloudflare dashboard (no
	// redeploy) or one line in `.dev.vars`. Effectively forces the same state
	// as `PLACES_PHOTOS_BUDGET=0`, but explicit and dashboard-editable.
	const photosEnabled = !['false', '0', 'no'].includes(
		String(env?.PLACES_PHOTOS_ENABLED ?? '').trim().toLowerCase(),
	);

	// Monthly call budgets per key. `0` DISABLES that key (never called); a
	// positive number is a monthly call cap (degraded at 90%, hard-blocked at
	// 100%).
	//
	// IMPORTANT — tier: the field mask requests Enterprise fields (rating,
	// priceLevel, priceRange, websiteUri) AND Atmosphere fields (reviewSummary,
	// editorialSummary — for the description), so every search/details request
	// is billed at the ENTERPRISE + ATMOSPHERE SKU. Its free allowance is only
	// 1,000 events/mo per SKU (Text Search E+A, Place Details E+A, and Place
	// Details Photos). Defaults are therefore main 1,000/mo and photos 1,000/mo
	// — the $0 cap. Raise only if your Google project truly allows more free.
	const budgets = {
		main: parseBudget(env?.PLACES_MAIN_BUDGET, 1_000),
		photos: parseBudget(env?.PLACES_PHOTOS_BUDGET, 1_000),
	};
	const degrade = parseFloat(env?.PLACES_QUOTA_DEGRADE_RATIO ?? '');
	const quotaDegradeRatio =
		Number.isFinite(degrade) && degrade > 0 && degrade < 1 ? degrade : 0.9;

	if (!isMock) {
		const missing = [];
		if (!placesApiKey) missing.push('PLACES_API_KEY');
		if (!placesPhotosApiKey) missing.push('PLACES_PHOTOS_API_KEY');
		if (missing.length > 0) {
			throw new Error(
				`[places-worker] missing required secret(s): ${missing.join(', ')} ` +
					`(set via .dev.vars locally or \`wrangler secret put\` in production). ` +
					`Set PLACES_API_MOCK=true to run without a Google key.`,
			);
		}
	}

	return {
		placesApiKey,
		placesPhotosApiKey,
		allowedUidsJson,
		emulatorHost,
		isMock,
		photosEnabled,
		budgets,
		quotaDegradeRatio,
	};
}

/**
 * Parse a budget env var: `0` stays `0` (DISABLED — never call this key); any
 * positive integer is used as the monthly cap; missing / non-numeric / negative
 * → `fallback`.
 * @param {string|undefined} raw
 * @param {number} fallback
 * @returns {number}
 */
function parseBudget(raw, fallback) {
	const n = Number.parseInt(raw ?? '', 10);
	if (Number.isNaN(n)) return fallback;
	return n >= 0 ? n : fallback;
}

/**
 * Pick the Google API key for a request based on the `photos` flag.
 * `photos=true` → the dedicated photos key (the request touches `photos` in the
 * field mask or the photo media endpoint); `photos=false` → the main key.
 *
 * @param {{placesApiKey: string, placesPhotosApiKey: string}} config - Result of `readEnv()`.
 * @param {boolean} photos - The request's `photos` param.
 * @returns {string}
 */
export function apiKeyFor(config, photos) {
	return photos ? config.placesPhotosApiKey : config.placesApiKey;
}
