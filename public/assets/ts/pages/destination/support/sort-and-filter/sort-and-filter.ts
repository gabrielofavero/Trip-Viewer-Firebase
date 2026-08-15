import { getID } from '../../../../utils/dom.js';
import { CONTENT, getDataSet, ACTIVE_CATEGORY } from '../../destination.js';
import { closeAddedDestination } from '../../edit-destination.js';
import { PLANNED_DESTINATION } from '../trip.js';
import { loadFilterOptions } from './filter.js';
import { loadSortOptions } from './sort.js';
import { closeDrawer } from './support/drawer.js';
import { isDrawerOpen } from './support/drawer.js';
import { openDrawer } from './support/drawer.js';
import { getPriceBuckets } from './support/price-bucket.js';
import { getPrices } from './support/price-bucket.js';

export const FILTER_SORT_KEYS_ORDER = {
	planned: ['planned', 'not_planned'],
	prices: ['-', '$', '$$', '$$$', '$$$$', 'default'],
	scores: ['5', '4', '3', '2', '1', 'default'],
};

export const FILTER_SORT_DATA = {};

// Loading Action
export function loadSortAndFilter(force = false) {
	loadFilterOptions(force);
	loadSortOptions(force);
	loadSortAndFilterVisibility();
}

function loadSortAndFilterVisibility() {
	const onlyOne = CONTENT.length === 1;

	getID('sort').style.display = onlyOne ? 'none' : '';
	getID('filter').style.display = onlyOne || noFilters() ? 'none' : '';

	function noFilters() {
		return !(
			shouldDisplayPlanned() ||
			shouldDisplayScores() ||
			shouldDisplayRegions() ||
			shouldDisplayPrices()
		);
	}
}

export function loadFilterSortingData(titles) {
	if (!FILTER_SORT_DATA[ACTIVE_CATEGORY]) {
		FILTER_SORT_DATA[ACTIVE_CATEGORY] = {};
	}
	for (const title in titles) {
		let data;
		switch (title) {
			case 'region':
				data = getDataSet('region');
				data.delete('');
				break;
			case 'planned':
				data = getDataSet('planned');
				break;
			case 'scores':
				data = getDataSet('rating');
				break;
			case 'prices':
				data = getPriceBuckets();
		}
		FILTER_SORT_DATA[ACTIVE_CATEGORY][title] = data || new Set();
	}
}

// Drawer
function deactivateFilterSortContainerButtons() {
	const container = getID('filter-sort-container');
	if (!container) return;

	container
		.querySelectorAll('.filter-sort.active')
		.forEach((btn) => btn.classList.remove('active'));
}

function activateFilterSortContainerButton(buttonEl) {
	if (!buttonEl) return;

	deactivateFilterSortContainerButtons();
	buttonEl.classList.add('active');
}

export function openFilterSortDrawer({ triggerId, getInnerHTML, clickAction, loadAction }) {
	const trigger = getID(triggerId);
	const title = trigger.innerText;

	if (isDrawerOpen() && title === getID('drawerTitle').innerText) {
		closeDrawer();
		return;
	}

	const actions = {
		beforeOpen: closeAddedDestination,
		click: clickAction,
		load: loadAction,
		close: deactivateFilterSortContainerButtons,
	};

	openDrawer(title, getInnerHTML(), actions);
	activateFilterSortContainerButton(trigger);
}

// Helpers
export function shouldDisplayRegions() {
	const REGIONS = getDataSet('region');
	REGIONS.delete('');
	return REGIONS.size > 1;
}

export function shouldDisplayPlanned() {
	const item = PLANNED_DESTINATION[ACTIVE_CATEGORY];
	if (!item || Object.keys(PLANNED_DESTINATION[ACTIVE_CATEGORY]).length <= 1) {
		return false;
	}
	return true;
}

export function shouldDisplayScores() {
	const ratings = getDataSet('rating');
	return ratings.size > 1;
}

export function shouldDisplayPrices() {
	const prices = getPrices();
	return prices.size > 1;
}
