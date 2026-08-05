import { startLoadingScreen, stopLoadingScreen } from '../utils/loading.js';
import { translate } from '../i18n/translation.js';
import {
	closeMessage,
	displayFullMessage,
	openToast,
	MESSAGE_PROPERTIES,
} from '../utils/messages.js';
import { cloneObject, getID } from '../utils/dom.js';
import { getTimestamp } from '../utils/dates.js';
import { getUID } from '../data/firebase/auth.js';
import {
	getUserTripSummaries,
	getUserDestinationSummaries,
	getUserListingSummaries,
} from '../data/firebase/database.js';

// ============================================================
// Export Document Types
// ============================================================

type DocType = 'trip' | 'destination' | 'listing';

interface DocSummary {
	id: string;
	title: string;
	pin?: string;
	modules?: Record<string, boolean>;
}

interface TypeInfo {
	type: DocType;
	labelKey: string;
	icon: string;
}

const TYPE_OPTIONS: TypeInfo[] = [
	{ type: 'trip', labelKey: 'trip.document', icon: 'tabler:plane-departure' },
	{ type: 'destination', labelKey: 'destination.document', icon: 'material-symbols:location-on' },
	{ type: 'listing', labelKey: 'listing.document', icon: 'fluent:list-28-filled' },
];

// ============================================================
// State for PIN-protected export
// ============================================================

interface ProtectedEntry {
	title: string;
	documentID: string;
	pin: string;
}

let pendingProtectedTrips: ProtectedEntry[] = [];

// ============================================================
// Firestore Helpers
// ============================================================

async function getCollectionDocs(collectionPath: string): Promise<Record<string, any>> {
	try {
		const snap = await firebase.firestore().collection(collectionPath).get();
		const result: Record<string, any> = {};
		snap.forEach((doc) => {
			result[doc.id] = doc.data();
		});
		return result;
	} catch {
		return {};
	}
}

async function getDocument(docPath: string): Promise<Record<string, any> | null> {
	try {
		const snap = await firebase.firestore().doc(docPath).get();
		if (snap.exists) return snap.data();
		return null;
	} catch {
		return null;
	}
}

// ============================================================
// Main Entry Point
// ============================================================

export async function exportDocumentsOnClickAction() {
	showTypeSelectorDialog();
}

// ============================================================
// Type Selector Dialog
// ============================================================

function showTypeSelectorDialog() {
	const properties = cloneObject(MESSAGE_PROPERTIES);
	properties.title = translate('account.export_documents.title');
	properties.content = `
		<div class="export-type-buttons">
			${TYPE_OPTIONS.map((t) => `
				<button class="btn btn-outline-theme export-type-btn" data-export-type="${t.type}">
					<i class="iconify" data-icon="${t.icon}"></i>
					<span>${translate(t.labelKey)}</span>
				</button>
			`).join('')}
		</div>
		<p class="security-warning-text">${translate('account.export_documents.security_warning')}</p>
	`;
	properties.buttons = [{ type: 'cancel' }];
	properties.extraClass = 'export-documents-dialog';

	displayFullMessage(properties);

	setTimeout(() => {
		document.querySelectorAll('.export-type-btn').forEach((btn) => {
			btn.addEventListener('click', function () {
				const docType = (this as HTMLElement).getAttribute('data-export-type') as DocType;
				showDocumentList(docType);
			});
		});
	}, 50);
}

// ============================================================
// Document List Dialog
// ============================================================

let currentExportType: DocType = 'trip';

async function showDocumentList(docType: DocType) {
	currentExportType = docType;
	startLoadingScreen();

	const uid = await getUID();
	if (!uid) {
		stopLoadingScreen();
		return;
	}

	let summaries: DocSummary[] = [];

	switch (docType) {
		case 'trip':
			summaries = await getUserTripSummaries(uid);
			break;
		case 'destination':
			summaries = await getUserDestinationSummaries(uid);
			break;
		case 'listing':
			summaries = await getUserListingSummaries(uid);
			break;
	}

	stopLoadingScreen();

	if (summaries.length === 0) {
		openToast(translate('account.export_documents.no_documents'));
		return;
	}

	summaries.sort((a, b) => (a.title || '').localeCompare(b.title || ''));

	const typeLabel = translate(TYPE_OPTIONS.find((t) => t.type === docType)!.labelKey);
	const properties = cloneObject(MESSAGE_PROPERTIES);
	properties.title = translate('account.export_documents.title') + ' — ' + typeLabel;
	properties.content = '<p class="export-subtitle">' + translate('account.export_documents.select_hint') + '</p>' + buildCheckboxList(summaries, docType);
	properties.extraClass = 'export-documents-dialog';
	properties.fullscreen = true;
	properties.buttons = [
		{ type: 'cancel' },
		{
			type: 'confirm',
			label: translate('account.export_documents.export_button'),
			action: () => handleExportSelected(summaries),
		},
	];

	displayFullMessage(properties);
}

function buildCheckboxList(summaries: DocSummary[], docType: DocType): string {
	const rows = summaries.map((s) => {
		const pinBadge = (docType === 'trip' && s.pin && s.pin !== 'no-pin')
			? ` <span class="export-pin-badge" title="${translate('trip.basic_information.pin.title')}">🔒</span>`
			: '';
		return `
		<label class="export-doc-row">
			<input type="checkbox" class="export-doc-checkbox" value="${s.id}">
			<span class="export-doc-title">${escapeHTML(s.title || translate('account.import_documents.untitled'))}${pinBadge}</span>
		</label>`;
	}).join('');

	return `
		<div class="export-documents-list">
			<label class="export-doc-row export-doc-select-all">
				<input type="checkbox" id="export-doc-select-all" class="export-doc-checkbox" onchange="document.querySelectorAll('.export-doc-checkbox').forEach(cb => cb.checked = this.checked)">
				<span class="export-doc-title"><strong>${translate('labels.select_all')}</strong></span>
			</label>
			${rows}
		</div>
	`;
}

// ============================================================
// Export Execution (with PIN flow for trips)
// ============================================================

async function handleExportSelected(summaries: DocSummary[]) {
	const checkboxes = document.querySelectorAll<HTMLInputElement>('.export-doc-checkbox');
	const selectedIds: string[] = [];
	checkboxes.forEach((cb) => {
		if (cb.checked) selectedIds.push(cb.value);
	});

	if (selectedIds.length === 0) {
		openToast(translate('account.export_documents.none_selected'));
		return;
	}

	// For trips: check if any selected trip has PIN protection
	if (currentExportType === 'trip') {
		pendingProtectedTrips = [];
		for (const tripId of selectedIds) {
			const summary = summaries.find((s) => s.id === tripId);
			if (summary && summary.pin && summary.pin !== 'no-pin') {
				pendingProtectedTrips.push({
					title: summary.title || tripId,
					documentID: tripId,
					pin: '',
				});
			}
		}

		if (pendingProtectedTrips.length > 0) {
			showPinRequestDialog(selectedIds);
			return;
		}
	}

	// No protected trips (or not trip type) — export directly
	await executeExport(selectedIds);
}

// ============================================================
// PIN Request Dialog (like backup's displayPinRequestBackup)
// ============================================================

function showPinRequestDialog(selectedIds: string[]) {
	closeMessage();

	// Cancel any pending closeMessage timeout so it doesn't wipe the new dialog
	const preloader = getID('preloader');
	if (preloader && (preloader as any)._closeMsgTimeout) {
		clearTimeout((preloader as any)._closeMsgTimeout);
		delete (preloader as any)._closeMsgTimeout;
	}

	const properties = cloneObject(MESSAGE_PROPERTIES);
	properties.title = translate('trip.basic_information.pin.title');
	properties.content = buildPinContent();
	properties.fullscreen = true;
	properties.buttons = [
		{ type: 'cancel' },
		{ type: 'confirm', label: translate('account.export_documents.export_button'), action: () => collectPinsAndExport(selectedIds) },
	];

	displayFullMessage(properties);

	function buildPinContent(): string {
		const rows = pendingProtectedTrips.map((p) => `
			<tr>
				<td class="pin-backup-label">${escapeHTML(p.title)}</td>
				<td class="pin-backup-input-cell">
					<input id="${p.documentID}" type="password" inputmode="numeric" maxlength="4" autocomplete="one-time-code" pattern="[0-9]*" placeholder="0000" class="pin-backup-input" />
				</td>
			</tr>
		`).join('');

		return `
			<p class="pin-backup-instruction">${translate('account.export_documents.pin_instruction')}</p>
			<div class="pin-backup-scroll">
				<table class="pin-backup-table">
					${rows}
				</table>
			</div>
		`;
	}
}

function collectPinsAndExport(selectedIds: string[]) {
	const inputs = getID('message-description').querySelectorAll('input');
	const ids = Array.from(inputs).map((input) => input.id);

	for (const entry of pendingProtectedTrips) {
		const index = ids.indexOf(entry.documentID);
		if (index === -1) continue;

		const pin = inputs[index].value.trim();
		if (!isNaN(Number(pin)) && pin.length === 4) {
			entry.pin = pin;
		}
		// If no PIN or invalid, leave pin empty — export without protected data
	}

	closeMessage();
	executeExport(selectedIds);
}

// ============================================================
// Execute Export
// ============================================================

async function executeExport(selectedIds: string[]) {
	startLoadingScreen();

	// Build a map of tripId → pin for quick lookup
	const pinMap: Record<string, string> = {};
	for (const entry of pendingProtectedTrips) {
		if (entry.pin) pinMap[entry.documentID] = entry.pin;
	}

	let exported = 0;
	let failed = 0;

	for (const docId of selectedIds) {
		try {
			const pin = pinMap[docId] || '';
			const doc = await buildExportDocument(docId, currentExportType, pin);
			if (doc) {
				downloadExportDocument(docId, doc, currentExportType);
				exported++;
			} else {
				failed++;
			}
		} catch (err) {
			failed++;
			console.error(`[export-documents] Failed to export ${currentExportType}:`, docId, err);
		}
	}

	pendingProtectedTrips = [];
	stopLoadingScreen();

	if (exported > 0) {
		const msg = failed > 0
			? translate('account.export_documents.partial_success', { exported: String(exported), failed: String(failed) })
			: translate('account.export_documents.success', { count: String(exported) });
		openToast(msg);
	} else {
		openToast(translate('account.export_documents.failed'));
	}
}

// ============================================================
// Build Export Document (by type)
// ============================================================

/**
 * Build a single export document.
 *
 * Trip format:
 *   { _meta: { type, exportedAt, version, sourceId }, trip, accommodations?, transportation?, itinerary?, expenses?, destinations?, protected? }
 *
 * Destination format:
 *   { _meta: { type, exportedAt, version, sourceId }, destination }
 *
 * Listing format:
 *   { _meta: { type, exportedAt, version, sourceId }, listing, destinations? }
 */
async function buildExportDocument(
	docId: string,
	docType: DocType,
	pin: string = '',
): Promise<Record<string, any> | null> {
	switch (docType) {
		case 'trip':
			return buildTripExport(docId, pin);
		case 'destination':
			return buildDestinationExport(docId);
		case 'listing':
			return buildListingExport(docId);
		default:
			return null;
	}
}

async function buildTripExport(tripId: string, pin: string = ''): Promise<Record<string, any> | null> {
	const tripData = await getDocument(`trips/${tripId}`);
	if (!tripData) {
		console.warn(`[export-documents] Trip not found: ${tripId}`);
		return null;
	}

	const [accommodations, transportation, itinerary, expensesData] = await Promise.all([
		getCollectionDocs(`trips/${tripId}/accommodations`),
		getCollectionDocs(`trips/${tripId}/transportation`),
		getCollectionDocs(`trips/${tripId}/itinerary`),
		getDocument(`expenses/${tripId}`),
	]);

	const destinations = await fetchReferencedDestinations(tripData);

	const doc: Record<string, any> = {
		_meta: {
			type: 'trip',
			exportedAt: new Date().toISOString(),
			version: '1.0',
			sourceId: tripId,
		},
		trip: tripData,
	};

	if (Object.keys(accommodations).length > 0) doc.accommodations = accommodations;
	if (Object.keys(transportation).length > 0) doc.transportation = transportation;
	if (Object.keys(itinerary).length > 0) doc.itinerary = itinerary;
	if (expensesData) doc.expenses = expensesData;
	if (Object.keys(destinations).length > 0) doc.destinations = destinations;

	// Fetch protected data if PIN is provided
	if (pin) {
		const protectedData = await fetchProtectedData(tripId, pin, tripData);
		if (protectedData) doc.protected = protectedData;
	}

	return doc;
}

async function buildDestinationExport(destId: string): Promise<Record<string, any> | null> {
	const destData = await getDocument(`destinations/${destId}`);
	if (!destData) {
		console.warn(`[export-documents] Destination not found: ${destId}`);
		return null;
	}

	return {
		_meta: {
			type: 'destination',
			exportedAt: new Date().toISOString(),
			version: '1.0',
			sourceId: destId,
		},
		destination: destData,
	};
}

async function buildListingExport(listingId: string): Promise<Record<string, any> | null> {
	const listingData = await getDocument(`listings/${listingId}`);
	if (!listingData) {
		console.warn(`[export-documents] Listing not found: ${listingId}`);
		return null;
	}

	const destinations = await fetchReferencedDestinations(listingData);

	const doc: Record<string, any> = {
		_meta: {
			type: 'listing',
			exportedAt: new Date().toISOString(),
			version: '1.0',
			sourceId: listingId,
		},
		listing: listingData,
	};

	if (Object.keys(destinations).length > 0) doc.destinations = destinations;

	return doc;
}

// ============================================================
// Protected Data
// ============================================================

/**
 * Fetch protected data for a trip using its PIN.
 * Reads:
 *   - trips/protected/{pin}/{tripId}  → reservation codes for accommodations & transportation
 *   - expenses/protected/{pin}/{tripId} → protected expenses (if expenses module is enabled)
 */
async function fetchProtectedData(
	tripId: string,
	pin: string,
	tripData: Record<string, any>,
): Promise<Record<string, any> | null> {
	const protectedTripPath = `trips/protected/${pin}/${tripId}`;
	const protectedExpensesPath = `expenses/protected/${pin}/${tripId}`;

	const fetches: Promise<any>[] = [getDocument(protectedTripPath)];

	if (tripData?.modules?.expenses === true) {
		fetches.push(getDocument(protectedExpensesPath));
	}

	const [protectedTrip, protectedExpenses] = await Promise.all(fetches);

	if (!protectedTrip && !protectedExpenses) return null;

	const result: Record<string, any> = { pin };

	if (protectedTrip) result.trip = protectedTrip;
	if (protectedExpenses) result.expenses = protectedExpenses;

	return result;
}

// ============================================================
// Referenced Destinations
// ============================================================

async function fetchReferencedDestinations(
	parentDoc: Record<string, any>,
): Promise<Record<string, any>> {
	const refs = parentDoc.destinationRefs || parentDoc.destinations;
	if (!refs || !Array.isArray(refs) || refs.length === 0) return {};

	const result: Record<string, any> = {};
	const fetches = refs.map(async (ref: any) => {
		const destId = ref.id || ref.destinationId;
		if (!destId) return;
		const data = await getDocument(`destinations/${destId}`);
		if (data) result[destId] = data;
	});

	await Promise.allSettled(fetches);
	return result;
}

// ============================================================
// Download
// ============================================================

function downloadExportDocument(
	docId: string,
	doc: Record<string, any>,
	docType: DocType,
) {
	const jsonStr = JSON.stringify(doc, null, 2);
	const blob = new Blob([jsonStr], { type: 'application/json' });
	const url = URL.createObjectURL(blob);

	const timestamp = getTimestamp();
	let title = docId;
	if (docType === 'trip' && doc.trip?.title) title = doc.trip.title;
	else if (docType === 'destination' && doc.destination?.title) title = doc.destination.title;
	else if (docType === 'listing' && doc.listing?.title) title = doc.listing.title;

	const safeTitle = title.replace(/[^a-zA-Z0-9_-]/g, '_');
	const typePrefix = docType;

	const link = document.createElement('a');
	link.href = url;
	link.download = `${timestamp}-tripviewer-${typePrefix}-${safeTitle}.json`;
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
	URL.revokeObjectURL(url);
}

// ============================================================
// Utilities
// ============================================================

function escapeHTML(str: string): string {
	const div = document.createElement('div');
	div.textContent = str;
	return div.innerHTML;
}
