/**
 * permissions.js — allowed-UID gate for the TripViewer Places worker.
 *
 * The app's real permission source of truth is the Firestore doc
 * `admin/permissions/canUsePlacesAPI/{uid}` (existence = has permission; read
 * by `getPermissions()` in `data/firebase/database.ts`). Authentication alone
 * is NOT enough. In v1 the worker has no Firestore / service-account access and
 * very few users hold this permission, so this module gates on an ALLOWLIST
 * instead (backend contract §6.1).
 *
 * Granting access = Firestore doc AND an entry in `ALLOWED_UIDS_JSON`
 * (two-step; documented in the worker README). Keep `isUidAllowed` thin so a
 * direct Firestore check can replace it later without touching callers.
 */

// Allowlist committed for deploy. This is what the deployed worker uses when
// `ALLOWED_UIDS_JSON` is not set — REAL (production) users only. Local/dev
// users live in `.dev.vars` `ALLOWED_UIDS_JSON` instead (see worker README
// "Granting a user access"). Replace with the Firestore permission check later.
//
// Single allowed production user (2026-08-26): SihZPW7xcEek6DNOnHSbfQSD5Ru2.
const FALLBACK_ALLOWED_UIDS = new Set(['SihZPW7xcEek6DNOnHSbfQSD5Ru2']);

/**
 * Resolve the set of allowed UIDs: env `ALLOWED_UIDS_JSON` (a JSON array of
 * uids) when set, else the committed fallback allowlist. Malformed env JSON
 * falls back to the allowlist too.
 *
 * @param {Record<string, string|undefined>} env
 * @returns {Set<string>}
 */
export function getAllowedUids(env) {
	const raw = env?.ALLOWED_UIDS_JSON;
	if (raw) {
		try {
			const parsed = JSON.parse(raw);
			if (Array.isArray(parsed)) return new Set(parsed.map(String));
		} catch {
			// Malformed JSON — fall through to the fallback allowlist.
		}
	}
	return FALLBACK_ALLOWED_UIDS;
}

/**
 * Whether a verified Firebase `uid` may call the API.
 * @param {string|null|undefined} uid - From the verified ID token (`claims.sub`).
 * @param {Record<string, string|undefined>} env
 * @returns {Promise<boolean>}
 */
export async function isUidAllowed(uid, env) {
	if (!uid) return false;
	return getAllowedUids(env).has(String(uid));
}
