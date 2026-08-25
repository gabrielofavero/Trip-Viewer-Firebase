/**
 * auth.js — Firebase ID-token verification for the TripViewer Image Proxy.
 *
 * Same approach as workers/places-api/src/auth.js: uses
 * `firebase-auth-cloudflare-workers` (zero-deps, Web-Standard-API only). One
 * `Auth` is created per project in `PROJECTS` (single project:
 * `trip-viewer-prd`); `verifyIdToken` checks the `aud`/`iss` claims.
 *
 * ⚠️ `Auth.getOrInitialize()` is a GLOBAL singleton in
 * `firebase-auth-cloudflare-workers@2.0.6` — construct `new Auth(projectId,
 * keyStore)` directly to get one verifier per project.
 *
 * In `local` mode we pass an `EmulatorEnv` so verification accepts the Firebase
 * Auth emulator's unsigned tokens; otherwise verification runs against Google's
 * public JWK set (cached in-memory via a KeyStorer — no KV binding).
 */
import { Auth } from 'firebase-auth-cloudflare-workers';
import { PROJECTS } from './config.js';
import { AuthError } from './errors.js';

/**
 * Minimal in-memory KeyStorer caching the Google public JWK set used to verify
 * ID tokens. `expirationTtl` is in seconds (KV semantics). No KV binding.
 */
class MemoryKeyStorer {
	constructor() {
		this.value = null;
		this.expiresAt = 0;
	}

	async get() {
		if (this.value === null || Date.now() >= this.expiresAt) {
			this.value = null;
			return null;
		}
		return this.value;
	}

	async put(value, expirationTtl) {
		this.value = value;
		this.expiresAt = Date.now() + expirationTtl * 1000;
	}
}

// Shared cache — the Google public-key endpoint is the same for every project.
const keyStore = new MemoryKeyStorer();

// One Auth (verifier) per project, bound to that project's `aud`/`iss`.
const authByProject = new Map();

function getAuth(projectId) {
	if (!authByProject.has(projectId)) {
		authByProject.set(projectId, new Auth(projectId, keyStore));
	}
	return authByProject.get(projectId);
}

/**
 * Parse a `Bearer <token>` Authorization header.
 * @param {string|null|undefined} authorizationHeader
 * @returns {string|null} the token, or `null` when absent/malformed.
 */
export function verifyBearer(authorizationHeader) {
	if (!authorizationHeader) return null;
	const match = /^Bearer\s+(.+)$/i.exec(authorizationHeader);
	return match ? match[1].trim() : null;
}

/**
 * Verify a Firebase ID token against every known project and return the
 * authenticated identity.
 *
 * @param {string|null|undefined} token - The raw ID token (from `verifyBearer`).
 * @param {{mode: 'local'|'dev'|'prd', emulatorHost?: string}} opts
 * @returns {Promise<{uid: string, aud: string}>}
 * @throws {AuthError} kind `missing` for an empty token; `invalid/expired` otherwise.
 */
export async function verifyToken(token, { mode, emulatorHost }) {
	if (!token) {
		throw new AuthError('missing');
	}

	// In local mode we verify against the Auth emulator (unsigned tokens).
	const env = mode === 'local' ? { FIREBASE_AUTH_EMULATOR_HOST: emulatorHost } : undefined;

	for (const projectId of PROJECTS) {
		const auth = getAuth(projectId);
		try {
			const claims = await auth.verifyIdToken(token, false, env);
			return { uid: claims.sub, aud: claims.aud };
		} catch {
			// Wrong project or invalid token — try the next one.
		}
	}

	throw new AuthError('invalid/expired');
}
