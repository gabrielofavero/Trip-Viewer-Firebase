import { displayError, displayMessage } from "../../utils/messages.js";
import { getHTMLpage } from '../../app/main.js';
import { getID } from '../../utils/dom.js';
import { translate } from '../../i18n/translation.js';
import { create, get, getSystemData } from './database.js';

export let USER_DATA;
export let UID;

export function setUserData(value) { USER_DATA = value; }

export async function getUserData(uid?) {
	if (USER_DATA) {
		return USER_DATA;
	}
	if (!uid) {
		uid = await getUID();
	}
	return await get(`usuarios/${uid}`);
}

export function unloadPageUserFunctions() {
	const html = getHTMLpage();
	if (html == "index") {
		openIndexPage("unlogged", 0, 1);
	}
}

export async function signInWithEmailAndPassword() {
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
		displayError(error);
	}
}

export function signOut() {
	UID = null;
	firebase.auth().signOut();
	if (window.location.href.includes("index.html")) {
		openIndexPage("unlogged", 0, 1);
	} else {
		window.location.href = "index.html";
	}
}

export async function registerIfUserNotPresent() {
	const user = firebase.auth().currentUser;

	if (!user) {
		signOut();
		displayError(translate("messages.errors.unauthenticated"));
		return;
	}

	const userDoc = await get(`usuarios/${user.uid}`);
	const systemData = await getSystemData();
	const registrationOpen = systemData?.registrationOpen == true;

	if (!userDoc && !registrationOpen) {
		signOut();
		const title = "Você chegou muito cedo! 😅";
		const content =
			"Olá! O TripViewer não está aceitando novos registros. Estamos trabalhando para lançar a primeira versão pública da aplicação. Fique atento para novidades! 🚀";
		displayMessage(title, content);
		return;
	}

	if (!userDoc && registrationOpen) {
		await create(
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
		return Promise.reject("User is not authenticated.");
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
