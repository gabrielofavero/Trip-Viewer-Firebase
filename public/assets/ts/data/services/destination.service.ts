// ======= Destination Service =======
// Domain service for destination-related operations.
// Wraps Firebase database calls — pages should use this instead of calling database.js directly.

import {
	get,
	getDestination as _getDestination,
	create,
	update,
	override,
	deleteDocument,
	newUserObjectDB,
	deleteUserObjectDB,
	createBatchOps,
	COLLECTION,
	SUBCOLLECTION,
} from '../firebase/database.js';

import { getUID } from '../firebase/auth.js';

import type { DestinationCategories, DestinationRef } from '../../models/schema.js';

// Re-export raw database functions that destination pages may still use during transition
export {
	get,
	create,
	update,
	override,
	deleteDocument,
	newUserObjectDB,
	deleteUserObjectDB,
	createBatchOps,
	COLLECTION,
};

// ── Destination-specific wrappers ──

/**
 * Get a destination by ID. Uses caching and optionally shows loading UI.
 * @param {string} destId - Destination document ID
 * @param {string} [containerID] - Optional container element ID for loading UI
 */
export async function getDestination(destId, containerID?) {
	return await _getDestination(destId, containerID);
}

/**
 * Get a destination without loading UI (raw fetch).
 */
export async function getDestinationRaw(destId) {
	return await get(`${COLLECTION.DESTINATIONS}/${destId}`, false);
}

// ── Destination metadata (denormalized cache for trip docs) ──

/**
 * Categories whose entry counts determine which category boxes appear on
 * view.html's destinationsBox (mirrors migration 18 in functions/src).
 */
export const DESTINATION_CATEGORIES = [
	'restaurants',
	'snacks',
	'nightlife',
	'tourism',
	'shopping',
] as const;

/** Whether a destination category map contains at least one entry. */
function categoryHasEntries(entries: any): boolean {
	return !!entries && typeof entries === 'object' && Object.keys(entries).length > 0;
}

/**
 * Build the lightweight metadata saved onto trip docs (destinationRefs[i])
 * so view.html can render the destinations section without fetching the
 * destination document on load. The `categories` booleans mean "has entries".
 */
export function buildDestinationMetadata(dest: any): Omit<DestinationRef, 'id'> {
	const categories: DestinationCategories = {
		restaurants: categoryHasEntries(dest?.restaurants),
		snacks: categoryHasEntries(dest?.snacks),
		nightlife: categoryHasEntries(dest?.nightlife),
		tourism: categoryHasEntries(dest?.tourism),
		shopping: categoryHasEntries(dest?.shopping),
	};

	return {
		title: dest?.title || '',
		image:
			dest?.image && typeof dest.image === 'object'
				? dest.image
				: { active: false, background: '' },
		categories,
		version:
			dest?.version && typeof dest.version === 'object'
				? dest.version
				: { lastUpdated: '' },
	};
}

/**
 * Fetch a destination and build its metadata for caching on a trip doc.
 * Returns null when the destination document doesn't exist.
 */
export async function getDestinationMetadata(
	destId: string,
): Promise<Omit<DestinationRef, 'id'> | null> {
	const dest = await get(`${COLLECTION.DESTINATIONS}/${destId}`, false);
	if (!dest) return null;
	return buildDestinationMetadata(dest);
}

/**
 * Create a new destination, register it to the current user's array,
 * and create a summary doc in users/{uid}/destinationSummaries/{id}.
 */
export async function createDestination(destData) {
	const result = await newUserObjectDB(destData, COLLECTION.DESTINATIONS);

	// Option B: also create a destination summary in the user subcollection
	if (result?.success && result?.data) {
		const destId =
			typeof result.data === 'string'
				? result.data
				: result.data?.id || result.data?.path?.split('/').pop();

		if (destId) {
			const uid = await getUID();
			if (uid) {
				try {
					await create(
						`${COLLECTION.USERS}/${uid}/${SUBCOLLECTION.DESTINATION_SUMMARIES}`,
						{
							title: destData?.title || '',
							currency: destData?.currency || '',
							image: destData?.image || {},
							version: destData?.version || {},
						},
						destId,
					);
				} catch (e) {
					console.warn('Failed to create destination summary:', e);
				}
			}
		}
	}

	return result;
}

/**
 * Update an existing destination (shallow merge).
 */
export async function updateDestination(destId, data) {
	return await update(`${COLLECTION.DESTINATIONS}/${destId}`, data);
}

/**
 * Replace an entire destination document (no merge).
 */
export async function replaceDestination(destId, data) {
	return await override(`${COLLECTION.DESTINATIONS}/${destId}`, data);
}

/**
 * Delete a destination, remove it from the user's destination list,
 * and delete its summary doc from users/{uid}/destinationSummaries/{id}.
 */
export async function deleteDestination(destId) {
	const result = await deleteUserObjectDB(destId, COLLECTION.DESTINATIONS);

	// Option B: also delete the destination summary from user subcollection
	const uid = await getUID();
	if (uid) {
		try {
			await deleteDocument(
				`${COLLECTION.USERS}/${uid}/${SUBCOLLECTION.DESTINATION_SUMMARIES}/${destId}`,
				true,
			);
		} catch (e) {
			console.warn('Failed to delete destination summary:', e);
		}
	}

	return result;
}
