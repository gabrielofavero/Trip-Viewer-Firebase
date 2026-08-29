// ======= Places API (New) — Shared Apply / Compare Helpers =======
// Pure, unit-testable helpers shared by the per-item "Fetch Info With Maps"
// dialog (P9) and the bulk "Update with Maps" flow (P11/P12), so the apply and
// compare logic lives in exactly one place (no duplication).
//
// References:
// - docs/implementation-plans/20260812-places-api-edit-destination.md (§3, P3)
// - models/places-api.model.ts (PlaceDetails)
// - models/new-schema.ts (PlaceItem / PlaceAPI / PlaceDescription)

import { translate } from '../i18n/translation.js';
import type { PlaceAPI, PlaceDescription, PlaceItem } from '../models/schema.js';
import type { PlaceDetails } from '../models/places-api.model.js';

// ============================================================
// Field keys a place can override
// ============================================================
// `media`, `isNew`, `createdAt`, `images` are app-managed and never touched;
// `id` / `updatedAt` are placeAPI metadata, never copied onto the entry.

export const FIELD_KEYS = [
	'name',
	'website',
	'rating',
	'price',
	'description',
	'emoji',
	'map',
	'region',
	'instagram',
] as const;

/** A single overridable entry field. */
export type PlaceFieldKey = (typeof FIELD_KEYS)[number];

// ============================================================
// applyPlaceData — merge a fetched place into a destination entry
// ============================================================

export interface ApplyPlaceDataParams {
	/** The destination entry to update (mutated in place and returned). */
	entry: PlaceItem;
	/** Fetched place (route 2 — fully populated, requested language only). */
	newPlace: PlaceDetails;
	/** Subset of FIELD_KEYS the user marked "Update with this info". */
	fieldsToApply: readonly PlaceFieldKey[];
	/** Active language pack name ('en' | 'pt'). */
	lang: string;
	/** Optional overrides. */
	opts?: ApplyPlaceDataOptions;
}

export interface ApplyPlaceDataOptions {
	/** Timestamp recorded as placeAPI.updatedAt (defaults to now). */
	updatedAt?: string;
}

/**
 * Apply a fetched place to a destination entry.
 *
 * Persistence rule (spec §1.3): the fetched info is ALWAYS merged into
 * `entry.placeAPI` (spread + `updatedAt` + `id`); only the fields in
 * `fieldsToApply` also override the entry values.
 *
 * Primitive fields are copied only when the fetched value is a non-empty
 * string, so checking a field never wipes existing user data with an empty API
 * value. `description` is written to `entry.description[lang]` only — the route
 * returns the requested language only and the other language is preserved.
 *
 * Mutates and returns `entry` (convenient for the form + dot-path persistence).
 */
export function applyPlaceData(params: ApplyPlaceDataParams): PlaceItem {
	const { entry, newPlace, fieldsToApply, lang, opts } = params;
	const updatedAt = opts?.updatedAt ?? new Date().toISOString();

	// Always persist the fetched info into placeAPI.
	entry.placeAPI = mergePlaceAPI(entry.placeAPI, newPlace, updatedAt, lang);

	// Only the checked fields override the entry values.
	for (const field of fieldsToApply) {
		applyFieldToEntry(entry, field, newPlace, lang);
	}

	return entry;
}

/**
 * Resolve the multi-language description object from a fetched place.
 * The local gmaps scraper returns BOTH languages (`descriptions`) → both slots
 * are written. The Places API returns only the requested language
 * (`description`) → only that slot is refreshed, the other is preserved.
 */
function resolveDescription(
	previous: PlaceDescription,
	newPlace: PlaceDetails,
	lang: string,
): PlaceDescription {
	const both = newPlace.descriptions;
	if (both && (both.en || both.pt)) {
		return {
			en: both.en || previous.en || '',
			pt: both.pt || previous.pt || '',
		} as PlaceDescription;
	}
	if (typeof newPlace.description === 'string' && newPlace.description !== '') {
		return { ...previous, [lang]: newPlace.description } as PlaceDescription;
	}
	return previous;
}

/**
 * Build the persisted placeAPI object from a fetched place.
 * placeAPI always mirrors the latest fetched info (missing API values coalesce
 * to ''); `description` keeps its multi-language shape and only the requested
 * language is refreshed. The previous `closed` flag survives via the spread.
 */
export function mergePlaceAPI(
	previous: PlaceAPI | undefined,
	newPlace: PlaceDetails,
	updatedAt: string,
	lang: string,
): PlaceAPI {
	const previousDescription: PlaceDescription = previous?.description ?? { pt: '', en: '' };
	const description = resolveDescription(previousDescription, newPlace, lang);

	return {
		...previous,
		region: newPlace.region ?? '',
		name: newPlace.name ?? '',
		website: newPlace.website ?? '',
		rating: newPlace.rating ?? '',
		price: newPlace.price ?? '',
		description,
		emoji: newPlace.emoji ?? '',
		map: newPlace.map ?? '',
		updatedAt,
		instagram: newPlace.instagram ?? '',
		id: newPlace.id ?? '',
		// Local (gmaps scraper) imports carry a refresh link; keep any previous
		// one when a Places API refresh (which has no sourceUrl) overwrites it.
		sourceUrl: newPlace.sourceUrl ?? previous?.sourceUrl ?? '',
	};
}

/**
 * Copy a single fetched field onto the entry.
 * Returns the entry (for chaining). Object fields (`description`) keep their
 * multi-language shape; primitive fields are copied only when non-empty.
 */
export function applyFieldToEntry(
	entry: PlaceItem,
	field: PlaceFieldKey,
	newPlace: PlaceDetails,
	lang: string,
): PlaceItem {
	if (field === 'description') {
		entry.description = resolveDescription(
			entry.description ?? { pt: '', en: '' },
			newPlace,
			lang,
		);
		return entry;
	}

	// `region` maps to the entry's `regions` array (migration 19) — append the
	// fetched region when it isn't already present, never wipe existing ones.
	if (field === 'region') {
		const value = newPlace.region;
		if (typeof value === 'string' && value !== '') {
			if (!Array.isArray(entry.regions)) entry.regions = [];
			if (!entry.regions.includes(value)) entry.regions.push(value);
		}
		return entry;
	}

	const value = newPlace[field];
	if (typeof value === 'string' && value !== '') {
		entry[field] = value;
	}
	return entry;
}

// ============================================================
// Comparison helpers (bulk "replace auto-filled only")
// ============================================================

/**
 * Whether an entry field is still "auto-filled" from a previous import, i.e.
 * the entry value is unchanged since the last Places API sync. Used by the
 * bulk "replace auto-filled only" strategy (P12).
 *
 * Note: object fields (`description`) compare by reference, so they are only
 * "auto-filled" when the exact same object is still in place — in practice this
 * returns false for descriptions, which is the safe default.
 */
export function isAutoFilled(
	entry: PlaceItem,
	oldPlaceAPI: PlaceAPI | undefined,
	field: PlaceFieldKey,
): boolean {
	// `region` is stored as the `regions` array on the entry; the placeAPI
	// still carries the single-string source value. Treat it as auto-filled
	// when the entry has exactly that one region.
	if (field === 'region') {
		const regions = Array.isArray(entry.regions) ? entry.regions : [];
		const oldRegion = oldPlaceAPI?.region;
		if (!oldRegion) return regions.length === 0;
		return regions.length === 1 && regions[0] === oldRegion;
	}
	return entry[field] === oldPlaceAPI?.[field];
}

// ============================================================
// Closed-place detection
// ============================================================

export interface ClosedState {
	/** Whether the place is PERMANENTLY closed (kept for back-compat callers). */
	closed: boolean;
	/** Raw businessStatus from the API ('' | OPERATIONAL | CLOSED_TEMPORARILY | CLOSED_PERMANENTLY). */
	status: string;
	/** Tri-state classification (plan P4): operational / temporarily closed / permanently closed. */
	kind: 'operational' | 'temporarilyClosed' | 'permanentlyClosed';
}

/**
 * Classify a fetched place's business status into a tri-state (plan P4).
 * Temporarily closed places are distinguished from permanently closed ones —
 * callers treat them separately (temporary: informational, enrich normally;
 * permanent: delete/label options).
 */
export function buildClosedState(newPlace: Pick<PlaceDetails, 'businessStatus'>): ClosedState {
	const status = newPlace.businessStatus ?? '';
	const kind =
		status === 'CLOSED_PERMANENTLY'
			? 'permanentlyClosed'
			: status === 'CLOSED_TEMPORARILY'
				? 'temporarilyClosed'
				: 'operational';
	return { closed: kind === 'permanentlyClosed', status, kind };
}

/** Whether the place is permanently closed. */
export function isPermanentlyClosed(state: ClosedState): boolean {
	return state.kind === 'permanentlyClosed';
}

/** Whether the place is temporarily closed. */
export function isTemporarilyClosed(state: ClosedState): boolean {
	return state.kind === 'temporarilyClosed';
}

/** Translatable "[Closed]" label used as a title prefix (P8/P12). */
export function getClosedLabel(): string {
	return translate('placesApi.closed.label');
}
