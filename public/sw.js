/**
 * sw.js — TripViewer image cache (service worker).
 *
 * Card images (destination / trip / listing) and people photos are external
 * media URLs (mostly OneDrive short links). Every load must traverse a redirect
 * chain that ends with a cache-busting `cb=<timestamp>` parameter, so the
 * browser can never reuse its HTTP cache and each refresh re-downloads the
 * images. This worker intercepts cross-origin image requests and serves them
 * cache-first, so a refresh costs nothing until the URL itself changes (the
 * app writes a new URL when the user replaces an image).
 *
 * Rules:
 *   - Only GET requests with `destination === 'image'` (covers <img> and CSS
 *     background-image, including the people avatars).
 *   - Only cross-origin http(s) URLs; local app assets already have immutable
 *     HTTP caching and are left untouched (HTML/JS/JSON are never cached here,
 *     so app updates and startup recovery keep working normally).
 *   - Cached entries are revalidated in the background after MAX_AGE_MS
 *     (mirrors OneDrive's own 30-day `max-age`), so an in-place edit of the
 *     same OneDrive file eventually shows up without blocking the render.
 *   - CROSS-ORIGIN IMAGES ARE OPAQUE RESPONSES: their status is 0 and their
 *     headers are unreadable. The bytes are still cacheable (the standard
 *     opaque-media pattern); these requests are always made in `no-cors` mode
 *     by the browser, so the worker cannot ask for CORS instead.
 *
 * Cache names are shared with public/assets/ts/app/media-cache.ts (the page
 * uses them for the "Clear Image Cache" action). Keep both files in sync.
 */

const IMAGE_CACHE = 'tripviewer-media-v1';
const META_CACHE = 'tripviewer-media-meta-v1';
const CACHE_PREFIX = 'tripviewer-media-';
const MAX_ENTRIES = 400;
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

self.addEventListener('install', () => {
	// No app-shell precache: activate the new worker immediately.
	self.skipWaiting();
});

self.addEventListener('activate', (event) => {
	event.waitUntil(
		(async () => {
			try {
				// Drop caches from older worker versions, then take over open tabs.
				const names = await caches.keys();
				await Promise.all(
					names
						.filter(
							(name) =>
								name.startsWith(CACHE_PREFIX) && name !== IMAGE_CACHE && name !== META_CACHE,
						)
						.map((name) => caches.delete(name)),
				);
			} catch {
				// Storage unavailable: activation still proceeds.
			}
			await self.clients.claim();
		})(),
	);
});

self.addEventListener('message', (event) => {
	const data = event.data;
	if (!data) return;
	if (data.type === 'CLEAR_IMAGE_CACHE') {
		event.waitUntil(clearAll());
	} else if (data.type === 'EVICT_IMAGE' && typeof data.url === 'string') {
		// The page saw the cached copy fail to decode (transient network error,
		// broken link): drop it so the next load tries the network again.
		event.waitUntil(evictOne(data.url));
	}
});

self.addEventListener('fetch', (event) => {
	const request = event.request;
	if (request.method !== 'GET' || request.destination !== 'image') return;

	let url;
	try {
		url = new URL(request.url);
	} catch {
		return;
	}
	if (url.protocol !== 'http:' && url.protocol !== 'https:') return;
	// Local assets are content-hashed and served with immutable HTTP caching.
	if (url.origin === self.location.origin) return;

	event.respondWith(respondWithImageCache(event));
});

/**
 * Cache-first response with stale-while-revalidate once a cached image is
 * older than MAX_AGE_MS.
 * @param {FetchEvent} event
 * @returns {Promise<Response>}
 */
async function respondWithImageCache(event) {
	const request = event.request;
	let cache;
	let meta;
	let cached;
	try {
		cache = await caches.open(IMAGE_CACHE);
		meta = await caches.open(META_CACHE);
		cached = await cache.match(request, { ignoreVary: true });
	} catch {
		// Storage unavailable (private mode, blocked quota, …): behave like no
		// service worker at all instead of breaking the image request.
		return fetch(request);
	}
	const cachedAt = await readCachedAt(meta, request.url);

	if (cached) {
		if (!cachedAt || Date.now() - cachedAt > MAX_AGE_MS) {
			// Answer from the cache right away; refresh the entry in background.
			event.waitUntil(refresh(request, cache, meta));
		}
		return cached;
	}

	const response = await fetch(request);
	if (isStorable(response)) {
		event.waitUntil(store(request, response.clone(), cache, meta));
	}
	return response;
}

/**
 * Re-fetch a URL and replace its cache entry (used for aging entries).
 * @param {Request} request
 * @param {Cache} cache
 * @param {Cache} meta
 */
async function refresh(request, cache, meta) {
	try {
		const response = await fetch(request);
		if (isStorable(response)) await store(request, response, cache, meta);
	} catch {
		// Offline: keep serving the cached copy until the next attempt.
	}
}

/**
 * Can this response be written to the Cache API?
 * @param {Response} response
 * @returns {boolean}
 */
function isStorable(response) {
	if (!response) return false;
	if (response.type === 'opaqueredirect') return false;
	// Opaque responses hide their status (always 0) but still hold the bytes.
	if (response.type === 'opaque') return true;
	return response.ok && response.status !== 206;
}

/**
 * Store an image response and its fetch timestamp, then bound the cache size.
 * @param {Request} request
 * @param {Response} response
 * @param {Cache} cache
 * @param {Cache} meta
 */
async function store(request, response, cache, meta) {
	try {
		await cache.put(request, response);
	} catch {
		// Quota exceeded or a response the Cache API refuses to store — the
		// image still renders, it just will not be reused next time.
		return;
	}
	try {
		await meta.put(new Request(request.url), new Response(String(Date.now())));
	} catch {
		// Timestamps are best-effort; a missing one only forces revalidation.
	}
	try {
		await prune(cache, meta);
	} catch {
		// Pruning is best-effort as well.
	}
}

/**
 * @param {Cache} meta
 * @param {string} url
 * @returns {Promise<number>} epoch ms of the last successful fetch, or 0.
 */
async function readCachedAt(meta, url) {
	try {
		const match = await meta.match(new Request(url), { ignoreVary: true });
		if (!match) return 0;
		const value = Number(await match.text());
		return Number.isFinite(value) ? value : 0;
	} catch {
		return 0;
	}
}

/**
 * Keep the cache bounded: `Cache.keys()` returns entries in insertion order,
 * so deleting the first N is FIFO eviction.
 * @param {Cache} cache
 * @param {Cache} meta
 */
async function prune(cache, meta) {
	const keys = await cache.keys();
	const overflow = keys.length - MAX_ENTRIES;
	if (overflow <= 0) return;
	for (const key of keys.slice(0, overflow)) {
		await cache.delete(key);
		try {
			await meta.delete(new Request(key.url));
		} catch {
			// Metadata cleanup is best-effort.
		}
	}
}

/**
 * Drop a single image (and its timestamp) from the cache.
 * @param {string} url
 */
async function evictOne(url) {
	try {
		const cache = await caches.open(IMAGE_CACHE);
		await cache.delete(new Request(url));
		const meta = await caches.open(META_CACHE);
		await meta.delete(new Request(url));
	} catch {
		// Storage unavailable — nothing cached to evict.
	}
}

/** Delete every image-cache entry (page-driven "Clear Image Cache"). */
async function clearAll() {
	try {
		const names = await caches.keys();
		await Promise.all(
			names.filter((name) => name.startsWith(CACHE_PREFIX)).map((name) => caches.delete(name)),
		);
	} catch {
		// Nothing else to do when storage is unavailable.
	}
}
