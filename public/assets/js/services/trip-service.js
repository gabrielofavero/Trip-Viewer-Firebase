// ======= Trip Service =======
// Domain service for trip-related operations.
// Wraps Firebase database calls — pages should use this instead of calling database.js directly.

import {
	_get,
	_getSingleData,
	_getTripDataWithDestinos,
	_update,
	_override,
	_delete,
	_create,
	_newUserObjectDB,
	_deleteUserObjectDB,
	_addToUserArray,
	_createBatchOps,
} from "../support/firebase/database.js";

// Side-effect import: ensures storage functions are attached to window
import "../support/firebase/storage.js";

// Re-export raw database functions that trip pages may still use during transition
export {
	_get,
	_getSingleData,
	_getTripDataWithDestinos,
	_update,
	_override,
	_delete,
	_create,
	_newUserObjectDB,
	_deleteUserObjectDB,
	_addToUserArray,
	_createBatchOps,
};

// ── Trip-specific wrappers ──

/**
 * Get a single trip by ID (reads from URL param "v").
 * Also auto-loads nested destination data.
 */
export async function getTrip(tripId) {
	if (!tripId) {
		return await _getSingleData("viagens");
	}
	const tripData = await _get(`viagens/${tripId}`);
	if (tripData?.destinos?.length > 0) {
		return await _getTripDataWithDestinos(tripData);
	}
	return tripData;
}

/**
 * Get a trip by explicit ID without auto-loading destinations.
 */
export async function getTripRaw(tripId) {
	return await _get(`viagens/${tripId}`);
}

/**
 * Create a new trip and register it to the current user.
 */
export async function createTrip(tripData) {
	return await _newUserObjectDB(tripData, "viagens");
}

/**
 * Update an existing trip (shallow merge).
 */
export async function updateTrip(tripId, data) {
	return await _update(`viagens/${tripId}`, data);
}

/**
 * Replace an entire trip document (no merge).
 */
export async function replaceTrip(tripId, data) {
	return await _override(`viagens/${tripId}`, data);
}

/**
 * Delete a trip and remove it from the user's trip list.
 */
export async function deleteTrip(tripId) {
	return await _deleteUserObjectDB(tripId, "viagens");
}

// BACKWARD COMPAT: attach to window during migration
window.getTrip = getTrip;
window.getTripRaw = getTripRaw;
window.createTrip = createTrip;
window.updateTrip = updateTrip;
window.replaceTrip = replaceTrip;
window.deleteTrip = deleteTrip;
