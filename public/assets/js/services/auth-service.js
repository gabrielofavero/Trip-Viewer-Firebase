// ======= Auth Service =======
// Domain service for authentication & user management.
// Wraps Firebase Auth calls — pages should use this instead of calling user.js directly.

import {
	USER_DATA,
	UID,
	_getUserData,
	_unloadPageUserFunctions,
	_signInWithEmailAndPassword,
	_signOut,
	_registerIfUserNotPresent,
	_getUID,
	_getFirebaseIdToken,
	_getUser,
} from "../support/firebase/user.js";

import { _getSystemData, _deleteAccount, _deleteAccountDocuments } from "../support/firebase/database.js";

// Re-export raw user functions that pages may still use during transition
export {
	USER_DATA,
	UID,
	_getUserData,
	_unloadPageUserFunctions,
	_signInWithEmailAndPassword,
	_signOut,
	_registerIfUserNotPresent,
	_getUID,
	_getFirebaseIdToken,
	_getUser,
	_getSystemData,
	_deleteAccount,
	_deleteAccountDocuments,
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
		return await _signInWithEmailAndPassword();
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
	_signOut();
}

/**
 * Get the current authenticated user.
 * @returns {Promise<firebase.User|undefined>}
 */
export async function getCurrentUser() {
	return await _getUser();
}

/**
 * Get the current user's UID.
 * @returns {Promise<string|null>}
 */
export async function getCurrentUID() {
	return await _getUID();
}

/**
 * Register the current auth user in Firestore if they don't exist yet.
 * Also checks if registration is open.
 */
export async function registerIfNeeded() {
	return await _registerIfUserNotPresent();
}

/**
 * Get the cached user data document from Firestore.
 */
export async function getCurrentUserData(uid) {
	return await _getUserData(uid);
}

/**
 * Delete the current user's account and all associated data.
 */
export async function deleteAccount() {
	return await _deleteAccount();
}

// BACKWARD COMPAT: attach to window during migration
window.login = login;
window.logout = logout;
window.getCurrentUser = getCurrentUser;
window.getCurrentUID = getCurrentUID;
window.registerIfNeeded = registerIfNeeded;
window.getCurrentUserData = getCurrentUserData;
window.deleteAccount = deleteAccount;
