// ======= Auto-itinerary exclusions =======
// Source keys of the itinerary entries the user deleted by hand: their
// transportation leg, or one side (check-in/check-out) of an accommodation.
// They are stored on the trip document so a deleted entry is never recreated,
// on this device or on any other one the trip is opened from.

import { translate } from '../../../../../i18n/translation.js';

var EXCLUDED_AUTO_KEYS: string[] = [];

/**
 * Load the exclusions stored on the trip document.
 *
 * Merged rather than replaced: the trip data can be re-loaded mid-session (a
 * PIN change, a traveler edit), and an entry the user deleted in the meantime
 * must not become eligible again.
 */
export function loadExcludedAutoKeys(keys: unknown) {
	if (!Array.isArray(keys)) return;
	for (const key of keys) {
		if (typeof key === 'string' && key) excludeAutoKey(key);
	}
}

/** Exclusions to persist on the trip document. */
export function getExcludedAutoKeys(): string[] {
	return EXCLUDED_AUTO_KEYS;
}

export function isAutoKeyExcluded(key: string): boolean {
	return EXCLUDED_AUTO_KEYS.includes(key);
}

/** Remember that the entry this source feeds was deleted: never add it again. */
export function excludeAutoKey(key: string) {
	if (!key || EXCLUDED_AUTO_KEYS.includes(key)) return;
	EXCLUDED_AUTO_KEYS.push(key);
}

/**
 * Source keys behind an itinerary item: a transportation leg is a single entry,
 * an accommodation is a check-in plus a check-out.
 *
 * The generated label tells the two sides of a stay apart. It is derived from
 * the stored label — not from the current form value — so custom labels (which
 * can't be attributed to a side) suppress both instead of guessing.
 */
export function getAutoKeysForItem(type: string, id: string, label = ''): string[] {
	if (!id) return [];
	if (type === 'transportation') return [`transportation:${id}`];
	if (type !== 'accommodations') return [];

	if (label.startsWith(`${translate('trip.accommodation.checkout')}:`)) {
		return [`accommodations:${id}:checkOut`];
	}
	if (label.startsWith(`${translate('trip.accommodation.checkin')}:`)) {
		return [`accommodations:${id}:checkIn`];
	}
	return [`accommodations:${id}:checkIn`, `accommodations:${id}:checkOut`];
}

/** Source keys of an itinerary entry — its own tag when it carries one. */
export function getAutoKeysForEntry(entry: any): string[] {
	if (entry?.auto) return [entry.auto];
	return getAutoKeysForItem(entry?.item?.type, entry?.item?.id, entry?.label);
}

/**
 * The itinerary item a source key belongs to: `transportation:<id>` for a leg,
 * `accommodations:<id>:<side>` for one side of a stay.
 */
export function getAutoKeySource(key: string): { type: string; id: string } | null {
	const [type, id] = String(key || '').split(':');
	if (!type || !id) return null;
	return { type, id };
}
