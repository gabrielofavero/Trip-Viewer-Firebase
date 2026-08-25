/**
 * Diff utility for computing minimal change sets between original (Firestore)
 * and new (form) data. This avoids unnecessary Firestore writes by only
 * sending fields that actually changed.
 *
 * Industry-standard approach: compute a deep diff, then write only the
 * changed keys. Firestore's `doc.update()` merges by default, so omitted
 * fields are left untouched.
 */

// ── Type helpers ──

/** Result of computing a diff between two objects. */
export interface ObjectDiff {
	/** Fields present in `updated` but not in `original`, or whose values differ. */
	changed: Record<string, unknown>;
	/** Whether any change was detected at all. */
	hasChanges: boolean;
}

/** Result of computing a diff between two arrays of identifiable items. */
export interface ArrayDiff<T> {
	/** Items to create or update (exist in `updated` with changes or are new). */
	toSet: T[];
	/** IDs of items to delete (present in `original` but not in `updated`). */
	toDelete: string[];
	/** Whether any array-level change was detected. */
	hasChanges: boolean;
}

// ── Core: deep equality ──

/**
 * Recursive deep equality check. Handles primitives, Dates, arrays,
 * plain objects, and null/undefined.
 */
export function deepEqual(a: unknown, b: unknown): boolean {
	// Same reference or both primitively equal
	if (a === b) return true;

	// One is null/undefined but not both
	if (a == null || b == null) return a == null && b == null;

	// Different types
	if (typeof a !== typeof b) return false;

	// Non-objects that aren't strictly equal
	if (typeof a !== 'object') return false;

	// Date comparison
	if (a instanceof Date && b instanceof Date) {
		return a.getTime() === b.getTime();
	}

	// Array comparison
	if (Array.isArray(a) && Array.isArray(b)) {
		if (a.length !== b.length) return false;
		return a.every((item, i) => deepEqual(item, b[i]));
	}

	// One is array, other is not
	if (Array.isArray(a) !== Array.isArray(b)) return false;

	// Plain object comparison
	const keysA = Object.keys(a as Record<string, unknown>);
	const keysB = Object.keys(b as Record<string, unknown>);

	if (keysA.length !== keysB.length) return false;

	return keysA.every((key) =>
		deepEqual(
			(a as Record<string, unknown>)[key],
			(b as Record<string, unknown>)[key],
		),
	);
}

// ── Object diff ──

/**
 * Computes a minimal diff between original and updated objects.
 * Only fields whose values differ are included in `changed`.
 *
 * @example
 *   computeObjectDiff({ a: 1, b: 2 }, { a: 1, b: 3, c: 4 })
 *   // => { changed: { b: 3, c: 4 }, hasChanges: true }
 */
export function computeObjectDiff(
	original: Record<string, unknown> | null | undefined,
	updated: Record<string, unknown>,
): ObjectDiff {
	const changed: Record<string, unknown> = {};

	// If there's no original, everything is new
	if (!original || Object.keys(original).length === 0) {
		return { changed: { ...updated }, hasChanges: Object.keys(updated).length > 0 };
	}

	for (const [key, newValue] of Object.entries(updated)) {
		const oldValue = original[key];
		if (!deepEqual(oldValue, newValue)) {
			changed[key] = newValue;
		}
	}

	return {
		changed,
		hasChanges: Object.keys(changed).length > 0,
	};
}

// ── Array (subcollection) diff ──

/**
 * Compares two arrays of identifiable objects and returns the minimal set of
 * changes needed to bring `originalItems` in sync with `updatedItems`.
 *
 * Items are identified by the `idField` property (default: 'id').
 *
 * @param originalItems - Items currently in Firestore.
 * @param updatedItems  - Items from the form that should be in Firestore.
 * @param idField       - Property name used as the item identifier.
 * @returns An ArrayDiff with items to set/update and IDs to delete.
 */
export function computeArrayDiff<T extends Record<string, unknown>>(
	originalItems: T[] | null | undefined,
	updatedItems: T[],
	idField = 'id',
): ArrayDiff<T> {
	const original = originalItems ?? [];

	// Build lookup maps
	const originalMap = new Map<string, T>();
	for (const item of original) {
		const id = item[idField] as string | undefined;
		if (id) originalMap.set(id, item);
	}

	const updatedMap = new Map<string, T>();
	for (const item of updatedItems) {
		const id = item[idField] as string | undefined;
		if (id) updatedMap.set(id, item);
	}

	const toSet: T[] = [];
	const toDelete: string[] = [];

	// Find items to set/update: items in updated that are new or changed
	for (const [id, updatedItem] of updatedMap) {
		const originalItem = originalMap.get(id);
		if (!originalItem || !deepEqual(originalItem, updatedItem)) {
			toSet.push(updatedItem);
		}
	}

	// Find items to delete: items in original that are not in updated
	for (const id of originalMap.keys()) {
		if (!updatedMap.has(id)) {
			toDelete.push(id);
		}
	}

	// Items without IDs in updated are always "new" — include them
	for (const item of updatedItems) {
		if (!item[idField]) {
			toSet.push(item);
		}
	}

	return {
		toSet,
		toDelete,
		hasChanges: toSet.length > 0 || toDelete.length > 0,
	};
}

// ── Pick helper ──

/**
 * Returns a new object containing only the specified keys from `source`.
 * Useful for extracting summary-relevant fields for the user document.
 */
export function pick<T extends Record<string, unknown>>(
	source: T,
	keys: string[],
): Partial<T> {
	const result: Partial<T> = {};
	for (const key of keys) {
		if (key in source) {
			(result as Record<string, unknown>)[key] = source[key];
		}
	}
	return result;
}
