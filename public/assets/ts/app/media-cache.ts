// ======= Image Cache (service worker) =======
//
// Registers public/sw.js, the service worker that serves external card /
// people images cache-first (see the header comment in sw.js). Images live in
// OneDrive short links whose redirect chain busts the browser HTTP cache on
// every load, so refreshes re-download every card photo; the worker keeps the
// bytes until the URL changes (or an in-place OneDrive edit is revalidated).
//
// Registration is skipped in static-export mode: exported pages are
// self-contained and ship their own image handling.

import { isStaticMode } from '../static-mode/static-mode.js';

/** Cache names created by public/sw.js — keep both files in sync. */
const MEDIA_CACHE = 'tripviewer-media-v1';
const MEDIA_META_CACHE = 'tripviewer-media-meta-v1';
const MEDIA_CACHE_PREFIX = 'tripviewer-media-';
const SW_URL = '/sw.js';

let started = false;

/**
 * Register the image-cache service worker once per page load. Called at the
 * very start of the app bootstrap so the worker can take control before the
 * page images are requested; failures are non-fatal (private mode,
 * unsupported browser, HTTP origin, …).
 */
export function initMediaCache(): void {
	if (started || isStaticMode()) return;
	if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
	started = true;

	navigator.serviceWorker
		.register(SW_URL, { updateViaCache: 'none' })
		.catch((error) => console.warn('Image cache worker registration failed:', error));
}

/**
 * Drop one cached image so the next load retries it from the network. Called
 * when an <img> reports a load error — a cached response can go bad (transient
 * network error, broken link) and would otherwise stay broken until cleared.
 * @param url the image URL (the `<img>` src) that failed to load
 */
export function evictCachedImage(url: string): void {
	const controller = navigator.serviceWorker?.controller;
	if (!controller || !url) return;
	controller.postMessage({ type: 'EVICT_IMAGE', url });
}

/**
 * Delete every cached image (Settings → Advanced → Clear Image Cache). Used
 * when an image was replaced at the same OneDrive URL, which no URL-keyed
 * cache can detect.
 * @returns true when at least one cache was removed.
 */
export async function clearMediaCache(): Promise<boolean> {
	if (typeof caches === 'undefined') return false;
	try {
		const names = await caches.keys();
		const ours = names.filter(
			(name) =>
				name === MEDIA_CACHE || name === MEDIA_META_CACHE || name.startsWith(MEDIA_CACHE_PREFIX),
		);
		await Promise.all(ours.map((name) => caches.delete(name)));
		return ours.length > 0;
	} catch {
		return false;
	}
}
