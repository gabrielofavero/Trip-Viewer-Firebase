// ======= Trip Model =======
// Pure data transformation functions for trip data
// Extracted from: view/categories/summary.js, edit-trip/

// ======= Trip Duration & Traveler Count =======

/**
 * Computes the number of days between two dates (inclusive)
 * @param {Date} inicio - Start date
 * @param {Date} fim - End date
 * @returns {number} Number of days
 */
export function computeTripDuration(inicio, fim) {
	return Math.ceil((fim - inicio) / (1000 * 60 * 60 * 24)) + 1;
}

/**
 * Computes the number of travelers
 * @param {Array} pessoas - Array of traveler objects
 * @returns {number} Number of travelers (minimum 1)
 */
export function computeTravelerCount(pessoas) {
	return pessoas?.length || 1;
}

// ======= Trip Date Helpers =======

/**
 * Gets the trip date range formatted as {date, text} objects
 * @param {Object} firestoreData - Raw Firestore trip data
 * @returns {{inicio: {date: Date, text: string}, fim: {date: Date, text: string}}}
 */
export function loadInicioFim(firestoreData) {
	const inicio = convertFromDateObject(firestoreData.inicio);
	const fim = convertFromDateObject(firestoreData.fim);

	return {
		inicio: {
			date: inicio,
			text: getFormattedDate(inicio),
		},
		fim: {
			date: fim,
			text: getFormattedDate(fim),
		},
	};
}
