import { startLoadingScreen, stopLoadingScreen } from '../utils/loading.js';
import { displayError, displayFullMessage, displayMessage, openToast, MESSAGE_PROPERTIES } from '../utils/messages.js';
import { translate } from '../i18n/translation.js';
import { getUID } from '../data/firebase/auth.js';
import { cloneObject } from '../utils/dom.js';
import {
	getUserTripSummaries,
	getUserDestinationSummaries,
	getUserListingSummaries,
} from '../data/firebase/database.js';

/**
 * Import one or more documents from the exported-docs JSON structure.
 *
 * The exported-docs format depends on _meta.type:
 *
 * Trip:
 * {
 *   _meta: { type: "trip", ... },
 *   trip: { ... },              → trips/{newId}
 *   accommodations: { ... },    → trips/{newId}/accommodations/{id}
 *   transportation: { ... },    → trips/{newId}/transportation/{id}
 *   itinerary: { ... },         → trips/{newId}/itinerary/{dayId}
 *   expenses: { ... },          → expenses/{newId}  (same ID as trip)
 *   destinations: { ... }       → destinations/{newDestId} (new IDs generated)
 *   protected: { ... }          → trips/protected/{pin}/{newId} & expenses/protected/{pin}/{newId}
 * }
 *
 * Destination:
 * {
 *   _meta: { type: "destination", ... },
 *   destination: { ... }        → destinations/{newId}
 * }
 *
 * Listing:
 * {
 *   _meta: { type: "listing", ... },
 *   listing: { ... },           → listings/{newId}
 *   destinations: { ... }       → destinations/{newDestId} (new IDs generated)
 * }
 */

const SUBCOLLECTION_MAP = {
	accommodations: 'accommodations',
	transportation: 'transportation',
	itinerary: 'itinerary',
} as const;

// ============================================================
// Parsed File + Conflict Info
// ============================================================

interface ParsedFile {
	fileName: string;
	data: Record<string, any>;
	docType: string;        // 'trip' | 'destination' | 'listing'
	title: string;           // display title from the doc
	hasDestinations: boolean; // true if this doc embeds destinations
}

interface ConflictItem {
	fileName: string;
	importedTitle: string;
	existingTitle: string;
	docType: string;
}

interface ConflictCheck {
	allParsed: ParsedFile[];
	conflicts: ConflictItem[];      // all conflicts across all files
	anyComplex: boolean;            // true if any file is a trip/listing with destinations AND all its destinations conflict
}

let pendingFiles: ParsedFile[] = [];
let pendingSkipDestinations: string[] = []; // file names for which to skip destinations

// ============================================================
// Entry Point
// ============================================================

export function importDocumentsOnClickAction() {
	const input = document.getElementById('import-documents-input') as HTMLInputElement;
	if (input) input.click();
}

export async function importDocumentsOnFileSelectionAction(event: Event) {
	const target = event.target as HTMLInputElement;
	const files = target.files;
	if (!files || files.length === 0) return;

	startLoadingScreen();

	// Step 1: Parse all files
	const parsed: ParsedFile[] = [];
	for (const file of Array.from(files)) {
		try {
			const jsonData = await readFileAsJSON(file);
			const docType = detectDocumentType(jsonData);
			if (!docType) {
				console.warn('[import-documents] Skipping file — unknown type:', file.name);
				continue;
			}
			parsed.push({
				fileName: file.name,
				data: jsonData,
				docType,
				title: extractTitle(jsonData, docType),
				hasDestinations: !!(jsonData.destinations && typeof jsonData.destinations === 'object' && Object.keys(jsonData.destinations).length > 0),
			});
		} catch (err) {
			console.error('[import-documents] Failed to parse file:', file.name, err);
		}
	}

	// Reset the input so the same files can be re-selected
	target.value = '';

	if (parsed.length === 0) {
		stopLoadingScreen();
		displayMessage(
			translate('account.import_documents.error_title'),
			translate('account.import_documents.none_imported'),
		);
		return;
	}

	// Step 2: Check for conflicts
	const uid = await getUID();
	if (!uid) {
		stopLoadingScreen();
		return;
	}

	const existingTrips = await getUserTripSummaries(uid);
	const existingDestinations = await getUserDestinationSummaries(uid);
	const existingListings = await getUserListingSummaries(uid);

	const conflicts = findConflicts(parsed, existingTrips, existingDestinations, existingListings);
	const anyComplex = parsed.some((pf) =>
		(pf.docType === 'trip' || pf.docType === 'listing') &&
		pf.hasDestinations &&
		allDestinationsConflict(pf, conflicts),
	);

	stopLoadingScreen();

	if (conflicts.length === 0) {
		// No conflicts — import directly
		await executeImports(parsed, false);
		return;
	}

	// Store for later use in callbacks
	pendingFiles = parsed;
	pendingSkipDestinations = [];

	if (anyComplex) {
		showComplexConflictPrompt(conflicts);
	} else {
		showSimpleConflictPrompt(conflicts);
	}
}

// ============================================================
// Conflict Detection
// ============================================================

function findConflicts(
	parsed: ParsedFile[],
	existingTrips: any[],
	existingDestinations: any[],
	existingListings: any[],
): ConflictItem[] {
	const conflicts: ConflictItem[] = [];

	for (const pf of parsed) {
		const importedTitle = pf.title.toLowerCase().trim();

		// Check main document
		let existingList: any[];
		switch (pf.docType) {
			case 'trip': existingList = existingTrips; break;
			case 'destination': existingList = existingDestinations; break;
			case 'listing': existingList = existingListings; break;
			default: continue;
		}

		const existingMatch = existingList.find((e: any) =>
			(e.title || '').toLowerCase().trim() === importedTitle,
		);
		if (existingMatch) {
			conflicts.push({
				fileName: pf.fileName,
				importedTitle: pf.title,
				existingTitle: existingMatch.title,
				docType: pf.docType,
			});
		}

		// Also check embedded destinations
		if (pf.hasDestinations) {
			const dests = pf.data.destinations as Record<string, any>;
			for (const destData of Object.values(dests)) {
				if (!destData || typeof destData !== 'object') continue;
				const destTitle = (destData.title || '').toLowerCase().trim();
				const destMatch = existingDestinations.find((e: any) =>
					(e.title || '').toLowerCase().trim() === destTitle,
				);
				if (destMatch) {
					conflicts.push({
						fileName: pf.fileName,
						importedTitle: destData.title || '(untitled)',
						existingTitle: destMatch.title,
						docType: 'destination',
					});
				}
			}
		}
	}

	return conflicts;
}

function allDestinationsConflict(pf: ParsedFile, allConflicts: ConflictItem[]): boolean {
	if (!pf.hasDestinations) return false;
	const dests = pf.data.destinations as Record<string, any>;
	const destTitles = Object.values(dests)
		.filter((d: any) => d && typeof d === 'object')
		.map((d: any) => (d.title || '').toLowerCase().trim());

	if (destTitles.length === 0) return false;

	const fileConflicts = allConflicts.filter((c) => c.fileName === pf.fileName && c.docType === 'destination');
	const conflictTitles = fileConflicts.map((c) => c.importedTitle.toLowerCase().trim());

	return destTitles.every((t) => conflictTitles.includes(t));
}

// ============================================================
// Conflict Prompts
// ============================================================

function showSimpleConflictPrompt(conflicts: ConflictItem[]) {
	const properties = cloneObject(MESSAGE_PROPERTIES);
	properties.title = translate('account.import_documents.conflict_title');
	properties.content = buildConflictContent(conflicts);
	properties.buttons = [
		{ type: 'cancel' },
		{ type: 'confirm', label: translate('account.import_documents.override_confirm'), action: () => executeImports(pendingFiles, false) },
	];

	displayFullMessage(properties);
}

function showComplexConflictPrompt(conflicts: ConflictItem[]) {
	const properties = cloneObject(MESSAGE_PROPERTIES);
	properties.title = translate('account.import_documents.conflict_title');
	properties.content = buildConflictContent(conflicts) + `
		<p class="import-conflict-hint">${translate('account.import_documents.complex_hint')}</p>
	`;
	properties.buttons = [
		{ type: 'cancel' },
		{ type: 'confirm', label: translate('account.import_documents.import_main_only'), action: () => executeImports(pendingFiles, true) },
	];

	displayFullMessage(properties);
}

function buildConflictContent(conflicts: ConflictItem[]): string {
	const rows = conflicts.map((c) => {
		const typeLabel = translate(
			c.docType === 'trip' ? 'trip.document' :
			c.docType === 'listing' ? 'listing.document' : 'destination.document',
		);
		return `
			<tr>
				<td class="import-conflict-type">${typeLabel}</td>
				<td class="import-conflict-existing">${escapeHTML(c.existingTitle)}</td>
				<td class="import-conflict-arrow">→</td>
				<td class="import-conflict-imported">${escapeHTML(c.importedTitle)} (${escapeHTML(c.fileName)})</td>
			</tr>
		`;
	}).join('');

	return `
		<p class="import-conflict-desc">${translate('account.import_documents.conflict_desc')}</p>
		<table class="import-conflict-table">
			<thead>
				<tr>
					<th>${translate('labels.type')}</th>
					<th>${translate('account.import_documents.in_db')}</th>
					<th></th>
					<th>${translate('account.import_documents.in_file')}</th>
				</tr>
			</thead>
			<tbody>${rows}</tbody>
		</table>
	`;
}

// ============================================================
// Execute Imports
// ============================================================

async function executeImports(parsed: ParsedFile[], skipAllDestinations: boolean) {
	startLoadingScreen();

	let imported = 0;
	let skipped = 0;

	for (const pf of parsed) {
		try {
			const skipDests = skipAllDestinations && pf.hasDestinations;
			const result = await importSingleDocument(pf.data, skipDests);
			if (result) imported++;
			else skipped++;
		} catch (err) {
			skipped++;
			console.error('[import-documents] Failed to import file:', pf.fileName, err);
		}
	}

	pendingFiles = [];
	pendingSkipDestinations = [];
	stopLoadingScreen();

	if (imported > 0) {
		openToast(translate('account.import_documents.success', { count: String(imported) }));
		setTimeout(() => { location.reload(); }, 3000);
	} else {
		displayMessage(
			translate('account.import_documents.error_title'),
			translate('account.import_documents.none_imported'),
		);
	}
}

// ============================================================
// Helpers
// ============================================================

function readFileAsJSON(file: File): Promise<Record<string, any>> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = (e) => {
			try {
				resolve(JSON.parse((e.target as FileReader).result as string));
			} catch (err) { reject(err); }
		};
		reader.onerror = reject;
		reader.readAsText(file);
	});
}

function detectDocumentType(doc: Record<string, any>): string | null {
	if (doc?._meta?.type && ['trip', 'destination', 'listing'].includes(doc._meta.type)) {
		return doc._meta.type;
	}
	if (doc?.trip && typeof doc.trip === 'object') return 'trip';
	if (doc?.destination && typeof doc.destination === 'object') return 'destination';
	if (doc?.listing && typeof doc.listing === 'object') return 'listing';
	return null;
}

function extractTitle(doc: Record<string, any>, docType: string): string {
	switch (docType) {
		case 'trip': return doc.trip?.title || '';
		case 'destination': return doc.destination?.title || '';
		case 'listing': return doc.listing?.title || '';
		default: return '';
	}
}

function escapeHTML(str: string): string {
	const div = document.createElement('div');
	div.textContent = str;
	return div.innerHTML;
}

// ============================================================
// Import Single Document
// ============================================================

async function importSingleDocument(doc: Record<string, any>, skipDestinations: boolean = false): Promise<boolean> {
	const docType = detectDocumentType(doc);
	if (!docType) {
		console.warn('[import-documents] Skipping file — unknown document type.');
		return false;
	}

	switch (docType) {
		case 'trip':
			return importTrip(doc, skipDestinations);
		case 'destination':
			return importDestination(doc);
		case 'listing':
			return importListing(doc, skipDestinations);
		default:
			return false;
	}
}

// ============================================================
// Import: Trip
// ============================================================

async function importTrip(doc: Record<string, any>, skipDestinations: boolean = false): Promise<boolean> {
	if (!doc?.trip || typeof doc.trip !== 'object') {
		console.warn('[import-documents] Skipping trip — no valid "trip" property found.');
		return false;
	}

	const uid = await getUID();
	const newTripId = firebase.firestore().collection('trips').doc().id;
	const destIdMap: Record<string, string> = {};

	// Map destination IDs (even if skipping, we need to remap refs — but refs will be dropped if skipping)
	if (doc.destinations && typeof doc.destinations === 'object') {
		for (const [oldDestId, destData] of Object.entries(doc.destinations as Record<string, any>)) {
			if (!destData || typeof destData !== 'object') continue;
			if (!skipDestinations) {
				destIdMap[oldDestId] = firebase.firestore().collection('destinations').doc().id;
			}
		}
	}

	const tripData = cloneObject(doc.trip);
	if (!tripData.sharing) tripData.sharing = {};
	tripData.sharing.owner = uid;
	tripData.sharing.active = tripData.sharing.active ?? false;
	tripData.sharing.editors = tripData.sharing.editors ?? [];
	tripData.version = { lastUpdated: new Date().toISOString() };

	// Remap destinationRefs — if skipping, clear them
	if (skipDestinations) {
		tripData.destinationRefs = [];
		delete tripData.destinations;
	} else {
		if (tripData.destinationRefs && Array.isArray(tripData.destinationRefs)) {
			tripData.destinationRefs = tripData.destinationRefs.map((ref: any) => {
				const oldId = ref.id || ref.destinationId;
				return (oldId && destIdMap[oldId]) ? { id: destIdMap[oldId] } : ref;
			});
		}
		if (tripData.destinations && Array.isArray(tripData.destinations)) {
			tripData.destinations = tripData.destinations.map((ref: any) => {
				const oldId = ref.id || ref.destinationId;
				return (oldId && destIdMap[oldId]) ? { id: destIdMap[oldId] } : ref;
			});
		}
	}

	let expensesData: Record<string, any> | null = null;
	if (doc.expenses && typeof doc.expenses === 'object') {
		expensesData = cloneObject(doc.expenses);
		if (!expensesData.sharing) expensesData.sharing = {};
		expensesData.sharing.owner = uid;
		expensesData.sharing.active = expensesData.sharing.active ?? true;
		expensesData.sharing.editors = expensesData.sharing.editors ?? [];
		expensesData.version = { lastUpdated: new Date().toISOString() };
	}

	const ops: Array<{ type: 'set'; ref: any; data?: any; options?: any }> = [];

	// Destination docs (only if not skipping)
	if (!skipDestinations) {
		for (const [oldDestId, destData] of Object.entries(doc.destinations || {})) {
			const newDestId = destIdMap[oldDestId];
			if (!newDestId || !destData || typeof destData !== 'object') continue;
			const importedDest = cloneObject(destData as Record<string, any>);
			if (!importedDest.sharing) importedDest.sharing = {};
			importedDest.sharing.owner = uid;
			importedDest.version = { lastUpdated: new Date().toISOString() };
			ops.push({ type: 'set', ref: firebase.firestore().doc(`destinations/${newDestId}`), data: importedDest });
			ops.push({ type: 'set', ref: firebase.firestore().doc(`users/${uid}/destinationSummaries/${newDestId}`), data: buildDestinationSummary(importedDest) });
		}
	}

	ops.push({ type: 'set', ref: firebase.firestore().doc(`trips/${newTripId}`), data: tripData });

	for (const [key, subName] of Object.entries(SUBCOLLECTION_MAP)) {
		const subData = doc[key];
		if (!subData || typeof subData !== 'object') continue;
		for (const [subId, subDoc] of Object.entries(subData as Record<string, any>)) {
			if (subId.startsWith('_')) continue;
			if (!subDoc || typeof subDoc !== 'object') continue;
			ops.push({ type: 'set', ref: firebase.firestore().doc(`trips/${newTripId}/${subName}/${subId}`), data: subDoc });
		}
	}

	if (expensesData) {
		ops.push({ type: 'set', ref: firebase.firestore().doc(`expenses/${newTripId}`), data: expensesData });
	}

	if (doc.protected && typeof doc.protected === 'object') {
		const prot = doc.protected;
		const pin = prot.pin;
		if (pin && typeof pin === 'string' && pin.length === 4) {
			if (prot.trip && typeof prot.trip === 'object') {
				ops.push({ type: 'set', ref: firebase.firestore().doc(`trips/protected/${pin}/${newTripId}`), data: prot.trip });
			}
			if (prot.expenses && typeof prot.expenses === 'object') {
				const protExp = cloneObject(prot.expenses);
				protExp.pin = pin;
				ops.push({ type: 'set', ref: firebase.firestore().doc(`expenses/protected/${pin}/${newTripId}`), data: protExp });
			}
		}
	}

	ops.push({ type: 'set', ref: firebase.firestore().doc(`users/${uid}/tripSummaries/${newTripId}`), data: buildTripSummary(tripData) });

	await commitInBatches(ops);
	return true;
}

// ============================================================
// Import: Destination
// ============================================================

async function importDestination(doc: Record<string, any>): Promise<boolean> {
	if (!doc?.destination || typeof doc.destination !== 'object') {
		console.warn('[import-documents] Skipping destination — no valid "destination" property found.');
		return false;
	}

	const uid = await getUID();
	const newDestId = firebase.firestore().collection('destinations').doc().id;

	const destData = cloneObject(doc.destination);
	if (!destData.sharing) destData.sharing = {};
	destData.sharing.owner = uid;
	destData.sharing.active = destData.sharing.active ?? false;
	destData.version = { lastUpdated: new Date().toISOString() };

	const ops: Array<{ type: 'set'; ref: any; data?: any }> = [];
	ops.push({ type: 'set', ref: firebase.firestore().doc(`destinations/${newDestId}`), data: destData });
	ops.push({ type: 'set', ref: firebase.firestore().doc(`users/${uid}/destinationSummaries/${newDestId}`), data: buildDestinationSummary(destData) });

	await commitInBatches(ops);
	return true;
}

// ============================================================
// Import: Listing
// ============================================================

async function importListing(doc: Record<string, any>, skipDestinations: boolean = false): Promise<boolean> {
	if (!doc?.listing || typeof doc.listing !== 'object') {
		console.warn('[import-documents] Skipping listing — no valid "listing" property found.');
		return false;
	}

	const uid = await getUID();
	const newListingId = firebase.firestore().collection('listings').doc().id;
	const destIdMap: Record<string, string> = {};

	if (doc.destinations && typeof doc.destinations === 'object') {
		for (const [oldDestId, destData] of Object.entries(doc.destinations as Record<string, any>)) {
			if (!destData || typeof destData !== 'object') continue;
			if (!skipDestinations) {
				destIdMap[oldDestId] = firebase.firestore().collection('destinations').doc().id;
			}
		}
	}

	const listingData = cloneObject(doc.listing);
	if (!listingData.sharing) listingData.sharing = {};
	listingData.sharing.owner = uid;
	listingData.sharing.active = listingData.sharing.active ?? false;
	listingData.sharing.editors = listingData.sharing.editors ?? [];
	listingData.version = {
		lastUpdated: new Date().toISOString(),
		showInDestinations: listingData.version?.showInDestinations ?? false,
	};

	if (skipDestinations) {
		listingData.destinationRefs = [];
		delete listingData.destinations;
	} else {
		if (listingData.destinationRefs && Array.isArray(listingData.destinationRefs)) {
			listingData.destinationRefs = listingData.destinationRefs.map((ref: any) => {
				const oldId = ref.id || ref.destinationId;
				return (oldId && destIdMap[oldId]) ? { id: destIdMap[oldId] } : ref;
			});
		}
		if (listingData.destinations && Array.isArray(listingData.destinations)) {
			listingData.destinations = listingData.destinations.map((ref: any) => {
				const oldId = ref.id || ref.destinationId;
				return (oldId && destIdMap[oldId]) ? { id: destIdMap[oldId] } : ref;
			});
		}
	}

	const ops: Array<{ type: 'set'; ref: any; data?: any }> = [];

	if (!skipDestinations) {
		for (const [oldDestId, destData] of Object.entries(doc.destinations || {})) {
			const newDestId = destIdMap[oldDestId];
			if (!newDestId || !destData || typeof destData !== 'object') continue;
			const importedDest = cloneObject(destData as Record<string, any>);
			if (!importedDest.sharing) importedDest.sharing = {};
			importedDest.sharing.owner = uid;
			importedDest.version = { lastUpdated: new Date().toISOString() };
			ops.push({ type: 'set', ref: firebase.firestore().doc(`destinations/${newDestId}`), data: importedDest });
			ops.push({ type: 'set', ref: firebase.firestore().doc(`users/${uid}/destinationSummaries/${newDestId}`), data: buildDestinationSummary(importedDest) });
		}
	}

	ops.push({ type: 'set', ref: firebase.firestore().doc(`listings/${newListingId}`), data: listingData });
	ops.push({ type: 'set', ref: firebase.firestore().doc(`users/${uid}/listingSummaries/${newListingId}`), data: buildListingSummary(listingData) });

	await commitInBatches(ops);
	return true;
}

// ============================================================
// Summary Builders
// ============================================================

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

function buildDestinationSummary(destData: Record<string, any>): Record<string, any> {
	return {
		title: destData.title || '',
		currency: destData.currency || '',
		version: destData.version || { lastUpdated: new Date().toISOString() },
	};
}

function buildListingSummary(listingData: Record<string, any>): Record<string, any> {
	return {
		title: listingData.title || '',
		subtitle: listingData.subtitle || '',
		description: listingData.description || '',
		image: listingData.image || {},
		colors: listingData.colors || {},
		version: listingData.version || { lastUpdated: new Date().toISOString() },
	};
}

// ============================================================
// Batch Commit
// ============================================================

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
