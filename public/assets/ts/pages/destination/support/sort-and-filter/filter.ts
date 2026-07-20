import { getPriceLabel, isPriceInBucketRange } from '../../../../models/destination.model.js';
import { translate } from '../../../../i18n/translation.js';
import {
	FILTER_SORT_DATA,
	loadFilterSortingData,
	openFilterSortDrawer,
	shouldDisplayPlanned,
	shouldDisplayPrices,
	shouldDisplayRegions,
	shouldDisplayScores,
} from './sort-and-filter.js';
import { filterDrawerOptionClickAction } from './support/drawer.js';
import { filterDrawerOptionLoadAction } from './support/drawer.js';
import { getFilterDrawerInnerHTML } from './support/drawer.js';
import { ACTIVE_CATEGORY, applyContent, CONTENT, getItem, isPlanned } from '../../destination.js';
import { getFilterPreferences } from './support/preferences.js';
import { getPrices } from './support/price-bucket.js';

export const FILTER_OPTIONS: Record<string, Record<string, Record<string, string>>> = {};

// Main Action
export function filter(render = false) {
	const preferences = getFilterPreferences();
	const isPlannedEnabled = shouldDisplayPlanned() && preferences.planned !== 'everything';
	const isPricesEnabled = shouldDisplayPrices() && preferences.prices !== 'everything';
	const isScoresEnabled = shouldDisplayScores() && preferences.scores !== 'everything';
	const isRegionsEnabled =
		shouldDisplayRegions() &&
		preferences.region !== 'everything' &&
		FILTER_SORT_DATA[ACTIVE_CATEGORY].region.has(preferences.region);

	for (const content of CONTENT) {
		const item = getItem(content.id);
		if (
			(isPlannedEnabled && shouldFilterByPlanned(content.id)) ||
			(isPricesEnabled && shouldFilterByPrices(item)) ||
			(isScoresEnabled && shouldFilterByScores(item)) ||
			(isRegionsEnabled && shouldFilterByRegions(item))
		) {
			content.filtered = true;
			continue;
		}
		content.filtered = false;
	}

	if (render) {
		applyContent();
	}

	function shouldFilterByPlanned(id) {
		const planned = isPlanned(id);
		return (
			(planned && preferences.planned === 'not_planned') ||
			(!planned && preferences.planned === 'planned')
		);
	}

	function shouldFilterByPrices(item) {
		const value = item.price;

		if (value === '$$$$') {
			return false;
		}

		if (value != 'default' && preferences.prices != 'default') {
			return !isPriceInBucketRange(preferences.prices, value);
		}

		return value != preferences.prices;
	}

	function shouldFilterByScores(item) {
		const value = item.rating;

		if (['default', '1'].includes(value)) {
			return true;
		}

		return Number(value) < Number(preferences.scores);
	}

	function shouldFilterByRegions(item) {
		const value = item.region;
		if (!value) {
			return true;
		}
		return value !== preferences.region;
	}
}

// Options
export function loadFilterOptions(force = false) {
	if (FILTER_OPTIONS[ACTIVE_CATEGORY] && !force) {
		return;
	}

	loadTitles();
	loadFilterSortingData(FILTER_OPTIONS.titles);

	FILTER_OPTIONS[ACTIVE_CATEGORY] = {};
	const options = FILTER_OPTIONS[ACTIVE_CATEGORY];

	if (shouldDisplayPlanned()) {
		options.planned = {
			planned: translate('destination.filter.planned.planned'),
			not_planned: translate('destination.filter.planned.not_planned'),
		};
	}

	if (shouldDisplayScores()) {
		options.scores = {
			5: translate('destination.filter.scores.5'),
			4: translate('destination.filter.scores.4'),
			3: translate('destination.filter.scores.3'),
			2: translate('destination.filter.scores.2'),
		};
	}

	if (shouldDisplayRegions()) {
		const regions = new Set(
			Array.from(FILTER_SORT_DATA[ACTIVE_CATEGORY].region)
				.map((r: string) => r?.trim())
				.filter(Boolean)
				.sort((a, b) => a.localeCompare(b)),
		);
		options.region = {
			none: translate('destination.filter.region.none'),
		};
		for (const region of regions) {
			options.region[region] = region;
		}
	}

	if (shouldDisplayPrices()) {
		options.prices = {};
		const prices = Array.from(getPrices()) as string[];

		if (prices.length === 2 && prices[0] === '-' && ['$', '$$', '$$$'].includes(prices[1])) {
			prices.pop();
		}

		for (const price of prices) {
			options.prices[price] = getPriceLabel(price);
		}
	}

	function loadTitles() {
		if (!FILTER_OPTIONS.titles) {
			FILTER_OPTIONS.titles = {
				planned: translate('destination.filter.planned.title'),
				scores: translate('destination.filter.scores.title'),
				region: translate('destination.filter.region.title'),
				prices: translate('destination.filter.price.title'),
			};
		}
	}
}

// Drawer
export function openFilterDrawer() {
	openFilterSortDrawer({
		triggerId: 'filter',
		getInnerHTML: getFilterDrawerInnerHTML,
		clickAction: filterDrawerOptionClickAction,
		loadAction: filterDrawerOptionLoadAction,
	});
}
