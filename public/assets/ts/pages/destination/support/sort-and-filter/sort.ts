import { normalizePriceBucket } from '../../../../models/destination.model.js';
import { translate } from '../../../../i18n/translation.js';
import {CONTENT, applyContent, getItem, isPlanned, ACTIVE_CATEGORY} from "../../destination.js";
import { getSortDrawerInnerHTML } from "./support/drawer.js";
import { sortDrawerOptionClickAction } from "./support/drawer.js";
import { sortDrawerOptionLoadAction } from "./support/drawer.js";
import { loadFilterSortingData } from "./sort-and-filter.js";
import { openFilterSortDrawer } from "./sort-and-filter.js";
import { shouldDisplayPlanned } from "./sort-and-filter.js";
import { shouldDisplayPrices } from "./sort-and-filter.js";
import { shouldDisplayScores } from "./sort-and-filter.js";
import { getSortPreferences } from "./support/preferences.js";

export const SORT_OPTIONS: Record<string, Record<string, Record<string, string>>> = {};

// Main Action
export function sort(render = false) {
	const { type, value } = getSortPreferences() || {};

	CONTENT.sort((a, b) => {
		const A = getItem(a.id) || {};
		const B = getItem(b.id) || {};

		const r =
			type === "planned"
				? comparePlanned(a.id, b.id, A, B, value)
				: compare(A, B, type, value);

		if (r !== 0) return r;
		return nameOf(A).localeCompare(nameOf(B));
	});

	if (render) applyContent();

	// ---- Comparators ----

	function compare(a, b, type, value) {
		switch (type) {
			case "scores": {
				const sa = scoreOf(a);
				const sb = scoreOf(b);
				return value === "lowest_first" ? sa - sb : sb - sa;
			}

			case "prices": {
				const pa = priceRank(normalizePriceBucket(a.valor));
				const pb = priceRank(normalizePriceBucket(b.valor));
				return value === "lowest_first" ? pa - pb : pb - pa;
			}

			case "name": {
				const na = nameOf(a);
				const nb = nameOf(b);
				return value === "descending"
					? nb.localeCompare(na)
					: na.localeCompare(nb);
			}

			default:
				return 0;
		}
	}

	function comparePlanned(idA, idB, a, b, value) {
		const pa = isPlanned(idA) ? 1 : 0;
		const pb = isPlanned(idB) ? 1 : 0;

		const plannedCmp = value === "not_planned_first" ? pa - pb : pb - pa;

		if (plannedCmp !== 0) return plannedCmp;

		const scoreCmp = scoreOf(b) - scoreOf(a);
		if (scoreCmp !== 0) return scoreCmp;

		return 0;
	}

	// ---- Accessors ----

	function scoreOf(item) {
		const n = parseInt(item.nota, 10);
		return Number.isNaN(n) ? -Infinity : n;
	}

	function priceRank(bucket) {
		const map = { "-": 0, $: 1, $$: 2, $$$: 3, $$$$: 4 };
		return map[bucket] ?? Infinity;
	}

	function nameOf(item) {
		return (item.nome || "").toString().toLowerCase();
	}
}

// Options
export function loadSortOptions(force = false) {
	if (SORT_OPTIONS[ACTIVE_CATEGORY] && !force) {
		return;
	}

	loadTitles();
	loadFilterSortingData(SORT_OPTIONS.titles);

	SORT_OPTIONS[ACTIVE_CATEGORY] = {};
	const options = SORT_OPTIONS[ACTIVE_CATEGORY];

	if (shouldDisplayScores()) {
		options.scores = {
			highest_first: translate("destination.sort.scores.highest_first"),
			lowest_first: translate("destination.sort.scores.lowest_first"),
		};
	}

	if (shouldDisplayPlanned()) {
		options.planned = {
			planned_first: translate("destination.sort.planned.planned_first"),
			not_planned_first: translate(
				"destination.sort.planned.not_planned_first",
			),
		};
	}

	if (shouldDisplayPrices()) {
		options.prices = {
			lowest_first: translate("destination.sort.price.lowest_first"),
			highest_first: translate("destination.sort.price.highest_first"),
		};
	}

	options.name = {
		ascending: translate("destination.sort.name.ascending"),
		descending: translate("destination.sort.name.descending"),
	};

	function loadTitles() {
		if (!SORT_OPTIONS.titles) {
			SORT_OPTIONS.titles = {
				name: translate("destination.sort.name.title"),
				planned: translate("destination.sort.planned.title"),
				scores: translate("destination.sort.scores.title"),
				prices: translate("destination.sort.price.title"),
			};
		}
	}
}

// Drawer
export function openSortDrawer() {
	openFilterSortDrawer({
		triggerId: "sort",
		getInnerHTML: getSortDrawerInnerHTML,
		clickAction: sortDrawerOptionClickAction,
		loadAction: sortDrawerOptionLoadAction,
	});
}
