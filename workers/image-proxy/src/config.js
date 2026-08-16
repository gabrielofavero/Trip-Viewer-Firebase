/**
 * config.js — environment + origin→mode detection for the TripViewer Image Proxy.
 *
 * Mirrors workers/places-api/src/config.js: the worker serves local / dev / prd
 * from ONE deployed route, and the environment is derived server-side from the
 * request Origin header (a client `env` param is spoofable → auth bypass). The
 * Firebase ID token's `aud` claim then picks the exact project during
 * verification (see auth.js).
 */

/**
 * Firebase projects the worker verifies ID tokens against.
 * A dev token only verifies against `trip-viewer-dev`; a prd token only against
 * `trip-viewer-prd` (aud/iss checked by `firebase-auth-cloudflare-workers`).
 */
export const PROJECTS = ['trip-viewer-dev', 'trip-viewer-prd'];

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
 * Whether an Origin header is allowed to call the worker.
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
 * @param {Record<string, string|undefined>} env - The worker `env` bindings.
 * @returns {{emulatorHost: string}}
 */
export function readEnv(env) {
	const emulatorHost = env?.FIREBASE_AUTH_EMULATOR_HOST ?? '127.0.0.1:9099';
	return { emulatorHost };
}
