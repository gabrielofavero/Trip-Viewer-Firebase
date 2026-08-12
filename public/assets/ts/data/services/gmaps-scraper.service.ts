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
