/**
 * errors.js — error envelope + status mapping for the TripViewer Image Proxy.
 *
 * Every thrown error is normalized into a consistent JSON envelope and mapped
 * to an HTTP status. The frontend only checks `response.ok`; the envelope
 * exists so the worker is debuggable and consistent.
 *
 * Status mapping (toStatus):
 *   AuthError       → 401
 *   PermissionError → 403 (bad origin)
 *   BadRequestError → 400 (invalid body / too many URLs / bad URL)
 *   anything else   → 500
 */

/** Base API error carrying an HTTP status + a machine-readable `image-proxy/*` code. */
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
		super(401, 'image-proxy/unauthorized', message ?? defaultMessage);
		this.name = 'AuthError';
		this.kind = kind;
	}
}

/** Disallowed Origin → 403. */
export class PermissionError extends ApiError {
	constructor(message = 'Forbidden') {
		super(403, 'image-proxy/forbidden', message);
		this.name = 'PermissionError';
	}
}

/** Invalid request body / URL → 400. */
export class BadRequestError extends ApiError {
	constructor(code, message) {
		super(400, code, message);
		this.name = 'BadRequestError';
	}
}

/**
 * Wrap any thrown value into the envelope `{ error: { code, message } }`.
 * @param {unknown} err
 * @returns {{error: {code: string, message: string}}}
 */
export function toEnvelope(err) {
	const code = err instanceof ApiError ? err.code : 'image-proxy/internal';
	const message = err?.message || 'Internal server error';
	return { error: { code, message } };
}

/**
 * Map any thrown value to an HTTP status.
 * @param {unknown} err
 * @returns {number}
 */
export function toStatus(err) {
	if (err instanceof ApiError) return err.status;
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
