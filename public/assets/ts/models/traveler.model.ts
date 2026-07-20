// ======= Traveler Model =======
// Pure data transformation functions for traveler/person data
// Extracted from: edit-trip/categories/travelers.js, view/categories/summary.js

import { getRandomID } from '../utils/dom.js';
import { TRAVELERS } from '../data/state.js';
import type { Traveler } from './new-schema.js';

/**
 * Generates a new unique traveler ID
 * @returns Unique random ID
 */
export function getNewTravelerID(): string {
	return getRandomID({ pool: TRAVELERS.map((t: Traveler) => t.id) });
}

/**
 * Validates and ensures all travelers have unique IDs
 */
export function validateTravelersObject(): void {
	for (const traveler of TRAVELERS) {
		if (!traveler.id) {
			traveler.id = getNewTravelerID();
		}
	}
}

/**
 * Checks for duplicate traveler names
 * @param travelers - Array of traveler objects (was "pessoas" with "nome" property)
 * @returns True if there are duplicate non-empty names
 */
export function hasDuplicateTravelerNames(travelers: Traveler[]): boolean {
	const names = travelers.map((t) => t.name); // was "nomes", "nome"
	return names.some((name, index) => {
		// was "nome"
		return names.indexOf(name) !== index && name !== '';
	});
}
