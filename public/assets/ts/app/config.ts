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

import { isStaticMode } from '../static-mode/static-mode.js';

const _cache = {};

// ======= Async Loaders (used at startup) =======

async function loadJSON(path) {
	if (_cache[path]) return _cache[path];
	// A static export can be served from any subfolder (the bundle ships
	// assets/ alongside view.html), so root-absolute asset paths must resolve
	// relative to the page. Keep the canonical path as the cache key so the
	// sync getters (getColors, ...) keep working unchanged.
	const fetchPath = isStaticMode() && path.startsWith('/') ? path.slice(1) : path;
	const response = await fetch(fetchPath);
	if (!response.ok) throw new Error(`Failed to load ${fetchPath}: ${response.status}`);
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

// Static language-pack paths (not template literals) so the build-time asset
// hasher can rewrite them to their fingerprinted immutable URLs. Keep in sync
// with LANGUAGES in public/assets/ts/i18n/translation.ts.
const LANGUAGE_PACK_PATHS = {
	en: '/assets/json/languages/en.json',
	pt: '/assets/json/languages/pt.json',
};

export async function loadLanguage(packName: string) {
	// Fall back to English for unknown packs (mirrors getLanguagePackName()).
	return loadJSON(LANGUAGE_PACK_PATHS[packName] || LANGUAGE_PACK_PATHS.en);
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
