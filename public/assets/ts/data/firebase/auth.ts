import { displayError, displayMessage } from '../../utils/messages.js';
import { getHTMLpage } from '../../app/main.js';
import { getID } from '../../utils/dom.js';
import { translate } from '../../i18n/translation.js';
import { create, get, getSystemData, COLLECTION } from './database.js';

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

export async function signInWithEmailAndPassword() {
	const email = getID('login-email').value;
	const password = getID('login-password').value;

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
		console.error('Error signing in:', error.message);
		displayError(error);
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

	const userDoc = await get(`${COLLECTION.USERS}/${user.uid}`);
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

	if (!userDoc && registrationOpen) {
		await create(
			`${COLLECTION.USERS}`,
			{
				listings: [],
				trips: [],
				destinations: [],
				visibility: 'dynamic',
			},
			user.uid,
		);
	}
}

export async function getUID() {
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

export async function getFirebaseIdToken(user) {
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
