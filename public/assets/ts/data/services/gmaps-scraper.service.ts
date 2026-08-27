// ======= gmaps-scraper — Local route service =======
// Client for the local gmaps-scraper HTTP server (scripts/gmaps-scraper/
// server.mjs), started by `npm run dev`. The server runs the
// gosom/google-maps-scraper Docker container and returns places already
// normalized into the app's PlaceDetails shape, plus `sourceUrl` (canonical
// Maps link, used to re-scrape later) and `imageUrls` (scraper photo URLs).
//
// Like the Places API feature, this is HARD-GATED to local environments only:
// the route only exists on the dev machine. Every call throws a friendly,
// translatable error on deployed hosts.
//
// References:
// - scripts/gmaps-scraper/server.mjs (the route this wraps)
// - models/places-api.model.ts (PlaceDetails)
// - places/places-local-step.ts (per-item import) + places/places-bulk.ts (bulk)

import { getLanguagePackName, translate } from '../../i18n/translation.js';
import { trackGscraperCall } from './places-counter.js';

/** Local gmaps-scraper server (fixed route — see package.json `gmaps:server`). */
export const GMAPS_SCRAPER_URL = 'http://127.0.0.1:8788';

/**
 * A place returned by the local scraper route: the app's PlaceDetails shape
 * plus the extra fields only the scraper provides.
 */
export interface GmapsScrapeResult {
	/** Google Place ID, or '' when the scraper didn't return a real one. */
	id: string;
	name: string;
	/** The requested-language description (what the dialog preview shows). */
	description?: string;
	/** BOTH languages' raw descriptions ({ en, pt }) — the apply step writes both. */
	descriptions?: { en?: string; pt?: string };
	region?: string;
	website?: string;
	instagram?: string;
	/** e.g. "4" (rounded). */
	rating?: string;
	/** "$" | "$$" | "$$$" | "$$$$" | "-". */
	price?: string;
	emoji?: string;
	/** Google Maps URL (the scraper's canonical `link`, or built from cid). */
	map?: string;
	/** e.g. "OPERATIONAL" | "CLOSED_PERMANENTLY" | "CLOSED_TEMPORARILY". */
	businessStatus?: string;
	/** Canonical Maps link used to re-scrape this place later (refresh). */
	sourceUrl: string;
	/** Direct photo URLs extracted by the scraper (thumbnail + images[]). */
	imageUrls: string[];
}

/** Response envelope from the local scraper route. */
interface GmapsScrapeResponse {
	places: GmapsScrapeResult[];
}

/** True when running on a local dev host (localhost / 127.0.0.1 / [::1]). */
export function isLocalEnv(): boolean {
	const hostname = window?.location?.hostname || '';
	return new Set(['localhost', '127.0.0.1', '[::1]']).has(hostname);
}

/** HARD CHECK — the gmaps-scraper import is local-only (the route only exists there). */
export const GMAPS_SCRAPER_ENABLED = isLocalEnv();

/** Error thrown for a non-OK response, carrying the server's error code. */
export class GmapsScraperError extends Error {
	constructor(
		public readonly code: string,
		message: string,
	) {
		super(message);
		this.name = 'GmapsScraperError';
	}
}

/**
 * Build a Google Maps search URL that the local scraper can actually resolve.
 * Searches by `name`; when lat/lng are given, appends the `@lat,lng,zoom` map
 * center so the results are biased toward that point. The scraper extracts the
 * TOP search result, so this center bias is what disambiguates chains (e.g.
 * `Dunkin'` ×8) and coordinate-only My Maps pins. Used by the My Maps
 * enrichment (mymaps-kml.service.ts resolveViaScraper), the My Maps import's
 * persisted `sourceUrl`, and the bulk local path's coordinate-link rewrite
 * (places/places-bulk.ts).
 */
export function buildMapsSearchUrl(
	name: string,
	coords?: { lat: number; lng: number },
): string {
	const encoded = encodeURIComponent((name ?? '').trim());
	if (coords && Number.isFinite(coords.lat) && Number.isFinite(coords.lng)) {
		return `https://www.google.com/maps/search/${encoded}@${coords.lat},${coords.lng},15z`;
	}
	return `https://www.google.com/maps/search/${encoded}`;
}

/**
 * Detect a My Maps coordinate-only search link
 * (`https://www.google.com/maps/search/?api=1&query=<lat>,<lng>`) and return
 * its coordinates, or null when the URL isn't that shape (or carries a real
 * query like a place name). The local scraper can't extract a business from a
 * bare coordinate pin, so callers rewrite it to a name search via
 * `buildMapsSearchUrl` instead.
 */
export function parseCoordinateSearchUrl(
	url: string,
): { lat: number; lng: number } | null {
	let parsed: URL;
	try {
		parsed = new URL(url);
	} catch {
		return null;
	}
	const path = parsed.pathname.replace(/\/+$/, '');
	if (path !== '/maps/search') return null;
	const query = (parsed.searchParams.get('query') ?? '').trim();
	const match = /^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/.exec(query);
	if (!match) return null;
	const lat = Number(match[1]);
	const lng = Number(match[2]);
	if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
	return { lat, lng };
}

/** Guard — throw a friendly error on any deployed host. */
function assertLocalOnly(): void {
	if (!GMAPS_SCRAPER_ENABLED) {
		throw new Error(translate('placesApi.errors.localOnly'));
	}
}

/**
 * Scrape one or more Google Maps URLs in a single request and return the
 * normalized places (one per URL, in order). Callers should surface failures
 * via displayError()/renderError() — the dialog-local step shows the message
 * inline so the user can retry.
 *
 * @param urls Google Maps place URLs (validated by the caller via
 *             ui/fields.ts isValidMapLink before calling).
 * @param options.lang active language pack; signal to cancel.
 */
export async function scrapePlaces(
	urls: string[],
	options: { lang?: string; signal?: AbortSignal } = {},
): Promise<GmapsScrapeResult[]> {
	assertLocalOnly(); // HARD CHECK — local environments only
	const lang = options.lang ?? getLanguagePackName();

	// Dev-mode call tracking (mirrors the Firestore counter — dev.places).
	trackGscraperCall({ urls });

	let response: Response;
	try {
		const headers = new Headers({ 'Content-Type': 'application/json' });
		response = await fetch(`${GMAPS_SCRAPER_URL}/scrape`, {
			method: 'POST',
			headers,
			body: JSON.stringify({ urls, lang }),
			signal: options.signal,
		});
	} catch (error) {
		if ((error as Error)?.name === 'AbortError') throw error;
		// Server not running (npm run dev without the gmaps process / no Docker).
		throw new Error(translate('placesApi.errors.scraperUnavailable'));
	}

	if (!response.ok) {
		let code = '';
		let message = '';
		try {
			const body = (await response.json()) as { error?: { code?: string; message?: string } };
			code = body?.error?.code ?? '';
			message = body?.error?.message ?? '';
		} catch {
			// Non-JSON error body — fall through.
		}
		if (code === 'gmaps/invalid-url') {
			throw new GmapsScraperError(code, translate('placesApi.errors.invalidMapLink'));
		}
		throw new GmapsScraperError(code, message || translate('placesApi.errors.scraperFailed'));
	}

	const body = (await response.json()) as GmapsScrapeResponse;
	return body.places ?? [];
}
