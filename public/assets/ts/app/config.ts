// ======= Config Module =======
// Lazy-loads and caches JSON configuration files.
// Replaces the global CONFIG variable with proper ES module imports.
//
// Usage:
//   import { loadAllConfigs, getColors, getLanguage, setLanguage } from '../app/config.js';
//
//   // At startup (in main.js):
//   await loadAllConfigs();
//
//   // Anywhere else (synchronous, config must be loaded first):
//   import { getColors } from '../../app/config.js';
//   const colors = getColors();

const _cache = {};

// ======= Async Loaders (used at startup) =======

async function loadJSON(path) {
	if (_cache[path]) return _cache[path];
	const response = await fetch(path);
	if (!response.ok) throw new Error(`Failed to load ${path}: ${response.status}`);
	const data = await response.json();
	_cache[path] = data;
	return data;
}

export async function loadColors() {
	return loadJSON('/assets/json/colors.json');
}

export async function loadDestinations() {
	return loadJSON('/assets/json/destinations-config.json');
}

export async function loadItinerary() {
	return loadJSON('/assets/json/itinerary.json');
}

export async function loadCurrencies() {
	return loadJSON('/assets/json/currencies.json');
}

export async function loadTransportations() {
	return loadJSON('/assets/json/transportation.json');
}

export async function loadIcons() {
	return loadJSON('/assets/json/icons.json');
}

export async function loadVersions() {
	return loadJSON('/assets/json/version.json');
}

export async function loadLanguage(packName: string) {
	const path = `/assets/json/languages/${packName}.json`;
	// Always fetch language fresh (no cache) since it can change
	const response = await fetch(path);
	if (!response.ok) throw new Error(`Failed to load ${path}: ${response.status}`);
	const data = await response.json();
	_cache[path] = data;
	return data;
}

/**
 * Load all configs in parallel. Must be called before any sync getter.
 * @param {string} languagePackName - e.g. "en" or "pt"
 */
export async function loadAllConfigs(languagePackName: string) {
	const [colors, destinations, itinerary, currencies, transportations, icons, versions, language] =
		await Promise.all([
			loadColors(),
			loadDestinations(),
			loadItinerary(),
			loadCurrencies(),
			loadTransportations(),
			loadIcons(),
			loadVersions(),
			loadLanguage(languagePackName),
		]);
	return {
		colors,
		destinations,
		itinerary,
		currencies,
		transportations,
		icons,
		versions,
		language,
	};
}

// ======= Synchronous Getters (for use after configs are loaded) =======

export function getColors() {
	return _cache['/assets/json/colors.json'];
}

export function getDestinations() {
	return _cache['/assets/json/destinations-config.json'];
}

export function getItinerary() {
	return _cache['/assets/json/itinerary.json'];
}

export function getCurrencies() {
	return _cache['/assets/json/currencies.json'];
}

export function getTransportations() {
	return _cache['/assets/json/transportation.json'];
}

export function getIcons() {
	return _cache['/assets/json/icons.json'];
}

export function getVersions() {
	return _cache['/assets/json/version.json'];
}

export function getLanguage() {
	// Language cache key varies by pack name, so find the cached language
	for (const [key, value] of Object.entries(_cache)) {
		if (key.startsWith('/assets/json/languages/')) {
			return value;
		}
	}
	return null;
}

/**
 * Reload language pack (e.g., when user switches language).
 * Invalidates the old language cache entry.
 */
export async function setLanguage(packName: string) {
	// Clear old language cache entries
	for (const key of Object.keys(_cache)) {
		if (key.startsWith('/assets/json/languages/')) {
			delete _cache[key];
		}
	}
	return loadLanguage(packName);
}
