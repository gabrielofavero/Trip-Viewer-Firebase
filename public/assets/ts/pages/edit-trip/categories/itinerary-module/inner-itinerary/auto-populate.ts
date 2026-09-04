// ======= Auto-populate itinerary from trip transportations/accommodations =======
// When a transportation or accommodation is created, or when the itinerary is
// enabled for the first time with no scheduled items yet, the itinerary days
// are pre-filled with:
//   - one item per transportation leg (on the departure date / period), and
//   - a check-in and a check-out item per accommodation.
// Check-in defaults to the afternoon period and check-out to the morning
// period when no specific time is set.

import { getChildIDs, getCategoryLegJs, getID, getJ } from '../../../../../utils/dom.js';
import { inputDateToKey, jsDateToKey } from '../../../../../utils/dates.js';
import { translate } from '../../../../../i18n/translation.js';
import { initializeSortableForGroup } from '../../../../../ui/sortable.js';
import { DATAS } from '../../../new-trip.js';
import {
	INNER_ITINERARY,
	afterDragInnerItinerary,
	getPeriod,
	loadInnerItineraryHTML,
} from './inner-itinerary.js';

const PERIODS = ['earlyMorning', 'morning', 'afternoon', 'night'] as const;

/** True when any itinerary day has at least one scheduled item. */
export function hasItineraryItems(data: any[]): boolean {
	return (data || []).some(
		(day) =>
			day.earlyMorning?.length ||
			day.morning?.length ||
			day.afternoon?.length ||
			day.night?.length,
	);
}

/**
 * Add a transportation leg as an itinerary item on the day matching its
 * departure date. The period follows the departure time.
 */
export function addTransportationToItinerary(j: number) {
	const departureDate = getID(`transportation-departure-date-${j}`)?.value;
	const id = getID(`transportation-id-${j}`)?.value;
	if (!departureDate || !id) return;

	const key = inputDateToKey(departureDate);
	const dayJ = getDayJByKey(key);
	if (!dayJ) return; // outside the trip's date range

	const origin = getID(`departure-point-${j}`)?.value || '';
	const destination = getID(`arrival-point-${j}`)?.value || '';
	const start = getID(`departure-time-${j}`)?.value || '';
	const end = getID(`arrival-time-${j}`)?.value || '';
	const label = [origin, destination].filter(Boolean).join(' → ');
	const period = timeToPeriod(start);

	ensureDayStructure(key);
	if (alreadyHasItem(key, 'transportation', id, label)) return;

	INNER_ITINERARY[key][period].push({
		label,
		start,
		end,
		travelers: [],
		item: { type: 'transportation', id, category: '', location: '' },
	});
	renderDay(dayJ);
}

/**
 * Add a check-in and a check-out item for an accommodation, placed on the
 * matching dates. Periods follow the set times; without a time, check-in goes
 * to the afternoon and check-out to the morning.
 */
export function addAccommodationToItinerary(j: number) {
	const id = getID(`accommodations-id-${j}`)?.value;
	if (!id) return;

	const name = getID(`accommodations-name-${j}`)?.value || '';
	const checkInDate = getID(`check-in-${j}`)?.value;
	const checkOutDate = getID(`check-out-${j}`)?.value;
	const checkInTime = getID(`check-in-time-${j}`)?.value || '';
	const checkOutTime = getID(`check-out-time-${j}`)?.value || '';

	if (checkInDate) {
		const key = inputDateToKey(checkInDate);
		const dayJ = getDayJByKey(key);
		if (dayJ) {
			const label = `${translate('trip.accommodation.checkin')}: ${name}`;
			const period = getAccommodationPeriod('checkIn', checkInTime);
			ensureDayStructure(key);
			if (!alreadyHasItem(key, 'accommodations', id, label)) {
				INNER_ITINERARY[key][period].push({
					label,
					start: checkInTime,
					end: '',
					travelers: [],
					item: { type: 'accommodations', id, category: '', location: '' },
				});
				renderDay(dayJ);
			}
		}
	}

	if (checkOutDate) {
		const key = inputDateToKey(checkOutDate);
		const dayJ = getDayJByKey(key);
		if (dayJ) {
			const label = `${translate('trip.accommodation.checkout')}: ${name}`;
			const period = getAccommodationPeriod('checkOut', checkOutTime);
			ensureDayStructure(key);
			if (!alreadyHasItem(key, 'accommodations', id, label)) {
				INNER_ITINERARY[key][period].push({
					label,
					start: checkOutTime,
					end: '',
					travelers: [],
					item: { type: 'accommodations', id, category: '', location: '' },
				});
				renderDay(dayJ);
			}
		}
	}
}

/** Add every transportation leg and accommodation to the itinerary. */
export function autoPopulateItineraryFromTrip() {
	for (const j of getCategoryLegJs('transportation')) {
		addTransportationToItinerary(j);
	}
	for (const child of getChildIDs('accommodations-box')) {
		addAccommodationToItinerary(getJ(child));
	}
}

// ---- Helpers ----

/** Map an HH:mm value to a period; no time / the form default → morning. */
function timeToPeriod(time: string): string {
	if (!time || time === '00:00') return 'morning';
	return getPeriod(parseInt(time.split(':')[0]));
}

function getAccommodationPeriod(kind: 'checkIn' | 'checkOut', time: string): string {
	if (!time) return kind === 'checkIn' ? 'afternoon' : 'morning';
	const hour = parseInt(time.split(':')[0]);
	// A check-out at noon or earlier is a morning departure.
	if (kind === 'checkOut' && hour <= 12) return 'morning';
	return getPeriod(hour);
}

/** Return the 1-based itinerary day index for a YYYYMMDD key, or 0. */
function getDayJByKey(key: string): number {
	for (let i = 0; i < DATAS.length; i++) {
		if (jsDateToKey(DATAS[i]) === key) return i + 1;
	}
	return 0;
}

function ensureDayStructure(key: string) {
	if (!INNER_ITINERARY[key]) {
		INNER_ITINERARY[key] = { earlyMorning: [], morning: [], afternoon: [], night: [] };
	}
	return INNER_ITINERARY[key];
}

/** Avoid duplicates: same linked item + label already present on the day. */
function alreadyHasItem(key: string, type: string, id: string, label: string): boolean {
	const day = INNER_ITINERARY[key];
	if (!day) return false;
	for (const period of PERIODS) {
		const exists = (day[period] || []).some(
			(item: any) =>
				item?.item?.type === type && item?.item?.id === id && item?.label === label,
		);
		if (exists) return true;
	}
	return false;
}

function renderDay(dayJ: number) {
	loadInnerItineraryHTML(dayJ);
	initializeSortableForGroup(`itinerary-${dayJ}`, { onEnd: afterDragInnerItinerary });
}
