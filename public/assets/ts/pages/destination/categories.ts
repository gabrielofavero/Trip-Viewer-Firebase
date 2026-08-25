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

// Active Category
export function loadActiveCategory(urlParams) {
	const type = urlParams['type'];
	const destinationsConfig = getDestinations();
	const ids = destinationsConfig.categories.ids;

	// If the URL type is already a valid English category ID, use it directly.
	// Otherwise, try the deprecated Portuguese→English mapping for old URLs.
	if (type && ids.includes(type)) {
		ACTIVE_CATEGORY = type;
		return;
	}

	const originals = destinationsConfig._deprecated_original;
	if (type && originals[type]) {
		ACTIVE_CATEGORY = originals[type];
		return;
	}

	ACTIVE_CATEGORY = getFirstCategory();

	function getFirstCategory() {
		const destinationsConfig = getDestinations();
		const types = destinationsConfig.categories.ids;
		const translations = destinationsConfig.translation;
		const destinoIDs = Object.keys(FIRESTORE_DESTINATIONS_DATA);
		for (const type of types) {
			const value = translations[type];
			if (destinoIDs.includes(type) && value) {
				return type;
			}
		}
		throw translate('messages.errors.missing_data');
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
		const date = convertFromDateObject(plannedItem.data);
		const weekday = getWeekday(date.getUTCDay());
		const day = plannedItem.data.day;
		const month = getMonth(plannedItem.data.month - 1).toLowerCase();
		const period = getPeriod(plannedItem.period).toLowerCase();
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
