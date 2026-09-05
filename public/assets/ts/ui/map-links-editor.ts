// ======= Map links editor controller (F204) =======
// Drives the "Map strategy" control shared by the standalone edit-destination
// page and the quick editor on destination.html. A place with 2+ regions can
// keep ONE map link (`map`) or use ONE map link PER REGION (stored in a
// hidden JSON field and edited through ui/map-region-dialog.ts).
//
// Element refs follow the page's id convention (e.g. `restaurants-map-0` on
// edit-destination and `edit-map-3` on destination.html); this module only
// toggles visibility + reads/writes the hidden region-map state, so the two
// surfaces wire the same ids.

import { getID } from '../utils/dom.js';
import { translate } from '../i18n/translation.js';
import { getRegionPills, registerRegionChangeListener } from './region-select.js';
import { openMapRegionDialog, RegionMapValues } from './map-region-dialog.js';

export interface MapLinksEditorRefs {
	/** Unique key for this editor (e.g. `${category}-${j}` or `edit-${j}`). */
	key: string;
	/** Pills container id — the source of the place's current regions. */
	regionsContainerId: string;
	/** Wrapper shown only when the place has 2+ regions (contains the select). */
	strategyRowId?: string;
	/** The strategy <select> (value: "single" | "per-region"). */
	strategySelectId: string;
	/** Wrapper around the single map input (shown unless per-region + 2+ regions). */
	singleBoxId?: string;
	/** The single map link <input>. */
	mapInputId: string;
	/** Wrapper shown when per-region + 2+ regions (contains the manage button). */
	perRegionBoxId?: string;
	/** Hidden <input> holding the { region → url } JSON state. */
	regionMapsInputId: string;
	/** Button that opens the per-region map dialog. */
	manageButtonId?: string;
	/** Optional small summary line inside the per-region box. */
	summaryId?: string;
}

export interface MapLinksEditorState {
	mapsPerRegion?: boolean;
	regionMaps?: RegionMapValues;
	map?: string;
}

/**
 * Standard refs for one entry. Both edit surfaces follow the same id scheme,
 * so `prefix` is the category on the standalone edit page (`restaurants`,
 * …) and `edit` on the destination.html quick editor.
 */
export function getEntryMapLinksRefs(prefix: string, j: number): MapLinksEditorRefs {
	return {
		key: `${prefix}-${j}`,
		regionsContainerId: `${prefix}-regions-${j}`,
		strategyRowId: `${prefix}-map-strategy-row-${j}`,
		strategySelectId: `${prefix}-map-strategy-${j}`,
		singleBoxId: `${prefix}-single-map-box-${j}`,
		mapInputId: `${prefix}-map-${j}`,
		perRegionBoxId: `${prefix}-per-region-map-box-${j}`,
		regionMapsInputId: `${prefix}-region-maps-${j}`,
		manageButtonId: `${prefix}-per-region-map-button-${j}`,
		summaryId: `${prefix}-map-strategy-summary-${j}`,
	};
}

const DESTROYERS = new Map<string, () => void>();

function show(element: HTMLElement | null, visible: boolean): void {
	if (element) element.style.display = visible ? '' : 'none';
}

function readHidden(inputId: string): RegionMapValues {
	const input = getID<HTMLInputElement>(inputId);
	if (!input) return {};
	try {
		const parsed = JSON.parse(input.value || '{}');
		return parsed && typeof parsed === 'object' ? (parsed as RegionMapValues) : {};
	} catch {
		return {};
	}
}

function writeHidden(inputId: string, values: RegionMapValues): void {
	const input = getID<HTMLInputElement>(inputId);
	if (input) input.value = JSON.stringify(values);
}

function getRefs(refs: MapLinksEditorRefs) {
	return {
		strategyRow: refs.strategyRowId ? getID<HTMLElement>(refs.strategyRowId) : null,
		select: getID<HTMLSelectElement>(refs.strategySelectId),
		singleBox: refs.singleBoxId ? getID<HTMLElement>(refs.singleBoxId) : null,
		mapInput: getID<HTMLInputElement>(refs.mapInputId),
		perRegionBox: refs.perRegionBoxId ? getID<HTMLElement>(refs.perRegionBoxId) : null,
		manageButton: refs.manageButtonId ? getID<HTMLElement>(refs.manageButtonId) : null,
		summary: refs.summaryId ? getID<HTMLElement>(refs.summaryId) : null,
	};
}

/**
 * Initialize (or re-initialize) the map-strategy editor for one entry.
 * Pass the loaded entry fields to restore the per-region state.
 */
export function initMapLinksEditor(refs: MapLinksEditorRefs, initial: MapLinksEditorState = {}): void {
	destroyMapLinksEditor(refs.key);

	const regionsContainerId = refs.regionsContainerId;
	const els = getRefs(refs);

	if (!els.select || !els.mapInput) {
		// Template not present (page not showing the field) — nothing to do.
		return;
	}

	// Restore state.
	writeHidden(refs.regionMapsInputId, initial.regionMaps || {});
	els.select.value = initial.mapsPerRegion === true ? 'per-region' : 'single';
	if (initial.map !== undefined) els.mapInput.value = initial.map;

	const refresh = () => {
		const regions = getRegionPills(regionsContainerId);
		const multi = regions.length >= 2;
		const perRegion = multi && els.select.value === 'per-region';

		show(els.strategyRow, multi);
		show(els.perRegionBox, perRegion);
		show(els.singleBox, !perRegion);

		if (els.summary) {
			const stored = readHidden(refs.regionMapsInputId);
			const linked = regions.filter((region) => (stored[region] ?? '').trim()).length;
			els.summary.textContent = translate('destination.mapStrategy.summary', {
				regions: String(regions.length),
				links: String(linked),
			});
		}

		// Fallback to single mode when the region count dropped below 2: make
		// sure the single input reflects the first region's link (if any).
		if (!perRegion) {
			const stored = readHidden(refs.regionMapsInputId);
			const firstLink = regions.length > 0 ? (stored[regions[0]] ?? '').trim() : '';
			if (firstLink && !els.mapInput.value.trim()) els.mapInput.value = firstLink;
		}
	};

	const onStrategyChange = () => {
		if (els.select.value === 'per-region') {
			// First switch → treat the existing single link as the first region's link.
			const regions = getRegionPills(regionsContainerId);
			const stored = readHidden(refs.regionMapsInputId);
			const hasAny = regions.some((region) => (stored[region] ?? '').trim());
			const singleValue = (els.mapInput.value ?? '').trim();
			if (regions.length > 0 && !hasAny && singleValue) {
				stored[regions[0]] = singleValue;
				writeHidden(refs.regionMapsInputId, stored);
			}
		}
		refresh();
	};

	const onManageClick = () => {
		const regions = getRegionPills(regionsContainerId);
		if (regions.length === 0) return;
		const stored = readHidden(refs.regionMapsInputId);
		void openMapRegionDialog({ regions, values: stored }).then((next) => {
			if (next) {
				writeHidden(refs.regionMapsInputId, next);
				refresh();
			}
		});
	};

	els.select.addEventListener('change', onStrategyChange);
	els.manageButton?.addEventListener('click', onManageClick);
	const unsubscribeRegion = registerRegionChangeListener(regionsContainerId, refresh);

	refresh();

	DESTROYERS.set(refs.key, () => {
		els.select?.removeEventListener('change', onStrategyChange);
		els.manageButton?.removeEventListener('click', onManageClick);
		unsubscribeRegion();
	});
}

/** Remove the map-strategy editor for a key (entry removed/moved/dialog closed). */
export function destroyMapLinksEditor(key: string): void {
	const destroy = DESTROYERS.get(key);
	if (destroy) {
		destroy();
		DESTROYERS.delete(key);
	}
}

/**
 * Read the entry's map fields back from the editor for saving.
 * - single / <2 regions → { map } (mapsPerRegion & regionMaps omitted so the
 *   save diff removes any stale per-region fields)
 * - per-region + 2+ regions → { map: first region's link, mapsPerRegion,
 *   regionMaps } pruned to the current regions.
 */
export function readMapLinksEditor(refs: MapLinksEditorRefs): MapLinksEditorState {
	const regions = getRegionPills(refs.regionsContainerId);
	const map = (getID<HTMLInputElement>(refs.mapInputId)?.value ?? '').trim();
	const select = getID<HTMLSelectElement>(refs.strategySelectId);
	const perRegion = (select?.value ?? 'single') === 'per-region' && regions.length >= 2;

	if (!perRegion) {
		return { map };
	}

	const stored = readHidden(refs.regionMapsInputId);
	const regionMaps: RegionMapValues = {};
	for (const region of regions) {
		const url = (stored[region] ?? '').trim();
		if (url) regionMaps[region] = url;
	}
	return {
		map: regionMaps[regions[0]] ?? '',
		mapsPerRegion: true,
		regionMaps,
	};
}
