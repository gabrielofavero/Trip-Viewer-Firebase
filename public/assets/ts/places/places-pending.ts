// ======= Places — Bulk "Enrich pending items" (P3) =======
// Attempts to link every destination entry that does NOT have a Google Place
// ID (placeAPI.id) to a Google Place, then lets the user review and apply.
//
// Flow:
//   1. Collect unlinked entries (places-bulk collectUnlinkedEntries), skipping
//      entries with no name (resolved decision #1).
//   2. For each, run a Places API text search with the same text the per-item
//      dialog auto-fills — "<entry name> <destination title>" — biased to the
//      entry's coordinates when it has them (resolved decision #2).
//   3. Route results:
//        * 1 result  → auto-select (no prompt).
//        * multiple  → review step: user picks the right one (or "no match").
//        * none      → review step: marked "could not be matched".
//      Multiple + no-result cases share the same review screen.
//   4. Closed detection: temporarily vs permanently closed are indicated
//      separately; permanently closed items get an opt-in "Delete" checkbox
//      (never auto-deleted).
//   5. Final review: apply-by-data-type checkboxes (grouped FIELD_KEYS, no
//      per-field old/new values) + an optional "Include a photo" toggle
//      (resolved decision #9: 1 photo per matched item, appended, cap 5).
//   6. Apply via a single Firestore batch (createBatchOps dot-path updates),
//      mirroring places-bulk's persistence + form/pending-data sync.
//
// References:
// - docs/implementation-plans/20260828-maps-import-enrichment-overhaul.md (§5.2, P3)
// - places/places-bulk.ts (dialog shell, bounded concurrency, batch apply)
// - places/places-apply.ts (FIELD_KEYS, applyPlaceData, buildClosedState)

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
	FIRESTORE_DESTINATIONS_DATA,
	FIRESTORE_DESTINATIONS_NEW_DATA,
} from '../data/state.js';
import {
	getPlacePhotos,
	PLACES_API_ENABLED,
	searchPlaces,
} from '../data/services/places-api.service.js';
import {
	buildMapsSearchUrl,
	GMAPS_SCRAPER_ENABLED,
	parseCoordinateSearchUrl,
	scrapePlaces,
} from '../data/services/gmaps-scraper.service.js';
import type { PlaceDetails, PlaceSearchResult } from '../models/places-api.model.js';
import type { PlaceImage, PlaceItem } from '../models/schema.js';
import { notifyPlacesLimited } from './places-dialog.js';
import {
	applyPlaceData,
	buildClosedState,
	FIELD_KEYS,
	type PlaceFieldKey,
} from './places-apply.js';
import { refreshPendingData, updateFormEntry } from './places-apply-flow.js';
import { collectUnlinkedEntries, type UnlinkedEntry } from './places-bulk.js';
import { removeDestinationImages } from '../pages/edit-destination/categories/image.js';
import { unregisterRegionSelect } from '../ui/region-select.js';

/** Max concurrent text searches (same bounded-concurrency pattern as bulk). */
const CONCURRENCY = 5;
/** Location-bias radius (meters) when an entry has coordinates. */
const BIAS_RADIUS_M = 3000;
/** Max photos per destination entry (matches the 5-photo cap, plan §8). */
const MAX_PHOTOS = 5;

// ------------------------------------------------------------------
// Per-item state
// ------------------------------------------------------------------

/** An unlinked entry that was resolved to a single Google Place. */
interface PendingItemResolved {
	category: string;
	id: string;
	entry: PlaceItem;
	/** The selected Place (search result used directly — no extra details call). */
	candidate: PlaceDetails;
}

/** An unlinked entry that needs user attention before applying. */
interface PendingItemReview {
	category: string;
	id: string;
	entry: PlaceItem;
	kind: 'multi' | 'none';
	/** Candidate results for 'multi' items (user picks one). */
	candidates: PlaceSearchResult[];
	/** Set when the search failed for this item (shown instead of "no match"). */
	error?: string;
}

// ------------------------------------------------------------------
// Module state
// ------------------------------------------------------------------

let _running = false;
let _abort: AbortController | null = null;
/** Auto-selected single matches (never need review). */
let _resolved: PendingItemResolved[] = [];
/** Items that need review (multiple matches / no match / search error). */
let _review: PendingItemReview[] = [];
/** Final matched list to apply (resolved + review picks). */
let _matched: PendingItemResolved[] = [];

// ------------------------------------------------------------------
// Entry point
// ------------------------------------------------------------------

/**
 * Run the batch "Enrich pending items" flow (P3/P9). Entry is the
 * `places-bulk-enrich` / `places-bulk-enrich-scraper` card actions (registered
 * at module bottom) and the message-action name `runEnrichPending()`.
 *
 * `source` selects the resolver:
 *  - 'api' (P3): Places API text search — single results auto-select.
 *  - 'scraper' (P9): local gmaps-scraper — matches ALWAYS go to review.
 */
export async function runEnrichPending(source: 'api' | 'scraper' = 'api'): Promise<void> {
	if (PLACES_API_ENABLED !== true) {
		displayError(new Error(translate('placesApi.errors.localOnly')), false, false);
		return;
	}
	// The local scraper route (127.0.0.1:8788) only exists on dev machines.
	if (source === 'scraper' && GMAPS_SCRAPER_ENABLED !== true) {
		displayError(new Error(translate('placesApi.errors.localOnly')), false, false);
		return;
	}
	if (_running) return;

	// Resolved decision #1: skip entries with no name — nothing to search by.
	const entries = collectUnlinkedEntries().filter((item) =>
		Boolean(item.entry?.name?.trim()),
	);
	if (entries.length === 0) {
		openToast(translate('placesApi.pending.none'));
		return;
	}

	_running = true;
	openPendingDialog();
	const controller = new AbortController();
	_abort = controller;
	// P9: scraper mode reuses the scraper loading message.
	showPendingLoading(
		source === 'scraper'
			? translate('placesApi.loading.scraping')
			: translate('placesApi.pending.searching'),
	);
	try {
		await fetchPendingMatches(
			entries,
			getDestinationTitle(),
			controller.signal,
			source,
		);
		if (controller.signal.aborted) return; // cancelled by the X / Escape
		renderNextStep();
	} catch (error) {
		if (isAbortError(error)) return;
		console.error('[places-pending] Enrich fetch failed', error);
		renderPendingError(error);
	} finally {
		if (_abort === controller) _abort = null;
		hidePendingLoading();
		_running = false;
	}
}

/** The destination title used to build the search text (same as per-item). */
function getDestinationTitle(): string {
	return getID('title')?.value ?? FIRESTORE_DESTINATIONS_DATA?.title ?? '';
}

/**
 * Resolve every unlinked entry (bounded concurrency) via the chosen source and
 * split the outcomes into auto-selected (`_resolved`) and needs-review
 * (`_review`) lists.
 *  - 'api' (P3): Places API text search — 1 result auto-selects, multiple /
 *    none go to review.
 *  - 'scraper' (P9): local gmaps-scraper — a single candidate per entry that
 *    ALWAYS goes to review for manual confirmation (resolved decision #8).
 */
async function fetchPendingMatches(
	entries: UnlinkedEntry[],
	destinationTitle: string,
	signal: AbortSignal,
	source: 'api' | 'scraper',
): Promise<void> {
	const lang = getLanguagePackName();
	const out: Array<PendingItemResolved | PendingItemReview> = new Array(entries.length);
	let index = 0;

	const worker = async (): Promise<void> => {
		while (index < entries.length) {
			const i = index++;
			const { category, id, entry } = entries[i];
			try {
				out[i] =
					source === 'scraper'
						? await scrapeEntry(entry, category, id, lang, signal)
						: await searchEntry(entry, category, id, destinationTitle, lang, signal);
			} catch (error) {
				// Cancellation propagates; a single bad lookup shouldn't abort the
				// run — record it as an unmatched item with the reason.
				if (isAbortError(error)) throw error;
				console.warn(`[places-pending] Resolve failed for ${category}:${id}`, error);
				out[i] = {
					category,
					id,
					entry,
					kind: 'none',
					candidates: [],
					error:
						error instanceof Error ? error.message : translate('placesApi.errors.network'),
				};
			}
		}
	};

	await Promise.all(Array.from({ length: Math.min(CONCURRENCY, entries.length) }, () => worker()));

	_resolved = [];
	_review = [];
	for (const item of out) {
		if (!item) continue;
		if ('candidate' in item) {
			_resolved.push(item as PendingItemResolved);
		} else {
			_review.push(item as PendingItemReview);
		}
	}
}

/** Places API text search for one unlinked entry (P3). */
async function searchEntry(
	entry: PlaceItem,
	category: string,
	id: string,
	destinationTitle: string,
	lang: string,
	signal: AbortSignal,
): Promise<PendingItemResolved | PendingItemReview> {
	const query = `${entry.name ?? ''} ${destinationTitle}`.trim();
	const rawUrl = entry.placeAPI?.sourceUrl ?? entry.placeAPI?.map ?? entry.map ?? '';
	const coords = parseCoordinateSearchUrl(rawUrl);
	const candidates = await searchPlaces(query, {
		signal,
		lang,
		photos: false,
		// Resolved decision #2: bias to the entry's coordinates when it has them
		// (e.g. My Maps pins), else search name + title.
		bias: coords
			? { latitude: coords.lat, longitude: coords.lng, radius: BIAS_RADIUS_M }
			: undefined,
		onLimited: (limited) => {
			if (limited) notifyPlacesLimited();
		},
	});
	if (signal.aborted) {
		throw new DOMException('The operation was aborted.', 'AbortError');
	}
	if (candidates.length === 1) {
		return { category, id, entry, candidate: candidates[0] as PlaceDetails };
	}
	if (candidates.length > 1) {
		return { category, id, entry, kind: 'multi', candidates };
	}
	return { category, id, entry, kind: 'none', candidates: [] };
}

/**
 * Local gmaps-scraper lookup for one unlinked entry (P9). The scraper returns
 * a single candidate per URL; it is ALWAYS routed to the review step for
 * manual confirmation (resolved decision #8) — never auto-selected.
 */
async function scrapeEntry(
	entry: PlaceItem,
	category: string,
	id: string,
	lang: string,
	signal: AbortSignal,
): Promise<PendingItemResolved | PendingItemReview> {
	const url = buildPendingScrapeUrl(entry);
	if (!url) {
		return { category, id, entry, kind: 'none', candidates: [] };
	}
	const places = await scrapePlaces([url], { signal, lang });
	if (signal.aborted) {
		throw new DOMException('The operation was aborted.', 'AbortError');
	}
	const result = places[0];
	if (!result?.name) {
		return { category, id, entry, kind: 'none', candidates: [] };
	}
	return { category, id, entry, kind: 'multi', candidates: [result as PlaceSearchResult] };
}

/**
 * The URL to hand the local scraper for one entry (P9). Coordinate-only search
 * links (what My Maps import persists for un-enriched pins) carry no business
 * to extract — rewrite them to a name search centered on the pin's coords so
 * the scraper actually finds the place (mirrors places-bulk buildScrapeUrlForEntry).
 */
function buildPendingScrapeUrl(entry: PlaceItem): string {
	const raw = entry.placeAPI?.sourceUrl ?? entry.placeAPI?.map ?? entry.map ?? '';
	const coords = parseCoordinateSearchUrl(raw);
	if (coords && entry.name) {
		return buildMapsSearchUrl(entry.name, coords);
	}
	return raw;
}

// ------------------------------------------------------------------
// Dialog shell + loading (mirrors places-bulk, distinct ids)
// ------------------------------------------------------------------

function openPendingDialog(): void {
	const properties = cloneObject(MESSAGE_PROPERTIES);
	properties.title = translate('placesApi.pending.title');
	properties.containers = getContainersInput();
	properties.containers.principal = `${properties.containers.principal} places-dialog-container`;
	properties.fullscreen = true;
	properties.closeButton = false;
	properties.icons = [{ type: 'close', action: closePendingDialog }];
	properties.buttons = [];
	properties.content = getPendingShellHTML();
	displayFullMessage(properties);

	const root = getID('places-pending');
	root?.addEventListener('click', handlePendingClick);
	document.addEventListener('keydown', handlePendingKeydown);

	showPendingLoading();
}

function getPendingShellHTML(): string {
	return `
	<div class="places-bulk" id="places-pending">
		<div id="places-pending-content" class="places-bulk-content"></div>
		<div id="places-pending-loading" class="places-dialog-loading" style="display: none">
			<div class="places-dialog-loading-ring"></div>
			<div id="places-pending-loading-message" class="places-dialog-loading-message"></div>
			<i id="places-pending-loading-cancel" class="iconify places-dialog-loading-cancel"
				data-icon="material-symbols-light:close" role="button"></i>
		</div>
	</div>`;
}

function showPendingLoading(message = ''): void {
	const overlay = getID('places-pending-loading');
	if (overlay) overlay.style.display = 'flex';
	const messageEl = getID('places-pending-loading-message');
	if (messageEl) messageEl.textContent = message || translate('placesApi.loading.search');
}

function hidePendingLoading(): void {
	const overlay = getID('places-pending-loading');
	if (overlay) overlay.style.display = 'none';
}

function handlePendingClick(event: MouseEvent): void {
	const target = event.target as Element | null;
	if (!target) return;
	if (target.closest('#places-pending-loading-cancel')) {
		closePendingDialog();
	}
}

function handlePendingKeydown(event: KeyboardEvent): void {
	if (event.key === 'Escape') {
		event.preventDefault();
		closePendingDialog();
	}
}

function closePendingDialog(): void {
	if (_abort) {
		_abort.abort();
		_abort = null;
	}
	document.removeEventListener('keydown', handlePendingKeydown);
	_running = false;
	closeMessage();
}

// ------------------------------------------------------------------
// Step rendering
// ------------------------------------------------------------------

/** Show the review step when items need attention, else go to the final review. */
function renderNextStep(): void {
	hidePendingLoading();
	if (_review.length > 0) {
		renderReviewStep();
		return;
	}
	_matched = [..._resolved];
	if (_matched.length === 0) {
		renderPendingEmpty();
		return;
	}
	renderFinalReview();
}

/** Review screen: multiple-match items (picker) + no-match/error items. */
function renderReviewStep(): void {
	hidePendingLoading();
	const content = getID('places-pending-content');
	if (!content) return;
	content.innerHTML = getReviewHTML();
}

function getReviewHTML(): string {
	const rows = _review
		.map((item) => {
			const name = item.entry?.name || `${item.category}:${item.id}`;
			if (item.kind === 'none') {
				const label = item.error ?? translate('placesApi.pending.review.none');
				return `
				<li class="places-bulk-report-item">
					<span class="places-bulk-report-item-name">${escapeHtml(name)}</span>
					<span class="places-bulk-badge">${escapeHtml(label)}</span>
				</li>`;
			}
			const options = [
				`<option value="">${escapeHtml(translate('placesApi.pending.review.skip'))}</option>`,
				...item.candidates.map(
					(candidate, i) =>
						`<option value="${i}">${escapeHtml(
							candidate.name + (candidate.region ? ` — ${candidate.region}` : ''),
						)}</option>`,
				),
			].join('');
			return `
			<li class="places-bulk-report-item places-pending-review-item">
				<span class="places-bulk-report-item-name">${escapeHtml(name)}</span>
				<span class="places-pending-review-label">${escapeHtml(
					translate('placesApi.pending.review.multi'),
				)}</span>
				<select id="places-pending-select-${item.category}-${item.id}"
					class="places-pending-select">
					${options}
				</select>
			</li>`;
		})
		.join('');

	return `
	<div class="places-bulk-report">
		<div class="places-bulk-report-icon">
			<i class="iconify" data-icon="material-symbols-light:rule"></i>
		</div>
		<h3 class="places-bulk-options-title">${escapeHtml(
			translate('placesApi.pending.review.title'),
		)}</h3>
		<p class="places-bulk-report-item-meta">${escapeHtml(
			translate('placesApi.pending.review.message'),
		)}</p>
		<ul class="places-bulk-report-list">${rows}</ul>
		<div class="places-bulk-footer">
			<button type="button" class="btn btn-basic btn-format" data-action="places-pending-done">
				${escapeHtml(translate('labels.cancel'))}
			</button>
			<button type="button" class="btn btn-basic btn-format"
				data-action="places-pending-review-continue">
				${escapeHtml(translate('placesApi.pending.review.continue'))}
			</button>
		</div>
	</div>`;
}

/** Read the review pickers, merge with auto-selected, and go to the final review. */
function handleReviewContinue(): void {
	const matched: PendingItemResolved[] = [..._resolved];
	for (const item of _review) {
		if (item.kind !== 'multi') continue; // 'none' stays unmatched
		const select = getID<HTMLSelectElement>(
			`places-pending-select-${item.category}-${item.id}`,
		);
		const value = select?.value ?? '';
		if (value === '') continue; // "no match / skip"
		const candidate = item.candidates[Number(value)];
		if (candidate) {
			matched.push({
				category: item.category,
				id: item.id,
				entry: item.entry,
				candidate: candidate as PlaceDetails,
			});
		}
	}
	_matched = matched;
	if (_matched.length === 0) {
		renderPendingEmpty();
		return;
	}
	renderFinalReview();
}

/** Final review: grouped data-type checkboxes + photo toggle + closed handling. */
function renderFinalReview(): void {
	hidePendingLoading();
	const content = getID('places-pending-content');
	if (!content) return;
	content.innerHTML = getFinalReviewHTML();
}

function getFinalReviewHTML(): string {
	const groups = FIELD_GROUPS.map(
		(group) => `
		<label class="places-bulk-option">
			<input type="checkbox" id="places-pending-group-${group.key}" checked />
			<span>${escapeHtml(translate(`placesApi.pending.apply.groups.${group.key}`))}</span>
		</label>`,
	).join('');

	return `
	<div class="places-bulk-report">
		<div class="places-bulk-report-icon">
			<i class="iconify" data-icon="material-symbols-light:task_alt"></i>
		</div>
		<h3 class="places-bulk-options-title">${escapeHtml(
			translate('placesApi.pending.apply.title'),
		)}</h3>
		<p class="places-bulk-report-item-meta">${escapeHtml(
			translate('placesApi.pending.apply.message', { count: String(_matched.length) }),
		)}</p>
		<div class="places-bulk-options">
			<div class="places-bulk-options-group">
				<h4 class="places-bulk-options-title">${escapeHtml(
					translate('placesApi.pending.apply.groupsTitle'),
				)}</h4>
				${groups}
			</div>
			<div class="places-bulk-options-group">
				<h4 class="places-bulk-options-title">${escapeHtml(
					translate('placesApi.pending.apply.photo'),
				)}</h4>
				<label class="places-bulk-option">
					<input type="checkbox" id="places-pending-photo" />
					<span>${escapeHtml(translate('placesApi.pending.apply.photo'))}</span>
				</label>
				<span class="places-bulk-report-item-meta">${escapeHtml(
					translate('placesApi.pending.apply.photoHint'),
				)}</span>
			</div>
			${getClosedGroupHTML()}
		</div>
		<div class="places-bulk-footer">
			<button type="button" class="btn btn-basic btn-format" data-action="places-pending-done">
				${escapeHtml(translate('labels.cancel'))}
			</button>
			<button type="button" class="btn btn-basic btn-format" data-action="places-pending-apply">
				${escapeHtml(translate('placesApi.apply.confirm'))}
			</button>
		</div>
	</div>`;
}

/**
 * Closed-places group: temporarily closed items are indicated (badge only,
 * resolved decision #3); permanently closed items get an opt-in delete
 * checkbox (never auto-deleted).
 */
function getClosedGroupHTML(): string {
	const rows = _matched
		.map((item) => {
			const state = buildClosedState(item.candidate);
			if (state.kind === 'operational') return '';
			const name = item.entry?.name || item.candidate?.name || `${item.category}:${item.id}`;
			if (state.kind === 'temporarilyClosed') {
				return `
				<li class="places-bulk-report-item">
					<span class="places-bulk-report-item-name">${escapeHtml(name)}</span>
					<span class="places-bulk-badge">${escapeHtml(
						translate('placesApi.pending.closed.temporary'),
					)}</span>
				</li>`;
			}
			return `
			<li class="places-bulk-report-item">
				<span class="places-bulk-report-item-name">${escapeHtml(name)}</span>
				<span class="places-bulk-badge">${escapeHtml(
					translate('placesApi.pending.closed.permanent'),
				)}</span>
				<label class="places-bulk-option places-pending-delete-option">
					<input type="checkbox" id="places-pending-delete-${item.category}-${item.id}" />
					<span>${escapeHtml(translate('placesApi.pending.closed.delete', { name }))}</span>
				</label>
			</li>`;
		})
		.filter(Boolean)
		.join('');

	if (!rows) return '';
	return `
	<div class="places-bulk-options-group">
		<h4 class="places-bulk-options-title">${escapeHtml(
			translate('placesApi.pending.closed.title'),
		)}</h4>
		<ul class="places-bulk-report-list">${rows}</ul>
	</div>`;
}

function renderPendingEmpty(): void {
	hidePendingLoading();
	const content = getID('places-pending-content');
	if (!content) return;
	content.innerHTML = `
	<div class="places-bulk-report">
		<div class="places-bulk-report-icon">
			<i class="iconify" data-icon="material-symbols-light:info"></i>
		</div>
		<p class="places-bulk-report-item-error">${escapeHtml(
			translate('placesApi.pending.noMatch'),
		)}</p>
		<div class="places-bulk-footer">
			<button type="button" class="btn btn-basic btn-format" data-action="places-pending-done">
				${escapeHtml(translate('labels.understood'))}
			</button>
		</div>
	</div>`;
}

function renderPendingError(error: unknown): void {
	hidePendingLoading();
	const content = getID('places-pending-content');
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
			<button type="button" class="btn btn-basic btn-format" data-action="places-pending-done">
				${escapeHtml(translate('labels.understood'))}
			</button>
		</div>
	</div>`;
}

// ------------------------------------------------------------------
// Apply + persist
// ------------------------------------------------------------------

/** Grouped data types → FIELD_KEYS (final review shows one checkbox per group). */
const FIELD_GROUPS: { key: string; fields: PlaceFieldKey[] }[] = [
	{ key: 'basic', fields: ['name', 'emoji'] },
	{ key: 'links', fields: ['website', 'instagram', 'map'] },
	{ key: 'ratings', fields: ['rating', 'price'] },
	{ key: 'description', fields: ['description'] },
	{ key: 'region', fields: ['region'] },
];

/** The FIELD_KEYS the user opted into, from the grouped checkboxes. */
function readCheckedFields(): Set<PlaceFieldKey> {
	const set = new Set<PlaceFieldKey>();
	for (const group of FIELD_GROUPS) {
		const el = getID<HTMLInputElement>(`places-pending-group-${group.key}`);
		if (el?.checked) group.fields.forEach((field) => set.add(field));
	}
	return set;
}

/** Whether the user opted to include a photo (1 per matched item). */
function readIncludePhoto(): boolean {
	return Boolean(getID<HTMLInputElement>('places-pending-photo')?.checked);
}

/** Permanently-closed items the user chose to delete (`category:id` set). */
function readDeleteChoices(): Set<string> {
	const set = new Set<string>();
	for (const item of _matched) {
		const state = buildClosedState(item.candidate);
		if (state.kind !== 'permanentlyClosed') continue;
		const el = getID<HTMLInputElement>(`places-pending-delete-${item.category}-${item.id}`);
		if (el?.checked) set.add(`${item.category}:${item.id}`);
	}
	return set;
}

/**
 * Apply the final-review choices WITHOUT writing to Firestore — per the edit
 * page's convention, the Save button persists everything. Updates are staged
 * into the in-memory pending data + the live edit form (refreshPendingData /
 * updateFormEntry); deleted items are removed from both. Matches the per-item
 * "Enrich Data" flow (applyAndClose).
 */
async function applyPending(): Promise<void> {
	const lang = getLanguagePackName();
	const fieldsToApplyAll = readCheckedFields();
	const includePhoto = readIncludePhoto();
	const deleteChoices = readDeleteChoices();

	for (const item of _matched) {
		const { category, id, entry, candidate } = item;
		const state = buildClosedState(candidate);

		// Permanently closed + user checked delete → remove (staged; Save persists).
		if (state.kind === 'permanentlyClosed' && deleteChoices.has(`${category}:${id}`)) {
			removePendingEntry(category, id);
			continue;
		}

		const fieldsToApply = FIELD_KEYS.filter((field) => fieldsToApplyAll.has(field));

		// Always merge placeAPI; only the checked groups override the entry.
		const updated = applyPlaceData({ entry, newPlace: candidate, fieldsToApply, lang });

		// Optional photo (decision #9): one photo per matched item, appended and
		// capped at 5 — never replaces existing photos.
		if (includePhoto && candidate.id) {
			const photos = await getPlacePhotos(candidate.id, {
				onLimited: (limited) => {
					if (limited) notifyPlacesLimited();
				},
			});
			const first = photos[0];
			if (first?.url) {
				const images = Array.isArray(updated.images) ? [...updated.images] : [];
				if (!images.some((image) => image.link === first.url) && images.length < MAX_PHOTOS) {
					images.push({ description: '', link: first.url });
				}
				updated.images = images;
			}
		}

		// Stage into pending data + the live edit form — the page's Save button
		// persists everything (no direct Firestore write here).
		refreshPendingData(category, id, updated);
		const j = findJFromID(id, category);
		if (getID(`${category}-id-${j}`)?.value === id) {
			updateFormEntry(category, j, updated, fieldsToApply, false, includePhoto);
		}
	}
}

/** Remove a deleted entry from the in-memory maps and the edit form. */
function removePendingEntry(category: string, id: string): void {
	if (FIRESTORE_DESTINATIONS_DATA?.[category]) delete FIRESTORE_DESTINATIONS_DATA[category][id];
	if (FIRESTORE_DESTINATIONS_NEW_DATA?.[category])
		delete FIRESTORE_DESTINATIONS_NEW_DATA[category][id];

	const j = findJFromID(id, category);
	if (getID(`${category}-id-${j}`)?.value === id) {
		removeChildWithValidation(category, j);
		unregisterRegionSelect(`${category}-region-select-${j}`);
		removeDestinationImages(category, j);
	}
}

/** Apply handler: applies + persists, then closes and toasts. */
async function handlePendingApply(): Promise<void> {
	if (_running) return;
	if (_matched.length === 0) return;
	_running = true;
	showPendingLoading(translate('placesApi.loading.applying'));
	try {
		await applyPending();
		closePendingDialog();
		void refreshPlacesBulkButton();
		openToast(translate('placesApi.pending.success'));
	} catch (error) {
		console.error('[places-pending] Apply failed', error);
		hidePendingLoading();
		displayError(error instanceof Error ? error : new Error(translate('placesApi.apply.error')));
		_running = false;
	}
}

/** Refresh the edit page's bulk button after apply changed linked counts. */
async function refreshPlacesBulkButton(): Promise<void> {
	try {
		const { refreshPlacesBulkButton } = await import(
			'../pages/edit-destination/edit-destination.js'
		);
		refreshPlacesBulkButton();
	} catch {
		// Not on the edit page — nothing to refresh.
	}
}

// ------------------------------------------------------------------
// Wiring
// ------------------------------------------------------------------

/** Whether `error` is a user-cancelled AbortError (same check as places-bulk). */
function isAbortError(error: unknown): boolean {
	return (error as Error)?.name === 'AbortError';
}

// The "Enrich pending items" cards in the bulk options dialog
// (`places-bulk-enrich` / `places-bulk-enrich-scraper`, edit-destination.ts)
// hand off to this flow. Also exposed as a message action + dev hook for
// console testing.
registerActions({
	'places-bulk-enrich': () => {
		void runEnrichPending('api');
	},
	'places-bulk-enrich-scraper': () => {
		void runEnrichPending('scraper');
	},
	'places-pending-done': () => {
		closePendingDialog();
	},
	'places-pending-review-continue': () => {
		handleReviewContinue();
	},
	'places-pending-apply': () => {
		void handlePendingApply();
	},
});
registerMessageActions({ runEnrichPending });

window.addEventListener('load', () => {
	const dev = (window as any).dev;
	if (dev?.isEnabled) {
		dev.page.runEnrichPending = runEnrichPending;
		dev.page.countUnlinked = () => collectUnlinkedEntries().length;
	}
});

// ------------------------------------------------------------------
// HTML escaping helper (same pattern as the step modules)
// ------------------------------------------------------------------

function escapeHtml(value: string): string {
	const div = document.createElement('div');
	div.textContent = value;
	return div.innerHTML;
}
