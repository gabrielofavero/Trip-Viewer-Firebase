// ============================================================
// Static Export — Dialog Flow
// ============================================================
// Settings → "Export as Static Web Page" multi-step dialog:
//   security warning → type selector → document list
//   → mode (light/complete) → app title + icon → build.
//
// Protected-data PINs are auto-resolved from the owner-readable
// `protected/{tripId}` lookup doc during build — no PIN prompt.
//
// The final step calls the ZIP builder (`build-zip.ts`, P2), which fetches
// the build manifest, assembles the assets, transforms the entry HTML and
// downloads a self-contained ZIP.
// ============================================================

import type { DocType } from '../backup/document-bundle.js';
import { getUID } from '../data/firebase/auth.js';
import {
	getUserDestinationSummaries,
	getUserListingSummaries,
	getUserTripSummaries,
} from '../data/firebase/database.js';
import { translate } from '../i18n/translation.js';
import { cloneObject, getID } from '../utils/dom.js';
import { startLoadingScreen, stopLoadingScreen } from '../utils/loading.js';
import {
	closeMessage,
	displayFullMessage,
	MESSAGE_PROPERTIES,
	openToast,
} from '../utils/messages.js';
import {
	startProgressLoading,
	stopProgressLoading,
	updateProgressLoading,
} from '../ui/progress-loading.js';
import type { StaticExportData } from './build-zip.js';
import { buildStaticExport } from './build-zip.js';
import type { ExportStaticMode, ExportStaticProgress } from './data-gather.js';
import { buildStaticData } from './data-gather.js';

// ============================================================
// Types & State
// ============================================================

interface DocSummary {
	id: string;
	title: string;
	pin?: string;
}

interface ExportStaticState {
	type: DocType;
	docId: string;
	docTitle: string;
	mode: ExportStaticMode;
	appTitle: string;
	iconDataUrl: string;
}

const TYPE_OPTIONS = [
	{ type: 'trip', labelKey: 'trip.document', icon: 'tabler:plane-departure' },
	{ type: 'destination', labelKey: 'destination.document', icon: 'material-symbols:location-on' },
	{ type: 'listing', labelKey: 'listing.document', icon: 'fluent:list-28-filled' },
] as const;

const state: ExportStaticState = {
	type: 'trip',
	docId: '',
	docTitle: '',
	mode: 'light',
	appTitle: '',
	iconDataUrl: '',
};

// ============================================================
// Entry Point
// ============================================================

export function exportStaticOnClickAction() {
	showSecurityWarning();
}

// ============================================================
// Step 1 — Security Warning
// ============================================================

function showSecurityWarning() {
	const properties = cloneObject(MESSAGE_PROPERTIES);
	properties.title = translate('account.export_static.title');
	properties.content = `<p class="security-warning-text">${translate('account.export_static.warning')}</p>`;
	properties.extraClass = 'export-static-dialog';
	properties.buttons = [
		{ type: 'cancel' },
		{ type: 'confirm', label: translate('labels.confirm'), action: () => showTypeSelector() },
	];

	displayFullMessage(properties);
}

// ============================================================
// Step 2 — Type Selector
// ============================================================

function showTypeSelector() {
	const properties = cloneObject(MESSAGE_PROPERTIES);
	properties.title = translate('account.export_static.select_type');
	properties.content = `
		<div class="export-type-buttons">
			${TYPE_OPTIONS.map(
				(t) => `
				<button class="btn btn-outline-theme export-type-btn" data-export-type="${t.type}">
					<i class="iconify" data-icon="${t.icon}"></i>
					<span>${translate(t.labelKey)}</span>
				</button>
			`,
			).join('')}
		</div>
	`;
	properties.buttons = [{ type: 'cancel' }];
	properties.extraClass = 'export-static-dialog';

	displayFullMessage(properties);

	setTimeout(() => {
		document.querySelectorAll('.export-type-btn').forEach((btn) => {
			btn.addEventListener('click', function () {
				const docType = (this as HTMLElement).getAttribute('data-export-type') as DocType;
				state.type = docType;
				showDocumentList(docType);
			});
		});
	}, 50);
}

// ============================================================
// Step 3 — Document List (single-select)
// ============================================================

async function showDocumentList(docType: DocType) {
	state.type = docType;
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
		openToast(translate('account.export_static.no_documents'));
		return;
	}

	summaries.sort((a, b) => (a.title || '').localeCompare(b.title || ''));

	const properties = cloneObject(MESSAGE_PROPERTIES);
	properties.title = translate('account.export_static.select_document');
	properties.content = buildRadioList(summaries, docType);
	properties.extraClass = 'export-static-dialog';
	properties.fullscreen = true;
	properties.buttons = [
		{ type: 'cancel' },
		{
			type: 'confirm',
			label: translate('labels.confirm'),
			action: () => handleDocumentSelected(summaries),
		},
	];

	displayFullMessage(properties);
}

function buildRadioList(summaries: DocSummary[], docType: DocType): string {
	const rows = summaries
		.map((s) => {
			const pinBadge =
				docType === 'trip' && s.pin && s.pin !== 'no-pin'
					? ` <span class="export-pin-badge" title="${translate('trip.basic_information.pin.title')}">🔒</span>`
					: '';
			return `
		<label class="export-doc-row">
			<input type="radio" name="export-static-doc" class="export-doc-checkbox" value="${s.id}">
			<span class="export-doc-title">${escapeHTML(s.title || translate('account.import_documents.untitled'))}${pinBadge}</span>
		</label>`;
		})
		.join('');

	return `
		<div class="export-documents-list">
			${rows}
		</div>
	`;
}

function handleDocumentSelected(summaries: DocSummary[]) {
	const selected = document.querySelector<HTMLInputElement>(
		'input[name="export-static-doc"]:checked',
	);
	if (!selected) {
		openToast(translate('account.export_static.none_selected'));
		return;
	}

	const docId = selected.value;
	const summary = summaries.find((s) => s.id === docId);
	state.docId = docId;
	state.docTitle = summary?.title || docId;

	// Protected-data PINs are auto-resolved from the owner-readable
	// `protected/{tripId}` lookup doc during build — no PIN prompt.
	showModeDialog();
}

// ============================================================
// Step 4 — Mode (light / complete)
// ============================================================

function showModeDialog() {
	const properties = cloneObject(MESSAGE_PROPERTIES);
	properties.title = translate('account.export_static.select_mode');
	properties.content = `
		<div class="export-documents-list">
			<label class="export-doc-row">
				<input type="radio" name="export-static-mode" class="export-doc-checkbox" value="light" checked>
				<span class="export-doc-title">
					<strong>${translate('account.export_static.mode_light')}</strong>
					<span class="export-static-hint">${translate('account.export_static.mode_light_hint')}</span>
				</span>
			</label>
			<label class="export-doc-row">
				<input type="radio" name="export-static-mode" class="export-doc-checkbox" value="complete">
				<span class="export-doc-title">
					<strong>${translate('account.export_static.mode_complete')}</strong>
					<span class="export-static-hint">${translate('account.export_static.mode_complete_hint')}</span>
				</span>
			</label>
		</div>
	`;
	properties.extraClass = 'export-static-dialog';
	properties.buttons = [
		{ type: 'cancel' },
		{ type: 'confirm', label: translate('labels.confirm'), action: () => handleModeSelected() },
	];

	displayFullMessage(properties);
}

function handleModeSelected() {
	const selected = document.querySelector<HTMLInputElement>(
		'input[name="export-static-mode"]:checked',
	);
	state.mode = (selected?.value as ExportStaticMode) || 'light';
	showTitleIconDialog();
}

// ============================================================
// Step 5 — App Title + Icon
// ============================================================

function showTitleIconDialog() {
	const properties = cloneObject(MESSAGE_PROPERTIES);
	properties.title = translate('account.export_static.title');
	properties.content = `
		<div class="export-static-field">
			<label for="export-static-title">${translate('account.export_static.app_title')}</label>
			<input id="export-static-title" type="text" class="export-static-input" />
			<p class="export-static-hint">${translate('labels.optional')}</p>
		</div>
		<div class="export-static-field">
			<label for="export-static-icon">${translate('account.export_static.app_icon')}</label>
			<input id="export-static-icon" type="file" accept="image/*" class="export-static-input" />
			<p class="export-static-hint">${translate('labels.optional')}</p>
		</div>
	`;
	properties.fullscreen = true;
	properties.extraClass = 'export-static-dialog';
	properties.buttons = [
		{ type: 'cancel' },
		{
			type: 'confirm',
			label: translate('account.export_static.build'),
			action: () => handleTitleIconSelected(),
		},
	];

	displayFullMessage(properties);

	setTimeout(() => {
		const titleInput = getID('export-static-title') as HTMLInputElement | null;
		if (titleInput && !titleInput.value) {
			titleInput.value = state.docTitle;
		}

		const iconInput = getID('export-static-icon') as HTMLInputElement | null;
		iconInput?.addEventListener('change', (event) => {
			const file = (event.target as HTMLInputElement).files?.[0];
			if (!file) return;
			const reader = new FileReader();
			reader.onload = () => {
				state.iconDataUrl = typeof reader.result === 'string' ? reader.result : '';
			};
			reader.readAsDataURL(file);
		});
	}, 50);
}

function handleTitleIconSelected() {
	const titleInput = getID('export-static-title') as HTMLInputElement | null;
	state.appTitle = (titleInput?.value || '').trim();
	buildAndDownload();
}

// ============================================================
// Build (P2: real ZIP builder)
// ============================================================

async function buildAndDownload() {
	if (!state.docId) {
		openToast(translate('account.export_static.none_selected'));
		return;
	}

	// Close the export dialog and switch to the step-by-step progress overlay
	// while the package is built (mirrors the restore flow).
	closeMessage();
	startProgressLoading({
		message: translate('account.export_static.loading.gathering'),
		progress: 5,
	});

	const onProgress: ExportStaticProgress = (message, progress) => {
		updateProgressLoading({ message, progress });
	};

	try {
		const data = await buildStaticData(
			state.type,
			state.docId,
			'', // PIN is auto-resolved from the owner-readable lookup doc
			state.mode,
			onProgress,
		);
		if (!data) {
			stopProgressLoading();
			openToast(translate('account.export_static.failed'));
			return;
		}

		const result = await buildStaticExport(
			data as StaticExportData,
			{ appTitle: state.appTitle, iconDataUrl: state.iconDataUrl },
			onProgress,
		);

		stopProgressLoading();

		if (result.failedImages.length > 0) {
			openToast(
				translate('account.export_static.partial_success', {
					failed: String(result.failedImages.length),
				}),
			);
		} else {
			openToast(translate('account.export_static.success'));
		}
	} catch (err) {
		console.error('[export-static] Failed to build static export:', err);
		stopProgressLoading();
		openToast(translate('account.export_static.failed'));
	}
}

// ============================================================
// Utilities
// ============================================================

function escapeHTML(str: string): string {
	const div = document.createElement('div');
	div.textContent = str;
	return div.innerHTML;
}
