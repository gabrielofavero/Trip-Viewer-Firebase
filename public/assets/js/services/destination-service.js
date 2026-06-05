// ======= Destination Service =======
// Domain service for destination-related operations.
// Wraps Firebase database calls — pages should use this instead of calling database.js directly.

import {
	_get,
	_getDestination,
	_create,
	_update,
	_override,
	_delete,
	_newUserObjectDB,
	_deleteUserObjectDB,
	_addToUserArray,
	_createBatchOps,
} from "../support/firebase/database.js";

// Re-export raw database functions that destination pages may still use during transition
export {
	_get,
	_getDestination,
	_create,
	_update,
	_override,
	_delete,
	_newUserObjectDB,
	_deleteUserObjectDB,
	_addToUserArray,
	_createBatchOps,
};

// ── Destination-specific wrappers ──

/**
 * Get a destination by ID. Uses caching and optionally shows loading UI.
 * @param {string} destId - Destination document ID
 * @param {string} [containerID] - Optional container element ID for loading UI
 */
export async function getDestination(destId, containerID) {
	return await _getDestination(destId, containerID);
}

/**
 * Get a destination without loading UI (raw fetch).
 */
export async function getDestinationRaw(destId) {
	return await _get(`destinos/${destId}`, false);
}

/**
 * Create a new destination and register it to the current user.
 */
export async function createDestination(destData) {
	return await _newUserObjectDB(destData, "destinos");
}

/**
 * Update an existing destination (shallow merge).
 */
export async function updateDestination(destId, data) {
	return await _update(`destinos/${destId}`, data);
}

/**
 * Replace an entire destination document (no merge).
 */
export async function replaceDestination(destId, data) {
	return await _override(`destinos/${destId}`, data);
}

/**
 * Delete a destination and remove it from the user's destination list.
 */
export async function deleteDestination(destId) {
	return await _deleteUserObjectDB(destId, "destinos");
}

// BACKWARD COMPAT: attach to window during migration
window.getDestination = getDestination;
window.getDestinationRaw = getDestinationRaw;
window.createDestination = createDestination;
window.updateDestination = updateDestination;
window.replaceDestination = replaceDestination;
window.deleteDestination = deleteDestination;
