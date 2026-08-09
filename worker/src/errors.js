/**
 * errors.js — error envelope + status mapping for the TripViewer Places worker.
 *
 * Every thrown error is normalized into a consistent JSON envelope (§10.1) and
 * mapped to an HTTP status (§10.2). The frontend only checks `response.ok`;
 * the envelope exists so the worker is debuggable and consistent.
 *
 * Status mapping (toStatus):
 *   AuthError       → 401
 *   PermissionError → 403 (no permission / bad origin)
 *   NotFoundError   → 404
 *   BadRequestError → 400 (bad `q` / `lang`)
 *   UpstreamError   → 429 (Google 429) / 502 / 503
 *   anything else   → 500
 */

/** Base API error carrying an HTTP status + a machine-readable `places/*` code. */
export class ApiError extends Error {
	constructor(status, code, message) {
		super(message);
		this.name = 'ApiError';
		this.status = status;
		this.code = code;
	}
}

/** Missing vs invalid/expired Firebase token → 401. */
export class AuthError extends ApiError {
	/**
	 * @param {'missing'|'invalid/expired'} kind - What went wrong.
	 * @param {string} [message] - Optional override; a default is derived from `kind`.
	 */
	constructor(kind = 'invalid/expired', message) {
		const defaultMessage =
			kind === 'missing' ? 'Missing bearer token' : 'Invalid or expired token';
		super(401, 'places/unauthorized', message ?? defaultMessage);
		this.name = 'AuthError';
		this.kind = kind;
	}
}

/** No `canUsePlacesAPI` permission, or disallowed Origin → 403. */
export class PermissionError extends ApiError {
	constructor(message = 'Forbidden') {
		super(403, 'places/forbidden', message);
		this.name = 'PermissionError';
	}
}

/** Missing/invalid `q` or invalid `lang` → 400. */
export class BadRequestError extends ApiError {
	constructor(code, message) {
		super(400, code, message);
		this.name = 'BadRequestError';
	}
}

/** Unknown `placeId` (routes 2/3) → 404. */
export class NotFoundError extends ApiError {
	constructor(message = 'Place not found') {
		super(404, 'places/not-found', message);
		this.name = 'NotFoundError';
	}
}

/** Upstream Google failure → 429 (Google 429) / 502 / 503. */
export class UpstreamError extends ApiError {
	constructor(status, message = 'Upstream service error') {
		super(status, 'places/upstream', message);
		this.name = 'UpstreamError';
	}
}

/**
 * Wrap any thrown value into the §10.1 envelope `{ error: { code, message } }`.
 * @param {unknown} err
 * @returns {{error: {code: string, message: string}}}
 */
export function toEnvelope(err) {
	const code = err instanceof ApiError ? err.code : 'places/internal';
	const message = err?.message || 'Internal server error';
	return { error: { code, message } };
}

/**
 * Map any thrown value to an HTTP status (§10.2).
 * @param {unknown} err
 * @returns {number}
 */
export function toStatus(err) {
	if (err instanceof ApiError) return err.status;
	// Raw Google 429 surfaced by an untyped error.
	if (err?.status === 429) return 429;
	return 500;
}

/**
 * Build a JSON `Response` with the given CORS headers.
 * @param {number} status
 * @param {unknown} body
 * @param {Record<string, string>} [corsHeaders]
 * @returns {Response}
 */
export function jsonResponse(status, body, corsHeaders) {
	return new Response(JSON.stringify(body), {
		status,
		headers: {
			'Content-Type': 'application/json',
			...(corsHeaders ?? {}),
		},
	});
}
