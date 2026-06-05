import { _getIdFromObjectDB, _getURLParam } from "../pages/data.js";
import { _displayError } from "../pages/messages.js";

export let DOCUMENT_ID;
export let ERROR_FROM_GET_REQUEST = {};

const DATABASE_TRIP_DOCUMENTS = ["viagens", "destinos", "listagens"];
const DATABASE_EDITABLE_DOCUMENTS = [
	"viagens",
	"destinos",
	"listagens",
	"gastos",
	"protegido",
];

// Constructors
export function buildDatabaseObject(success, message = "", data = {}) {
	return {
		success: success,
		data: data,
		message: message,
	};
}

// Generic Methods
export async function get(path, treatError = true, hideWarn = false) {
	try {
		const docRef = firebase.firestore().doc(path);
		const snapshot = await docRef.get();

		if (snapshot.exists) {
			return snapshot.data();
		} else if (!hideWarn) {
			const message = `Document not found: ${path}`;
			console.warn(message);
			return;
		}
	} catch (error) {
		if (treatError) {
			console.error(error.message);
			ERROR_FROM_GET_REQUEST = error;
			return;
		} else throw error;
	}
}

export async function hasReadPermission(path) {
	try {
		const docRef = firebase.firestore().doc(path);
		const snapshot = await docRef.get();

		if (!snapshot.exists) {
			console.warn(
				`Document has reading permissions, but it was not found: ${path}`,
			);
		}

		return true;
	} catch (e) {
		return false;
	}
}

export async function create(collection, data, docName = "") {
	try {
		let docRef = "";
		if (!docName) {
			docRef = await firebase.firestore().collection(collection).add(data);
		} else {
			docRef = await firebase
				.firestore()
				.collection(collection)
				.doc(docName)
				.set(data);
		}
		return buildDatabaseObject(
			true,
			translate("messages.documents.create.success"),
			docRef,
		);
	} catch (error) {
		console.error(error.message);
		return buildDatabaseObject(
			false,
			`${translate("messages.documents.create.error")}: ${error.message}`,
		);
	}
}

export async function deepCreate(path, data, docId = "") {
	try {
		let docRef;

		if (!docId) {
			// Auto-generate document ID
			docRef = await firebase.firestore().collection(path).add(data);
		} else {
			// Specify custom document ID (supports deeper paths)
			docRef = firebase.firestore().doc(`${path}/${docId}`);
			await docRef.set(data);
		}

		return buildDatabaseObject(
			true,
			translate("messages.documents.create.success"),
			docRef,
		);
	} catch (error) {
		console.error(error.message);
		return buildDatabaseObject(
			false,
			`${translate("messages.documents.create.error")}: ${error.message}`,
		);
	}
}

export async function update(path, newData) {
	const docRef = firebase.firestore().doc(path);
	try {
		const update = await docRef.update(newData);
		return buildDatabaseObject(
			true,
			translate("messages.documents.update.success"),
			update,
		);
	} catch (error) {
		console.error(error.message);
		return buildDatabaseObject(
			false,
			`${translate("messages.documents.update.error")}: ${error.message}`,
		);
	}
}

export async function override(path, newData) {
	const docRef = firebase.firestore().doc(path);
	try {
		await docRef.set(newData, { merge: false });
		return buildDatabaseObject(
			true,
			translate("messages.documents.replace.success"),
		);
	} catch (error) {
		console.error(error.message);
		return buildDatabaseObject(
			false,
			`${translate("messages.documents.replace.error")}: ${error.message}`,
		);
	}
}

export async function delete(path, ignoreError = false) {
	const docRef = firebase.firestore().doc(path);
	try {
		const deleteObj = await docRef.delete();
		return buildDatabaseObject(
			true,
			translate("messages.documents.delete.success"),
			deleteObj,
		);
	} catch (error) {
		if (ignoreError) {
			buildDatabaseObject(
				true,
				translate("messages.documents.delete.success"),
			);
		}
		console.error(error.message);
		return buildDatabaseObject(
			false,
			`${translate("messages.documents.delete.error")}: ${error.message}`,
		);
	}
}

// Business logic functions
export function createBatchOps() {
	const db = firebase.firestore();
	const batch = db.batch();
	const ops = [];

	function ref(path) {
		return db.doc(path);
	}

	function track(type, path, data) {
		ops.push({ type, path, data });
	}

	return {
		create(path, data) {
			const docRef = db.collection(path).doc(); // auto ID generated now
			batch.set(docRef, data, { merge: false });
			track("set", docRef.path, data);
			return docRef.id;
		},

		set(path, data) {
			batch.set(ref(path), data, { merge: true });
			track("set", path, data);
		},

		overwrite(path, data) {
			batch.set(ref(path), data, { merge: false });
			track("overwrite", path, data);
		},

		update(path, data) {
			batch.update(ref(path), data);
			track("update", path, data);
		},

		delete(path) {
			batch.delete(ref(path));
			track("delete", path);
		},

		commit: async () => {
			console.log("[Firestore batch] Operations to commit:", ops);

			try {
				await batch.commit();
				return {
					success: true,
					operations: ops.length,
				};
			} catch (error) {
				console.error("[Firestore batch] Commit failed:", {
					error,
					operations: ops,
				});

				return {
					success: false,
					error: error.message,
					operations: ops,
				};
			}
		},
	};
}

export async function getSingleData(type) {
	let data;
	try {
		data = await get(`${type}/${getURLParam(type[0])}`);
		if (!data) {
			displayError(
				`${translate("messages.documents.get.error")}. ${translate(translate("messages.documents.get.no_code"))}`,
			);
		}
		if (
			["viagens", "listagens"].includes(type) &&
			data?.destinos &&
			data.destinos.length > 0
		) {
			data = await getTripDataWithDestinations(data);
		}
	} catch (error) {
		console.error("Error fetching data from Firestore:", error.message);
	}

	return data;
}

export async function getTripDataWithDestinations(tripData) {
	for (let i = 0; i < tripData?.destinos?.length; i++) {
		let place;
		try {
			place = await get(`destinos/${tripData.destinos[i].destinosID}`, false);
			tripData.destinos[i].destinos = place;
		} catch (e) {
			console.warn(
				`Unable to get destination ${tripData.destinos[i].destinosID}: ${e.message}`,
			);
			tripData.destinos.splice(i, 1);
		}
	}
	return tripData;
}

export async function getSystemData() {
	const systemData = await get("config/system");
	return systemData;
}

export async function deleteUserObjectDB(id, type) {
	const uid = await getUID();
	if (uid) {
		const userData = await getUserData(uid);
		let dataArray = userData[type];
		dataArray = dataArray.filter((item) => item !== id);

		let result = {};
		result[type] = dataArray;

		update(`usuarios/${uid}/`, result);

		return await delete(`${type}/${id}`);
	}
}

export async function deleteAccount() {
	const uid = await getUID();
	if (uid) {
		await deleteAccountDocuments();
		await delete(`usuarios/${uid}`);
		await firebase.auth().currentUser.delete();
	}
}

export async function deleteAccountDocuments() {
	const uid = await getUID();
	const userData = await getUserData(uid);

	const deleteOps = [];

	const safePushDelete = (ref) => {
		deleteOps.push(
			ref.delete().then(
				() => console.log("Deleted:", ref.path),
				(err) => console.warn("⚠️ Failed:", ref.path, err.message),
			),
		);
	};

	// --- CASE A: destinos + listagens ---
	for (const type of ["destinos", "listagens"]) {
		const ids = userData[type] ?? [];
		for (const id of ids) {
			const ref = firebase.firestore().collection(type).doc(id);
			safePushDelete(ref);
		}
		userData[type] = [];
	}

	// --- CASE B: viagens ---
	if (Array.isArray(userData.viagens)) {
		for (const viagemID of userData.viagens) {
			const refViagem = firebase
				.firestore()
				.collection("viagens")
				.doc(viagemID);
			safePushDelete(refViagem);

			const protRef = firebase
				.firestore()
				.collection("protegido")
				.doc(viagemID);

			// Read protRef (read must be awaited, deletes can be parallel)
			let protSnap = null;
			try {
				protSnap = await protRef.get();
			} catch (e) {
				console.warn("⚠️ Failed reading:", protRef.path, e.message);
			}

			if (protSnap?.exists) {
				const pin = protSnap.data()?.pin;

				if (pin) {
					safePushDelete(
						firebase.firestore().doc(`viagens/protected/${pin}/${viagemID}`),
					);
					safePushDelete(
						firebase.firestore().doc(`gastos/protected/${pin}/${viagemID}`),
					);
				}

				safePushDelete(protRef);
			} else {
				const gastosRef = firebase
					.firestore()
					.collection("gastos")
					.doc(viagemID);
				safePushDelete(gastosRef);
			}
		}

		userData.viagens = [];
	}

	// --- Update user object individually (not batched) ---
	const userRef = firebase.firestore().collection("usuarios").doc(uid);
	deleteOps.push(
		userRef.update(userData).then(
			() => console.log("Updated user:", userRef.path),
			(err) =>
				console.warn("⚠️ Failed updating user:", userRef.path, err.message),
		),
	);

	console.log("Running all delete ops...");
	await Promise.allSettled(deleteOps);
}

export async function addToUserArray(type, value) {
	const uid = await getUID();
	if (uid) {
		const userDoc = await get(`usuarios/${uid}`);
		if (userDoc) {
			let list = userDoc[type];
			if (!list) {
				list = [];
			}
			if (!list.includes(value)) {
				list.push(value);
				await update(`usuarios/${uid}`, {
					[type]: list,
				});
			}
			console.log("User data updated successfully");
		}
	}
}

export async function newUserObjectDB(object, type) {
	if (await getUID()) {
		const result = await create(type, object);
		console.log(`Document created in ${type}:`);
		console.log(result);
		if (result.data) {
			const id = getIdFromObjectDB(result);
			addToUserArray(type, id);
			return result;
		}
	} else return translate("messages.unauthenticated");
}

export async function getPermissoes() {
	// Seing permissions is only for Front-End purposes. Security is handled by Firebase Rules
	const uid = await getUID();
	if (uid) {
		const userData = await getUserData(uid);
		return userData?.permissoes;
	}
}

export async function getDestination(id, containerID) {
	if (DESTINOS_ATIVOS[id]) return DESTINOS_ATIVOS[id];

	let content, preloader, isAlreadyLoading;
	if (containerID) {
		const container = getID(containerID);
		content = container.querySelector(".content");
		preloader = container.querySelector(".preloader");

		content.style.display = "none";
		preloader.style.display = "block";
	} else {
		isAlreadyLoading = isAlreadyLoading();
		if (!isAlreadyLoading) {
			startLoadingScreen();
		}
	}

	try {
		DESTINOS_ATIVOS[id] = await get(`destinos/${id}`);
		return DESTINOS_ATIVOS[id];
	} finally {
		if (containerID) {
			content.style.display = "block";
			preloader.style.display = "none";
		} else if (!isAlreadyLoading) {
			stopLoadingScreen();
		}
	}
}

// Helpers (Not database related)
export function haveErrorFromGetRequest() {
	return Object.keys(ERROR_FROM_GET_REQUEST).length > 0;
}

// BACKWARD COMPAT: attach to window during migration
window.DOCUMENT_ID = DOCUMENT_ID;
window.ERROR_FROM_GET_REQUEST = ERROR_FROM_GET_REQUEST;
window.buildDatabaseObject = buildDatabaseObject;
window.get = get;
window.hasReadPermission = hasReadPermission;
window.create = create;
window.deepCreate = deepCreate;
window.update = update;
window.override = override;
window.delete = delete;
window.createBatchOps = createBatchOps;
window.getSingleData = getSingleData;
window.getTripDataWithDestinations = getTripDataWithDestinations;
window.getSystemData = getSystemData;
window.deleteUserObjectDB = deleteUserObjectDB;
window.deleteAccount = deleteAccount;
window.deleteAccountDocuments = deleteAccountDocuments;
window.addToUserArray = addToUserArray;
window.newUserObjectDB = newUserObjectDB;
window.getPermissoes = getPermissoes;
window.getDestination = getDestination;
window.haveErrorFromGetRequest = haveErrorFromGetRequest;
