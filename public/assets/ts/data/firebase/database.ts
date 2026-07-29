import { getID, getURLParams } from '../../utils/dom.js';
import { displayError } from '../../utils/messages.js';
import { isAlreadyLoading, startLoadingScreen, stopLoadingScreen } from '../../utils/loading.js';
import { translate } from '../../i18n/translation.js';
import { getUID } from './auth.js';
import { ACTIVE_DESTINATIONS } from '../../pages/edit-trip/categories/destination.js';
import { getURLParam } from '../../utils/dom.js';
import { DOCUMENT_ID, ERROR_FROM_GET_REQUEST, setErrorFromGetRequest } from '../state.js';
import { incrementReads, incrementWrites } from './counter.js';

// ============================================================
// Collection & Subcollection Name Constants
// ============================================================

export const COLLECTION = {
	USERS: 'users',
	TRIPS: 'trips',
	DESTINATIONS: 'destinations',
	LISTINGS: 'listings',
	EXPENSES: 'expenses',
	PROTECTED: 'protected',
	CONFIG: 'config',
} as const;

export const SUBCOLLECTION = {
	TRIP_SUMMARIES: 'tripSummaries',
	DESTINATION_SUMMARIES: 'destinationSummaries',
	LISTING_SUMMARIES: 'listingSummaries',
	ACCOMMODATIONS: 'accommodations',
	TRANSPORTATION: 'transportation',
	ITINERARY: 'itinerary',
	PROTECTED_TRIPS: 'protected', // under trips/{id}/protected
	PROTECTED_EXPENSES: 'protected', // under expenses/{id}/protected
} as const;

/** Maps collection names to URL param chars (t=trips, d=destinations, l=listings) */
const URL_PARAM_MAP: Record<string, string> = {
	[COLLECTION.TRIPS]: 't',
	[COLLECTION.DESTINATIONS]: 'd',
	[COLLECTION.LISTINGS]: 'l',
};

/** @deprecated Use COLLECTION.TRIPS, COLLECTION.DESTINATIONS, COLLECTION.LISTINGS */
const DATABASE_TRIP_DOCUMENTS = [COLLECTION.TRIPS, COLLECTION.DESTINATIONS, COLLECTION.LISTINGS];

/** @deprecated Use COLLECTION constants */
export const DATABASE_EDITABLE_DOCUMENTS = [
	COLLECTION.TRIPS,
	COLLECTION.DESTINATIONS,
	COLLECTION.LISTINGS,
	COLLECTION.EXPENSES,
	COLLECTION.PROTECTED,
];

// Constructors
export function buildDatabaseObject(success, message = '', data = {}) {
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
		incrementReads(path);

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
			setErrorFromGetRequest(error);
			return;
		} else throw error;
	}
}

export async function hasReadPermission(path) {
	try {
		const docRef = firebase.firestore().doc(path);
		const snapshot = await docRef.get();
		incrementReads(path);

		if (!snapshot.exists) {
			console.warn(`Document has reading permissions, but it was not found: ${path}`);
		}

		return true;
	} catch (e) {
		return false;
	}
}

export async function create(collection, data, docName = '') {
	try {
		let docRef = '';
		if (!docName) {
			docRef = await firebase.firestore().collection(collection).add(data);
		} else {
			docRef = await firebase.firestore().collection(collection).doc(docName).set(data);
		}
		incrementWrites([
			{
				type: 'create',
				path: docName ? `${collection}/${docName}` : `${collection}/${(docRef as any).id}`,
			},
		]);
		return buildDatabaseObject(true, translate('messages.documents.create.success'), docRef);
	} catch (error) {
		console.error(error.message);
		return buildDatabaseObject(
			false,
			`${translate('messages.documents.create.error')}: ${error.message}`,
		);
	}
}

export async function deepCreate(path, data, docId = '') {
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
		incrementWrites([{ type: 'create', path: `${path}/${docId || docRef.id}` }]);
		return buildDatabaseObject(true, translate('messages.documents.create.success'), docRef);
	} catch (error) {
		console.error(error.message);
		return buildDatabaseObject(
			false,
			`${translate('messages.documents.create.error')}: ${error.message}`,
		);
	}
}

export async function update(path, newData) {
	const docRef = firebase.firestore().doc(path);
	try {
		const update = await docRef.update(newData);
		incrementWrites([{ type: 'update', path }]);
		return buildDatabaseObject(true, translate('messages.documents.update.success'), update);
	} catch (error) {
		console.error(error.message);
		return buildDatabaseObject(
			false,
			`${translate('messages.documents.update.error')}: ${error.message}`,
		);
	}
}

export async function override(path, newData) {
	const docRef = firebase.firestore().doc(path);
	try {
		await docRef.set(newData, { merge: false });
		incrementWrites([{ type: 'overwrite', path }]);
		return buildDatabaseObject(true, translate('messages.documents.replace.success'));
	} catch (error) {
		console.error(error.message);
		return buildDatabaseObject(
			false,
			`${translate('messages.documents.replace.error')}: ${error.message}`,
		);
	}
}

export async function deleteDocument(path, ignoreError = false) {
	const docRef = firebase.firestore().doc(path);
	try {
		const deleteObj = await docRef.delete();
		incrementWrites([{ type: 'delete', path }]);
		return buildDatabaseObject(true, translate('messages.documents.delete.success'), deleteObj);
	} catch (error) {
		if (ignoreError) {
			buildDatabaseObject(true, translate('messages.documents.delete.success'));
		}
		console.error(error.message);
		return buildDatabaseObject(
			false,
			`${translate('messages.documents.delete.error')}: ${error.message}`,
		);
	}
}

/** Delete all documents in a Firestore (sub)collection. Returns the count deleted. */
export async function deleteSubcollection(collectionPath: string): Promise<number> {
	const snapshot = await firebase.firestore().collection(collectionPath).get();
	if (snapshot.empty) return 0;

	const batchOps = createBatchOps();
	snapshot.docs.forEach((doc) => batchOps.delete(doc.ref));
	await batchOps.commit();

	incrementWrites(
		snapshot.docs.map((doc) => ({ type: 'delete', path: doc.ref.path })),
	);
	return snapshot.size;
}

// Business logic functions
export function createBatchOps() {
	const db = firebase.firestore();
	const batch = db.batch();
	const ops = [];

	function ref(path) {
		return db.doc(path);
	}

	function track(type, path, data?) {
		ops.push({ type, path, data });
	}

	return {
		create(path, data) {
			const docRef = db.collection(path).doc(); // auto ID generated now
			batch.set(docRef, data, { merge: false });
			track('set', docRef.path, data);
			return docRef.id;
		},

		set(path, data) {
			batch.set(ref(path), data, { merge: true });
			track('set', path, data);
		},

		overwrite(path, data) {
			batch.set(ref(path), data, { merge: false });
			track('overwrite', path, data);
		},

		update(path, data) {
			batch.update(ref(path), data);
			track('update', path, data);
		},

		delete(path) {
			batch.delete(ref(path));
			track('delete', path);
		},

		/** Returns all tracked operations (for dryrun inspection). */
		getOps: () => ops,

		commit: async () => {
			console.log('[Firestore batch] Operations to commit:', ops);

			try {
				await batch.commit();
				incrementWrites(
					ops.map(
						(o) =>
							({ type: o.type, path: o.path }) as {
								type: 'set' | 'update' | 'overwrite' | 'delete' | 'create';
								path: string;
							},
					),
				);
				return {
					success: true,
					operations: ops.length,
				};
			} catch (error) {
				console.error('[Firestore batch] Commit failed:', {
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
		const param = URL_PARAM_MAP[type] || type[0];
		data = await get(`${type}/${getURLParam(param)}`);
		if (!data) {
			displayError(
				`${translate('messages.documents.get.error')}. ${translate(translate('messages.documents.get.no_code'))}`,
			);
		}
		if (
			[COLLECTION.TRIPS, COLLECTION.LISTINGS].includes(type) &&
			(data?.destinationRefs || data?.destinations) &&
			(data?.destinationRefs || data?.destinations)?.length > 0
		) {
			data = await getTripDataWithDestinations(data);
		}
	} catch (error) {
		console.error('Error fetching data from Firestore:', error.message);
	}

	return data;
}

export async function getTripDataWithDestinations(tripData) {
	// Migration 13 renamed 'destinos' → 'destinationRefs' on trip docs.
	const refs = tripData?.destinations || tripData?.destinationRefs;
	if (!refs || refs.length === 0) return tripData;

	// Normalize to the old 'destinations' key so downstream code sees it there.
	if (!tripData.destinations) tripData.destinations = refs;

	const results = await Promise.allSettled(
		refs.map((ref) => get(`${COLLECTION.DESTINATIONS}/${ref.id || ref.destinationId}`, false)),
	);

	results.forEach((result, i) => {
		if (result.status === 'fulfilled' && result.value) {
			tripData.destinations[i].destinations = result.value;
		} else {
			const reason = result.status === 'rejected' ? result.reason?.message : 'not found';
			console.warn(`Unable to get destination ${refs[i].id || refs[i].destinationId}: ${reason}`);
			tripData.destinations.splice(i, 1);
		}
	});

	return tripData;
}

export async function getSystemData() {
	const systemData = await get('config/system');
	return systemData;
}

export async function deleteUserObjectDB(id, type) {
	// Subcollections (tripSummaries, etc.) are managed by the service layer.
	// Legacy user-doc array manipulation removed — summaries live in subcollections only.
	return await deleteDocument(`${type}/${id}`);
}

export async function deleteAccount() {
	const uid = await getUID();
	if (uid) {
		await deleteAccountDocuments();
		await deleteDocument(`${COLLECTION.USERS}/${uid}`);
		await firebase.auth().currentUser.delete();
	}
}

export async function deleteAccountDocuments() {
	const uid = await getUID();

	const deleteOps: Promise<void>[] = [];

	const safePushDelete = (ref: any) => {
		deleteOps.push(
			ref.delete().then(
				() => console.log('Deleted:', ref.path),
				(err: any) => console.warn('⚠️ Failed:', ref.path, err.message),
			),
		);
	};

	// --- Step 1: Discover document IDs from summary subcollections ---
	const summaryIds: Record<string, string[]> = {
		trips: [],
		destinations: [],
		listings: [],
	};

	for (const [type, subName] of [
		['trips', SUBCOLLECTION.TRIP_SUMMARIES],
		['destinations', SUBCOLLECTION.DESTINATION_SUMMARIES],
		['listings', SUBCOLLECTION.LISTING_SUMMARIES],
	] as const) {
		try {
			const subSnap = await firebase
				.firestore()
				.collection(`${COLLECTION.USERS}/${uid}/${subName}`)
				.get();
			subSnap.forEach((doc) => {
				summaryIds[type].push(doc.id);
				safePushDelete(doc.ref); // Delete the summary doc
			});
		} catch {
			// Subcollection may not exist
		}
	}

	// --- Step 2: Delete destinations + listings ---
	for (const type of [COLLECTION.DESTINATIONS, COLLECTION.LISTINGS]) {
		const key = type === COLLECTION.DESTINATIONS ? 'destinations' : 'listings';
		for (const id of summaryIds[key]) {
			safePushDelete(firebase.firestore().collection(type).doc(id));
		}
	}

	// --- Step 3: Delete trips (with protected data, expenses, and subcollections) ---
	for (const tripID of summaryIds.trips) {
		safePushDelete(firebase.firestore().collection(COLLECTION.TRIPS).doc(tripID));

		const protRef = firebase.firestore().collection(COLLECTION.PROTECTED).doc(tripID);
		let protSnap: any = null;
		try {
			protSnap = await protRef.get();
		} catch (e: any) {
			console.warn('⚠️ Failed reading:', protRef.path, e.message);
		}

		if (protSnap?.exists) {
			const pin = protSnap.data()?.pin;
			if (pin) {
				safePushDelete(
					firebase.firestore().doc(`${COLLECTION.TRIPS}/protected/${pin}/${tripID}`),
				);
				safePushDelete(
					firebase.firestore().doc(`${COLLECTION.EXPENSES}/protected/${pin}/${tripID}`),
				);
			}
			safePushDelete(protRef);
		} else {
			safePushDelete(firebase.firestore().collection(COLLECTION.EXPENSES).doc(tripID));
		}
	}

	// --- Step 4: User document is deleted by deleteAccount() after this call ---
	// (Legacy trips/destinations/listings arrays are no longer written here;
	// the user doc itself is deleted in deleteAccount() above.)

	console.log('Running all delete ops...');
	await Promise.allSettled(deleteOps);
}



export async function newUserObjectDB(object, type) {
	if (await getUID()) {
		const result = await create(type, object);
		console.log(`Document created in ${type}:`);
		console.log(result);
		// Note: Summary subcollection management is handled by the service layer
		// (trip.service.ts / destination.service.ts). The legacy addToUserArray
		// call that wrote IDs to users/{uid}.{type} arrays has been removed
		// as of migration 15 — summaries now live in subcollections.
		return result;
	} else return translate('messages.unauthenticated');
}

/** Get user permissions by checking admin/permissions subcollection.
 *  Each permission is represented by a document at
 *  admin/permissions/{permissionType}/{uid} — existence = has permission.
 *  Security is enforced by Firestore rules; this is purely for UI gating. */
export async function getPermissions(): Promise<Record<string, boolean>> {
	const uid = await getUID();
	if (!uid) return {};

	const permissionTypes = ['unlimitedUploadSize', 'upload'];
	const permissions: Record<string, boolean> = {};

	await Promise.all(
		permissionTypes.map(async (type) => {
			try {
				const snap = await firebase
					.firestore()
					.doc(`admin/permissions/${type}/${uid}`)
					.get();
				permissions[type] = snap.exists;
			} catch {
				// If the read fails (e.g. permission denied), default to false
				permissions[type] = false;
			}
		}),
	);

	return permissions;
}

export async function getDestination(id, containerID?) {
	if (ACTIVE_DESTINATIONS[id]) return ACTIVE_DESTINATIONS[id];

	let content, preloader, _alreadyLoading;
	if (containerID) {
		const container = getID(containerID);
		content = container.querySelector('.content');
		preloader = container.querySelector('.preloader');

		content.style.display = 'none';
		preloader.style.display = 'block';
	} else {
		_alreadyLoading = isAlreadyLoading();
		if (!_alreadyLoading) {
			startLoadingScreen();
		}
	}

	try {
		ACTIVE_DESTINATIONS[id] = await get(`${COLLECTION.DESTINATIONS}/${id}`);
		return ACTIVE_DESTINATIONS[id];
	} finally {
		if (containerID) {
			content.style.display = 'block';
			preloader.style.display = 'none';
		} else if (!_alreadyLoading) {
			stopLoadingScreen();
		}
	}
}

// ============================================================
// Subcollection Read Functions (Option B — Optimized Redesign)
// ============================================================

/** Get all accommodations for a trip from trips/{tripId}/accommodations */
export async function getAccommodations(tripId: string): Promise<any[]> {
	const snapshot = await firebase
		.firestore()
		.collection(`${COLLECTION.TRIPS}/${tripId}/${SUBCOLLECTION.ACCOMMODATIONS}`)
		.get();
	return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

/** Get all transportation legs + settings for a trip from trips/{tripId}/transportation */
export async function getTransportation(tripId: string): Promise<{ legs: any[]; settings: any }> {
	const colRef = firebase
		.firestore()
		.collection(`${COLLECTION.TRIPS}/${tripId}/${SUBCOLLECTION.TRANSPORTATION}`);
	const snapshot = await colRef.get();
	const legs: any[] = [];
	let settings: any = { viewMode: 'simple' };
	snapshot.forEach((doc) => {
		if (doc.id === '_settings') {
			settings = doc.data();
		} else {
			legs.push({ id: doc.id, ...doc.data() });
		}
	});
	return { legs, settings };
}

/** Get all itinerary days for a trip from trips/{tripId}/itinerary */
export async function getItinerary(tripId: string): Promise<any[]> {
	const snapshot = await firebase
		.firestore()
		.collection(`${COLLECTION.TRIPS}/${tripId}/${SUBCOLLECTION.ITINERARY}`)
		.get();
	return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

/** Get trip summaries for a user from users/{uid}/tripSummaries */
export async function getUserTripSummaries(uid: string): Promise<any[]> {
	const snapshot = await firebase
		.firestore()
		.collection(`${COLLECTION.USERS}/${uid}/${SUBCOLLECTION.TRIP_SUMMARIES}`)
		.get();
	return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

/** Get destination summaries for a user from users/{uid}/destinationSummaries */
export async function getUserDestinationSummaries(uid: string): Promise<any[]> {
	const snapshot = await firebase
		.firestore()
		.collection(`${COLLECTION.USERS}/${uid}/${SUBCOLLECTION.DESTINATION_SUMMARIES}`)
		.get();
	return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

/** Get listing summaries for a user from users/{uid}/listingSummaries */
export async function getUserListingSummaries(uid: string): Promise<any[]> {
	const snapshot = await firebase
		.firestore()
		.collection(`${COLLECTION.USERS}/${uid}/${SUBCOLLECTION.LISTING_SUMMARIES}`)
		.get();
	return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

/**
 * Get a trip with all subcollections resolved in parallel.
 * Replaces getTripDataWithDestinations for the new subcollection architecture.
 */
export async function getTripComplete(tripId: string): Promise<any> {
	const tripData = await get(`${COLLECTION.TRIPS}/${tripId}`);
	if (!tripData) return null;

	const destinationRefs = tripData.destinationRefs || tripData.destinations;

	let [accommodations, transportation, itinerary, destinations] = await Promise.all([
		getAccommodations(tripId).catch(() => []),
		getTransportation(tripId).catch(() => ({
			legs: [],
			settings: { viewMode: 'simple' },
		})),
		getItinerary(tripId).catch(() => []),
		destinationRefs?.length
			? Promise.all(
					destinationRefs.map(async (ref: any) => {
						const id = ref.id || ref.destinationId;
						const data = await get(`${COLLECTION.DESTINATIONS}/${id}`, false);
						return data ? { id, destinations: data } : null;
					}),
				).then((results) => results.filter(Boolean))
			: Promise.resolve([]),
	]);

	if (!transportation.legs?.length && tripData.transportation?.data?.length) {
		transportation = {
			legs: tripData.transportation.data,
			settings: { viewMode: tripData.transportation.viewMode || 'simple' },
		};
	}

	return {
		...tripData,
		accommodations,
		transportation,
		itinerary,
		destinations,
	};
}

// Helpers (Not database related)
export function haveErrorFromGetRequest() {
	return ERROR_FROM_GET_REQUEST && Object.keys(ERROR_FROM_GET_REQUEST).length > 0;
}
