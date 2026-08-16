/**
 * Import Destination Functions
 * Call these from the browser console on edit/destination.html
 *
 * Data shape (from export-maps-data script):
 * {
 *   name, emoji, website, map, instagram, region, price, media, rating,
 *   isNew (bool), description: { en, pt }, createdAt, id
 * }
 */
import {
	addKnownValues,
	buildRegionSelects,
	renderRegionPills,
} from '../../ui/region-select.js';
import { getJs, getLastJ } from '../../utils/dom.js';
import { closeAccordions, openLastAccordion } from '../../ui/accordion.js';
import { addSnacks } from './new-destination.js';
import { addShopping } from './new-destination.js';
import { addRestaurants } from './new-destination.js';
import { addNightlife } from './new-destination.js';
import { addTourism } from './new-destination.js';
import { setDescription } from './categories/description.js';
import { updateDescriptionButtonLabel } from './categories/description.js';
import { loadCurrencyValueAndVisibility } from './categories/price.js';
import { updateDestinationsTitle } from './edit-destination.js';

const IMPORT_TYPES = ['restaurants', 'snacks', 'nightlife', 'tourism', 'shopping'];

// ─── Core: Fill a destination's fields ────────────────────────────────────────
function importFillDestination(category, j, data, force) {
	const entries = [
		{ key: 'name', field: 'name', type: 'value' },
		{ key: 'emoji', field: 'emoji', type: 'value' },
		{ key: 'website', field: 'website', type: 'value' },
		{ key: 'map', field: 'map', type: 'value' },
		{ key: 'instagram', field: 'instagram', type: 'value' },
		{ key: 'media', field: 'media', type: 'value' },
		{ key: 'rating', field: 'rating', type: 'value' },
		{ key: 'id', field: 'id', type: 'value' },
		{ key: 'createdAt', field: 'createdAt', type: 'value' },
	];

	for (const { key, field, type } of entries) {
		const el = document.getElementById(`${category}-${field}-${j}`);
		if (!el) continue;
		const newVal = data[key];
		if (force || (newVal !== undefined && newVal !== null && newVal !== '')) {
			if (type === 'value') (el as HTMLInputElement).value = newVal;
		}
	}

	// isNew (checkbox)
	const isNewEl = document.getElementById(`${category}-isNew-${j}`);
	if (isNewEl) {
		if (force || data.isNew !== undefined) {
			(isNewEl as HTMLInputElement).checked = !!data.isNew;
		}
	}

	// region(s) — supports both the new `regions` array and the legacy string.
	const regions = Array.isArray(data.regions)
		? data.regions
		: data.region
			? [data.region]
			: [];
	if (force || regions.length > 0) {
		renderRegionPills(`${category}-regions-${j}`, regions);
		addKnownValues(regions);
		buildRegionSelects();
	}

	// price (uses loadCurrencyValueAndVisibility)
	if (force || (data.price !== undefined && data.price !== null && data.price !== '')) {
		loadCurrencyValueAndVisibility(data.price || '', category, j);
	}

	// description
	if (data.description && (force || Object.values(data.description).some((v) => v))) {
		setDescription(category, j, data.description);
	}

	// update title & description button
	updateDestinationsTitle(j, category);
	updateDescriptionButtonLabel(category, j);
}

// ─── Helper: get last J (index) in a category box ─────────────────────────────
function importGetLastJ(category) {
	return getLastJ(`${category}-box`);
}

// ─── Add-function lookup (replaces dynamic window._addXxx calls) ──────────────
const ADD_FUNCTIONS = {
	restaurants: addRestaurants,
	snacks: addSnacks,
	nightlife: addNightlife,
	tourism: addTourism,
	shopping: addShopping,
};

// ─── 1. importNewDestination ──────────────────────────────────────────────────
/**
 * Click the "add" button for the given type, then fill the new item.
 * @param {"restaurants"|"snacks"|"nightlife"|"tourism"|"shopping"} type
 * @param {Object} data - destination data
 * @param {boolean} [force=false] - if true, replace all fields (even with empty values)
 */
function importNewDestination(type, data, force = false) {
	if (!IMPORT_TYPES.includes(type)) {
		console.error(`Invalid type: "${type}". Must be one of: ${IMPORT_TYPES.join(', ')}`);
		return;
	}

	const addFn = ADD_FUNCTIONS[type];
	if (typeof addFn !== 'function') {
		console.error(`Add function for "${type}" not found.`);
		return;
	}

	// Close others, trigger add, open the new one
	closeAccordions(type);
	addFn();
	const j = importGetLastJ(type);
	openLastAccordion(type);
	buildRegionSelects();

	importFillDestination(type, j, data, force);
	console.log(`✅ Imported new "${type}" at index ${j}: ${data.name || '(unnamed)'}`);
}

// ─── 2. importDestinationByJ ──────────────────────────────────────────────────
/**
 * Replace all fields of the destination at the given index.
 * @param {"restaurants"|"snacks"|"nightlife"|"tourism"|"shopping"} type
 * @param {number} j - the index (e.g., 15 for collapse-restaurants-15)
 * @param {Object} data
 * @param {boolean} [force=false]
 */
function importDestinationByJ(type, j, data, force = false) {
	if (!IMPORT_TYPES.includes(type)) {
		console.error(`Invalid type: "${type}". Must be one of: ${IMPORT_TYPES.join(', ')}`);
		return;
	}

	const accordion = document.getElementById(`collapse-${type}-${j}`);
	if (!accordion) {
		console.error(`Destination not found: collapse-${type}-${j}`);
		return;
	}

	importFillDestination(type, j, data, force);
	console.log(`✅ Imported "${type}" at index ${j}: ${data.name || '(unnamed)'}`);
}

// ─── 3. importDestinationByName ───────────────────────────────────────────────
/**
 * Search for a destination by name across one or all types.
 * @param {string} name - the name to search for
 * @param {Object} data
 * @param {string} [type] - if omitted, searches all types
 * @param {boolean} [force=false]
 */
function importDestinationByName(name, data, type, force = false) {
	const typesToSearch = type ? [type] : IMPORT_TYPES;

	if (type && !IMPORT_TYPES.includes(type)) {
		console.error(`Invalid type: "${type}". Must be one of: ${IMPORT_TYPES.join(', ')}`);
		return;
	}

	const matches = [];

	for (const cat of typesToSearch) {
		const js = [...new Set(getJs(`${cat}-box`))];
		for (const j of js) {
			const nameEl = document.getElementById(`${cat}-name-${j}`);
			if (
				nameEl &&
				(nameEl as HTMLInputElement).value.trim().toLowerCase() === name.trim().toLowerCase()
			) {
				matches.push({ type: cat, j });
			}
		}
	}

	if (matches.length === 0) {
		console.warn(`⚠️ No destination found with name "${name}"`);
		return;
	}

	if (matches.length > 1) {
		console.error(
			`❌ Multiple matches found for "${name}":`,
			matches.map((m) => `  - ${m.type}[${m.j}]`).join('\n'),
		);
		return;
	}

	const match = matches[0];
	importDestinationByJ(match.type, match.j, data, force);
}

// ─── Per-category convenience wrappers ────────────────────────────────────────

// --- importNew* ---
function importNewRestaurant(data, force) {
	importNewDestination('restaurants', data, force);
}
function importNewSnack(data, force) {
	importNewDestination('snacks', data, force);
}
function importNewNightlife(data, force) {
	importNewDestination('nightlife', data, force);
}
function importNewTourism(data, force) {
	importNewDestination('tourism', data, force);
}
function importNewShop(data, force) {
	importNewDestination('shopping', data, force);
}

// --- import*ByJ ---
function importRestaurantByJ(j, data, force) {
	importDestinationByJ('restaurants', j, data, force);
}
function importSnackByJ(j, data, force) {
	importDestinationByJ('snacks', j, data, force);
}
function importNightlifeByJ(j, data, force) {
	importDestinationByJ('nightlife', j, data, force);
}
function importTourismByJ(j, data, force) {
	importDestinationByJ('tourism', j, data, force);
}
function importShopByJ(j, data, force) {
	importDestinationByJ('shopping', j, data, force);
}

// --- import*ByName ---
function importRestaurantByName(name, data, force) {
	importDestinationByName(name, data, 'restaurants', force);
}
function importSnackByName(name, data, force) {
	importDestinationByName(name, data, 'snacks', force);
}
function importNightlifeByName(name, data, force) {
	importDestinationByName(name, data, 'nightlife', force);
}
function importTourismByName(name, data, force) {
	importDestinationByName(name, data, 'tourism', force);
}
function importShopByName(name, data, force) {
	importDestinationByName(name, data, 'shopping', force);
}

// ─── Expose on dev.page for console use ──────────────────────────────────────
if (typeof dev !== 'undefined') {
	dev.page.importNewDestination = importNewDestination;
	dev.page.importDestinationByJ = importDestinationByJ;
	dev.page.importDestinationByName = importDestinationByName;

	dev.page.importNewRestaurant = importNewRestaurant;
	dev.page.importNewSnack = importNewSnack;
	dev.page.importNewNightlife = importNewNightlife;
	dev.page.importNewTourism = importNewTourism;
	dev.page.importNewShop = importNewShop;

	dev.page.importRestaurantByJ = importRestaurantByJ;
	dev.page.importSnackByJ = importSnackByJ;
	dev.page.importNightlifeByJ = importNightlifeByJ;
	dev.page.importTourismByJ = importTourismByJ;
	dev.page.importShopByJ = importShopByJ;

	dev.page.importRestaurantByName = importRestaurantByName;
	dev.page.importSnackByName = importSnackByName;
	dev.page.importNightlifeByName = importNightlifeByName;
	dev.page.importTourismByName = importTourismByName;
	dev.page.importShopByName = importShopByName;
}
