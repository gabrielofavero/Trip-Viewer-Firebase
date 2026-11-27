// ======= Destination Categories =======
// Destination formatting functions moved to models/destination.model.js — imported here for backward compat

import {
	getRatingTranslation,
	getPriceValue,
	convertCustomPrice,
	getDescriptionValue,
} from '../../models/destination.model.js';
import { getDestinations } from '../../app/config.js';
import { translate } from '../../i18n/translation.js';
import { getURLParam, setURLParam } from '../../utils/dom.js';
import { convertFromDateObject, getMonth, getWeekday } from '../../utils/dates.js';
import { getPlannedDestinations } from './support/trip.js';
import { FIRESTORE_DESTINATIONS_DATA } from '../../data/state.js';

export var ACTIVE_CATEGORY;

/**
 * True when a destination category has something to render.
 *
 * The `myMaps` "category" holds the My Maps link itself (a string) while the
 * regular categories are entry maps. Disabled modules leave empty maps on the
 * document (`restaurants: {}`), so the key being present does NOT mean the
 * category is usable — this is the single rule shared by the initial category
 * selection, the tab bar and the page mount.
 */
export function hasCategoryContent(category) {
	const data = FIRESTORE_DESTINATIONS_DATA?.[category];
	if (!data) return false;
	if (typeof data === 'string') return data.trim() !== '';
	return typeof data === 'object' && Object.keys(data).length > 0;
}

/**
 * Resolve a `?type=` value to a canonical category id. Accepts the English id
 * (`tourism`), the label the tab bar writes into the URL (`Tourism`) and the
 * legacy Portuguese ids (`turismo`). The legacy `map` id normalizes to
 * `myMaps`, which is the document key holding the My Maps link.
 */
function resolveCategoryId(raw) {
	if (!raw) return '';
	const config = getDestinations();
	const ids = config.categories.ids;
	const needle = String(raw).trim().toLowerCase();

	const canonical = (id) => (id === 'map' ? 'myMaps' : id);
	const matches = (value) => String(value || '').trim().toLowerCase() === needle;

	for (const id of ids) if (matches(id)) return canonical(id);
	for (const id of ids) if (matches(config.translation?.[id])) return canonical(id);
	for (const [id, legacy] of Object.entries(config._deprecated_original || {})) {
		if (matches(legacy)) return canonical(id);
	}
	return '';
}

// Active Category
export function loadActiveCategory(urlParams) {
	const requested = resolveCategoryId(urlParams?.['type']);
	const ids = getDestinations().categories.ids;

	// A deep-linked category is only honoured when it has content. Selecting an
	// empty category left the page with nothing to render and aborted with
	// "missing data" (prod: documents with disabled modules keep `{}` maps).
	if (requested && hasCategoryContent(requested)) {
		ACTIVE_CATEGORY = requested;
		return;
	}

	// Otherwise start on the first category that has content, in config order —
	// the same rule the tab bar uses, so the initial tab is always the first tab.
	ACTIVE_CATEGORY = ids.find((id) => hasCategoryContent(id));

	// Nothing has content yet (brand-new destination): still pick a real
	// category so the in-page "Add" button knows which map to write the first
	// entry into. Prefer a module the document has enabled, skipping `myMaps`
	// (that key holds the My Maps link, not entries).
	if (!ACTIVE_CATEGORY) {
		const modules = FIRESTORE_DESTINATIONS_DATA?.modules || {};
		ACTIVE_CATEGORY =
			ids.find((id) => id !== 'myMaps' && modules[id] === true) ||
			ids.find((id) => id !== 'myMaps');
	}
}

export function updateActiveCategory(category) {
	const urlParam = getURLParam('type');
	const translations = getDestinations().translation;
	const param = translations[category];

	if (urlParam === param) {
		return;
	}

	ACTIVE_CATEGORY = category;
	setURLParam('type', param);
}

// Rating
export function getRatingIcon(rating) {
	switch (rating) {
		case '5':
			return 'ph:number-five-bold';
		case '4':
			return 'ph:number-four-bold';
		case '3':
			return 'ph:number-three-bold';
		case '2':
			return 'ph:number-two-bold';
		case '1':
			return 'ph:number-one-bold';
		default:
			return 'ic:outline-question-mark';
	}
}

export function getRatingClass(rating) {
	switch (rating) {
		case '5':
		case '4':
		case '3':
		case '2':
		case '1':
			return `rating-${rating}`;
		default:
			return 'rating-absent';
	}
}

// Links
export function getLinkOnClick(item, type) {
	if (item[type]) {
		return ` data-action="open-link" data-url="${item[type]}"`;
	} else return '';
}

// Planned
export function getPlanned(id) {
	const plannedItems = getPlannedDestinations(id);
	return getPlannedValue(plannedItems);

	function getPlannedValue(plannedItems = []) {
		if (plannedItems.length === 0) {
			return '';
		}

		if (plannedItems.length > 1) {
			return translate('labels.planned.multiple');
		}

		const plannedItem = plannedItems[0];
		// Entries without a date are ignored — the card badge asks for the
		// planned label of every destination.
		if (!plannedItem?.data) {
			return '';
		}

		const date = convertFromDateObject(plannedItem.data);
		const weekday = getWeekday(date.getUTCDay());
		const day = plannedItem.data.day;
		const month = getMonth(plannedItem.data.month - 1).toLowerCase();
		const period = (getPeriod(plannedItem.period) || '').toLowerCase();
		const periodLabel = period ? ` (${period})` : '';
		return `${translate('labels.planned.title')}: ${weekday}, ${translate('datetime.titles.day_month', { day, month })}${periodLabel}`;
	}
}

export function getPeriod(period) {
	switch (period) {
		case 'earlyMorning':
			return translate('datetime.time_of_day.early_hours');
		case 'morning':
			return translate('datetime.time_of_day.morning');
		case 'afternoon':
			return translate('datetime.time_of_day.afternoon');
		case 'night':
			return translate('datetime.time_of_day.evening');
		default:
			return undefined;
	}
}
