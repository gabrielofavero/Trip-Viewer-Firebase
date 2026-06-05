// ======= Expense Service =======
// Domain service for expense-related operations.
// Wraps Firebase database calls — pages should use this instead of calling database.js directly.

import {
	get,
	create,
	deepCreate,
	update,
	override,
	deleteDocument,
	createBatchOps,
} from "../support/firebase/database.js";

// Re-export raw database functions that expense pages may still use during transition
export {
	get,
	create,
	deepCreate,
	update,
	override,
	deleteDocument,
	createBatchOps,
};

// ── Expense-specific wrappers ──

/**
 * Get expenses for a specific trip.
 * @param {string} tripId - The trip document ID
 */
export async function getExpenses(tripId) {
	return await get(`gastos/${tripId}`, true, true);
}

/**
 * Get protected expenses (PIN-locked) for a trip.
 * @param {string} pin - The trip PIN
 * @param {string} tripId - The trip document ID
 */
export async function getProtectedExpenses(pin, tripId) {
	return await get(`gastos/protected/${pin}/${tripId}`, false);
}

/**
 * Update expenses for a trip (shallow merge).
 */
export async function updateExpenses(tripId, data) {
	return await update(`gastos/${tripId}`, data);
}

/**
 * Replace all expenses for a trip (no merge).
 */
export async function replaceExpenses(tripId, data) {
	return await override(`gastos/${tripId}`, data);
}

/**
 * Create or overwrite protected expenses for a trip.
 */
export async function setProtectedExpenses(pin, tripId, data) {
	return await deepCreate(`gastos/protected/${pin}`, data, tripId);
}

/**
 * Delete expenses for a trip (used during account deletion).
 */
export async function deleteExpenses(tripId) {
	return await deleteDocument(`gastos/${tripId}`, true);
}


