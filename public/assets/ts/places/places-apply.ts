// ======= Places API (New) — Shared Apply / Compare Helpers =======
// Pure, unit-testable helpers shared by the per-item "Fetch Info With Maps"
// dialog (P9) and the bulk "Update with Maps" flow (P11/P12), so the apply and
// compare logic lives in exactly one place (no duplication).
//
// References:
// - docs/ai-analysis/6-places-api-edit-destination.md (§3, P3)
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
	const description =
		typeof newPlace.description === 'string' && newPlace.description !== ''
			? ({ ...previousDescription, [lang]: newPlace.description } as PlaceDescription)
			: previousDescription;

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
		if (typeof newPlace.description === 'string' && newPlace.description !== '') {
			entry.description = {
				...(entry.description ?? { pt: '', en: '' }),
				[lang]: newPlace.description,
			} as PlaceDescription;
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
	return entry[field] === oldPlaceAPI?.[field];
}

// ============================================================
// Closed-place detection
// ============================================================

export interface ClosedState {
	/** Whether the place is no longer operational. */
	closed: boolean;
	/** Raw businessStatus from the API (e.g. "CLOSED_PERMANENTLY"). */
	status: string;
}

/**
 * Determine whether a fetched place is "no longer operational".
 * Per plan Open Question 8, only CLOSED_PERMANENTLY counts for now;
 * CLOSED_TEMPORARILY is not treated as closed.
 */
export function buildClosedState(newPlace: Pick<PlaceDetails, 'businessStatus'>): ClosedState {
	const status = newPlace.businessStatus ?? '';
	return { closed: status === 'CLOSED_PERMANENTLY', status };
}

/** Translatable "[Closed]" label used as a title prefix (P8/P12). */
export function getClosedLabel(): string {
	return translate('placesApi.closed.label');
}
