/**
 * normalize.js — Google Places (New) raw payload → contract shape (§7).
 *
 * Mirrors `scripts/export-maps-data/export-maps-data.py` (the python export
 * script): resolve_emoji, resolve_price_level, split_website_instagram,
 * round_rating and the description priority are 1:1 ports. The worker returns
 * ONLY the requested language (a single Google payload), never merged langs.
 *
 * Output shape (§4.1): scalar fields always emitted with `""` defaults;
 * `businessStatus` / `photos` are omitted when not applicable.
 */

import EMOJI_MAP from './data/emoji-map.json';
import PRICE_LEVEL_MAP from './data/price-level-map.json';
import CURRENCIES from './data/currencies.json';

/** Price bands order (scaleNumeric keys). */
const PRICE_LEVELS = ['$', '$$', '$$$', '$$$$'];

/**
 * Normalize a raw Google Places (New) place into the §4.1 contract shape.
 * @param {Record<string, unknown>} raw - One Google place payload.
 * @param {{photos?: boolean}} [opts] - `photos: true` includes the `photos[]` refs.
 * @returns {Record<string, unknown>} The normalized place.
 */
export function normalizePlace(raw, { photos = false } = {}) {
	const result = {
		id: raw?.id ?? '',
		name: raw?.displayName?.text ?? '',
		description: resolveDescription(raw),
		region: raw?.postalAddress?.sublocality ?? '',
		...splitWebsiteInstagram(raw?.websiteUri ?? ''),
		rating: roundRating(raw?.rating),
		price: resolvePriceLevel(raw),
		emoji: resolveEmoji(raw?.types),
		map: raw?.googleMapsUri ?? '',
	};

	// Omit `businessStatus` when Google omits it (§7).
	if (raw?.businessStatus) result.businessStatus = raw.businessStatus;

	// `photos` refs only when the caller wants them (§6.4).
	if (photos && Array.isArray(raw?.photos)) {
		const refs = raw.photos
			.map((p) => p?.name)
			.filter((name) => typeof name === 'string' && name.length > 0)
			.map((name) => ({ name }));
		if (refs.length > 0) result.photos = refs;
	}

	return result;
}

/**
 * Description priority: editorialSummary.text → reviewSummary.text →
 * primaryTypeDisplayName.text (first non-empty).
 * @param {Record<string, unknown>|undefined} raw
 * @returns {string}
 */
function resolveDescription(raw) {
	const editorial = raw?.editorialSummary?.text;
	if (editorial) return String(editorial);
	const review = raw?.reviewSummary?.text;
	if (review) return String(review);
	const primary = raw?.primaryTypeDisplayName?.text;
	return primary ? String(primary) : '';
}

/**
 * Split `websiteUri` into `{ website, instagram }` — exactly one is set.
 * Instagram URLs go to `instagram`, everything else to `website`.
 * @param {string} uri
 * @returns {{website: string, instagram: string}}
 */
function splitWebsiteInstagram(uri) {
	if (!uri) return { website: '', instagram: '' };
	if (uri.toLowerCase().includes('instagram.com')) return { website: '', instagram: uri };
	return { website: uri, instagram: '' };
}

/**
 * Round a numeric rating to the nearest integer and return it as a string
 * (`""` when missing / non-numeric). Port of python `round_rating`.
 * @param {unknown} rating
 * @returns {string}
 */
function roundRating(rating) {
	if (rating === undefined || rating === null || rating === '') return '';
	const num = Number(rating);
	if (Number.isNaN(num)) return '';
	return String(Math.round(num));
}

/**
 * Resolve the `$`…`$$$$` price string (priority order, §7.1):
 *   1. priceRange average against the currency's `scaleNumeric` bands.
 *   2. priceLevel via the fixed map.
 *   3. Fallback `"-"`.
 * @param {Record<string, unknown>|undefined} raw
 * @returns {string}
 */
function resolvePriceLevel(raw) {
	// Priority 1: priceRange (only when start AND end price exist).
	const priceRange = raw?.priceRange;
	if (priceRange) {
		const startPrice = priceRange.startPrice;
		const endPrice = priceRange.endPrice;
		if (startPrice && endPrice) {
			const currency = startPrice.currencyCode ?? '';
			const startVal = startPrice.units;
			const endVal = endPrice.units;
			if (
				currency &&
				typeof startVal !== 'undefined' &&
				startVal !== null &&
				typeof endVal !== 'undefined' &&
				endVal !== null
			) {
				const avg = (Number(startVal) + Number(endVal)) / 2;
				const bands = CURRENCIES.scaleNumeric?.[currency];
				if (bands && Number.isFinite(avg)) {
					for (const levelKey of PRICE_LEVELS) {
						const range = bands[levelKey];
						if (Array.isArray(range) && range.length > 0) {
							const low = range[0];
							const high = range.length > 1 ? range[1] : Infinity;
							if (low <= avg && avg <= high) return levelKey;
						}
					}
				}
			}
		}
	}

	// Priority 2: priceLevel via the fixed map.
	const priceLevel = raw?.priceLevel;
	if (priceLevel && Object.prototype.hasOwnProperty.call(PRICE_LEVEL_MAP, priceLevel)) {
		return PRICE_LEVEL_MAP[priceLevel];
	}

	// Priority 3: fallback.
	return '-';
}

/**
 * Resolve an emoji from Google `types[]` using emoji-map.json. Port of the
 * python `resolve_emoji` — per type: exact match → wildcard substring
 * (`wc in t or t in wc`) → first-token prefix of exact keys → first-token
 * prefix of wildcard keys. Returns the first hit, else `""`.
 * @param {unknown} types - Google `types` array.
 * @returns {string}
 */
function resolveEmoji(types) {
	if (!Array.isArray(types) || types.length === 0) return '';

	const exactMap = EMOJI_MAP.exact ?? {};
	const wildcardMap = EMOJI_MAP.wildcard ?? {};

	// Exact match, then wildcard substring.
	for (const t of types) {
		if (Object.prototype.hasOwnProperty.call(exactMap, t)) return exactMap[t];
		for (const [wcKey, wcEmoji] of Object.entries(wildcardMap)) {
			if (wcKey.includes(t) || t.includes(wcKey)) return wcEmoji;
		}
	}

	// First-token prefix of exact keys (e.g. type "pizzaria" → key "pizza_restaurant").
	for (const t of types) {
		for (const [exKey, exEmoji] of Object.entries(exactMap)) {
			const exFirst = exKey.split('_')[0];
			if (exFirst && exFirst !== exKey && t.startsWith(exFirst)) return exEmoji;
		}
	}

	// First-token prefix of wildcard keys.
	for (const t of types) {
		for (const [wcKey, wcEmoji] of Object.entries(wildcardMap)) {
			const wcFirst = wcKey.split('_')[0];
			if (wcFirst && wcFirst !== wcKey && t.startsWith(wcFirst)) return wcEmoji;
		}
	}

	return '';
}
