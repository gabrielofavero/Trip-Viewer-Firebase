// ======= Places API (New) — TypeScript Interfaces =======
// Data shapes returned by the Google Places API (New) Cloudflare routes.
// The backend is not built yet — the client sends the Firebase ID token
// (Authorization header) + `lang` + `photos`, and all validation lives
// server-side. These types are shared by the edit-destination page (per-item
// dialog) and the bulk "Update with Maps" flow.
//
// References:
// - docs/implementation-plans/20260812-places-api-edit-destination.md (§3)
// - data/services/places-api.service.ts (fetch wrapper + MOCK fixtures)

/** Google Places "business status" values (subset the app cares about). */
export type PlaceBusinessStatus =
	| 'OPERATIONAL'
	| 'CLOSED_PERMANENTLY'
	| 'CLOSED_TEMPORARILY'
	| string;

/** A photo reference returned by the search/details routes. Route 3 consumes these. */
export interface PlacePhotoRef {
	/** Photo reference id (name). */
	name: string;
}

/** A place returned by the search route (route 1) and details route (route 2). */
export interface PlaceSearchResult {
	/** Google Place ID. */
	id: string;
	name: string;
	/** Localized — only present in the requested language. */
	description?: string;
	/**
	 * BOTH languages' descriptions (gmaps scraper import only; Places API
	 * results leave it unset). `description` above is the active-language text
	 * the dialog shows; this carries the raw en + pt texts so the apply step
	 * can write both into the entry's `description` object.
	 */
	descriptions?: { en?: string; pt?: string };
	region?: string;
	website?: string;
	instagram?: string;
	/** e.g. "4" (rounded, like the python script). */
	rating?: string;
	/**
	 * A `$`-band ("$" | "$$" | "$$$" | "$$$$" | "-" | "default") OR — when the
	 * Places API returns a priceRange — the final display label built from the
	 * actual amounts, e.g. "$26 - $50" / "$100+" (see workers/places-api/src/normalize.js).
	 */
	price?: string;
	emoji?: string;
	/** googleMapsUri. */
	map?: string;
	/** Coordinates from Google's `location` (route 1; My Maps import nearest-pick). */
	location?: { lat: number; lng: number };
	/** e.g. "OPERATIONAL" | "CLOSED_PERMANENTLY" | "CLOSED_TEMPORARILY". */
	businessStatus?: string;
	/** Photo references (route 3 consumes these). */
	photos?: PlacePhotoRef[];
	/**
	 * Canonical Google Maps link to re-scrape this place locally (gmaps scraper
	 * import). Set by the local route only; Places API results leave it empty.
	 */
	sourceUrl?: string;
}

/** Route 2 response item: same shape as PlaceSearchResult, fully populated. */
export interface PlaceDetails extends PlaceSearchResult {}

/** Route 3 wire item (as returned by the worker) — a directly fetchable image. */
export interface PlacePhotoWire {
	/** Photo reference id. */
	name: string;
	/** Direct image URL (keyless CDN). */
	photoUri: string;
}

/** Route 3 response item — the app's internal shape (url aliases photoUri). */
export interface PlacePhoto {
	/** Photo reference id. */
	name: string;
	/** Direct image URL. */
	url: string;
}

// ============================================================
// Response envelopes
// ============================================================
// The Cloudflare routes return these wrapper objects; the service layer
// unwraps them so callers receive the plain data.

/** Route 1 response: { results: [...], limited? } */
export interface PlaceSearchResponse {
	results: PlaceSearchResult[];
	/** True when the worker degraded the request (monthly quota nearly reached — photos off). */
	limited?: boolean;
}

/** Route 2 response: { place: {...}, limited? } */
export interface PlaceDetailsResponse {
	place: PlaceDetails;
	/** True when the worker degraded the request (monthly quota nearly reached — photos off). */
	limited?: boolean;
}

/** Route 3 response: { photos: [...], limited? } */
export interface PlacePhotosResponse {
	photos: PlacePhotoWire[];
	/** True when the worker skipped photos (monthly quota nearly reached — no Google call). */
	limited?: boolean;
}
