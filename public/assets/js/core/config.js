// ======= Config Module =======
// Lazy-loads and caches JSON configuration files.
// Replaces the global CONFIG variable with proper ES module imports.
//
// Usage:
//   import { loadAllConfigs, getCores, getLanguage, setLanguage } from '../core/config.js';
//
//   // At startup (in main.js):
//   await loadAllConfigs();
//
//   // Anywhere else (synchronous, config must be loaded first):
//   import { getCores } from '../../core/config.js';
//   const cores = getCores();

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

export async function loadCores() {
	return loadJSON('/assets/json/cores.json');
}

export async function loadDestinos() {
	return loadJSON('/assets/json/destinos.json');
}

export async function loadItinerary() {
	return loadJSON('/assets/json/itinerary.json');
}

export async function loadCurrencies() {
	return loadJSON('/assets/json/moedas.json');
}

export async function loadTransportations() {
	return loadJSON('/assets/json/transportes.json');
}

export async function loadIcons() {
	return loadJSON('/assets/json/icons.json');
}

export async function loadVersoes() {
	return loadJSON('/assets/json/version.json');
}

export async function loadLanguage(packName) {
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
export async function loadAllConfigs(languagePackName) {
	const [cores, destinos, itinerary, moedas, transportes, icons, versoes, language] =
		await Promise.all([
			loadCores(),
			loadDestinos(),
			loadItinerary(),
			loadCurrencies(),
			loadTransportations(),
			loadIcons(),
			loadVersoes(),
			loadLanguage(languagePackName),
		]);
	return { cores, destinos, itinerary, moedas, transportes, icons, versoes, language };
}

// ======= Synchronous Getters (for use after configs are loaded) =======

export function getCores() {
	return _cache['/assets/json/cores.json'];
}

export function getDestinos() {
	return _cache['/assets/json/destinos.json'];
}

export function getItinerary() {
	return _cache['/assets/json/itinerary.json'];
}

export function getCurrencies() {
	return _cache['/assets/json/moedas.json'];
}

export function getTransportations() {
	return _cache['/assets/json/transportes.json'];
}

export function getIcons() {
	return _cache['/assets/json/icons.json'];
}

export function getVersoes() {
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
export async function setLanguage(packName) {
	// Clear old language cache entries
	for (const key of Object.keys(_cache)) {
		if (key.startsWith('/assets/json/languages/')) {
			delete _cache[key];
		}
	}
	return loadLanguage(packName);
}
