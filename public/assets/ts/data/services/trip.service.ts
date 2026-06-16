// ======= Trip Service =======
// Domain service for trip-related operations.
// Wraps Firebase database calls — pages should use this instead of calling database.js directly.

import {
	get,
	getSingleData,
	getTripDataWithDestinations,
	getTripComplete,
	getAccommodations,
	getTransportation,
	getItinerary,
	update,
	override,
	deleteDocument,
	create,
	newUserObjectDB,
	deleteUserObjectDB,
	addToUserArray,
	createBatchOps,
	COLLECTION,
} from "../firebase/database.js";

// Side-effect import: ensures storage functions are attached to window
import "../firebase/storage.js";

// Re-export raw database functions that trip pages may still use during transition
export {
	get,
	getSingleData,
	getTripDataWithDestinations,
	getTripComplete,
	getAccommodations,
	getTransportation,
	getItinerary,
	update,
	override,
	deleteDocument,
	create,
	newUserObjectDB,
	deleteUserObjectDB,
	addToUserArray,
	createBatchOps,
	COLLECTION,
};

// ── Trip-specific wrappers ──

/**
 * Get a single trip by ID (reads from URL param "v").
 * Uses getTripComplete for parallel subcollection loading.
 * Falls back to getSingleData + getTripDataWithDestinations for
 * trips still in the old embedded-data format.
 */
export async function getTrip(tripId?) {
	if (!tripId) {
		// getSingleData reads the trip by URL param and resolves destinations inline
		return await getSingleData(COLLECTION.TRIPS);
	}

	// Try the new subcollection-based read first
	const completeTrip = await getTripComplete(tripId);
	if (completeTrip) return completeTrip;

	// Fallback: old embedded-data format (no subcollections migrated yet)
	const tripData = await get(`${COLLECTION.TRIPS}/${tripId}`);
	if (tripData?.destinations?.length > 0) {
		return await getTripDataWithDestinations(tripData);
	}
	return tripData;
}

/**
 * Get a trip by explicit ID without auto-loading destinations or subcollections.
 */
export async function getTripRaw(tripId) {
	return await get(`${COLLECTION.TRIPS}/${tripId}`);
}

/**
 * Create a new trip and register it to the current user.
 */
export async function createTrip(tripData) {
	return await newUserObjectDB(tripData, COLLECTION.TRIPS);
}

/**
 * Update an existing trip (shallow merge).
 */
export async function updateTrip(tripId, data) {
	return await update(`${COLLECTION.TRIPS}/${tripId}`, data);
}

/**
 * Replace an entire trip document (no merge).
 */
export async function replaceTrip(tripId, data) {
	return await override(`${COLLECTION.TRIPS}/${tripId}`, data);
}

/**
 * Delete a trip and remove it from the user's trip list.
 */
export async function deleteTrip(tripId) {
	return await deleteUserObjectDB(tripId, COLLECTION.TRIPS);
}

// ── Subcollection accessors (Option B architecture) ──

/**
 * Get all accommodations for a trip from trips/{tripId}/accommodations.
 */
export async function getTripAccommodations(tripId) {
	return await getAccommodations(tripId);
}

/**
 * Get all transportation legs + settings for a trip from trips/{tripId}/transportation.
 */
export async function getTripTransportation(tripId) {
	return await getTransportation(tripId);
}

/**
 * Get all itinerary days for a trip from trips/{tripId}/itinerary.
 */
export async function getTripItinerary(tripId) {
	return await getItinerary(tripId);
}


