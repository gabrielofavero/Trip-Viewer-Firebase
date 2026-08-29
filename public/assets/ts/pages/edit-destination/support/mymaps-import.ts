// ======= My Maps Import — Review + bulk write (P4) =======
// The edit-page UI that imports a Google My Maps export into the destination's
// category entries. Owns the whole flow:
//
//   1. Acquire  — fetchKml() via the worker proxy (P1), falling back to a
//      local .kml / .kmz upload when the map isn't publicly shared.
//   2. Review   — a full-screen dialog with one row per placemark: include
//      checkbox, resolved category <select>, and a status badge shown only
//      once it means something ("resolved" / "failed" — §5 P4).
//   3. Enrich   — OPTIONAL, user-approved (decision #3): resolveMyMapsDrafts()
//      (P3) resolves each placemark to a real place via Places API Text Search
//      (location bias) or the local scraper; statuses update in place.
//   4. Conflicts— before writing, every draft whose name OR Maps link collides
//      with an existing entry in its target category is listed with a per-item
//      choice (keep both / skip / replace) — decision #5.
//   5. Write    — createBatchOps() dot-path updates (`{category}.{id}: item`),
//      batches of ≤ 500; on success re-read the doc, re-populate the form and
//      openToast().
//
// Local-only for now (decision #2): mirrors the Places API PLACES_API_ENABLED
// gate via MYMAPS_KML_ENABLED.
//
// References:
// - docs/implementation-plans/20260826-mymaps-import-destination.md (§5 P4)

import { registerActions } from '../../../ui/actions.js';
import { cloneObject, getID, getRandomID } from '../../../utils/dom.js';
import {
	closeMessage,
	displayError,
	displayFullMessage,
	getContainersInput,
	MESSAGE_PROPERTIES,
	openToast,
} from '../../../utils/messages.js';
import { translate } from '../../../i18n/translation.js';
import {
	DOCUMENT_ID,
	FIRESTORE_DESTINATIONS_DATA,
	setFirestoreDestinationsData,
} from '../../../data/state.js';
import { COLLECTION, createBatchOps } from '../../../data/services/destination.service.js';
import { getSingleData } from '../../../data/firebase/database.js';
import { snapshotFormState } from '../../../ui/fields.js';
import {
	buildMapsCoordinateLink,
	buildMyMapsEntry,
	fetchKml,
	MYMAPS_KML_ENABLED,
	type MyMapsDraft,
	parseKml,
	readKmlFromFile,
	resolveMyMapsDrafts,
} from '../../../data/services/mymaps-kml.service.js';
import { GMAPS_SCRAPER_ENABLED, parseCoordinateSearchUrl } from '../../../data/services/gmaps-scraper.service.js';
import { PLACES_API_ENABLED } from '../../../data/services/places-api.service.js';
import { populateExistingDestinationForm } from '../existing-destination.js';

/** The 5 content categories a My Maps folder can map into (see §5 P2). */
const IMPORTABLE_CATEGORIES = ['restaurants', 'snacks', 'nightlife', 'tourism', 'shopping'];

/** Firestore writes per batch (hard limit is 500 — keep headroom). */
const BATCH_LIMIT = 500;

/** Re-import tolerance (plan P6, decision #6): pins within this distance (m) count as the same place. */
const REIMPORT_TOLERANCE_M = 20;

// ------------------------------------------------------------------
// Module state
// ------------------------------------------------------------------
let _drafts: MyMapsDraft[] = [];
let _docPath = '';
let _enriched = false; // whether enrichment already ran
let _enriching = false; // enrichment in progress
let _busy = false; // import write in progress
let _fetchController: AbortController | null = null;
let _uploadResolve: ((kml: string | null) => void) | null = null;
let _reimportMode = false; // re-import: skip already-imported placemarks (P6)

// ------------------------------------------------------------------
// Entry point
// ------------------------------------------------------------------

/**
 * Open the "Import from My Maps" flow — reached from the basic-information
 * "Update with Maps" bulk button: directly when nothing is linked to places,
 * or via the "My Maps" source option of the bulk source prompt. Reads the
 * destination's `myMaps` link, fetches (or uploads) the KML, then shows the
 * review dialog.
 */
export async function openMymapsImportDialog(): Promise<void> {
	_reimportMode = false;
	const drafts = await acquireKmlDrafts();
	if (drafts === null) return;
	_drafts = drafts;
	_enriched = false;
	_enriching = false;
	renderReview();
}

/**
 * Re-import from My Maps (P6): the same flow as the regular import, but
 * placemarks that were already imported are ignored — matching by source
 * coordinates (within ~20 m) against the destination's existing entries — so
 * only newly discovered placemarks are offered for review/write.
 */
export async function openMymapsReimportDialog(): Promise<void> {
	_reimportMode = true;
	const drafts = await acquireKmlDrafts();
	if (drafts === null) return;

	const existing = collectExistingCoordinates();
	const fresh = drafts.filter(
		(draft) =>
			!existing.some(
				(point) =>
					distanceM(point.lat, point.lng, draft.lat, draft.lng) <= REIMPORT_TOLERANCE_M,
			),
	);

	if (fresh.length === 0) {
		openToast(translate('mymapsImport.reimportNone'));
		return;
	}

	_drafts = fresh;
	_enriched = false;
	_enriching = false;
	renderReview();
}

/**
 * Acquire the destination's My Maps KML (worker proxy first, upload fallback)
 * and parse it into drafts. Returns null when the user cancels or parsing fails.
 */
async function acquireKmlDrafts(): Promise<MyMapsDraft[] | null> {
	if (MYMAPS_KML_ENABLED !== true) {
		displayError(new Error(translate('placesApi.errors.localOnly')), false, false);
		return null;
	}
	if (_busy || _enriching) return null;
	if (!DOCUMENT_ID) {
		displayError(new Error(translate('mymapsImport.errors.noDoc')), false, false);
		return null;
	}
	_docPath = `${COLLECTION.DESTINATIONS}/${DOCUMENT_ID}`;

	const mapLink = (getID<HTMLInputElement>('map-link')?.value ?? '').trim();
	const mid = extractMid(mapLink);

	// Acquire the KML: worker proxy first (when a `mid` is present), then the
	// upload fallback (map not public / proxy down / no link).
	let kml: string | null = null;
	if (mid) {
		showFetchingDialog();
		try {
			kml = await fetchKml({ mid, signal: _fetchController?.signal });
		} catch (error) {
			if (isAbortError(error)) {
				hideFetchingDialog();
				return null;
			}
			hideFetchingDialog();
			kml = await promptUpload(mid);
		}
	} else {
		kml = await promptUpload(mid);
	}
	if (kml == null) return null;

	try {
		return parseKml(kml);
	} catch (error) {
		displayError(
			error instanceof Error ? error : new Error(translate('mymapsImport.errors.invalidKml')),
			false,
			false,
		);
		return null;
	}
}

/**
 * Collect the source coordinates of every existing destination entry (P6).
 * Prefers the persisted `placeAPI.sourceCoords` (written by My Maps imports),
 * falling back to parsing the coordinate search URL kept in
 * `placeAPI.sourceUrl` / `placeAPI.map` / `entry.map` (legacy imports).
 */
function collectExistingCoordinates(): Array<{ lat: number; lng: number }> {
	const points: Array<{ lat: number; lng: number }> = [];
	for (const category of IMPORTABLE_CATEGORIES) {
		const map = FIRESTORE_DESTINATIONS_DATA?.[category] || {};
		for (const rawEntry of Object.values(map)) {
			const entry = rawEntry as any;
			const coords = entry?.placeAPI?.sourceCoords;
			if (coords && Number.isFinite(coords.lat) && Number.isFinite(coords.lng)) {
				points.push({ lat: coords.lat, lng: coords.lng });
				continue;
			}
			const url = entry?.placeAPI?.sourceUrl ?? entry?.placeAPI?.map ?? entry?.map ?? '';
			const parsed = parseCoordinateSearchUrl(url);
			if (parsed) points.push(parsed);
		}
	}
	return points;
}

/** Haversine distance in meters between two lat/lng points. */
function distanceM(lat1: number, lng1: number, lat2: number, lng2: number): number {
	const EARTH_RADIUS_M = 6371000;
	const toRad = (deg: number) => (deg * Math.PI) / 180;
	const dLat = toRad(lat2 - lat1);
	const dLng = toRad(lng2 - lng1);
	const a =
		Math.sin(dLat / 2) ** 2 +
		Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
	return EARTH_RADIUS_M * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ------------------------------------------------------------------
// Acquire: fetching dialog + upload fallback
// ------------------------------------------------------------------

function showFetchingDialog(): void {
	const controller = new AbortController();
	_fetchController = controller;
	const properties = cloneObject(MESSAGE_PROPERTIES);
	properties.title = translate('mymapsImport.title');
	properties.content = `
	<div class="mymaps-dialog mymaps-dialog--fetching">
		<div class="places-dialog-loading-ring"></div>
		<p class="mymaps-dialog-fetching-text">${escapeHtml(translate('mymapsImport.fetching'))}</p>
	</div>`;
	properties.containers = getContainersInput();
	properties.containers.principal = `${properties.containers.principal} mymaps-dialog-container`;
	properties.fullscreen = true;
	properties.buttons = [];
	// X cancels the in-flight fetch (aborts the controller) before closing.
	properties.icons = [{ type: 'close', action: cancelFetch }];
	displayFullMessage(properties);
}

function hideFetchingDialog(): void {
	_fetchController = null;
	closeMessage();
}

function cancelFetch(): void {
	_fetchController?.abort();
	_fetchController = null;
	closeMessage();
}

function isAbortError(error: unknown): boolean {
	return (error as Error)?.name === 'AbortError';
}

/**
 * Ask the user to pick an exported .kml / .kmz file. Resolves with the KML
 * text, or null when the user cancels. Used as the fallback when the worker
 * proxy path fails (map not public / network) or no `mid` is available.
 */
function promptUpload(mid: string): Promise<string | null> {
	return new Promise((resolve) => {
		_uploadResolve = resolve;
		const properties = cloneObject(MESSAGE_PROPERTIES);
		properties.title = translate('mymapsImport.title');
		properties.content = getUploadHTML(mid);
		properties.containers = getContainersInput();
		properties.containers.principal = `${properties.containers.principal} mymaps-dialog-container`;
		properties.fullscreen = true;
		// The X and the Cancel button both resolve(null) (see cancelUpload).
		properties.icons = [{ type: 'close', action: cancelUpload }];
		properties.buttons = [{ type: 'cancel', action: cancelUpload }];
		displayFullMessage(properties);
		wireUploadInput();
	});
}

function getUploadHTML(mid: string): string {
	return `
	<div class="mymaps-dialog">
		<p class="mymaps-dialog-message">${escapeHtml(translate('mymapsImport.fetchFailed'))}</p>
		${getUploadHintHTML(mid)}
		<input type="file" id="mymaps-file-input" accept=".kml,.kmz" style="display: none;" />
		<div class="mymaps-upload-actions">
			<button type="button" class="btn btn-theme btn-format" data-action="mymaps-upload">
				${escapeHtml(translate('mymapsImport.upload'))}
			</button>
		</div>
	</div>`;
}

/**
 * Hint line for the upload dialog. When the map's `mid` is known, offers a
 * manual download of the KML/KMZ straight from Google
 * (`https://www.google.com/maps/d/kml?mid=<MID>&forcekml=1`) so the user
 * doesn't have to go through ⋮ → Export — the link only wraps "clicking
 * here". Falls back to the generic export hint when no `mid` is available
 * (no My Maps link set).
 */
function getUploadHintHTML(mid: string): string {
	if (!mid) {
		return `<p class="mymaps-dialog-message mymaps-dialog-message--hint">${escapeHtml(
			translate('mymapsImport.uploadHint'),
		)}</p>`;
	}
	return `<p class="mymaps-dialog-message mymaps-dialog-message--hint">${escapeHtml(
		translate('mymapsImport.downloadHintBefore'),
	)}<a class="mymaps-download-link" href="${escapeAttr(
		`https://www.google.com/maps/d/kml?mid=${encodeURIComponent(mid)}&forcekml=1`,
	)}" target="_blank" rel="noopener noreferrer">${escapeHtml(
		translate('mymapsImport.downloadHintLink'),
	)}</a>.</p>`;
}

function wireUploadInput(): void {
	const input = getID<HTMLInputElement>('mymaps-file-input');
	if (!input) return;
	input.addEventListener('change', async () => {
		const file = input.files?.[0];
		if (!file) return;
		const resolve = _uploadResolve;
		_uploadResolve = null;
		try {
			const kml = await readKmlFromFile(file);
			closeMessage();
			resolve?.(kml);
		} catch (error) {
			closeMessage();
			displayError(
				error instanceof Error
					? error
					: new Error(translate('mymapsImport.errors.invalidKml')),
				false,
				false,
			);
			resolve?.(null);
		}
	});
}

function cancelUpload(): void {
	const resolve = _uploadResolve;
	_uploadResolve = null;
	closeMessage();
	resolve?.(null);
}

/** Pull the `mid` param out of a My Maps viewer URL ("" when absent). */
function extractMid(url: string): string {
	if (!url) return '';
	try {
		return new URL(url).searchParams.get('mid') ?? '';
	} catch {
		return '';
	}
}

// ------------------------------------------------------------------
// Review dialog
// ------------------------------------------------------------------

function renderReview(): void {
	const properties = cloneObject(MESSAGE_PROPERTIES);
	properties.title = translate(_reimportMode ? 'mymapsImport.reimportTitle' : 'mymapsImport.title');
	properties.containers = getContainersInput();
	properties.containers.principal = `${properties.containers.principal} mymaps-dialog-container`;
	properties.fullscreen = true;
	properties.buttons = [];
	properties.content = getReviewHTML();
	displayFullMessage(properties);
	wireReview();
}

function getReviewHTML(): string {
	const canEnrich = !_enriched && (PLACES_API_ENABLED || GMAPS_SCRAPER_ENABLED) && !_enriching;
	const skipped = _drafts.filter((d) => d.include && !d.category).length;
	const unmappedCount = _drafts.filter((d) => !d.category).length;
	// Mapped rows first, then the ones we couldn't auto-map grouped under a
	// heading so the user can assign each a category or leave it unchecked to
	// discard (see §5 P4 — "unassigned" handling).
	const mappedRows = _drafts.map((d, i) => (d.category ? getRowHTML(d, i) : '')).join('');
	const unmappedRows = _drafts.map((d, i) => (!d.category ? getRowHTML(d, i) : '')).join('');
	return `
	<div class="mymaps-dialog">
		<p class="mymaps-dialog-summary">${escapeHtml(
			translate(
				_reimportMode ? 'mymapsImport.reimportSummary' : 'mymapsImport.summary',
				{ count: String(_drafts.length) },
			),
		)}</p>
		${_enriching ? `<p class="mymaps-dialog-progress" id="mymaps-progress">${escapeHtml(translate('mymapsImport.enriching', { done: '0', total: String(_drafts.length) }))}</p>` : ''}
		<div class="mymaps-list" id="mymaps-list">
			${mappedRows}
			${unmappedCount > 0
				? `<div class="mymaps-unmapped-heading" id="mymaps-unmapped-heading">${escapeHtml(
						translate('mymapsImport.unmapped', { count: String(unmappedCount) }),
					)}</div>${unmappedRows}`
				: ''}
		</div>
		<p class="mymaps-dialog-hint" id="mymaps-skip-hint" ${skipped > 0 ? '' : 'style="display: none;"'}>${escapeHtml(
			translate('mymapsImport.skipUncategorized', { count: String(skipped) }),
		)}</p>
		<div class="mymaps-footer">
			${canEnrich ? `<button type="button" class="btn btn-basic btn-format" data-action="mymaps-enrich">${escapeHtml(translate('mymapsImport.enrich'))}</button>` : ''}
			<button type="button" id="mymaps-import-confirm" class="btn btn-theme btn-format" data-action="mymaps-import-confirm" ${_enriching ? 'disabled' : ''}>${escapeHtml(
				translate('mymapsImport.importAction', { count: String(countImportable()) }),
			)}</button>
		</div>
	</div>`;
}

function getRowHTML(draft: MyMapsDraft, index: number): string {
	const status = getStatus(draft);
	const unmapped = !draft.category;
	return `
	<div class="mymaps-row ${unmapped ? 'mymaps-row--unmapped' : ''}" data-index="${index}">
		<label class="mymaps-row-include">
			<input type="checkbox" data-action="mymaps-toggle" data-index="${index}" ${draft.include ? 'checked' : ''} ${_enriching ? 'disabled' : ''} />
		</label>
		<span class="mymaps-row-name" title="${escapeHtml(draft.map || buildMapsCoordinateLink(draft.lat, draft.lng))}">${escapeHtml(draft.name)}</span>
		${unmapped ? `<span class="mymaps-row-badge mymaps-row-badge--unassigned">${escapeHtml(translate('mymapsImport.unassigned'))}</span>` : ''}
		<select class="mymaps-row-category" data-index="${index}" ${_enriching ? 'disabled' : ''}>
			<option value="">${escapeHtml(translate('mymapsImport.unassigned'))}</option>
			${IMPORTABLE_CATEGORIES.map(
				(cat) =>
					`<option value="${cat}" ${draft.category === cat ? 'selected' : ''}>${escapeHtml(
						translate(`destination.${cat}.title`),
					)}</option>`,
			).join('')}
		</select>
		${status ? `<span class="mymaps-row-status mymaps-row-status--${status.key}">${escapeHtml(status.label)}</span>` : ''}
	</div>`;
}

function getStatus(draft: MyMapsDraft): { key: string; label: string } | null {
	if (draft.placeId) return { key: 'resolved', label: translate('mymapsImport.status.resolved') };
	if (_enriched) return { key: 'failed', label: translate('mymapsImport.status.failed') };
	// Pre-enrichment every placemark is just a coordinate pin — showing
	// "Coordinate link" on every row is noise, so no badge until there's a
	// resolution outcome to communicate.
	return null;
}

/** Number of drafts the Import button would actually write (included + categorized). */
function countImportable(): number {
	return _drafts.filter((d) => d.include && d.category).length;
}

/** Keep the Import button + skip hint in sync with checkbox/category edits. */
function updateConfirmLabel(): void {
	const button = getID<HTMLButtonElement>('mymaps-import-confirm');
	if (button && !button.disabled) {
		button.textContent = translate('mymapsImport.importAction', {
			count: String(countImportable()),
		});
	}
	const hint = getID<HTMLElement>('mymaps-skip-hint');
	if (hint) {
		const skipped = _drafts.filter((d) => d.include && !d.category).length;
		hint.style.display = skipped > 0 ? '' : 'none';
		hint.textContent = translate('mymapsImport.skipUncategorized', { count: String(skipped) });
	}
}

function wireReview(): void {
	// Category <select> edits update the live draft (change, not click).
	document.querySelectorAll<HTMLSelectElement>('.mymaps-row-category').forEach((select) => {
		select.addEventListener('change', () => {
			const index = Number(select.getAttribute('data-index'));
			const draft = _drafts[index];
			if (!draft) return;
			const wasUncategorized = !draft.category;
			draft.category = select.value || null;
			// Picking a category for an unmapped placemark = intent to import it →
			// auto-check the row so it counts toward the Import button (and the
			// user can still uncheck to discard instead).
			if (wasUncategorized && draft.category && !draft.include) {
				draft.include = true;
				const checkbox = select
					.closest('.mymaps-row')
					?.querySelector<HTMLInputElement>('input[type="checkbox"]');
				if (checkbox) checkbox.checked = true;
			}
			updateConfirmLabel();
		});
	});
}

// ------------------------------------------------------------------
// Enrichment (optional, user-approved — decision #3)
// ------------------------------------------------------------------

async function runEnrichment(): Promise<void> {
	if (_enriching || _busy) return;
	const importable = _drafts.filter((d) => d.include && d.category);
	if (importable.length === 0) return;

	_enriching = true;
	// Re-render in a "resolving" state (progress line, disabled controls).
	renderReview();

	const destinationTitle = (getID<HTMLInputElement>('title')?.value ?? '').trim();
	try {
		const resolved = await resolveMyMapsDrafts(_drafts, {
			destinationTitle,
			onProgress: (done, total) => {
				const el = getID<HTMLElement>('mymaps-progress');
				if (el) {
					el.textContent = translate('mymapsImport.enriching', {
						done: String(done),
						total: String(total),
					});
				}
			},
		});
		_drafts = resolved;
		_enriched = true;
	} catch (error) {
		console.error('[mymaps-import] Enrichment failed', error);
	} finally {
		_enriching = false;
		// Re-render only when the review dialog is still open (the user may
		// have closed it mid-enrichment).
		if (getID('mymaps-list')) renderReview();
	}
}

// ------------------------------------------------------------------
// Conflict detection + write
// ------------------------------------------------------------------

interface MyMapsConflict {
	/** Index into `_drafts` (matches the review row). */
	index: number;
	category: string;
	name: string;
	existingId: string;
	existingName: string;
	viaName: boolean;
}

type ConflictChoice = 'keep' | 'skip' | 'replace';

/** Per-draft write decision (from the conflict dialog, keyed by draft index). */
type DecisionMap = Map<number, { choice: ConflictChoice; existingId?: string }>;

/**
 * Find drafts whose name or Maps link collides with an existing entry in the
 * same category (decision #5). One conflict per draft — enough to ask.
 */
function detectConflicts(indexes: number[]): MyMapsConflict[] {
	const conflicts: MyMapsConflict[] = [];
	const norm = (s: string) =>
		(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

	for (const index of indexes) {
		const draft = _drafts[index];
		const category = draft.category;
		if (!category) continue;
		const existing: Record<string, any> = FIRESTORE_DESTINATIONS_DATA?.[category] || {};
		const draftName = norm(draft.name);
		const draftMap = norm(draft.map || buildMapsCoordinateLink(draft.lat, draft.lng));

		for (const [existingId, rawEntry] of Object.entries(existing)) {
			const entry = rawEntry as any;
			const viaName = Boolean(draftName && norm(entry?.name) === draftName);
			const viaLink = Boolean(draftMap && norm(entry?.map) === draftMap);
			if (viaName || viaLink) {
				conflicts.push({
					index,
					category,
					name: draft.name,
					existingId,
					existingName: entry?.name || existingId,
					viaName,
				});
				break;
			}
		}
	}
	return conflicts;
}

async function handleImportConfirm(): Promise<void> {
	if (_busy || _enriching) return;

	const indexes = _drafts
		.map((d, i) => (d.include && d.category ? i : -1))
		.filter((i) => i >= 0);
	if (indexes.length === 0) {
		openToast(translate('mymapsImport.emptySelection'));
		return;
	}

	// Conflict pass (decision #5) — batch every collision into one dialog.
	const conflicts = detectConflicts(indexes);
	let decisions: DecisionMap = new Map();
	if (conflicts.length > 0) {
		const resolved = await promptConflicts(conflicts);
		if (!resolved) return; // user cancelled
		decisions = resolved;
	}

	_busy = true;
	try {
		// Close whichever dialog is showing (review or conflict) before writing.
		closeMessage();
		const imported = await writeImports(decisions);
		// Reflect the completion marker in-memory too (P5), so the bulk options
		// read it live even before the post-write form refresh completes.
		if (imported > 0 && FIRESTORE_DESTINATIONS_DATA) {
			FIRESTORE_DESTINATIONS_DATA.myMapsImported = true;
		}
		await refreshForm();
		openToast(translate('mymapsImport.imported', { count: String(imported) }));
	} catch (error) {
		console.error('[mymaps-import] Import write failed', error);
		displayError(
			error instanceof Error ? error : new Error(translate('placesApi.apply.error')),
			false,
			false,
		);
	} finally {
		_busy = false;
	}
}

/**
 * Write the included drafts to Firestore as dot-path map updates
 * (`{category}.{id}: item`, plan §5 P4) in batches of ≤ 500. Handles the
 * per-conflict decisions: skip / replace (keep the existing id) / keep both.
 * Returns the number of entries written.
 */
async function writeImports(decisions: DecisionMap): Promise<number> {
	const usedIds = new Set<string>();
	for (const category of IMPORTABLE_CATEGORIES) {
		for (const id of Object.keys(FIRESTORE_DESTINATIONS_DATA?.[category] || {})) {
			usedIds.add(id);
		}
	}

	const ops: { path: string; data: Record<string, unknown> }[] = [];
	// Categories that actually receive at least one entry this run (only
	// written ones — conflict "skip" decisions don't count).
	const touchedCategories = new Set<string>();
	let imported = 0;

	for (let i = 0; i < _drafts.length; i++) {
		const draft = _drafts[i];
		if (!draft.include || !draft.category) continue;

		const decision = decisions.get(i);
		if (decision?.choice === 'skip') continue;

		const item = buildMyMapsEntry(draft);
		if (decision?.choice === 'replace' && decision.existingId) {
			ops.push({
				path: _docPath,
				data: { [`${draft.category}.${decision.existingId}`]: item },
			});
		} else {
			const id = getRandomID({ pool: [...usedIds] });
			usedIds.add(id);
			ops.push({ path: _docPath, data: { [`${draft.category}.${id}`]: item } });
		}
		touchedCategories.add(draft.category);
		imported++;
	}

	// A My Maps import may target a category whose module is currently
	// disabled (its section hidden on the edit page). Auto-enable it in the
	// same write (`modules.{category}: true` — read back by
	// populateExistingDestinationForm/loadExistingDestination), so the imported
	// entries are immediately visible and manageable in the form. Only persists
	// when the stored doc has the module off; enabled categories are untouched.
	for (const category of touchedCategories) {
		if (FIRESTORE_DESTINATIONS_DATA?.modules?.[category] !== true) {
			ops.push({ path: _docPath, data: { [`modules.${category}`]: true } });
		}
	}

	// Mark the destination as having completed a My Maps import (plan P5) so
	// the bulk options hide "Import from My Maps" and offer "Re-import from My
	// Maps" instead. Only persisted when at least one entry was actually imported.
	if (imported > 0) {
		ops.push({ path: _docPath, data: { myMapsImported: true } });
	}

	for (let start = 0; start < ops.length; start += BATCH_LIMIT) {
		const chunk = ops.slice(start, start + BATCH_LIMIT);
		const batch = createBatchOps();
		for (const op of chunk) batch.update(op.path, op.data);
		const result = await batch.commit();
		if (!result?.success) {
			throw new Error(result?.error || translate('placesApi.apply.error'));
		}
	}
	return imported;
}

// ------------------------------------------------------------------
// Conflict dialog
// ------------------------------------------------------------------

/**
 * Show every conflict in one dialog, each with a per-item choice
 * (keep both / skip / replace — default keep). Resolves with the decisions
 * map, or null when the user cancels.
 */
function promptConflicts(conflicts: MyMapsConflict[]): Promise<DecisionMap | null> {
	return new Promise((resolve) => {
		const properties = cloneObject(MESSAGE_PROPERTIES);
		properties.title = translate('mymapsImport.conflicts.title');
		properties.content = getConflictsHTML(conflicts);
		properties.containers = getContainersInput();
		properties.containers.principal = `${properties.containers.principal} mymaps-dialog-container`;
		properties.fullscreen = true;
		// No X close button — only Cancel (back to review) and Confirm resolve the
		// promise, so the awaited flow never hangs on a bare close.
		properties.closeButton = false;
		properties.buttons = [
			{
				type: 'cancel',
				action: () => {
					closeMessage();
					// Back to the review dialog so the user can adjust and retry.
					renderReview();
					resolve(null);
				},
			},
			{
				type: 'confirm',
				// Read the per-item choices; the caller (handleImportConfirm)
				// closes this dialog right before the write.
				action: () => resolve(readConflictDecisions(conflicts)),
			},
		];
		displayFullMessage(properties);
	});
}

function getConflictsHTML(conflicts: MyMapsConflict[]): string {
	const rows = conflicts
		.map((conflict) => {
			const categoryLabel = translate(`destination.${conflict.category}.title`);
			return `
			<div class="mymaps-conflict" data-index="${conflict.index}">
				<p class="mymaps-conflict-text">
					<strong>${escapeHtml(conflict.name)}</strong>
					<span class="mymaps-conflict-meta">· ${escapeHtml(categoryLabel)}</span>
				</p>
				<select class="mymaps-conflict-choice" data-index="${conflict.index}">
					<option value="keep">${escapeHtml(translate('mymapsImport.conflicts.keep'))}</option>
					<option value="skip">${escapeHtml(translate('mymapsImport.conflicts.skip'))}</option>
					<option value="replace">${escapeHtml(translate('mymapsImport.conflicts.replace'))}</option>
				</select>
			</div>`;
		})
		.join('');

	return `
	<div class="mymaps-dialog">
		<p class="mymaps-dialog-message">${escapeHtml(translate('mymapsImport.conflicts.message'))}</p>
		<div class="mymaps-conflict-list">${rows}</div>
	</div>`;
}

function readConflictDecisions(conflicts: MyMapsConflict[]): DecisionMap {
	const decisions: DecisionMap = new Map();
	document.querySelectorAll<HTMLSelectElement>('.mymaps-conflict-choice').forEach((select) => {
		const index = Number(select.getAttribute('data-index'));
		const conflict = conflicts.find((c) => c.index === index);
		if (!conflict) return;
		const choice = (select.value === 'skip' || select.value === 'replace' ? select.value : 'keep') as ConflictChoice;
		decisions.set(index, { choice, existingId: conflict.existingId });
	});
	return decisions;
}

// ------------------------------------------------------------------
// Post-write form refresh
// ------------------------------------------------------------------

/**
 * Re-read the destination doc, re-populate the edit form (so the imported
 * entries show up as cards) and reset the unsaved-changes baseline so the
 * beforeunload prompt doesn't fire right after an import.
 */
async function refreshForm(): Promise<void> {
	const data = await getSingleData('destinations');
	if (data) {
		setFirestoreDestinationsData(data);
		// A re-populate failure shouldn't mask the successful write — log it
		// and keep going so the success toast still shows.
		try {
			populateExistingDestinationForm();
		} catch (error) {
			console.error('[mymaps-import] Form refresh failed after import', error);
		}
		snapshotFormState();
	}
	// Keep the bulk "Update with Maps" button in sync (imported entries may be
	// linked now). Dynamic import avoids the edit-destination module cycle.
	try {
		const { refreshPlacesBulkButton } = await import('../edit-destination.js');
		refreshPlacesBulkButton();
	} catch {
		// Not on the edit page — nothing to refresh.
	}
}

// ------------------------------------------------------------------
// Actions + wiring
// ------------------------------------------------------------------

registerActions({
	'mymaps-upload': () => {
		getID<HTMLInputElement>('mymaps-file-input')?.click();
	},
	'mymaps-toggle': (target) => {
		const el = target as HTMLInputElement;
		const index = Number(el.getAttribute('data-index'));
		if (_drafts[index]) _drafts[index].include = el.checked;
		updateConfirmLabel();
	},
	'mymaps-enrich': () => {
		void runEnrichment();
	},
	'mymaps-import-confirm': () => {
		void handleImportConfirm();
	},
});

// ------------------------------------------------------------------
// HTML escaping helper (local copy, same pattern as the places modules)
// ------------------------------------------------------------------

function escapeHtml(value: string): string {
	const div = document.createElement('div');
	div.textContent = value;
	return div.innerHTML;
}

/** Escape for use inside a double-quoted HTML attribute value. */
function escapeAttr(value: string): string {
	return escapeHtml(value).replace(/"/g, '&quot;');
}
