import { startLoadingScreen, stopLoadingScreen } from '../utils/loading.js';
import { displayError, displayMessage, openToast } from '../utils/messages.js';
import { translate } from '../i18n/translation.js';
import { getUID } from '../data/firebase/auth.js';
import { cloneObject } from '../utils/dom.js';

/**
 * Import one or more trip documents from the exported-docs JSON structure.
 *
 * The exported-docs format is:
 * {
 *   _meta: { ... },
 *   trip: { ... },              → trips/{newId}
 *   accommodations: { ... },    → trips/{newId}/accommodations/{id}
 *   transportation: { ... },    → trips/{newId}/transportation/{id}
 *   itinerary: { ... },         → trips/{newId}/itinerary/{dayId}
 *   expenses: { ... }           → expenses/{newId}  (same ID as trip)
 * }
 */

const SUBCOLLECTION_MAP = {
	accommodations: 'accommodations',
	transportation: 'transportation',
	itinerary: 'itinerary',
} as const;

export function importDocumentsOnClickAction() {
	const input = document.getElementById('import-documents-input') as HTMLInputElement;
	if (input) input.click();
}

export async function importDocumentsOnFileSelectionAction(event: Event) {
	const target = event.target as HTMLInputElement;
	const files = target.files;
	if (!files || files.length === 0) return;

	startLoadingScreen();

	let imported = 0;
	let skipped = 0;

	for (const file of Array.from(files)) {
		try {
			const jsonData = await readFileAsJSON(file);
			const result = await importSingleDocument(jsonData);
			if (result) imported++;
			else skipped++;
		} catch (err) {
			skipped++;
			console.error('[import-documents] Failed to import file:', file.name, err);
		}
	}

	// Reset the input so the same files can be re-selected
	target.value = '';

	if (imported > 0) {
		openToast(translate('account.import_documents.success', { count: String(imported) }));
		// Reload the page after a short delay
		setTimeout(() => {
			location.reload();
		}, 3000);
	} else {
		stopLoadingScreen();
		displayMessage(
			translate('account.import_documents.error_title'),
			translate('account.import_documents.none_imported'),
		);
	}
}

function readFileAsJSON(file: File): Promise<Record<string, any>> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = (e) => {
			try {
				resolve(JSON.parse((e.target as FileReader).result as string));
			} catch (err) {
				reject(err);
			}
		};
		reader.onerror = reject;
		reader.readAsText(file);
	});
}

/**
 * Import a single document. Returns true on success, false if skipped.
 */
async function importSingleDocument(doc: Record<string, any>): Promise<boolean> {
	// Validate the document has at least a trip
	if (!doc?.trip || typeof doc.trip !== 'object') {
		console.warn('[import-documents] Skipping file — no valid "trip" property found.');
		return false;
	}

	const uid = await getUID();
	const newTripId = firebase.firestore().collection('trips').doc().id;

	// 1. Prepare trip document — set owner, update version
	const tripData = cloneObject(doc.trip);
	if (!tripData.sharing) tripData.sharing = {};
	tripData.sharing.owner = uid;
	tripData.sharing.active = tripData.sharing.active ?? false;
	tripData.sharing.editors = tripData.sharing.editors ?? [];
	tripData.version = {
		lastUpdated: new Date().toISOString(),
	};

	// 2. Prepare expenses document — set owner, use same ID as trip
	let expensesData: Record<string, any> | null = null;
	if (doc.expenses && typeof doc.expenses === 'object') {
		expensesData = cloneObject(doc.expenses);
		if (!expensesData.sharing) expensesData.sharing = {};
		expensesData.sharing.owner = uid;
		expensesData.sharing.active = expensesData.sharing.active ?? true;
		expensesData.sharing.editors = expensesData.sharing.editors ?? [];
		expensesData.version = {
			lastUpdated: new Date().toISOString(),
		};
	}

	// 3. Build all write operations
	const ops: Array<{ type: 'set'; ref: any; data?: any; options?: any }> = [];

	// Main trip document
	ops.push({
		type: 'set',
		ref: firebase.firestore().doc(`trips/${newTripId}`),
		data: tripData,
	});

	// Subcollections: accommodations, transportation, itinerary
	for (const [key, subName] of Object.entries(SUBCOLLECTION_MAP)) {
		const subData = doc[key];
		if (!subData || typeof subData !== 'object') continue;

		for (const [subId, subDoc] of Object.entries(subData as Record<string, any>)) {
			// Skip _settings and other meta keys
			if (subId.startsWith('_')) continue;
			if (!subDoc || typeof subDoc !== 'object') continue;

			ops.push({
				type: 'set',
				ref: firebase.firestore().doc(`trips/${newTripId}/${subName}/${subId}`),
				data: subDoc,
			});
		}
	}

	// Expenses document (same ID as trip, under expenses/ collection)
	if (expensesData) {
		ops.push({
			type: 'set',
			ref: firebase.firestore().doc(`expenses/${newTripId}`),
			data: expensesData,
		});
	}

	// 4. Trip summary for user subcollection
	const tripSummary = buildTripSummary(tripData);
	ops.push({
		type: 'set',
		ref: firebase.firestore().doc(`users/${uid}/tripSummaries/${newTripId}`),
		data: tripSummary,
	});

	// 5. Execute all operations in batches
	await commitInBatches(ops);

	return true;
}

/**
 * Build a TripSummary object for the users/{uid}/tripSummaries subcollection.
 */
function buildTripSummary(tripData: Record<string, any>): Record<string, any> {
	return {
		title: tripData.title || '',
		start: tripData.start || {},
		end: tripData.end || {},
		image: tripData.image?.light || tripData.image?.dark || '',
		colors: tripData.colors || { light: '', dark: '', active: false },
		version: tripData.version || { lastUpdated: new Date().toISOString() },
		pin: tripData.pin || 'no-pin',
		modules: tripData.modules || {},
	};
}

/**
 * Commit write operations in batches (max 450 per batch).
 */
async function commitInBatches(
	ops: Array<{ type: string; ref: any; data?: any; options?: any }>,
	chunkSize = 450,
) {
	for (let i = 0; i < ops.length; i += chunkSize) {
		const batch = firebase.firestore().batch();
		const slice = ops.slice(i, i + chunkSize);

		for (const op of slice) {
			if (op.type === 'set') {
				batch.set(op.ref, op.data, op.options || {});
			}
		}

		await batch.commit();
	}
}
