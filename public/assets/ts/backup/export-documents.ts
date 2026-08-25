import { startLoadingScreen, stopLoadingScreen } from '../utils/loading.js';
import { beginOperation, endOperation } from '../utils/operation-guard.js';
import { translate } from '../i18n/translation.js';
import {
	displayFullMessage,
	openToast,
	MESSAGE_PROPERTIES,
} from '../utils/messages.js';
import { cloneObject } from '../utils/dom.js';
import { getTimestamp } from '../utils/dates.js';
import { getUID } from '../data/firebase/auth.js';
import {
	getUserTripSummaries,
	getUserDestinationSummaries,
	getUserListingSummaries,
} from '../data/firebase/database.js';
import { buildExportDocument } from './document-bundle.js';
import type { DocType } from './document-bundle.js';

// ============================================================
// Export Document Types
// ============================================================

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
// Export Execution
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

	// Protected-data PINs are auto-resolved from the owner-readable
	// `protected/{tripId}` lookup doc during export — no PIN prompt.
	await executeExport(selectedIds);
}

// ============================================================
// Execute Export
// ============================================================

async function executeExport(selectedIds: string[]) {
	startLoadingScreen();
	// Block refresh/close while the export gathers and downloads documents.
	beginOperation();

	let exported = 0;
	let failed = 0;

	try {
		for (const docId of selectedIds) {
			try {
				// Protected-data PINs are auto-resolved inside buildExportDocument from
				// the owner-readable `protected/{tripId}` lookup doc — no prompt.
				const doc = await buildExportDocument(docId, currentExportType);
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
	} finally {
		stopLoadingScreen();
		endOperation();
	}

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
