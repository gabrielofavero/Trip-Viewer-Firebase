// ======= Auth Service =======
// Domain service for authentication & user management.
// Wraps Firebase Auth calls — pages should use this instead of calling user.js directly.

import {
	USER_DATA,
	UID,
	getUserData,
	unloadPageUserFunctions,
	signInWithEmailAndPassword,
	signOut,
	registerIfUserNotPresent,
	getUID,
	getFirebaseIdToken,
	getUser,
} from "../firebase/auth.js";

import {
	getSystemData,
	deleteAccount,
	deleteAccountDocuments,
	getUserTripSummaries,
	getUserDestinationSummaries,
	getUserListingSummaries,
	COLLECTION,
} from "../firebase/database.js";
import { getID } from "../../utils/dom.js";

// Re-export raw user functions that pages may still use during transition
export {
	USER_DATA,
	UID,
	getUserData,
	unloadPageUserFunctions,
	signInWithEmailAndPassword,
	signOut,
	registerIfUserNotPresent,
	getUID,
	getFirebaseIdToken,
	getUser,
	getSystemData,
	deleteAccountDocuments,
	COLLECTION,
};

// ── Auth-specific wrappers ──

/**
 * Sign in with email and password.
 */
export async function login(email, password) {
	// _signInWithEmailAndPassword reads from DOM elements, so we set them temporarily
	const emailEl = getID<HTMLInputElement>("login-email");
	const passwordEl = getID<HTMLInputElement>("login-password");

	if (emailEl && passwordEl) {
		emailEl.value = email;
		passwordEl.value = password;
		return await signInWithEmailAndPassword();
	}

	// Fallback: direct Firebase auth call (bypasses the DOM-based function)
	try {
		await firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL);
		const userCredential = await firebase.auth().signInWithEmailAndPassword(email, password);
		console.log("User signed in:", userCredential.user);
		return userCredential.user;
	} catch (error) {
		console.error("Error signing in:", error.message);
		throw error;
	}
}

/**
 * Sign out the current user.
 */
export function logout() {
	signOut();
}

/**
 * Get the current authenticated user.
 * @returns {Promise<firebase.User|undefined>}
 */
export async function getCurrentUser() {
	return await getUser();
}

/**
 * Get the current user's UID.
 * @returns {Promise<string|null>}
 */
export async function getCurrentUID() {
	return await getUID();
}

/**
 * Register the current auth user in Firestore if they don't exist yet.
 * Also checks if registration is open.
 */
export async function registerIfNeeded() {
	return await registerIfUserNotPresent();
}

/**
 * Get the cached user data document from Firestore.
 */
export async function getCurrentUserData(uid) {
	return await getUserData(uid);
}

/**
 * Delete the current user's account and all associated data.
 * Delegates to the database-level deleteAccount function.
 */
export async function deleteAccountService() {
	return await deleteAccount();
}

// ── User summary subcollection readers (Option B architecture) ──

/**
 * Get all trip summaries for a user from users/{uid}/tripSummaries.
 * Falls back to reading the user doc's embedded trips array if the
 * subcollection hasn't been migrated yet.
 */
export async function getUserTrips(uid?) {
	if (!uid) {
		uid = await getUID();
	}
	if (!uid) return [];

	// Try new subcollection first
	const summaries = await getUserTripSummaries(uid);
	if (summaries?.length > 0) return summaries;

	// Fallback: old embedded format (user doc had "trips" or "viagens" object)
	const userData = await getUserData(uid);
	if (userData?.trips) {
		// Convert object {id: data} → array of {id, ...data}
		return Object.entries(userData.trips).map(([id, data]: [string, any]) => ({
			id,
			...(typeof data === "object" ? data : { title: data }),
		}));
	}
	if (userData?.viagens) {
		return Object.entries(userData.viagens).map(([id, data]: [string, any]) => ({
			id,
			...(typeof data === "object" ? data : { title: data }),
		}));
	}

	return [];
}

/**
 * Get all destination summaries for a user from users/{uid}/destinationSummaries.
 */
export async function getUserDestinations(uid?) {
	if (!uid) {
		uid = await getUID();
	}
	if (!uid) return [];

	const summaries = await getUserDestinationSummaries(uid);
	if (summaries?.length > 0) return summaries;

	// Fallback: old embedded format
	const userData = await getUserData(uid);
	if (userData?.destinations) {
		return Object.entries(userData.destinations).map(([id, data]: [string, any]) => ({
			id,
			...(typeof data === "object" ? data : { title: data }),
		}));
	}
	if (userData?.destinos) {
		return Object.entries(userData.destinos).map(([id, data]: [string, any]) => ({
			id,
			...(typeof data === "object" ? data : { title: data }),
		}));
	}

	return [];
}

/**
 * Get all listing summaries for a user from users/{uid}/listingSummaries.
 */
export async function getUserListings(uid?) {
	if (!uid) {
		uid = await getUID();
	}
	if (!uid) return [];

	const summaries = await getUserListingSummaries(uid);
	if (summaries?.length > 0) return summaries;

	// Fallback: old embedded format
	const userData = await getUserData(uid);
	if (userData?.listings) {
		return Object.entries(userData.listings).map(([id, data]: [string, any]) => ({
			id,
			...(typeof data === "object" ? data : { title: data }),
		}));
	}
	if (userData?.listagens) {
		return Object.entries(userData.listagens).map(([id, data]: [string, any]) => ({
			id,
			...(typeof data === "object" ? data : { title: data }),
		}));
	}

	return [];
}