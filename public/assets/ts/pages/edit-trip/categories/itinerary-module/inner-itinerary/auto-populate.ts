// ======= Auto-populate itinerary from trip transportations/accommodations =======
// Keeps the itinerary in sync with the trip's transportations and
// accommodations:
//   - one item per transportation leg, on its departure date and time-of-day;
//   - a check-in and a check-out item per accommodation, from their times
//     (afternoon / morning by default when no time is set).
// Items created here carry an `auto` source key so they can be re-synced when
// their source changes, and are never recreated once the user deletes them by
// hand (auto-excluded.ts).

import { getChildIDs, getCategoryLegJs, getID, getJ } from '../../../../../utils/dom.js';
import { inputDateToKey, jsDateToKey } from '../../../../../utils/dates.js';
import { translate } from '../../../../../i18n/translation.js';
import { initializeSortableForGroup } from '../../../../../ui/sortable.js';
import { DATAS } from '../../../new-trip.js';
import {
	INNER_ITINERARY,
	afterDragInnerItinerary,
	ensureInnerItineraryDay,
	getPeriod,
	loadInnerItineraryHTML,
} from './inner-itinerary.js';
import { isAutoKeyExcluded } from './auto-excluded.js';

/**
 * "add-only" only creates the items that are missing (page load, itinerary just
 * enabled); "full" also rewrites the items it owns, after their source changed.
 */
type AutoPopulateMode = 'add-only' | 'full';

/** An itinerary item the trip's transportations/accommodations ask for. */
interface AutoItem {
	/** Source key: the leg, or one side of an accommodation. */
	auto: string;
	/** YYYYMMDD key of the day it belongs to. */
	key: string;
	/** Period inside the day. */
	period: string;
	label: string;
	start: string;
	end: string;
	item: { type: string; id: string; category: string; location: string };
}

/** Where an itinerary item currently sits. */
interface ItemLocation {
	key: string;
	period: string;
	index: number;
	item: any;
	/** 1-based day index used by the DOM, or 0 when the day isn't rendered. */
	dayJ: number;
}

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

// ======= Trip-wide changes =======

/**
 * Add every transportation leg and accommodation to the itinerary, leaving the
 * items already scheduled — by hand or by a previous run — untouched.
 */
export function autoPopulateItineraryFromTrip() {
	if (!isItineraryEnabled()) return;

	const days = new Set<number>();

	for (const j of getCategoryLegJs('transportation')) {
		collectDays(syncItem(getTransportationItems(j), 'add-only'), days);
	}

	for (const child of getChildIDs('accommodations-box')) {
		collectDays(syncItem(getAccommodationItems(getJ(child)), 'add-only'), days);
	}

	renderDays(days);
}

// ======= Source changes =======

/** Re-sync a transportation leg after its route, date or time changed. */
export function syncTransportationItinerary(j: number) {
	if (!isItineraryEnabled()) return;
	renderDays(syncItem(getTransportationItems(j), 'full'));
}

/** Re-sync an accommodation after its name, dates or times changed. */
export function syncAccommodationItinerary(j: number) {
	if (!isItineraryEnabled()) return;
	renderDays(syncItem(getAccommodationItems(j), 'full'));
}

function isItineraryEnabled(): boolean {
	return Boolean(getID('itinerary-enabled')?.checked);
}

// ======= Source descriptions =======

/** The itinerary items a transportation leg asks for: itself, on its departure date. */
function getTransportationItems(j: number): AutoItem[] {
	const id = getID(`transportation-id-${j}`)?.value;
	const departureDate = getID(`transportation-departure-date-${j}`)?.value;
	if (!id || !departureDate) return [];

	const key = inputDateToKey(departureDate);
	if (!getDayJByKey(key)) return []; // outside the trip's date range

	const start = getID(`departure-time-${j}`)?.value || '';
	const origin = getID(`departure-point-${j}`)?.value || '';
	const destination = getID(`arrival-point-${j}`)?.value || '';

	return [
		{
			auto: `transportation:${id}`,
			key,
			period: timeToPeriod(start),
			label: [origin, destination].filter(Boolean).join(' → '),
			start,
			end: getID(`arrival-time-${j}`)?.value || '',
			item: { type: 'transportation', id, category: '', location: '' },
		},
	];
}

/** The itinerary items an accommodation asks for: its check-in and check-out. */
function getAccommodationItems(j: number): AutoItem[] {
	const id = getID(`accommodations-id-${j}`)?.value;
	if (!id) return [];

	const name = getID(`accommodations-name-${j}`)?.value || '';
	const result: AutoItem[] = [];

	const sides = [
		{
			auto: `accommodations:${id}:checkIn`,
			kind: 'checkIn' as const,
			title: translate('trip.accommodation.checkin'),
			date: getID(`check-in-${j}`)?.value,
			time: getID(`check-in-time-${j}`)?.value || '',
		},
		{
			auto: `accommodations:${id}:checkOut`,
			kind: 'checkOut' as const,
			title: translate('trip.accommodation.checkout'),
			date: getID(`check-out-${j}`)?.value,
			time: getID(`check-out-time-${j}`)?.value || '',
		},
	];

	for (const side of sides) {
		if (!side.date) continue;
		const key = inputDateToKey(side.date);
		if (!getDayJByKey(key)) continue; // outside the trip's date range

		result.push({
			auto: side.auto,
			key,
			period: getAccommodationPeriod(side.kind, side.time),
			// The label carries the side of the stay: it is what tells the
			// check-in item apart from the check-out one.
			label: `${side.title}: ${name}`,
			start: side.time,
			end: '',
			item: { type: 'accommodations', id, category: '', location: '' },
		});
	}

	return result;
}

// ======= Applying =======

/**
 * Create - or, in "full" mode, rewrite - the itinerary items a source asks for.
 * Returns the day indexes whose DOM has to be re-rendered.
 *
 * An item is claimed by its source key first, then by the item it links plus
 * the generated label, which is how the items created before they carried a key
 * are adopted. Anything else is left alone, and a source whose item was deleted
 * by hand never gets it back.
 */
function syncItem(desired: AutoItem[], mode: AutoPopulateMode): Set<number> {
	const days = new Set<number>();

	for (const want of desired) {
		if (isAutoKeyExcluded(want.auto)) continue;

		const own = findItem((item: any) => item?.auto === want.auto);
		if (own) {
			if (mode === 'full') updateItem(own, want, days);
			continue;
		}

		const unclaimed = findItem(
			(item: any) =>
				!item?.auto &&
				item?.item?.type === want.item.type &&
				item?.item?.id === want.item.id &&
				item?.label === want.label,
		);
		if (unclaimed) {
			unclaimed.item.auto = want.auto;
			addDay(days, unclaimed.dayJ);
			if (mode === 'full') updateItem(unclaimed, want, days);
			continue;
		}

		// Nothing scheduled for this source yet. An empty label renders as
		// nothing at all, so a source with no usable description is skipped
		// until the user fills it in.
		if (!want.label) continue;

		ensureInnerItineraryDay(want.key)[want.period].push({
			label: want.label,
			start: want.start,
			end: want.end,
			travelers: [],
			item: want.item,
			auto: want.auto,
		});
		addDay(days, getDayJByKey(want.key));
	}

	return days;
}

/**
 * Move an item onto the source's day and period and refresh what the source
 * owns, keeping what the user added (travelers, notes).
 */
function updateItem(location: ItemLocation, want: AutoItem, days: Set<number>) {
	const { item } = location;

	if (want.label) item.label = want.label;
	item.start = want.start;
	item.end = want.end;
	item.item = want.item;
	item.auto = want.auto;

	if (location.key !== want.key || location.period !== want.period) {
		ensureInnerItineraryDay(location.key)[location.period]?.splice(location.index, 1);
		ensureInnerItineraryDay(want.key)[want.period].push(item);

		addDay(days, location.dayJ);
		addDay(days, getDayJByKey(want.key));
	}
}

/** First itinerary item matching the predicate, wherever it is scheduled. */
function findItem(match: (item: any) => boolean): ItemLocation | null {
	for (const key of Object.keys(INNER_ITINERARY)) {
		const day = INNER_ITINERARY[key];
		if (!day) continue;

		for (const period of Object.keys(day)) {
			const items = day[period];
			if (!Array.isArray(items)) continue;

			for (let index = 0; index < items.length; index++) {
				if (match(items[index])) {
					return { key, period, index, item: items[index], dayJ: getDayJByKey(key) };
				}
			}
		}
	}

	return null;
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

function addDay(days: Set<number>, dayJ: number) {
	if (dayJ) days.add(dayJ);
}

function collectDays(source: Set<number>, days: Set<number>) {
	for (const dayJ of source) days.add(dayJ);
}

function renderDays(days: Set<number>) {
	for (const dayJ of days) renderDay(dayJ);
}

function renderDay(dayJ: number) {
	loadInnerItineraryHTML(dayJ);
	initializeSortableForGroup(`itinerary-${dayJ}`, { onEnd: afterDragInnerItinerary });
}
