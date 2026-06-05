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

import { getSystemData, deleteAccount, deleteAccountDocuments } from "../firebase/database.js";

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
};

// ── Auth-specific wrappers ──

/**
 * Sign in with email and password.
 */
export async function login(email, password) {
	// _signInWithEmailAndPassword reads from DOM elements, so we set them temporarily
	const emailEl = document.getElementById("login-email");
	const passwordEl = document.getElementById("login-password");

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


