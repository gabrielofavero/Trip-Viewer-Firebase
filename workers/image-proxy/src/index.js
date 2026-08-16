/**
 * index.js — TripViewer Image Proxy worker.
 *
 * Batch image downloader for the "Export as Static Web Page" complete-mode.
 * The browser sends ONE POST with EVERY image URL it needs; this worker
 * fetches them server-side (no CORS) and returns them ALL in a single
 * response. Fixes the 0-byte download bug: a browser `fetch(url, {mode:
 * 'no-cors'})` for a CORS-blocked host (trvl-media, brussels.be, …) yields an
 * OPAQUE response whose `.blob()` is always 0 bytes — the old fallback zipped
 * that empty file and rewrote the URL to it. Server-side fetching has no CORS
 * notion, so every URL resolves to its real bytes.
 *
 * Flow per request:
 *   CORS/preflight → origin check → method check (POST /)
 *     → auth (verifyBearer → verifyToken) → URL validation
 *     → fetch each URL (bounded concurrency) → binary envelope response
 *
 * Response (Content-Type: application/octet-stream):
 *   <JSON header UTF-8>\n<image bytes concatenated>
 *   header: { "images": [{url, contentType, size, offset}], "failed": [{url, reason}] }
 *   where `offset` is the byte offset relative to the byte AFTER the header's
 *   terminating '\n'. The client slices [bodyStart+offset, +size) → Blob.
 *
 * Why binary instead of base64-in-JSON: base64-encoding megabytes in the
 * worker is CPU-bound and would blow the FREE-tier 10ms CPU limit; concatenating
 * raw buffers is mostly memcpy (cheap). The client parses the tiny JSON header
 * and slices bytes — same data, far less worker CPU.
 */
import { getMode, isAllowedOrigin, readEnv } from './config.js';
import { verifyBearer, verifyToken } from './auth.js';
import {
	ApiError,
	BadRequestError,
	PermissionError,
	jsonResponse,
	toEnvelope,
	toStatus,
} from './errors.js';

// ---------------------------------------------------------------------------
// Limits (protect the worker from abuse + the free-tier CPU/subrequest caps)
// ---------------------------------------------------------------------------

/** Max image URLs per request (free plan allows 50 subrequests; cap well under). */
const MAX_URLS = 40;
/** Max concurrent outbound fetches (keeps peak memory + subrequests bounded). */
const CONCURRENCY = 10;
/** Soft cap on a single image (bytes) — skip anything larger. */
const MAX_IMAGE_BYTES = 25 * 1024 * 1024;
/** Hard cap on the total response body — Cloudflare free response limit is 100MB. */
const MAX_TOTAL_BYTES = 90 * 1024 * 1024;

/** Hostnames that are never fetchable (SSRF hygiene: metadata + loopback). */
const BLOCKED_HOSTS = new Set([
	'localhost',
	'127.0.0.1',
	'0.0.0.0',
	'[::1]',
	'::1',
	'metadata.google.internal',
	'169.254.169.254',
]);

/**
 * Validate a candidate image URL: must be http(s) and not a blocked host.
 * @param {string} raw
 * @returns {{ok: true, url: URL}|{ok: false, reason: string}}
 */
function validateUrl(raw) {
	if (typeof raw !== 'string' || raw.length === 0 || raw.length > 2048) {
		return { ok: false, reason: 'invalid_url' };
	}
	let url;
	try {
		url = new URL(raw);
	} catch {
		return { ok: false, reason: 'invalid_url' };
	}
	if (url.protocol !== 'http:' && url.protocol !== 'https:') {
		return { ok: false, reason: 'unsupported_protocol' };
	}
	if (BLOCKED_HOSTS.has(url.hostname.toLowerCase())) {
		return { ok: false, reason: 'blocked_host' };
	}
	return { ok: true, url };
}

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
		'Access-Control-Allow-Methods': 'POST, OPTIONS',
		'Access-Control-Allow-Headers': 'Authorization, Content-Type',
		'Vary': 'Origin',
	};
}

/**
 * Fetch one image and return its bytes, or a failure reason.
 * @param {string} rawUrl
 * @param {number} timeoutMs
 * @returns {Promise<{ok: true, url: string, bytes: Uint8Array, contentType: string}|{ok: false, url: string, reason: string}>}
 */
async function fetchOne(rawUrl, timeoutMs) {
	const check = validateUrl(rawUrl);
	if (!check.ok) return { ok: false, url: rawUrl, reason: check.reason };

	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), timeoutMs);
	try {
		const res = await fetch(check.url.toString(), {
			signal: controller.signal,
			redirect: 'follow',
		});
		if (!res.ok) return { ok: false, url: rawUrl, reason: `http_${res.status}` };

		const buffer = await res.arrayBuffer();
		if (buffer.byteLength === 0) return { ok: false, url: rawUrl, reason: 'empty_body' };
		if (buffer.byteLength > MAX_IMAGE_BYTES) {
			return { ok: false, url: rawUrl, reason: 'too_large' };
		}

		const contentType = res.headers.get('Content-Type') || 'application/octet-stream';
		return {
			ok: true,
			url: rawUrl,
			bytes: new Uint8Array(buffer),
			contentType,
		};
	} catch {
		return { ok: false, url: rawUrl, reason: 'fetch_failed' };
	} finally {
		clearTimeout(timer);
	}
}

/**
 * Run `fn` over `items` with bounded concurrency, preserving input order.
 * @template T, R
 * @param {T[]} items
 * @param {(item: T) => Promise<R>} fn
 * @param {number} concurrency
 * @returns {Promise<R[]>}
 */
async function mapWithConcurrency(items, fn, concurrency) {
	const results = new Array(items.length);
	let nextIndex = 0;

	async function worker() {
		while (nextIndex < items.length) {
			const index = nextIndex++;
			results[index] = await fn(items[index]);
		}
	}

	const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => worker());
	await Promise.all(workers);
	return results;
}

/**
 * Build the binary envelope response: JSON header line + concatenated images.
 * @param {{url: string, bytes: Uint8Array, contentType: string}[]} images
 * @param {{url: string, reason: string}[]} failed
 * @param {Record<string, string>} corsHeaders
 * @returns {Response}
 */
function buildEnvelopeResponse(images, failed, corsHeaders) {
	const headerImages = [];
	const bodyChunks = [];
	let bodyBytes = 0;
	let offset = 0;

	for (const img of images) {
		headerImages.push({
			url: img.url,
			contentType: img.contentType,
			size: img.bytes.byteLength,
			offset,
		});
		bodyChunks.push(img.bytes);
		bodyBytes += img.bytes.byteLength;
		offset += img.bytes.byteLength;
	}

	const headerBytes = new TextEncoder().encode(
		JSON.stringify({ images: headerImages, failed }),
	);
	const total = headerBytes.byteLength + 1 + bodyBytes;
	const out = new Uint8Array(total);
	out.set(headerBytes, 0);
	out[headerBytes.byteLength] = 0x0a; // '\n' separates header from body

	let cursor = headerBytes.byteLength + 1;
	for (const chunk of bodyChunks) {
		out.set(chunk, cursor);
		cursor += chunk.byteLength;
	}

	return new Response(out, {
		status: 200,
		headers: {
			'Content-Type': 'application/octet-stream',
			'X-Image-Proxy-Images': String(images.length),
			'X-Image-Proxy-Failed': String(failed.length),
			...(corsHeaders ?? {}),
		},
	});
}

/**
 * Handle the POST — the only route.
 * @param {Request} request
 * @param {Record<string, string|undefined>} env
 * @param {Record<string, string>} corsHeaders
 * @returns {Promise<Response>}
 */
async function handleBatch(request, env, corsHeaders) {
	const origin = request.headers.get('Origin');
	const mode = getMode(origin); // non-null: guaranteed by buildCorsHeaders
	const { emulatorHost } = readEnv(env);

	// Auth: every request must carry a valid Firebase ID token (identifies the
	// logged-in owner). Not UID-allowlisted — any authenticated TripViewer user
	// may export their own trip's images.
	const token = verifyBearer(request.headers.get('Authorization'));
	await verifyToken(token, { mode, emulatorHost });

	// Body: { urls: string[] }.
	let body;
	try {
		body = await request.json();
	} catch {
		throw new BadRequestError('image-proxy/invalid-body', 'Expected JSON body');
	}
	const urls = Array.isArray(body?.urls) ? body.urls : null;
	if (!urls || urls.length === 0) {
		throw new BadRequestError('image-proxy/no-urls', 'Expected { urls: string[] }');
	}
	if (urls.length > MAX_URLS) {
		throw new BadRequestError(
			'image-proxy/too-many-urls',
			`Too many URLs (max ${MAX_URLS} per request)`,
		);
	}

	// Fetch all URLs with bounded concurrency, preserving order.
	const results = await mapWithConcurrency(urls, (u) => fetchOne(u, 30_000), CONCURRENCY);

	// Assemble successes (respecting the total response cap) + failures.
	const images = [];
	const failed = [];
	let totalBytes = 0;
	for (const r of results) {
		if (r.ok) {
			if (totalBytes + r.bytes.byteLength > MAX_TOTAL_BYTES) {
				failed.push({ url: r.url, reason: 'total_too_large' });
			} else {
				images.push(r);
				totalBytes += r.bytes.byteLength;
			}
		} else {
			failed.push({ url: r.url, reason: r.reason });
		}
	}

	return buildEnvelopeResponse(images, failed, corsHeaders);
}

export default {
	/**
	 * Worker entry.
	 * @param {Request} request
	 * @param {Record<string, string|undefined>} env
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
			if (request.method !== 'POST' || url.pathname !== '/') {
				throw new ApiError(405, 'image-proxy/method-not-allowed', 'Method not allowed');
			}
			return await handleBatch(request, env, corsHeaders);
		} catch (err) {
			// Every thrown error → envelope + status.
			return jsonResponse(toStatus(err), toEnvelope(err), corsHeaders);
		}
	},
};
