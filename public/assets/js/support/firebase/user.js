import { _displayError, _displayMessage } from "../pages/messages.js";

export let USER_DATA;
export let UID;

export async function _getUserData(uid) {
	if (USER_DATA) {
		return USER_DATA;
	}
	if (!uid) {
		uid = await _getUID();
	}
	return await _get(`usuarios/${uid}`);
}

export function _unloadPageUserFunctions() {
	const html = _getHTMLpage();
	if (html == "index") {
		_openIndexPage("unlogged", 0, 1);
	}
}

export async function _signInWithEmailAndPassword() {
	const email = getID("login-email").value;
	const password = getID("login-password").value;

	try {
		// Set persistence to LOCAL
		await firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL);

		// Sign in with email and password
		const userCredential = await firebase
			.auth()
			.signInWithEmailAndPassword(email, password);

		// Get the signed-in user
		const user = userCredential.user;
		console.log("User signed in:", user);

		return user; // Optionally return the user for further use
	} catch (error) {
		console.error("Error signing in:", error.message);
		_displayError(error);
	}
}

export function _signOut() {
	UID = null;
	firebase.auth().signOut();
	if (window.location.href.includes("index.html")) {
		_openIndexPage("unlogged", 0, 1);
	} else {
		window.location.href = "index.html";
	}
}

export async function _registerIfUserNotPresent() {
	const user = firebase.auth().currentUser;

	if (!user) {
		_signOut();
		_displayError(translate("messages.errors.unauthenticated"));
		return;
	}

	const userDoc = await _get(`usuarios/${user.uid}`);
	const systemData = await _getSystemData();
	const registrationOpen = systemData?.registrationOpen == true;

	if (!userDoc && !registrationOpen) {
		_signOut();
		const title = "Você chegou muito cedo! 😅";
		const content =
			"Olá! O TripViewer não está aceitando novos registros. Estamos trabalhando para lançar a primeira versão pública da aplicação. Fique atento para novidades! 🚀";
		_displayMessage(title, content);
		return;
	}

	if (!userDoc && registrationOpen) {
		await _create(
			`usuarios`,
			{
				listagens: [],
				viagens: [],
				destinos: [],
				visibilidade: "dinamico",
			},
			user.uid,
		);
	}
}

export async function _getUID() {
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

export async function _getFirebaseIdToken(user) {
	if (!user) {
		user = firebase.auth().currentUser;
	}
	if (user) {
		return await user.getIdToken();
	} else {
		return Promise.reject("User is not authenticated.");
	}
}

export async function _getUser() {
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

// BACKWARD COMPAT: attach to window during migration
window.USER_DATA = USER_DATA;
window.UID = UID;
window._getUserData = _getUserData;
window._unloadPageUserFunctions = _unloadPageUserFunctions;
window._signInWithEmailAndPassword = _signInWithEmailAndPassword;
window._signOut = _signOut;
window._registerIfUserNotPresent = _registerIfUserNotPresent;
window._getUID = _getUID;
window._getFirebaseIdToken = _getFirebaseIdToken;
window._getUser = _getUser;
