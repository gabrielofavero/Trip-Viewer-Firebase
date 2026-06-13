// ======= Trip Service =======
// Domain service for trip-related operations.
// Wraps Firebase database calls — pages should use this instead of calling database.js directly.

import {
	get,
	getSingleData,
	getTripDataWithDestinations,
	update,
	override,
	deleteDocument,
	create,
	newUserObjectDB,
	deleteUserObjectDB,
	addToUserArray,
	createBatchOps,
} from "../firebase/database.js";

// Side-effect import: ensures storage functions are attached to window
import "../firebase/storage.js";

// Re-export raw database functions that trip pages may still use during transition
export {
	get,
	getSingleData,
	getTripDataWithDestinations,
	update,
	override,
	deleteDocument,
	create,
	newUserObjectDB,
	deleteUserObjectDB,
	addToUserArray,
	createBatchOps,
};

// ── Trip-specific wrappers ──

/**
 * Get a single trip by ID (reads from URL param "v").
 * Also auto-loads nested destination data.
 */
export async function getTrip(tripId) {
	if (!tripId) {
		return await getSingleData("viagens");
	}
	const tripData = await get(`viagens/${tripId}`);
	if (tripData?.destinos?.length > 0) {
		return await getTripDataWithDestinations(tripData);
	}
	return tripData;
}

/**
 * Get a trip by explicit ID without auto-loading destinations.
 */
export async function getTripRaw(tripId) {
	return await get(`viagens/${tripId}`);
}

/**
 * Create a new trip and register it to the current user.
 */
export async function createTrip(tripData) {
	return await newUserObjectDB(tripData, "viagens");
}

/**
 * Update an existing trip (shallow merge).
 */
export async function updateTrip(tripId, data) {
	return await update(`viagens/${tripId}`, data);
}

/**
 * Replace an entire trip document (no merge).
 */
export async function replaceTrip(tripId, data) {
	return await override(`viagens/${tripId}`, data);
}

/**
 * Delete a trip and remove it from the user's trip list.
 */
export async function deleteTrip(tripId) {
	return await deleteUserObjectDB(tripId, "viagens");
}


