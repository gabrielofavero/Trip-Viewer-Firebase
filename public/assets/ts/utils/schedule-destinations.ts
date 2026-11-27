import type { ItineraryDay } from '../models/schema.js';

/** Normalize destination references and combine entries that share a calendar day. */
export function getScheduleDestinations(
	itinerary: Pick<ItineraryDay, 'date' | 'destinationIds'>[] = [],
): Record<string, { id: string }[]> {
	const days: Record<string, { id: string }[]> = {};
	for (const day of itinerary) {
		if (!day.date) continue;
		const { year, month, day: date } = day.date;
		const key = `${year}${String(month).padStart(2, '0')}${String(date).padStart(2, '0')}`;
		const destinations = (days[key] ??= []);
		for (const reference of day.destinationIds || []) {
			const id =
				typeof reference === 'string'
					? reference
					: reference?.id || (reference as { destinationId?: string })?.destinationId;
			if (id && !destinations.some((destination) => destination.id === id)) {
				destinations.push({ id });
			}
		}
	}
	return Object.fromEntries(
		Object.keys(days)
			.sort()
			.map((key) => [key, days[key]]),
	);
}

export function getScheduleDestinationOrder(
	itinerary: Pick<ItineraryDay, 'date' | 'destinationIds'>[] = [],
): string[] {
	return [
		...new Set(
			Object.values(getScheduleDestinations(itinerary)).flatMap((destinations) =>
				destinations.map((destination) => destination.id),
			),
		),
	];
}
