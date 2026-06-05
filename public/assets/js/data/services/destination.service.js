// ======= Destination Service =======
// Domain service for destination-related operations.
// Wraps Firebase database calls — pages should use this instead of calling database.js directly.

import {
	get,
	getDestination,
	create,
	update,
	override,
	deleteDocument,
	newUserObjectDB,
	deleteUserObjectDB,
	addToUserArray,
	createBatchOps,
} from "../firebase/database.js";

// Re-export raw database functions that destination pages may still use during transition
export {
	get,
	getDestination,
	create,
	update,
	override,
	deleteDocument,
	newUserObjectDB,
	deleteUserObjectDB,
	addToUserArray,
	createBatchOps,
};

// ── Destination-specific wrappers ──

/**
 * Get a destination by ID. Uses caching and optionally shows loading UI.
 * @param {string} destId - Destination document ID
 * @param {string} [containerID] - Optional container element ID for loading UI
 */
export async function getDestination(destId, containerID) {
	return await getDestination(destId, containerID);
}

/**
 * Get a destination without loading UI (raw fetch).
 */
export async function getDestinationRaw(destId) {
	return await get(`destinos/${destId}`, false);
}

/**
 * Create a new destination and register it to the current user.
 */
export async function createDestination(destData) {
	return await newUserObjectDB(destData, "destinos");
}

/**
 * Update an existing destination (shallow merge).
 */
export async function updateDestination(destId, data) {
	return await update(`destinos/${destId}`, data);
}

/**
 * Replace an entire destination document (no merge).
 */
export async function replaceDestination(destId, data) {
	return await override(`destinos/${destId}`, data);
}

/**
 * Delete a destination and remove it from the user's destination list.
 */
export async function deleteDestination(destId) {
	return await deleteUserObjectDB(destId, "destinos");
}


