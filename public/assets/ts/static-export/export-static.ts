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
import { beginOperation, endOperation } from '../utils/operation-guard.js';
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
	/** Start date (trip summaries) — used to order trips newest-first. */
	start?: { year?: number; month?: number; day?: number };
	/** Summary image block — shape varies by document type. */
	image?: {
		active?: boolean;
		background?: string | { link?: string };
		light?: string;
		dark?: string;
	};
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

/** Placeholder icon per document type for cards without an image. */
const TYPE_ICONS: Record<DocType, string> = {
	trip: 'tabler:plane-departure',
	destination: 'material-symbols:location-on',
	listing: 'fluent:list-28-filled',
};

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

	orderSummaries(docType, summaries);

	const properties = cloneObject(MESSAGE_PROPERTIES);
	properties.title = translate('account.export_static.select_document');
	properties.content = buildDocPicker(summaries, docType);
	properties.extraClass = 'export-static-dialog';
	properties.fullscreen = true;
	properties.buttons = [
		{ type: 'cancel' },
		{
			type: 'confirm',
			label: translate('labels.confirm'),
			action: () => handleDocumentSelected(),
		},
	];

	displayFullMessage(properties);

	setTimeout(() => wireDocPicker(summaries, docType), 50);
}

/** Order the picker list: trips newest-first by start date (same as the
 * accommodation importer), other document types alphabetically by title. */
function orderSummaries(docType: DocType, summaries: DocSummary[]) {
	if (docType === 'trip') {
		summaries.sort((a, b) => getTripStartTime(b) - getTripStartTime(a));
		return;
	}
	summaries.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
}

/** Timestamp for a trip summary's start date (0 when missing). Mirrors the
 * accommodation importer so the static-export trip order matches it. */
function getTripStartTime(trip: DocSummary): number {
	const start = trip.start;
	if (!start || typeof start.year !== 'number') return 0;
	return new Date(start.year, (start.month || 1) - 1, start.day || 1).getTime();
}

/** Best available image URL for a document summary card. Mirrors the
 * accommodation importer (`image.active` + `image.background`) with extra
 * fallbacks for listing summaries whose `background` may be a `{ link }`
 * object. */
function getDocImage(summary: DocSummary): string {
	const img = summary.image;
	if (!img || img.active === false) return '';
	if (typeof img.background === 'string' && img.background) return img.background;
	if (typeof img.background === 'object' && img.background?.link) return img.background.link;
	if (img.light) return img.light;
	if (img.dark) return img.dark;
	return '';
}

/** Single-select document card (image thumb + title), same styling as the
 * "Import accommodation" trip cards. */
function getDocCard(summary: DocSummary, docType: DocType): string {
	const image = getDocImage(summary);
	const isProtected = docType === 'trip' && summary.pin && summary.pin !== 'no-pin';
	const title = summary.title || translate('account.import_documents.untitled');
	const thumb = image
		? `<div class="wallpaper-import-thumb" style="background-image: url('${image}')"></div>`
		: `<div class="wallpaper-import-thumb no-image"><i class="iconify image-picker-icon" data-icon="${TYPE_ICONS[docType]}"></i></div>`;
	const pinBadge = isProtected
		? `<span class="export-pin-badge" title="${translate('trip.basic_information.pin.title')}">🔒</span>`
		: '';
	return `
		<button type="button" class="wallpaper-import-card" data-doc-id="${summary.id}">
			${thumb}
			${pinBadge}
			<div class="wallpaper-import-name">${escapeHTML(title)}</div>
		</button>`;
}

/** Build the document picker: search bar on top, scrollable card grid below. */
function buildDocPicker(summaries: DocSummary[], docType: DocType): string {
	const cards = summaries.map((s) => getDocCard(s, docType)).join('');
	return `
		<div class="export-static-picker">
			<div class="wallpaper-import-search-bar">
				<div class="search-bar">
					<i class="iconify search-icon" data-icon="material-symbols:search"></i>
					<input type="text" id="export-static-doc-search" class="search-input"
						placeholder="${translate('account.export_static.search_placeholder')}" />
					<button class="search-clear" id="export-static-doc-clear" style="display:none"
						aria-label="Clear search">
						<i class="iconify" data-icon="material-symbols:close"></i>
					</button>
				</div>
			</div>
			<div class="wallpaper-import-scroll" id="export-static-doc-scroll">
				<div class="wallpaper-import-group-grid" id="export-static-doc-grid">
					${cards}
				</div>
			</div>
		</div>
	`;
}

/** Wire up the card picker: live title filtering, clear button, single-select. */
function wireDocPicker(summaries: DocSummary[], docType: DocType) {
	const input = getID('export-static-doc-search') as HTMLInputElement | null;
	const clear = getID('export-static-doc-clear');
	const grid = getID('export-static-doc-grid');
	if (!input || !grid) return;

	const render = (query: string) => {
		const q = query.trim().toLowerCase();
		const filtered = q
			? summaries.filter((s) => (s.title || '').toLowerCase().includes(q))
			: summaries;
		grid.innerHTML = filtered.length
			? filtered.map((s) => getDocCard(s, docType)).join('')
			: `<div class="wallpaper-import-empty">${translate('account.export_static.no_matches')}</div>`;
		// Keep the previously selected card highlighted even after filtering.
		grid.querySelectorAll('.wallpaper-import-card').forEach((item) => {
			const el = item as HTMLElement;
			if (el.getAttribute('data-doc-id') === state.docId) el.classList.add('selected');
		});
	};

	input.addEventListener('input', () => {
		if (clear) clear.style.display = input.value ? 'flex' : 'none';
		render(input.value);
	});
	clear?.addEventListener('click', () => {
		input.value = '';
		if (clear) clear.style.display = 'none';
		render('');
	});

	grid.addEventListener('click', (event) => {
		const card = (event.target as Element).closest<HTMLElement>('[data-doc-id]');
		if (!card) return;
		const id = card.getAttribute('data-doc-id') || '';
		if (!id) return;
		state.docId = id;
		state.docTitle = summaries.find((s) => s.id === id)?.title || id;
		grid.querySelectorAll('.wallpaper-import-card').forEach((item) => {
			item.classList.toggle('selected', item === card);
		});
	});
}

function handleDocumentSelected() {
	if (!state.docId) {
		openToast(translate('account.export_static.none_selected'));
		return;
	}

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
	// Block refresh/close while the static package is assembled and downloaded.
	beginOperation();

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
	} finally {
		endOperation();
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
