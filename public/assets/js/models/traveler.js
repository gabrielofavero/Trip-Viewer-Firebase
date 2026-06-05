// ======= Traveler Model =======
// Pure data transformation functions for traveler/person data
// Extracted from: edit-trip/categories/travelers.js, view/categories/summary.js

/**
 * Generates a new unique traveler ID
 * @returns {string} Unique random ID
 */
export function _getNewTravelerID() {
	return _getRandomID({ pool: TRAVELERS.map((t) => t.id) });
}

/**
 * Validates and ensures all travelers have unique IDs
 */
export function _validateTravelersObject() {
	for (const traveler of TRAVELERS) {
		if (!traveler.id) {
			traveler.id = _getNewTravelerID();
		}
	}
}

/**
 * Checks for duplicate traveler names
 * @param {Array} travelers - Array of traveler objects with nome property
 * @returns {boolean} True if there are duplicate non-empty names
 */
export function _hasDuplicateTravelerNames(travelers) {
	const nomes = travelers.map((t) => t.nome);
	return nomes.some((nome, index) => {
		return nomes.indexOf(nome) !== index && nome !== "";
	});
}
