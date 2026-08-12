// ======= Places API — Bulk "Update with Maps": fetch + report (P11) =======
// Fetches fresh info for every destination entry that has a linked Google
// Place ID (placeAPI.id) and renders a report of what can be updated:
//   - how many fields across the linked items carry new data vs the saved
//     placeAPI,
//   - how many linked places are no longer operational (CLOSED_PERMANENTLY).
//
// P10 contract (running in parallel — the bulk BUTTON + confirm dialog live in
// pages/edit-destination/edit-destination.ts + public/edit/destination.html).
// P10's Confirm button calls runBulkPlacesUpdate() directly (imported from this
// module); runBulkUpdate is kept as an alias. The entry point is also exposed
// for robustness via:
//   1. import { runBulkPlacesUpdate } from './places-bulk.js';
//   2. a button with data-action="places-bulk-run"
//   3. a string message action "runBulkPlacesUpdate()" (utils/messages.ts registry)
// P10 also uses countLinkedItems()/collectLinkedEntries() for the button
// visibility + the "Try to get information from X linked item(s)?" message.
//
// P12 extends this module with the apply options UI + persistence; it consumes
// the BulkReport / BulkItemResult shapes exported here.
//
// This module is loaded transitively by places/places-apply-flow.ts (P9), so
// it joins the edit-destination bundle without touching P10's files.
//
// References:
// - docs/ai-analysis/6-places-api-edit-destination.md (§4, §5 P11)
// - places/places-apply.ts (P3: FIELD_KEYS, buildClosedState, getClosedLabel)
// - data/services/places-api.service.ts (P1: getPlace + MOCK fixtures)

import { registerActions } from '../ui/actions.js';
import { cloneObject, findJFromID, getID, removeChildWithValidation } from '../utils/dom.js';
import {
	closeMessage,
	displayError,
	displayFullMessage,
	getContainersInput,
	MESSAGE_PROPERTIES,
	openToast,
	registerActions as registerMessageActions,
} from '../utils/messages.js';
import { getLanguagePackName, translate } from '../i18n/translation.js';
import {
	DOCUMENT_ID,
	FIRESTORE_DESTINATIONS_DATA,
	FIRESTORE_DESTINATIONS_NEW_DATA,
} from '../data/state.js';
import { COLLECTION, createBatchOps } from '../data/services/destination.service.js';
import { getPlace, PLACES_API_ENABLED } from '../data/services/places-api.service.js';
import { GMAPS_SCRAPER_ENABLED, scrapePlaces } from '../data/services/gmaps-scraper.service.js';
import { removeSelectorDS } from '../ui/dynamic-select.js';
import { removeDestinationImages } from '../pages/edit-destination/categories/image.js';
import type { PlaceDetails } from '../models/places-api.model.js';
import type { PlaceAPI, PlaceDescription, PlaceItem } from '../models/schema.js';
import { notifyPlacesLimited } from './places-dialog.js';
import {
	applyPlaceData,
	buildClosedState,
	FIELD_KEYS,
	getClosedLabel,
	isAutoFilled,
	type PlaceFieldKey,
} from './places-apply.js';
// P9's form/pending-data sync helpers are reused by the bulk apply (P12).
// This creates a benign circular import (apply-flow imports this module for
// bundling) — both modules only call each other's functions at runtime, never
// at module-eval time, so the ESM cycle resolves safely in the browser.
import { refreshPendingData, updateFormEntry } from './places-apply-flow.js';

/** The five destination categories (same keys as the edit form + schema). */
const DESTINATION_CATEGORIES = [
	'restaurants',
	'snacks',
	'nightlife',
	'tourism',
	'shopping',
] as const;

/** Max concurrent info requests (bounded concurrency, plan §5 P11). */
const CONCURRENCY = 5;

let _bulkRunning = false;
let _bulkAbort: AbortController | null = null;
/** Last computed report — kept so the apply step (P12) can read its items. */
let _bulkReport: BulkReport | null = null;

// ------------------------------------------------------------------
// Public data shapes (P12 consumes these for the apply options)
// ------------------------------------------------------------------

/** A destination entry that has a linked Google Place ID (placeAPI.id). */
export interface BulkLinkedEntry {
	category: string;
	id: string;
	entry: PlaceItem;
	/** The entry's saved placeAPI (always present — this is what makes it linked). */
	placeAPI: PlaceAPI;
	/** Google Place ID (placeAPI.id), or '' for local-only imports. */
	placeId: string;
	/** Maps link used by the local (gmaps scraper) refresh path, when available. */
	scrapeUrl?: string;
}

/** Per-entry result after fetching fresh info for a linked item. */
export interface BulkItemResult {
	category: string;
	id: string;
	/** Google Place ID (placeAPI.id) — also handy for P12's apply updates. */
	placeId: string;
	entry: PlaceItem;
	/** The placeAPI stored before this bulk run (P12 compares/applies against it). */
	oldPlaceAPI: PlaceAPI;
	/** Fresh info fetched from the info route (P12 applies it). */
	newPlace: PlaceDetails;
	/** FIELD_KEYS whose fresh value differs from the stored placeAPI. */
	updatableFields: PlaceFieldKey[];
	/** Whether the fresh place is no longer operational. */
	closed: boolean;
	/** Set when fetching this item failed — excluded from the counts. */
	error?: string;
}

/** Aggregate report P11 renders (and P12 consumes to build the apply options). */
export interface BulkReport {
	items: BulkItemResult[];
	/** Total updatable fields across all successfully-fetched items. */
	totalUpdatableFields: number;
	/** Number of linked places no longer operational. */
	closedCount: number;
}

// ------------------------------------------------------------------
// Linked-item discovery (P10 uses the count; P12 reuses collectLinkedEntries)
// ------------------------------------------------------------------

/**
 * Count destination entries that have a linked Google Place ID across all
 * categories. P10 uses this for the "Update with Maps" button visibility and
 * the "Try to get information from X linked item(s)?" confirm message.
 */
export function countLinkedItems(): number {
	return collectLinkedEntries().length;
}

/**
 * Collect every linked entry (placeAPI.id) from the loaded + pending
 * destination data. Pending data (FIRESTORE_DESTINATIONS_NEW_DATA) wins over
 * the loaded document for the same id, so entries staged/updated by the
 * per-item dialog (P9) are seen with their freshest values.
 */
export function collectLinkedEntries(): BulkLinkedEntry[] {
	const byKey = new Map<string, BulkLinkedEntry>();
	const addFrom = (source: Record<string, any> | null | undefined): void => {
		if (!source) return;
		for (const category of DESTINATION_CATEGORIES) {
			const map: Record<string, any> | undefined = source[category];
			if (!map || typeof map !== 'object') continue;
			for (const [id, rawEntry] of Object.entries(map)) {
				const placeAPI = rawEntry?.placeAPI as PlaceAPI | undefined;
				const placeId = placeAPI?.id;
				if (!placeId) continue;
				byKey.set(`${category}:${id}`, {
					category,
					id,
					entry: rawEntry as PlaceItem,
					placeAPI,
					placeId,
				});
			}
		}
	};
	addFrom(FIRESTORE_DESTINATIONS_DATA);
	addFrom(FIRESTORE_DESTINATIONS_NEW_DATA); // newer pending data wins
	return [...byKey.values()];
}

/**
 * Collect every entry that can be refreshed by the LOCAL (gmaps scraper) path:
 * any entry with a scrape-able Maps link (placeAPI.sourceUrl or placeAPI.map).
 * This includes local imports that have a BLANK place id (sourceUrl only),
 * which the Places API bulk path can't reach. Pending data wins over the
 * loaded document for the same id.
 */
export function collectLocalScrapeEntries(): BulkLinkedEntry[] {
	const byKey = new Map<string, BulkLinkedEntry>();
	const addFrom = (source: Record<string, any> | null | undefined): void => {
		if (!source) return;
		for (const category of DESTINATION_CATEGORIES) {
			const map: Record<string, any> | undefined = source[category];
			if (!map || typeof map !== 'object') continue;
			for (const [id, rawEntry] of Object.entries(map)) {
				const placeAPI = rawEntry?.placeAPI as PlaceAPI | undefined;
				if (!placeAPI) continue;
				const scrapeUrl = placeAPI.sourceUrl ?? placeAPI.map ?? '';
				if (!scrapeUrl) continue;
				byKey.set(`${category}:${id}`, {
					category,
					id,
					entry: rawEntry as PlaceItem,
					placeAPI,
					placeId: placeAPI.id ?? '',
					scrapeUrl,
				});
			}
		}
	};
	addFrom(FIRESTORE_DESTINATIONS_DATA);
	addFrom(FIRESTORE_DESTINATIONS_NEW_DATA); // newer pending data wins
	return [...byKey.values()];
}

/** Count local-scrapeable entries (sourceUrl/map present). */
export function countLocalScrapeEntries(): number {
	return collectLocalScrapeEntries().length;
}

/**
 * Count entries refreshable by EITHER source: linked by a place id OR carrying
 * a local scrape link. Drives the bulk button visibility (the button should
 * show as long as at least one entry can be updated somehow).
 */
export function countBulkEligibleEntries(): number {
	const keys = new Set<string>();
	for (const entry of collectLinkedEntries()) keys.add(`${entry.category}:${entry.id}`);
	for (const entry of collectLocalScrapeEntries()) keys.add(`${entry.category}:${entry.id}`);
	return keys.size;
}

// ------------------------------------------------------------------
// Main entry point (P10's Confirm button calls this)
// ------------------------------------------------------------------

/**
 * Run the bulk fetch + report flow for the PLACES API source.
 *
 * 1. Collect every linked entry (placeAPI.id).
 * 2. Show a dialog-scoped loading overlay (spinner ring + cancel X).
 * 3. Fetch fresh info for each via getPlace() with bounded concurrency (5).
 *    ONLY the info route is called — the bulk flow never fetches photos
 *    (photo import exists only in the per-item dialog, P8/P9).
 * 4. Compare fresh data vs the stored placeAPI: count updatable fields + closed
 *    places, then render the report.
 */
export async function runBulkPlacesUpdate(): Promise<void> {
	// HARD CHECK — local environments only. Guard the direct entry point
	// (data-action="places-bulk-run" / message action) too, even though
	// getPlace() already throws on deployed hosts.
	if (PLACES_API_ENABLED !== true) {
		displayError(new Error(translate('placesApi.errors.localOnly')));
		return;
	}
	const entries = collectLinkedEntries();
	if (entries.length === 0) {
		// P10 gates the button on count > 0 — this is a safety net.
		console.warn('[places-bulk] No linked items to update');
		return;
	}
	await runBulkFetch(entries, (item, signal) =>
		getPlace(item.placeId, {
			signal,
			photos: false,
			onLimited: (limited) => {
				if (limited) notifyPlacesLimited();
			},
		}),
	);
}

/** @deprecated Alias for {@link runBulkPlacesUpdate} (the P10 contract name). */
export { runBulkPlacesUpdate as runBulkUpdate };

/**
 * Run the bulk fetch + report flow for the LOCAL (gmaps scraper) source.
 * Collects every entry with a scrape-able Maps link (sourceUrl/map — includes
 * local imports with a blank place id) and refreshes them ALL in ONE local
 * request (scrapePlaces), then reuses the same report + apply options as
 * P11/P12. Local scrapes never touch the Places API/photos keys.
 */
export async function runBulkLocalUpdate(): Promise<void> {
	// HARD CHECK — local-only (the scraper route only exists on the dev machine).
	if (PLACES_API_ENABLED !== true || GMAPS_SCRAPER_ENABLED !== true) {
		displayError(new Error(translate('placesApi.errors.localOnly')));
		return;
	}
	const entries = collectLocalScrapeEntries();
	if (entries.length === 0) {
		displayError(new Error(translate('placesApi.bulk.local.none')));
		return;
	}
	// Sequential (concurrency 1): each entry is one local docker run, and
	// back-to-back runs get rate-limited by Google — never fan them out.
	await runBulkFetch(
		entries,
		async (item, signal) => {
			const url = item.scrapeUrl ?? '';
			const places = await scrapePlaces([url], {
				signal,
				lang: getLanguagePackName(),
			});
			const place = places[0];
			if (!place || !place.name) {
				// Empty result → blocked/rate-limited; surface it per entry.
				throw new Error(translate('placesApi.errors.rateLimited'));
			}
			return place;
		},
		1,
	);
}

/**
 * Build the aggregate report from per-item results. Exported so P12 can reuse
 * it after applying options.
 */
export function computeBulkReport(items: BulkItemResult[]): BulkReport {
	const totalUpdatableFields = items.reduce((sum, item) => sum + item.updatableFields.length, 0);
	const closedCount = items.filter((item) => item.closed).length;
	return { items, totalUpdatableFields, closedCount };
}

// ------------------------------------------------------------------
// Shared fetch driver (both sources)
// ------------------------------------------------------------------

/**
 * Open the bulk dialog, fetch fresh info for `entries` with bounded
 * concurrency via `fetcher`, and render the report. Shared by the Places API
 * (runBulkPlacesUpdate) and local scraper (runBulkLocalUpdate) paths.
 */
async function runBulkFetch(
	entries: BulkLinkedEntry[],
	fetcher: (item: BulkLinkedEntry, signal: AbortSignal) => Promise<PlaceDetails>,
	concurrency = CONCURRENCY,
): Promise<void> {
	if (_bulkRunning) return;
	if (entries.length === 0) return;

	_bulkRunning = true;
	openBulkDialog();

	const controller = new AbortController();
	_bulkAbort = controller;
	try {
		const items = await fetchPlaces(entries, fetcher, controller.signal, concurrency);
		if (controller.signal.aborted) return; // cancelled by the X / Escape
		renderBulkReport(computeBulkReport(items));
	} catch (error) {
		if (isAbortError(error)) return;
		console.error('[places-bulk] Bulk fetch failed', error);
		renderBulkError(error);
	} finally {
		if (_bulkAbort === controller) _bulkAbort = null;
		hideBulkLoading();
		_bulkRunning = false;
	}
}

/** Whether `error` is a user-cancelled AbortError (same check as places-dialog). */
function isAbortError(error: unknown): boolean {
	return (error as Error)?.name === 'AbortError';
}

/**
 * Fetch fresh info for every entry via `fetcher` with bounded concurrency,
 * building a per-item BulkItemResult. A single failure records + skips rather
 * than aborting the run.
 */
async function fetchPlaces(
	entries: BulkLinkedEntry[],
	fetcher: (item: BulkLinkedEntry, signal: AbortSignal) => Promise<PlaceDetails>,
	signal: AbortSignal,
	concurrency = CONCURRENCY,
): Promise<BulkItemResult[]> {
	const lang = getLanguagePackName();
	const results: Array<BulkItemResult | undefined> = new Array(entries.length);
	let index = 0;

	const worker = async (): Promise<void> => {
		while (index < entries.length) {
			const i = index++;
			const { category, id, entry, placeAPI, placeId } = entries[i];
			try {
				const newPlace = await fetcher(entries[i], signal);
				if (signal.aborted) return;
				results[i] = {
					category,
					id,
					// Fresh id wins — a local scrape may return a real place id
					// where the saved one was blank.
					placeId: newPlace.id || placeId,
					entry,
					oldPlaceAPI: placeAPI,
					newPlace,
					updatableFields: computeUpdatableFields(newPlace, placeAPI, lang),
					closed: buildClosedState(newPlace).closed,
				};
			} catch (error) {
				// Cancellation propagates; a single bad link (e.g. removed on
				// Google's side) shouldn't abort the whole run — record + skip.
				if (isAbortError(error)) throw error;
				console.warn(`[places-bulk] Failed to fetch place ${placeId}`, error);
				results[i] = {
					category,
					id,
					placeId,
					entry,
					oldPlaceAPI: placeAPI,
					newPlace: {} as PlaceDetails,
					updatableFields: [],
					closed: false,
					error: error instanceof Error ? error.message : translate('placesApi.errors.network'),
				};
			}
		}
	};

	await Promise.all(Array.from({ length: Math.min(concurrency, entries.length) }, () => worker()));
	return results.filter((result): result is BulkItemResult => Boolean(result));
}

/** The FIELD_KEYS whose fresh value is non-empty and differs from the stored placeAPI. */
function computeUpdatableFields(
	newPlace: PlaceDetails,
	oldPlaceAPI: PlaceAPI,
	lang: string,
): PlaceFieldKey[] {
	return FIELD_KEYS.filter((field) => isFieldUpdatable(newPlace, oldPlaceAPI, field, lang));
}

/**
 * Whether a field has new info worth applying. Only counts when the fresh value
 * is non-empty AND differs from the stored placeAPI — an empty API value can't
 * update anything (matches places-apply's applyFieldToEntry, which only copies
 * non-empty primitives). `description` compares the requested language only.
 */
function isFieldUpdatable(
	newPlace: PlaceDetails,
	oldPlaceAPI: PlaceAPI,
	field: PlaceFieldKey,
	lang: string,
): boolean {
	if (field === 'description') {
		const newValue = typeof newPlace.description === 'string' ? newPlace.description : '';
		if (newValue === '') return false;
		const stored = oldPlaceAPI.description?.[lang as keyof PlaceDescription] ?? '';
		return newValue !== stored;
	}
	const newValue = typeof newPlace[field] === 'string' ? (newPlace[field] as string) : '';
	if (newValue === '') return false;
	const stored = oldPlaceAPI[field] ?? '';
	return newValue !== stored;
}

// ------------------------------------------------------------------
// Bulk dialog
// Reuses the .places-dialog-container width (edit.css) and the P5
// .places-dialog-loading dialog-scoped overlay (spinner ring + cancel X).
// ------------------------------------------------------------------

function openBulkDialog(): void {
	const properties = cloneObject(MESSAGE_PROPERTIES);
	properties.title = translate('placesApi.updateWithMaps');
	properties.containers = getContainersInput();
	properties.containers.principal = `${properties.containers.principal} places-dialog-container`;
	properties.fullscreen = true;
	// The X close button renders in the standard icon box (above the title);
	// its action cancels the in-flight fetch before closing (closeBulkDialog).
	// closeButton stays false so Escape keeps going through closeBulkDialog.
	properties.closeButton = false;
	properties.icons = [{ type: 'close', action: closeBulkDialog }];
	properties.buttons = [];
	properties.content = getBulkShellHTML();
	displayFullMessage(properties);

	const root = getID('places-bulk');
	root?.addEventListener('click', handleBulkClick);
	document.addEventListener('keydown', handleBulkKeydown);

	showBulkLoading();
}

function getBulkShellHTML(): string {
	return `
	<div class="places-bulk" id="places-bulk">
		<div id="places-bulk-content" class="places-bulk-content"></div>
		<!-- Dialog-scoped loading overlay — reuses the P5 .places-dialog-loading
		     spinner ring + cancel X (see edit.css). -->
		<div id="places-bulk-loading" class="places-dialog-loading" style="display: none">
			<div class="places-dialog-loading-ring"></div>
			<div id="places-bulk-loading-message" class="places-dialog-loading-message"></div>
			<i id="places-bulk-loading-cancel" class="iconify places-dialog-loading-cancel"
				data-icon="material-symbols-light:close" role="button"></i>
		</div>
	</div>`;
}

function showBulkLoading(message = ''): void {
	const overlay = getID('places-bulk-loading');
	if (overlay) overlay.style.display = 'flex';
	const messageEl = getID('places-bulk-loading-message');
	if (messageEl) messageEl.textContent = message || translate('placesApi.loading.fetching');
}

function hideBulkLoading(): void {
	const overlay = getID('places-bulk-loading');
	if (overlay) overlay.style.display = 'none';
}

function handleBulkClick(event: MouseEvent): void {
	const target = event.target as Element | null;
	if (!target) return;
	// Event delegation keeps the buttons working after Iconify replaces the
	// close <i> icons with <svg> at runtime (same pattern as places-dialog).
	if (target.closest('#places-bulk-loading-cancel')) {
		closeBulkDialog();
	}
}

function handleBulkKeydown(event: KeyboardEvent): void {
	if (event.key === 'Escape') {
		event.preventDefault();
		closeBulkDialog();
	}
}

/** Abort the in-flight fetch, detach the keydown listener and close the modal. */
function closeBulkDialog(): void {
	if (_bulkAbort) {
		_bulkAbort.abort();
		_bulkAbort = null;
	}
	document.removeEventListener('keydown', handleBulkKeydown);
	_bulkRunning = false;
	closeMessage();
}

// ------------------------------------------------------------------
// Report rendering
// ------------------------------------------------------------------

function renderBulkReport(report: BulkReport): void {
	hideBulkLoading();
	// Keep the report so the apply step (P12) can build updates from its items.
	_bulkReport = report;
	const content = getID('places-bulk-content');
	if (!content) return;
	content.innerHTML = getReportHTML(report);
}

function getReportHTML(report: BulkReport): string {
	const { items, totalUpdatableFields, closedCount } = report;

	const rows = items
		.map((item) => {
			const name =
				item.entry?.name || item.newPlace?.name || item.placeId || `${item.category}:${item.id}`;
			if (item.error) {
				return `
				<li class="places-bulk-report-item">
					<span class="places-bulk-report-item-name">${escapeHtml(name)}</span>
					<span class="places-bulk-report-item-error">${escapeHtml(item.error)}</span>
				</li>`;
			}
			const meta: string[] = [];
			if (item.updatableFields.length > 0) {
				meta.push(
					escapeHtml(
						translate('placesApi.bulk.report.fields', {
							count: String(item.updatableFields.length),
						}),
					),
				);
			}
			if (item.closed) {
				meta.push(`<span class="places-bulk-badge">${escapeHtml(getClosedLabel())}</span>`);
			}
			return `
			<li class="places-bulk-report-item">
				<span class="places-bulk-report-item-name">${escapeHtml(name)}</span>
				${meta.length > 0 ? `<span class="places-bulk-report-item-meta">${meta.join(' ')}</span>` : ''}
			</li>`;
		})
		.join('');

	return `
	<div class="places-bulk-report">
		<div class="places-bulk-report-icon">
			<i class="iconify" data-icon="material-symbols-light:summarize"></i>
		</div>
		<div class="places-bulk-report-counts">
			<span>${escapeHtml(
				translate('placesApi.bulk.report.fields', { count: String(totalUpdatableFields) }),
			)}</span>
			<span>${escapeHtml(
				translate('placesApi.bulk.report.closed', { count: String(closedCount) }),
			)}</span>
		</div>
		<ul class="places-bulk-report-list">${rows}</ul>
		<div class="places-bulk-options">
			${getFieldsOptionsHTML()}
			${closedCount > 0 ? getClosedOptionsHTML() : ''}
		</div>
		<div class="places-bulk-footer">
			<button type="button" class="btn btn-basic btn-format" data-action="places-bulk-done">
				${escapeHtml(translate('labels.cancel'))}
			</button>
			<button type="button" class="btn btn-basic btn-format" data-action="places-bulk-apply">
				${escapeHtml(translate('placesApi.apply.confirm'))}
			</button>
		</div>
	</div>`;
}

/** Fields strategy radios: replace everything, or only the auto-filled fields. */
function getFieldsOptionsHTML(): string {
	return `
	<div class="places-bulk-options-group">
		<h4 class="places-bulk-options-title">${escapeHtml(
			translate('placesApi.bulk.options.fields.title'),
		)}</h4>
		<label class="places-bulk-option">
			<input type="radio" name="places-bulk-fields" value="all" checked />
			<span>${escapeHtml(translate('placesApi.bulk.options.fields.all'))}</span>
		</label>
		<label class="places-bulk-option">
			<input type="radio" name="places-bulk-fields" value="auto" />
			<span>${escapeHtml(translate('placesApi.bulk.options.fields.auto'))}</span>
		</label>
	</div>`;
}

/** Closed-places strategy radios (only shown when at least one place is closed). */
function getClosedOptionsHTML(): string {
	return `
	<div class="places-bulk-options-group">
		<h4 class="places-bulk-options-title">${escapeHtml(
			translate('placesApi.bulk.options.closed.title'),
		)}</h4>
		<label class="places-bulk-option">
			<input type="radio" name="places-bulk-closed" value="delete" />
			<span>${escapeHtml(translate('placesApi.bulk.options.closed.delete'))}</span>
		</label>
		<label class="places-bulk-option">
			<input type="radio" name="places-bulk-closed" value="label" checked />
			<span>${escapeHtml(translate('placesApi.bulk.options.closed.label'))}</span>
		</label>
	</div>`;
}

function renderBulkError(error: unknown): void {
	hideBulkLoading();
	const content = getID('places-bulk-content');
	if (!content) return;
	const message =
		error instanceof Error && error.message ? error.message : translate('placesApi.errors.network');
	content.innerHTML = `
	<div class="places-bulk-report">
		<div class="places-bulk-report-icon">
			<i class="iconify" data-icon="material-symbols-light:error"></i>
		</div>
		<p class="places-bulk-report-item-error">${escapeHtml(message)}</p>
		<div class="places-bulk-footer">
			<button type="button" class="btn btn-basic btn-format" data-action="places-bulk-done">
				${escapeHtml(translate('labels.understood'))}
			</button>
		</div>
	</div>`;
}

// ------------------------------------------------------------------
// Bulk apply options + persist (P12)
// ------------------------------------------------------------------

/** Apply options chosen in the report dialog. */
interface BulkApplyOptions {
	/** Fields strategy: every overridable field, or only still-auto-filled ones. */
	fieldsStrategy: 'all' | 'auto';
	/** Closed-places strategy: auto-delete, or add the [Closed] label. */
	closedStrategy: 'delete' | 'label';
}

/** Read the selected options from the report dialog's radios. */
function readApplyOptions(): BulkApplyOptions {
	const fields = document.querySelector<HTMLInputElement>(
		'input[name="places-bulk-fields"]:checked',
	)?.value;
	const closed = document.querySelector<HTMLInputElement>(
		'input[name="places-bulk-closed"]:checked',
	)?.value;
	return {
		fieldsStrategy: fields === 'auto' ? 'auto' : 'all',
		closedStrategy: closed === 'delete' ? 'delete' : 'label',
	};
}

/**
 * Apply the chosen options to every fetched item and persist via a single
 * Firestore batch (plan §5 P12). Reuses P3's apply helpers (applyPlaceData /
 * isAutoFilled) and P9's form/pending-data sync (updateFormEntry /
 * refreshPendingData) so the apply + compare logic lives in exactly one place.
 *
 * - "Replace everything" → applies all FIELD_KEYS; "auto-filled only" → only
 *   fields whose entry value is unchanged since the stored placeAPI.
 * - "Auto-delete" removes closed items from Firestore, the in-memory maps and
 *   the edit form; "Add [Closed] label" sets placeAPI.closed + title marker.
 * - placeAPI is ALWAYS refreshed (updatedAt) for every non-deleted item.
 * - Existing entries are written to the DB immediately (matching P9's decision);
 *   brand-new, never-saved entries are only staged (created by the Save flow).
 */
async function applyBulk(report: BulkReport, options: BulkApplyOptions): Promise<void> {
	const lang = getLanguagePackName();
	const docPath = DOCUMENT_ID ? `${COLLECTION.DESTINATIONS}/${DOCUMENT_ID}` : null;
	const batch = createBatchOps();
	let hasDbOps = false;

	for (const item of report.items) {
		if (item.error) continue;
		const { category, id, entry, oldPlaceAPI, newPlace } = item;
		const isExisting = Boolean(FIRESTORE_DESTINATIONS_DATA?.[category]?.[id]);
		const base = `${category}.${id}`;

		// Closed-place "auto-delete" strategy: remove the item everywhere.
		if (item.closed && options.closedStrategy === 'delete') {
			if (docPath && isExisting) {
				batch.update(docPath, { [base]: firebase.firestore.FieldValue.delete() });
				hasDbOps = true;
			}
			removeLinkedEntry(category, id);
			continue;
		}

		// Fields strategy: everything, or only fields still auto-filled.
		const fieldsToApply: PlaceFieldKey[] =
			options.fieldsStrategy === 'all'
				? [...FIELD_KEYS]
				: FIELD_KEYS.filter((field) => isAutoFilled(entry, oldPlaceAPI, field));

		// Always merge placeAPI + refresh updatedAt; only fieldsToApply override the entry.
		const updated = applyPlaceData({ entry, newPlace, fieldsToApply, lang });

		// Closed "label" strategy → closed flag + [Closed] title marker.
		const applyClosedLabel = item.closed && options.closedStrategy === 'label';
		if (applyClosedLabel) {
			updated.placeAPI = { ...updated.placeAPI, closed: true } as PlaceAPI;
		}

		// Persist existing entries (new/staged ones are created by the Save flow).
		if (docPath && isExisting) {
			const updates: Record<string, unknown> = { [`${base}.placeAPI`]: updated.placeAPI };
			for (const field of fieldsToApply) {
				updates[field === 'description' ? `${base}.description` : `${base}.${field}`] =
					field === 'description' ? updated.description : updated[field];
			}
			batch.update(docPath, updates);
			hasDbOps = true;
		}

		// Sync in-memory pending data + the live edit form so a later Save
		// doesn't overwrite these updates with stale form values.
		refreshPendingData(category, id, updated);
		const j = findJFromID(id, category);
		if (getID(`${category}-id-${j}`)?.value === id) {
			updateFormEntry(category, j, updated, fieldsToApply, applyClosedLabel, false);
		}
	}

	if (docPath && hasDbOps) {
		const result = await batch.commit();
		if (!result?.success) {
			throw new Error(result?.error || translate('placesApi.apply.error'));
		}
	}
}

/**
 * Remove an auto-deleted linked entry from the in-memory maps and the edit
 * form. Mirrors places-apply-flow's per-item deleteItem.
 */
function removeLinkedEntry(category: string, id: string): void {
	if (FIRESTORE_DESTINATIONS_DATA?.[category]) delete FIRESTORE_DESTINATIONS_DATA[category][id];
	if (FIRESTORE_DESTINATIONS_NEW_DATA?.[category])
		delete FIRESTORE_DESTINATIONS_NEW_DATA[category][id];

	const j = findJFromID(id, category);
	if (getID(`${category}-id-${j}`)?.value === id) {
		removeChildWithValidation(category, j);
		removeSelectorDS('region', `${category}-region-select-${j}`);
		removeDestinationImages(category, j);
	}
}

/** Apply handler: reads the options, applies + persists, then closes + toasts. */
async function handleBulkApply(): Promise<void> {
	if (_bulkRunning) return;
	if (!_bulkReport) return;
	const options = readApplyOptions();
	_bulkRunning = true;
	showBulkLoading(translate('placesApi.loading.applying'));
	try {
		await applyBulk(_bulkReport, options);
		closeBulkDialog();
		void refreshPlacesBulkButton();
		openToast(translate('placesApi.bulk.success'));
	} catch (error) {
		console.error('[places-bulk] Bulk apply failed', error);
		hideBulkLoading();
		displayError(error instanceof Error ? error : new Error(translate('placesApi.apply.error')));
		_bulkRunning = false;
	}
}

/**
 * Refresh the edit page's bulk "Update with Maps" button after the bulk apply
 * changed the number of linked entries (deletes). Dynamic import avoids the
 * circular dependency (edit-destination imports this module).
 */
async function refreshPlacesBulkButton(): Promise<void> {
	try {
		const { refreshPlacesBulkButton } = await import(
			'../pages/edit-destination/edit-destination.js'
		);
		refreshPlacesBulkButton();
	} catch {
		// Not on the edit page (or module unavailable) — nothing to refresh.
	}
}

// ------------------------------------------------------------------
// Wiring (P10 contract + temporary dev hook)
// ------------------------------------------------------------------

// Let P10 invoke the flow without importing the module:
//   - data-action="places-bulk-run"  (ui/actions.ts click delegation)
//   - string message action "runBulkPlacesUpdate()" (utils/messages.ts registry)
registerActions({
	'places-bulk-run': () => {
		void runBulkPlacesUpdate();
	},
	'places-bulk-done': () => {
		closeBulkDialog();
	},
	'places-bulk-apply': () => {
		void handleBulkApply();
	},
});
registerMessageActions({ runBulkPlacesUpdate });

// TEMP dev hook (localhost only): console-run the bulk flow before P10's
// button exists, e.g. dev.page.runBulkPlaces(). initDev() runs at app start
// (runtime, not module-eval), so register once the window 'load' event fires.
window.addEventListener('load', () => {
	const dev = (window as any).dev;
	if (dev?.isEnabled) {
		dev.page.runBulkPlaces = runBulkPlacesUpdate;
		dev.page.runBulkLocal = runBulkLocalUpdate;
		dev.page.countLinkedPlaces = countLinkedItems;
	}
});

// ------------------------------------------------------------------
// HTML escaping helpers (local copies, same pattern as the step modules)
// ------------------------------------------------------------------

function escapeHtml(value: string): string {
	const div = document.createElement('div');
	div.textContent = value;
	return div.innerHTML;
}
