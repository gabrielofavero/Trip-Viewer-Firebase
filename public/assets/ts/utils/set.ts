import { startLoadingScreen, stopLoadingScreen } from './loading.js';
import { getUID } from '../data/firebase/auth.js';
import { createBatchOps, SUBCOLLECTION } from '../data/firebase/database.js';
import { translate } from '../i18n/translation.js';
import { hasUnsavedChanges, validateRequiredFields } from '../ui/fields.js';
import { cloneObject, getID, getNewDataDocument, getURLParam } from './dom.js';
import { DOCUMENT_ID, SUCCESSFUL_SAVE, getState, setDocumentId, setSuccessfulSaveFn } from '../data/state.js';
import {
	MESSAGE_MODAL_OPEN,
	MESSAGE_PROPERTIES,
	displayFullMessage,
	displayMessage,
	displaySaveSuccess,
} from './messages.js';
import { computeObjectDiff, pick, type ObjectDiff } from './diff.js';

// ── Dryrun mode detection & indicator (runs on module load for all edit pages) ──
const IS_DRY_RUN = getURLParam('dryrun') !== null;

if (IS_DRY_RUN) {
	console.log(
		'%c DRYRUN MODE ACTIVE %c— No data will be saved to Firestore',
		'color: #f0c040; font-weight: bold; font-size: 14px;',
		'color: #aaa;',
	);

	function injectDryRunBanner() {
		if (document.getElementById('dryrun-banner')) return; // avoid duplicates
		const banner = document.createElement('div');
		banner.id = 'dryrun-banner';
		banner.innerHTML = 'DRYRUN';
		Object.assign(banner.style, {
			position: 'fixed',
			top: '8px',
			right: '8px',
			zIndex: '99999',
			background: '#f0c040',
			color: '#1a1a1a',
			padding: '4px 10px',
			borderRadius: '4px',
			fontSize: '12px',
			fontWeight: '700',
			fontFamily: 'monospace',
			letterSpacing: '0.5px',
			pointerEvents: 'none',
			boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
		});
		document.body.prepend(banner);
	}

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', injectDryRunBanner);
	} else {
		injectDryRunBanner();
	}
}

export var CUSTOM_UPLOADS = {
	accommodations: [],
	destinations: [],
	gallery: [],
};
var SET_RESPONSES: { message: string; success: boolean }[] = [];
var UPLOAD_AFTER_SET = false;

export function addSetResponse(message: string, success: boolean) {
	SET_RESPONSES.push({ message, success });
}

export async function setDocument({
	type,
	checks = [],
	dataBuildingFunctions = [],
	batchFunctions = [],
}: {
	type: string;
	checks?: Array<() => void | Promise<void>>;
	dataBuildingFunctions?: Array<() => void | Promise<void>>;
	batchFunctions?: Array<(ops: ReturnType<typeof createBatchOps>) => void | Promise<void>>;
}) {
	try {
		const uid = await getUID();
		const ops = createBatchOps();
		let response = translate('messages.documents.save.success');

		if (!uid || !type) {
			throwSetError(
				!uid ? translate('labels.unauthenticated') : translate('messages.documents.save.error'),
			);
			return;
		}

		startLoadingScreen();

		// 1. Run validation checks (e.g., validatePinField)
		for (const check of checks) {
			await check();
		}
		if (MESSAGE_MODAL_OPEN) return;

		// 2. Validate required fields
		validateRequiredFields();
		if (MESSAGE_MODAL_OPEN) return;

		// 3. Build new data from the form
		for (const build of dataBuildingFunctions) {
			await build();
		}

		// 4. Quick guard: no DOM changes at all
		if (!hasUnsavedChanges()) {
			throwSetError(`${translate('messages.documents.save.no_new_data')}`);
			return;
		}

		const documentData = getNewDataDocument(type);

		// 5. Compute diff against original state — only write changed fields
		const isNewDocument = !DOCUMENT_ID;
		let documentDiff: ObjectDiff;

		if (isNewDocument) {
			// New document: write everything
			documentDiff = { changed: documentData, hasChanges: Object.keys(documentData).length > 0 };
		} else {
			// Existing document: compute minimal diff
			documentDiff = computeObjectDiff(getState(), documentData);
		}

		// 6. Main document write
		if (isNewDocument && documentDiff.hasChanges) {
			const id = ops.create(type, documentDiff.changed);
			setDocumentId(id);
		} else if (documentDiff.hasChanges) {
			ops.update(`${type}/${DOCUMENT_ID}`, documentDiff.changed);
		} else if (!isNewDocument) {
			// No main-document changes — still allow subcollection/batch writes below
			console.log('[setDocument] No main-document changes detected; skipping document update.');
		}

		// 7. Update user's summary (only if summary-relevant fields changed)
		setUserData(ops, uid, type, documentDiff, documentData, isNewDocument);

		// 8. Run batch functions (PIN-protected data + subcollections)
		for (const batch of batchFunctions) {
			await batch(ops);
		}

		// 9. Guard: if no operations at all, skip commit
		const totalOps = ops.getOps().length;
		if (totalOps === 0) {
			throwSetError(`${translate('messages.documents.save.no_new_data')}`);
			return;
		}

		// ── Dryrun mode: log all operations without writing to Firestore ──
		if (IS_DRY_RUN) {
			performDryRun(ops, type);
			return;
		}

		const result = await ops.commit();

		if (!result.success) {
			throwSetError(translate('messages.documents.save.error'));
			return;
		}

		setSuccessfulSaveFn(true);
		stopLoadingScreen();
		displaySaveSuccess({ type, docId: DOCUMENT_ID, content: response });
	} catch (e) {
		console.log(e);
		throwSetError(translate('messages.documents.save.error'));
	}
}

function throwSetError(message) {
	setSuccessfulSaveFn(false);
	stopLoadingScreen();
	displayMessage(null, message);
}

/**
 * Dryrun mode — simulates the save flow and logs all Firestore operations
 * to the developer console without writing any data.
 */
function performDryRun(
	ops: ReturnType<typeof createBatchOps>,
	type: string,
) {
	const allOps = ops.getOps();

	// ── Build structured JSON payload for download ──
	const dryrunPayload = {
		dryrun: true,
		timestamp: new Date().toISOString(),
		documentType: type,
		documentId: DOCUMENT_ID || '(new — auto-generated on real save)',
		totalOperations: allOps.length,
		operations: allOps.map((o: any, i: number) => ({
			index: i + 1,
			type: o.type,
			path: o.path,
			data: o.data ?? null,
		})),
	};

	// ── Console logging (existing) ──
	console.group(
		'%c🔍 DRYRUN — No data was saved to Firestore',
		'color: #f0c040; font-weight: bold; font-size: 14px;',
	);
	console.log('%c📄 Document type:%c', 'font-weight: bold;', '', type);
	console.log(
		'%c🆔 Document ID:%c',
		'font-weight: bold;',
		'',
		DOCUMENT_ID || '(new — auto-generated on real save)',
	);
	console.log('%c📊 Operations that would be performed:%c', 'font-weight: bold;', '', allOps.length);
	console.table(
		allOps.map((o: any) => ({
			'#': o.type.toUpperCase(),
			Path: o.path,
			'Data keys': o.data ? Object.keys(o.data).join(', ') : '(delete)',
		})),
	);
	console.log('%c📋 Full operation payloads:%c', 'font-weight: bold;', '');
	allOps.forEach((o: any, i: number) => {
		console.groupCollapsed(`#${i + 1}: ${o.type.toUpperCase()} → ${o.path}`);
		if (o.data) {
			console.log(o.data);
		} else {
			console.log('(delete — no data payload)');
		}
		console.groupEnd();
	});
	console.groupEnd();

	// ── Build filename ──
	const dateStr = new Date().toISOString().slice(0, 10);
	const docIdSlug = DOCUMENT_ID || 'new';
	const filename = `dryrun-${type}-${docIdSlug}-${dateStr}.json`;

	// ── Show modal with download button ──
	setSuccessfulSaveFn(false);
	stopLoadingScreen();

	const properties = cloneObject(MESSAGE_PROPERTIES);
	properties.title = '🔍 Dryrun complete';
	properties.content =
		`${allOps.length} Firestore operation(s) simulated.<br>` +
		`All payloads logged to the developer console (F12).<br><br>` +
		`<em>No data was saved.</em>`;
	properties.buttons = [
		{
			type: 'download',
			action: () => downloadJSON(dryrunPayload, filename),
		},
		{
			type: 'close',
			action: '',
		},
	];
	displayFullMessage(properties);
}

/**
 * Trigger a browser download of a JSON object.
 */
function downloadJSON(data: unknown, filename: string) {
	const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = filename;
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	URL.revokeObjectURL(url);
}

/**
 * Updates the user document ({@code users/{uid}}) with summary data for the
 * saved document. For new documents, always writes the summary (it must appear
 * on the home page). For existing documents, only writes if summary-relevant
 * fields actually changed compared to the original state.
 *
 * @param ops              - The Firestore batch ops wrapper.
 * @param uid              - The current user's UID.
 * @param type             - The collection type (trips, destinations, listings).
 * @param documentDiff     - The diff between original and new data.
 * @param fullDocumentData - The complete new document data (for summary extraction).
 * @param isNewDocument    - Whether this is a brand-new document (no existing Firestore doc).
 */
function setUserData(
	ops: ReturnType<typeof createBatchOps>,
	uid: string,
	type: string,
	documentDiff: ObjectDiff,
	fullDocumentData: Record<string, unknown>,
	isNewDocument: boolean,
) {
	// New documents MUST appear in the user's home page — always write.
	if (!isNewDocument) {
		// Existing document: skip if main doc didn't change or summary fields are unchanged.
		if (!documentDiff.hasChanges) return;

		const summaryKeys = getSummaryKeys(type);
		const summaryChanged = summaryKeys.some((key) => key in documentDiff.changed);
		if (!summaryChanged) return;
	}

	const newData = getSingleUserData(type, fullDocumentData);
	if (Object.keys(newData).length === 0) {
		throwSetError('Error while fetching user data');
		return;
	}

	// Write summary to the subcollection (post-migration 15):
	//   users/{uid}/tripSummaries/{docId}
	//   users/{uid}/destinationSummaries/{docId}
	//   users/{uid}/listingSummaries/{docId}
	const summarySubcollection = typeToSummarySubcollection(type);
	ops.set(`users/${uid}/${summarySubcollection}/${DOCUMENT_ID}`, newData);
}

/** Maps a collection type to its summary subcollection name. */
function typeToSummarySubcollection(type: string): string {
	switch (type) {
		case 'destinations':
			return SUBCOLLECTION.DESTINATION_SUMMARIES;
		case 'listings':
			return SUBCOLLECTION.LISTING_SUMMARIES;
		case 'trips':
			return SUBCOLLECTION.TRIP_SUMMARIES;
		default:
			return '';
	}
}

/** Returns the keys that, if changed, should trigger a user-document update. */
function getSummaryKeys(type: string): string[] {
	switch (type) {
		case 'destinations':
			return ['currency', 'image', 'title', 'version'];
		case 'listings':
			return ['colors', 'description', 'image', 'subtitle', 'title', 'version'];
		case 'trips':
			return ['colors', 'end', 'image', 'start', 'modules', 'pin', 'title', 'version'];
		default:
			return [];
	}
}

/** Extracts the summary fields from a full document for the user sub-document. */
function getSingleUserData(type: string, data: Record<string, unknown>): Record<string, unknown> {
	switch (type) {
		case 'destinations':
			return {
				currency: data.currency,
				image: data.image,
				title: data.title,
				version: data.version,
			};
		case 'listings':
			return {
				colors: data.colors,
				description: data.description,
				image: data.image,
				subtitle: data.subtitle,
				title: data.title,
				version: data.version,
			};
		case 'trips':
			return {
				colors: data.colors,
				end: data.end,
				image: data.image,
				start: data.start,
				modules: data.modules,
				pin: data.pin,
				title: data.title,
				version: data.version,
			};
		default:
			return {};
	}
}
