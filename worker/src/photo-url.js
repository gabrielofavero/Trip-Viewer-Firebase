/**
 * photo-url.js — resolve stable CDN photo URLs (photoUri strategy).
 *
 * Replaces the old HMAC sign/verify + byte-proxy design (contract §4.2/§4.3
 * adapted — see docs/implementation-plans/20260809-places-api-worker-build-prompts.md §Deviation). Google photo `name` refs
 * expire and can't be cached, so the worker resolves name → stable, keyless
 * CDN `photoUri` (`lh3.googleusercontent.com/…`) once at edit time; the
 * frontend stores `photoUri` on the Firestore `placeAPI` doc and end users
 * hotlink it directly (zero worker/Google calls per view).
 *
 * Contingency only (NOT built in v1): if `photoUri` ever proves unstable in
 * practice, re-add the old byte-proxy (`getPhotoBytes(photoName)` + short-lived
 * signed `url`s + route 4). Do not implement unless photoUris break.
 */

import { getPhotoUri } from './places.js';

/**
 * Thin wrapper around `places.getPhotoUri` — keeps the media-endpoint details
 * out of route code (P4). Caller passes the photos key.
 * @param {{apiKey: string, photoName: string, maxWidthPx?: number}} opts
 * @returns {Promise<string>} Stable CDN `photoUri`.
 */
export async function photoUriFor({ apiKey, photoName, maxWidthPx = 1600 } = {}) {
	return getPhotoUri(photoName, { apiKey, maxWidthPx });
}
