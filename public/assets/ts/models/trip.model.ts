// ======= Trip Model =======
// Pure data transformation functions for trip data
// Extracted from: view/categories/summary.js, edit-trip/

import { convertFromDateObject } from '../utils/dates.js';
import type { Trip, DateObject, Traveler } from './new-schema.js';

// ======= Trip Duration & Traveler Count =======

/**
 * Computes the number of days between two dates (inclusive)
 * @param start - Start date (was "inicio")
 * @param end - End date (was "fim")
 * @returns Number of days
 */
export function computeTripDuration(start: Date, end: Date): number {
	return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
}

/**
 * Computes the number of travelers
 * @param travelers - Array of traveler objects (was "pessoas")
 * @returns Number of travelers (minimum 1)
 */
export function computeTravelerCount(travelers: Traveler[]): number {
	return travelers?.length || 1;
}

// ======= Trip Date Helpers =======

/**
 * Gets the trip date range formatted as {date, text} objects
 * @param firestoreData - Raw Firestore trip data (was using "inicio"/"fim" fields)
 * @returns Date range with start/end
 */
export function loadStartEnd(firestoreData: Trip): {
	start: { date: Date; text: string };
	end: { date: Date; text: string };
} {
	const startDate = convertFromDateObject(firestoreData.start);
	const endDate = convertFromDateObject(firestoreData.end);

	return {
		start: {
			date: startDate,
			text: getFormattedDate(startDate),
		},
		end: {
			date: endDate,
			text: getFormattedDate(endDate),
		},
	};
}

/** @deprecated Use `loadStartEnd` instead */
export const loadInicioFim = loadStartEnd;
