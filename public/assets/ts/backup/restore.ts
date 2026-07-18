import { startLoadingScreen, stopLoadingScreen } from '../utils/loading.js';
import {
	closeMessage,
	displayError,
	displayMessage,
	displayPrompt,
	openToast,
} from '../utils/messages.js';
import { translate } from '../i18n/translation.js';
import { getUID, USER_DATA } from '../data/firebase/auth.js';
import { DATABASE_EDITABLE_DOCUMENTS } from '../data/firebase/database.js';
import { cloneObject } from '../utils/dom.js';
import { normalizeLegacyJson } from './normalize.js';

export async function restoreOnClickAction() {
	const title = translate('account.restore.title');
	const content = translate('account.restore.prompt');
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
			displayError(translate('messages.documents.get.error'));
			console.error(err);
		}
	};
	reader.readAsText(file);
}

export function openRestoreFilePicker() {
	document.getElementById('restore-account-input').click();
}

async function restoreAccountData(restore) {
	closeMessage();
	startLoadingScreen();

	// Normalize legacy (Portuguese) JSON if detected
	const normalized = normalizeLegacyJson(restore);
	if (normalized._normalizationMeta?.wasLegacy) {
		console.log(
			`[restore] Legacy JSON normalized: ${normalized._normalizationMeta.fieldsRenamed} fields, ${normalized._normalizationMeta.valuesTranslated} values.`,
		);
	}

	if (!isRestoreValid(normalized)) {
		displayMessage(
			translate('account.restore.error_title'),
			translate('account.restore.invalid_file'),
		);
		return;
	}

	// Fix ownership: if sharing.owner doesn't match the current user, update it
	const uid = await getUID();
	const ownershipFixed = fixRestoreOwnership(normalized, uid);
	if (ownershipFixed > 0) {
		console.log(
			`[restore] Fixed sharing.owner on ${ownershipFixed} document(s) to match current user.`,
		);
	}

	try {
		await restoreAccount(normalized);

		// Show success toast with optional ownership note
		const successMsg = ownershipFixed > 0
			? translate('account.restore.owner_updated', { count: String(ownershipFixed) })
			: translate('account.restore.success');
		openToast(successMsg);

		// Keep the loading screen visible — the page will auto-refresh shortly.
		setTimeout(() => {
			location.reload();
		}, 5000);
	} catch (err) {
		console.error('Restoration failed:', err);
		stopLoadingScreen();
		displayError(err.message || translate('account.restore.error_title'));
	}
}

function isRestoreValid(restore) {
	const REQUIRED_KEYS = ['destinations', 'expenses', 'listings', 'protected', 'trips'];

	// Basic type check
	if (!restore || typeof restore !== 'object') return false;

	// All required keys must exist
	if (!REQUIRED_KEYS.every((key) => key in restore)) return false;

	// Basic structure check for each group
	for (const key of REQUIRED_KEYS) {
		const group = restore[key];
		if (typeof group !== 'object' || group === null) return false;
	}

	return true;
}

/**
 * Walk all documents in the restore payload and update sharing.owner
 * to match the current user's UID where it differs.
 * Returns the number of documents that were fixed.
 */
function fixRestoreOwnership(restore, uid: string): number {
	const REQUIRED_KEYS = ['destinations', 'expenses', 'listings', 'protected', 'trips'];
	let fixed = 0;

	for (const key of REQUIRED_KEYS) {
		const group = restore[key];
		if (!group || typeof group !== 'object') continue;

		for (const docID in group) {
			if (docID === 'protected') {
				fixed += fixProtectedOwnership(group.protected);
				continue;
			}

			if (fixDocOwnership(group[docID])) fixed++;
		}
	}

	return fixed;

	function fixDocOwnership(doc): boolean {
		if (!doc || typeof doc !== 'object') return false;
		const sharing = doc.sharing;
		if (!sharing || typeof sharing !== 'object') return false;
		if (sharing.owner === uid) return false;
		sharing.owner = uid;
		return true;
	}

	function fixProtectedOwnership(protectedGroup): number {
		if (!protectedGroup || typeof protectedGroup !== 'object') return 0;
		let count = 0;
		for (const pin in protectedGroup) {
			const pinGroup = protectedGroup[pin];
			if (!pinGroup || typeof pinGroup !== 'object') continue;
			for (const docID in pinGroup) {
				if (fixDocOwnership(pinGroup[docID])) count++;
			}
		}
		return count;
	}
}

async function restoreAccount(restore) {
	const uid = await getUID();

	console.log('Preparing delete operations...');
	const deleteOps = await collectDeleteOps(uid);
	console.log(`${deleteOps.length} delete operations.`);

	console.log('Executing delete batches...');
	await commitInChunks(deleteOps);
	console.log('Deletions complete');

	console.log('Preparing create operations...');
	const createOps = await collectCreateOps(restore);
	console.log(`${createOps.length} create operations.`);

	// Add subcollection writes from _subcollections
	const subOps = collectSubcollectionCreateOps(restore);
	if (subOps.length > 0) {
		console.log(`${subOps.length} subcollection create operations.`);
		createOps.push(...subOps);
	}

	console.log('Executing create batches...');
	await commitInChunks(createOps);
	console.log('Restoration complete');

	// Write user summary subcollections (tripSummaries, destinationSummaries, listingSummaries)
	const summaryOps = collectUserSummaryOps(restore, uid);
	if (summaryOps.length > 0) {
		console.log(`${summaryOps.length} user summary operations.`);
		await commitInChunks(summaryOps);
		console.log('User summaries complete');
	}

	console.log('Preparing user update...');
	const userUpdateOp = collectUserUpdateOp(restore, uid);

	console.log('Executing user update...');
	await commitInChunks([userUpdateOp]);
	console.log('User update complete');

	console.log('All operations finished successfully');

	async function commitInChunks(ops, chunkSize = 450) {
		for (let i = 0; i < ops.length; i += chunkSize) {
			const batch = firebase.firestore().batch();
			const slice = ops.slice(i, i + chunkSize);

			for (const op of slice) {
				if (op.type === 'delete') {
					batch.delete(op.ref);
				} else if (op.type === 'set') {
					batch.set(op.ref, op.data, op.options || {});
				}
			}

			await batch.commit();
		}
	}

	async function collectDeleteOps(uid) {
		const userData = cloneObject(USER_DATA);
		const ops = [];

		const pushDelete = (ref) => ops.push({ type: 'delete', ref });

		// --- Delete user summary subcollections ---
		for (const sub of ['tripSummaries', 'destinationSummaries', 'listingSummaries']) {
			try {
				const subSnap = await firebase
					.firestore()
					.collection(`users/${uid}/${sub}`)
					.get();
				subSnap.forEach((doc) => pushDelete(doc.ref));
			} catch {
				// Subcollection may not exist
			}
		}

		// --- CASE A: destinations + listings ---
		for (const type of ['destinations', 'listings']) {
			const data = userData[type] ?? [];
			for (const id in data) pushDelete(firebase.firestore().collection(type).doc(id));
			userData[type] = [];
		}

		// --- CASE B: trips (+ protected / expenses, + subcollections) ---
		if (Array.isArray(userData.trips)) {
			for (const tripID in userData.trips) {
				// Main trip
				pushDelete(firebase.firestore().collection('trips').doc(tripID));

				// Subcollections: accommodations, transportation, itinerary
				for (const sub of ['accommodations', 'transportation', 'itinerary']) {
					try {
						const subSnap = await firebase
							.firestore()
							.collection(`trips/${tripID}/${sub}`)
							.get();
						subSnap.forEach((doc) => pushDelete(doc.ref));
					} catch {
						// Subcollection may not exist
					}
				}

				const protRef = firebase.firestore().collection('protected').doc(tripID);

				// Try read for protected
				let protSnap = null;
				try {
					protSnap = await protRef.get();
				} catch {}

				if (protSnap?.exists) {
					const pin = protSnap.data()?.pin;

					if (pin) {
						pushDelete(firebase.firestore().doc(`trips/protected/${pin}/${tripID}`));
						pushDelete(firebase.firestore().doc(`expenses/protected/${pin}/${tripID}`));
					}

					pushDelete(protRef);
				} else {
					// Fallback normal expenses/<tripID>
					pushDelete(firebase.firestore().collection('expenses').doc(tripID));
				}
			}

			userData.trips = [];
		}

		// Finally update the user document
		ops.push({
			type: 'set',
			ref: firebase.firestore().collection('users').doc(uid),
			data: userData,
		});

		return ops;
	}

	async function collectCreateOps(restore) {
		const ops = [];

		const pushCreate = (ref, data, options?) => ops.push({ type: 'set', ref, data, options });

		for (const type of DATABASE_EDITABLE_DOCUMENTS) {
			const group = restore?.[type];
			if (!group) continue;

			for (const docID of Object.keys(group)) {
				if (docID === 'protected') {
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

	/**
	 * Collect write operations for subcollection data.
	 * Reads from restore._subcollections.trips[tripId].{accommodations,transportation,itinerary}
	 */
	function collectSubcollectionCreateOps(restore) {
		const ops = [];
		const pushCreate = (ref, data, options?) => ops.push({ type: 'set', ref, data, options });

		const scTrips = restore?._subcollections?.trips;
		if (!scTrips || typeof scTrips !== 'object') return ops;

		for (const [tripId, subData] of Object.entries(scTrips as Record<string, any>)) {
			if (!subData || typeof subData !== 'object') continue;

			// Accommodations
			const accs = subData.accommodations;
			if (accs && typeof accs === 'object') {
				for (const [accId, accDoc] of Object.entries(accs)) {
					pushCreate(
						firebase.firestore().doc(`trips/${tripId}/accommodations/${accId}`),
						accDoc,
					);
				}
			}

			// Transportation
			const trans = subData.transportation;
			if (trans && typeof trans === 'object') {
				for (const [legId, legDoc] of Object.entries(trans)) {
					pushCreate(
						firebase.firestore().doc(`trips/${tripId}/transportation/${legId}`),
						legDoc,
					);
				}
			}

			// Itinerary
			const itin = subData.itinerary;
			if (itin && typeof itin === 'object') {
				for (const [dayId, dayDoc] of Object.entries(itin)) {
					pushCreate(
						firebase.firestore().doc(`trips/${tripId}/itinerary/${dayId}`),
						dayDoc,
					);
				}
			}
		}

		return ops;
	}

	/**
	 * Collect write operations for user summary subcollections.
	 * Reads from restore.user.{trips,destinations,listings} and writes to:
	 *   users/{uid}/tripSummaries/{id}
	 *   users/{uid}/destinationSummaries/{id}
	 *   users/{uid}/listingSummaries/{id}
	 *
	 * These subcollections are what the home page reads to render the trip/listing cards.
	 */
	function collectUserSummaryOps(restore, uid: string) {
		const ops = [];
		const pushCreate = (ref, data) => ops.push({ type: 'set', ref, data });

		const userData = restore?.user;
		if (!userData || typeof userData !== 'object') return ops;

		// Trip summaries → users/{uid}/tripSummaries/{tripId}
		const trips = userData.trips;
		if (trips && typeof trips === 'object') {
			for (const [tripId, summary] of Object.entries(trips as Record<string, any>)) {
				if (!summary || typeof summary !== 'object') continue;
				pushCreate(
					firebase.firestore().doc(`users/${uid}/tripSummaries/${tripId}`),
					summary,
				);
			}
		}

		// Destination summaries → users/{uid}/destinationSummaries/{destId}
		const destinations = userData.destinations;
		if (destinations && typeof destinations === 'object') {
			for (const [destId, summary] of Object.entries(destinations as Record<string, any>)) {
				if (!summary || typeof summary !== 'object') continue;
				pushCreate(
					firebase.firestore().doc(`users/${uid}/destinationSummaries/${destId}`),
					summary,
				);
			}
		}

		// Listing summaries → users/{uid}/listingSummaries/{listingId}
		const listings = userData.listings;
		if (listings && typeof listings === 'object') {
			for (const [listingId, summary] of Object.entries(listings as Record<string, any>)) {
				if (!summary || typeof summary !== 'object') continue;
				pushCreate(
					firebase.firestore().doc(`users/${uid}/listingSummaries/${listingId}`),
					summary,
				);
			}
		}

		return ops;
	}

	function collectUserUpdateOp(restore, uid) {
		const patch = buildUserUpdateFromRestore(restore);

		return {
			type: 'set',
			ref: firebase.firestore().collection('users').doc(uid),
			data: patch,
			options: { merge: true },
		};
	}

	function buildUserUpdateFromRestore(restore) {
		const patch = {};
		const types = ['trips', 'destinations', 'listings'];

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
