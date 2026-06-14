import { startLoadingScreen, stopLoadingScreen } from '../utils/loading.js';
import { closeMessage, displayError, displayMessage, displayPrompt, openToast } from '../utils/messages.js';
import { translate } from '../i18n/translation.js';
import { getUID, USER_DATA } from '../data/firebase/auth.js';
import { DATABASE_EDITABLE_DOCUMENTS } from '../data/firebase/database.js';
import { cloneObject } from '../utils/dom.js';

export async function restoreOnClickAction() {
	const title = translate("account.restore.title");
	const content = translate("account.restore.prompt");
	displayPrompt({ title, content, yesAction: openRestoreFilePicker });
}

export function restoreOnFileSelectionAction(event) {
	const file = event.target.files[0];
	if (!file) return;

	const reader = new FileReader();
	reader.onload = function (e) {
		try {
			const jsonData = JSON.parse((e.target as FileReader).result as string);
			restoreAccountData(jsonData);
		} catch (err) {
			stopLoadingScreen();
			displayError(translate("messages.documents.get.error"));
			console.error(err);
		}
	};
	reader.readAsText(file);
}

export function openRestoreFilePicker() {
	document.getElementById("restore-account-input").click();
}

async function restoreAccountData(restore) {
	closeMessage();
	startLoadingScreen();

	if (!isRestoreValid(restore)) {
		displayMessage(
			translate("account.restore.error_title"),
			translate("account.restore.invalid_file"),
		);
		return;
	}

	if (!(await isRestoreOwnerValid(restore))) {
		displayMessage(
			translate("account.restore.error_title"),
			translate("account.restore.incorrect_owner"),
		);
		return;
	}

	try {
		await restoreAccount(restore);
		openToast(translate("account.restore.success"));

		setTimeout(() => {
			location.reload();
		}, 5000);
	} catch (err) {
		console.error("Restoration failed:", err);
		displayError(err.message || translate("account.restore.error_title"));
	} finally {
		stopLoadingScreen();
	}
}

function isRestoreValid(restore) {
	const REQUIRED_KEYS = [
		"destinations",
		"expenses",
		"listings",
		"protected",
		"trips",
	];

	// Basic type check
	if (!restore || typeof restore !== "object") return false;

	// All required keys must exist
	if (!REQUIRED_KEYS.every((key) => key in restore)) return false;

	// Basic structure check for each group
	for (const key of REQUIRED_KEYS) {
		const group = restore[key];
		if (typeof group !== "object" || group === null) return false;
	}

	return true;
}

async function isRestoreOwnerValid(restore) {
	const REQUIRED_KEYS = [
		"destinations",
		"expenses",
		"listings",
		"protected",
		"trips",
	];
	const uid = await getUID();

	// --- Iterate through all document groups ---
	for (const key of REQUIRED_KEYS) {
		const group = restore[key];

		for (const docID in group) {
			if (docID === "protected") {
				if (!hasValidProtectedOwnership(group.protected)) return false;
				continue;
			}

			if (!hasValidOwnership(group[docID])) return false;
		}
	}

	return true;

	// --- Ownership check for normal docs ---
	function hasValidOwnership(doc) {
		const owner = doc?.sharing?.owner;
		return !owner || owner === uid;
	}

	// --- Ownership check for protected docs ---
	function hasValidProtectedOwnership(protectedGroup) {
		for (const pin in protectedGroup) {
			const pinGroup = protectedGroup[pin];
			for (const docID in pinGroup) {
				if (!hasValidOwnership(pinGroup[docID])) {
					return false;
				}
			}
		}
		return true;
	}
}

async function restoreAccount(restore) {
	const uid = await getUID();

	console.log("Preparing delete operations...");
	const deleteOps = await collectDeleteOps(uid);
	console.log(`${deleteOps.length} delete operations.`);

	console.log("Executing delete batches...");
	await commitInChunks(deleteOps);
	console.log("Deletions complete");

	console.log("Preparing create operations...");
	const createOps = await collectCreateOps(restore);
	console.log(`${createOps.length} create operations.`);

	console.log("Executing create batches...");
	await commitInChunks(createOps);
	console.log("Restoration complete");

	console.log("Preparing user update...");
	const userUpdateOp = collectUserUpdateOp(restore, uid);

	console.log("Executing user update...");
	await commitInChunks([userUpdateOp]);
	console.log("User update complete");

	console.log("All operations finished successfully");

	async function commitInChunks(ops, chunkSize = 450) {
		for (let i = 0; i < ops.length; i += chunkSize) {
			const batch = firebase.firestore().batch();
			const slice = ops.slice(i, i + chunkSize);

			for (const op of slice) {
				if (op.type === "delete") {
					batch.delete(op.ref);
				} else if (op.type === "set") {
					batch.set(op.ref, op.data, op.options || {});
				}
			}

			await batch.commit();
		}
	}

	async function collectDeleteOps(uid) {
		const userData = cloneObject(USER_DATA);
		const ops = [];

		const pushDelete = (ref) => ops.push({ type: "delete", ref });

		// --- CASE A: destinations + listings ---
		for (const type of ["destinations", "listings"]) {
			const data = userData[type] ?? [];
			for (const id in data)
				pushDelete(firebase.firestore().collection(type).doc(id));
			userData[type] = [];
		}

		// --- CASE B: trips (+ protected / expenses) ---
		if (Array.isArray(userData.trips)) {
			for (const tripID in userData.trips) {
				// Main trip
				pushDelete(firebase.firestore().collection("trips").doc(tripID));

				const protRef = firebase
					.firestore()
					.collection("protected")
					.doc(tripID);

				// Try read for protected
				let protSnap = null;
				try {
					protSnap = await protRef.get();
				} catch {}

				if (protSnap?.exists) {
					const pin = protSnap.data()?.pin;

					if (pin) {
						pushDelete(
							firebase.firestore().doc(`trips/protected/${pin}/${tripID}`),
						);
						pushDelete(
							firebase.firestore().doc(`expenses/protected/${pin}/${tripID}`),
						);
					}

					pushDelete(protRef);
				} else {
					// Fallback normal expenses/<tripID>
					pushDelete(firebase.firestore().collection("expenses").doc(tripID));
				}
			}

			userData.trips = [];
		}

		// Finally update the user document
		ops.push({
			type: "set",
			ref: firebase.firestore().collection("users").doc(uid),
			data: userData,
		});

		return ops;
	}

	async function collectCreateOps(restore) {
		const ops = [];

		const pushCreate = (ref, data, options?) =>
			ops.push({ type: "set", ref, data, options });

		for (const type of DATABASE_EDITABLE_DOCUMENTS) {
			const group = restore?.[type];
			if (!group) continue;

			for (const docID of Object.keys(group)) {
				if (docID === "protected") {
					const tree = group.protected;

					for (const pin of Object.keys(tree)) {
						for (const innerID of Object.keys(tree[pin])) {
							pushCreate(
								firebase.firestore().doc(`${type}/protected/${pin}/${innerID}`),
								tree[pin][innerID],
							);
						}
					}
					continue;
				}

				pushCreate(firebase.firestore().doc(`${type}/${docID}`), group[docID]);
			}
		}

		return ops;
	}

	function collectUserUpdateOp(restore, uid) {
		const patch = buildUserUpdateFromRestore(restore);

		return {
			type: "set",
			ref: firebase.firestore().collection("users").doc(uid),
			data: patch,
			options: { merge: true },
		};
	}

	function buildUserUpdateFromRestore(restore) {
		const patch = {};
		const types = ["trips", "destinations", "listings"];

		for (const type of types) {
			const group = restore?.user?.[type];
			if (!group || Object.keys(group).length === 0) {
				patch[type] = {};
				continue;
			}

			patch[type] = group;
		}

		return patch;
	}
}
