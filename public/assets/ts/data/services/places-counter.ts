// ======= Places API + gmaps-scraper — dev call counter =======
// Tracks every Places API route call and gmaps-scraper scrape request on the
// current page. Mirrors data/firebase/counter.ts (the Firestore read/write
// counter) so the Places feature gets the same dev-mode observability.
//
// Exposed on `dev.places` in dev mode (localhost):
//   dev.places.stats         → { placesApi: [...], gscraper: [...] }  (all calls)
//   dev.places.placesApi     → per-route breakdown + photos true/false counts
//   dev.places.gscraper      → scrape count + what was scraped (the URLs)
//   dev.places.reset()       → reset counters to zero
//
// The services call the track*() functions on every real request:
//   - data/services/places-api.service.ts  (search / details / photos routes)
//   - data/services/gmaps-scraper.service.ts (/scrape route)

/** Places API route names (mirror the worker contract — docs/ai-analysis/7). */
export type PlacesApiRoute = 'search' | 'details' | 'photos';

/** A single Places API route call. */
export interface PlacesApiCall {
	route: PlacesApiRoute;
	/**
	 * Whether the request asked for photos. Only meaningful for 'search' and
	 * 'details' (the dedicated 'photos' route always returns photos — no flag
	 * is sent, so it never counts toward the photos true/false buckets).
	 */
	photos: boolean;
	/** Search query ('search') or Google place id ('details' | 'photos'). */
	subject: string;
}

/** A single gmaps-scraper scrape request (one request can batch many URLs). */
export interface GscraperCall {
	/** The Google Maps URLs scraped in this request. */
	urls: string[];
}

interface PlacesStats {
	placesApi: PlacesApiCall[];
	gscraper: GscraperCall[];
}

const stats: PlacesStats = {
	placesApi: [],
	gscraper: [],
};

/** Record a Places API route call (search / details / photos). */
export function trackPlacesApiCall(call: PlacesApiCall): void {
	stats.placesApi.push({ ...call });
}

/** Record a gmaps-scraper scrape request. */
export function trackGscraperCall(call: GscraperCall): void {
	stats.gscraper.push({ urls: [...call.urls] });
}

/** Reset both counters to zero. */
export function resetPlacesStats(): void {
	stats.placesApi = [];
	stats.gscraper = [];
}

/** Deep copy of the raw stats (every recorded call). */
export function getPlacesStats(): Readonly<PlacesStats> {
	return {
		placesApi: stats.placesApi.map((call) => ({ ...call })),
		gscraper: stats.gscraper.map((call) => ({ urls: [...call.urls] })),
	};
}
