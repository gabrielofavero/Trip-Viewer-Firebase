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
 * Firebase projects the worker verifies ID tokens against.
 * A dev token only verifies against `trip-viewer-dev`; a prd token only against
 * `trip-viewer-prd` (aud/iss checked by `firebase-auth-cloudflare-workers`).
 */
export const PROJECTS = ['trip-viewer-dev', 'trip-viewer-prd'];

/**
 * Deployed hosts allowed to call the API. Local (`localhost` / `127.0.0.1`, any
 * port) is handled separately by getMode()/isAllowedOrigin().
 */
export const ALLOWED_ORIGINS = [
	'trip-viewer-dev.firebaseapp.com',
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
	if (host === 'trip-viewer-dev.firebaseapp.com') return 'dev';
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
 *   - `PLACES_API_KEY`        — main key; used when `photos=false`.
 *   - `PLACES_PHOTOS_API_KEY` — dedicated photos key; used for any request that
 *     touches photos (`photos=true` on routes 1/2 and route 3 incl. the media
 *     endpoint). The `photos` param picks the key via `apiKeyFor()`.
 *
 * Note: `PHOTO_URL_SECRET` was dropped (photoUri strategy — no HMAC/byte proxy
 * in v1; see docs/ai-analysis/8 §Deviation).
 *
 * @param {Record<string, string|undefined>} env - The worker `env` bindings.
 * @returns {{placesApiKey: string, placesPhotosApiKey: string, allowedUidsJson: string, emulatorHost: string, isMock: boolean}}
 */
export function readEnv(env) {
	const isMock = Boolean(env?.PLACES_API_MOCK);
	const placesApiKey = env?.PLACES_API_KEY ?? '';
	const placesPhotosApiKey = env?.PLACES_PHOTOS_API_KEY ?? '';
	const allowedUidsJson = env?.ALLOWED_UIDS_JSON ?? '';
	const emulatorHost = env?.FIREBASE_AUTH_EMULATOR_HOST ?? '127.0.0.1:9099';

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

	return { placesApiKey, placesPhotosApiKey, allowedUidsJson, emulatorHost, isMock };
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
