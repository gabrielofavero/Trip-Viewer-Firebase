import { startLoadingScreen, stopLoadingScreen } from './loading.js';
import { getUID } from '../data/firebase/auth.js';
import { createBatchOps } from '../data/firebase/database.js';
import { translate } from '../i18n/translation.js';
import { hasUnsavedChanges, validateRequiredFields } from '../ui/fields.js';
import { getID, getNewDataDocument, getURLParam } from './dom.js';
import { DOCUMENT_ID, SUCCESSFUL_SAVE, setDocumentId, setSuccessfulSaveFn } from '../data/state.js';
import {
	MESSAGE_MODAL_OPEN,
	displayMessage,
	displaySaveSuccess,
} from './messages.js';

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
	gallery: [],
};
var SET_RESPONSES: { message: string; success: boolean }[] = [];
var UPLOAD_AFTER_SET = false;

export function addSetResponse(message: string, success: boolean) {
	SET_RESPONSES.push({ message, success });
}

export async function setDocumento({
	type,
	checks = [],
	dataBuildingFunctions = [],
	batchFunctions = [],
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

		for (const check of checks) {
			await check();
		}

		if (MESSAGE_MODAL_OPEN) return;

		validateRequiredFields();
		if (MESSAGE_MODAL_OPEN) return;

		for (const build of dataBuildingFunctions) {
			await build();
		}

		if (!hasUnsavedChanges()) {
			throwSetError(`${translate('messages.documents.save.no_new_data')}`);
			return;
		}

		const documentData = getNewDataDocument(type);

		if (DOCUMENT_ID && documentData) {
			ops.update(`${type}/${DOCUMENT_ID}`, documentData);
		} else if (documentData) {
			const id = ops.create(type, documentData);
			setDocumentId(id);
		}

		setUserData(ops, uid, type, documentData);

		for (const batch of batchFunctions) {
			await batch(ops);
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

	setSuccessfulSaveFn(false);
	stopLoadingScreen();
	displayMessage(
		'🔍 Dryrun complete',
		`${allOps.length} Firestore operation(s) simulated.<br>` +
		`All payloads logged to the developer console (F12).<br><br>` +
		`<em>No data was saved.</em>`,
	);
}

function setUserData(ops, uid, type, documentData) {
	const newData = getSingleUserData(type, documentData);
	if (Object.keys(newData).length === 0) {
		throwSetError('Error while fetching user data');
		return;
	}

	ops.update(`users/${uid}`, {
		[`${type}.${DOCUMENT_ID}`]: newData,
	});

	function getSingleUserData(type, data) {
		switch (type) {
			case 'destinations':
				return {
					currency: data.currency,
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
		}
	}
}
