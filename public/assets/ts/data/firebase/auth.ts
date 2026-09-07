import { displayError, displayMessage } from '../../utils/messages.js';
import { getHTMLpage } from '../../app/main.js';
import { getID } from '../../utils/dom.js';
import { translate } from '../../i18n/translation.js';
import { create, get, getSystemData, COLLECTION } from './database.js';
import { isStaticMode, staticConfig } from '../../static-mode/static-mode.js';

export let USER_DATA;
export let UID;

export function setUserData(value) {
	USER_DATA = value;
}

export async function getUserData(uid?) {
	if (USER_DATA) {
		return USER_DATA;
	}
	if (!uid) {
		uid = await getUID();
	}
	return await get(`${COLLECTION.USERS}/${uid}`);
}

export function unloadPageUserFunctions() {
	const html = getHTMLpage();
	if (html === 'index') {
		const unloggedView = document.getElementById('unlogged-view');
		const loggedView = document.getElementById('logged-view');
		if (unloggedView) unloggedView.style.display = 'block';
		if (loggedView) loggedView.style.display = 'none';
	}
}

// Firebase Auth error codes that represent user-correctable conditions (NOT
// system faults). These are shown as friendly inline messages on the login
// form — never through the system-error dialog (no "contact the system
// administrator" note / no stacktrace copy).
const LOGIN_USER_ERROR_CODES = [
	'auth/wrong-password',
	'auth/user-not-found',
	'auth/invalid-email',
	'auth/invalid-credential',
	'auth/invalid-login-credentials', // newer Firebase Auth SDKs
];

function clearLoginError() {
	const loginError = getID('login-error');
	if (loginError) {
		loginError.textContent = '';
		loginError.hidden = true;
	}
}

function showLoginError(message: string) {
	const loginError = getID('login-error');
	if (loginError) {
		loginError.textContent = message;
		loginError.hidden = false;
	} else {
		// Fallback (login box not present on this page): friendly modal — still
		// not a system error.
		displayMessage('', message);
	}
}

/**
 * Maps a failed-sign-in Firebase Auth error to a friendly inline message, or
 * returns `null` when the error is an unexpected system fault (which should go
 * through the system-error dialog instead).
 */
function getLoginErrorMessage(error): string | null {
	const code = error?.code || '';
	if (LOGIN_USER_ERROR_CODES.includes(code)) {
		return translate('messages.login.invalid_credentials');
	}
	if (code === 'auth/too-many-requests') {
		return translate('messages.login.too_many_attempts');
	}
	if (code === 'auth/user-disabled') {
		return translate('messages.login.account_disabled');
	}
	if (code === 'auth/network-request-failed') {
		// Offline / no network — a condition the user can fix, not a system fault.
		return translate('messages.errors.offline');
	}
	return null;
}

export async function signInWithEmailAndPassword() {
	const email = getID('login-email').value;
	const password = getID('login-password').value;

	// Clear any previous inline error before the new attempt.
	clearLoginError();

	try {
		// Set persistence to LOCAL
		await firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL);

		// Sign in with email and password
		const userCredential = await firebase.auth().signInWithEmailAndPassword(email, password);

		// Get the signed-in user
		const user = userCredential.user;
		console.log('User signed in:', user);

		return user; // Optionally return the user for further use
	} catch (error) {
		console.error('Error signing in:', error?.message || error);
		const loginMessage = getLoginErrorMessage(error);
		if (loginMessage) {
			// User-correctable (e.g. wrong password, offline): friendly inline
			// error on the login form — never a "system error" dialog.
			showLoginError(loginMessage);
			return;
		}
		// Unexpected failure → genuine system-error dialog (contact admin + copy).
		displayError(
			error instanceof Error ? error : new Error(String(error?.message || error)),
			false,
			false,
		);
	}
}

export function signOut() {
	UID = null;
	firebase.auth().signOut();
	// Check if we're on the index page (clean URL "/" or "index.html")
	const path = window.location.pathname.replace(/\/+$/, '');
	if (path === '' || path === '/index' || path.endsWith('/index')) {
		// Already on index — show unlogged view (no navigation needed)
		const unloggedView = document.getElementById('unlogged-view');
		const loggedView = document.getElementById('logged-view');
		if (unloggedView) unloggedView.style.display = 'block';
		if (loggedView) loggedView.style.display = 'none';
	} else {
		window.location.href = '/';
	}
}

export async function registerIfUserNotPresent() {
	const user = firebase.auth().currentUser;

	if (!user) {
		signOut();
		displayError(translate('messages.errors.unauthenticated'));
		return;
	}

	// Read with treatError=false so a network/offline failure THROWS instead of
	// being swallowed into `undefined`. A swallowed offline read would be
	// misread below as "user document does not exist" and wrongly sign the user
	// out with the "too early" message (or show a bogus registration error).
	const userDoc = await get(`${COLLECTION.USERS}/${user.uid}`, false);
	const systemData = await getSystemData();
	const registrationOpen = systemData?.registrationOpen == true;

	if (!userDoc && !registrationOpen) {
		const title = translate('messages.too_early.title');
		const content = translate('messages.too_early.message');
		displayMessage(title, content);
		// Sign out from Firebase Auth only (skip signOut() which redirects)
		UID = null;
		firebase.auth().signOut();
		return;
	}

	// Return the user document so callers can reuse it instead of reading
	// users/{uid} again.
	if (!userDoc && registrationOpen) {
		const profile = {
			// Profile fields — read from Firestore first, Auth as fallback
			name: user.displayName || '',
			email: user.email || '',
			photoURL: user.photoURL || '',
			listings: [],
			trips: [],
			destinations: [],
		};
		await create(`${COLLECTION.USERS}`, profile, user.uid);
		return profile;
	}

	return userDoc;
}

export async function getUID() {
	if (isStaticMode()) {
		return staticConfig().ownerUid;
	}
	if (UID) {
		return UID;
	}
	return new Promise((resolve, reject) => {
		const unsubscribe = firebase.auth().onAuthStateChanged((user) => {
			unsubscribe();
			UID = user?.uid || null;
			resolve(UID);
		});
	});
}

export async function getFirebaseIdToken(user = null) {
	if (!user) {
		user = firebase.auth().currentUser;
	}
	if (user) {
		return await user.getIdToken();
	} else {
		return Promise.reject('User is not authenticated.');
	}
}

export async function getUser() {
	if (isStaticMode()) {
		return undefined;
	}
	return new Promise((resolve, reject) => {
		const auth = firebase.auth();
		const unsubscribe = auth.onAuthStateChanged(
			async (user) => {
				unsubscribe();

				if (user) {
					resolve(user);
				} else {
					resolve(undefined);
				}
			},
			(error) => {
				reject(error);
			},
		);
	});
}
