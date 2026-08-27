/**
 * normalize.js — Google Places (New) raw payload → contract shape (§7).
 *
 * Mirrors `scripts/export-maps-data/export-maps-data.py` (the python export
 * script): resolve_emoji, split_website_instagram, round_rating and the
 * description priority are 1:1 ports. The worker returns ONLY the requested
 * language (a single Google payload), never merged langs.
 *
 * `resolvePriceLevel` differs from the python's average→band mapping: when
 * Google returns a `priceRange` the worker emits the FINAL display label built
 * from the actual amounts (e.g. "$26 - $50"), since the app stores the price
 * label directly. `priceLevel` still maps to the `$`-band as a fallback.
 *
 * Output shape (§4.1): scalar fields always emitted with `""` defaults;
 * `businessStatus` / `photos` are omitted when not applicable.
 */

import EMOJI_MAP from './data/emoji-map.json';
import PRICE_LEVEL_MAP from './data/price-level-map.json';
import CURRENCIES from './data/currencies.json';

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

	// `location` when Google returns it (additive — used by the My Maps import
	// nearest-pick; not part of the original §4.1 contract shape).
	if (raw?.location) {
		const latitude = Number(raw.location.latitude);
		const longitude = Number(raw.location.longitude);
		if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
			result.location = { lat: latitude, lng: longitude };
		}
	}

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
 *
 * NOTE: `reviewSummary.text` is a LocalizedText OBJECT ({ text, languageCode }),
 * not a plain string — `String(reviewSummary.text)` would yield "[object
 * Object]". The inner `.text` is extracted instead (both shapes handled
 * defensively in case Google ever returns a bare string).
 * @param {Record<string, unknown>|undefined} raw
 * @returns {string}
 */
function resolveDescription(raw) {
	const editorial = raw?.editorialSummary?.text;
	if (editorial) return String(editorial);

	const review = raw?.reviewSummary?.text;
	if (review) {
		const reviewText = typeof review === 'string' ? review : review?.text;
		if (reviewText) return String(reviewText);
	}

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
 * Resolve the price string (priority order, §7.1):
 *   1. priceRange → the FINAL display label from Google's actual start/end
 *      amounts, e.g. "$26 - $50" (currencies.json `symbols`), or "$100+" when
 *      `endPrice` is unset (no upper bound). The app stores the label directly.
 *   2. priceLevel via the fixed map (fallback when no priceRange).
 *   3. Fallback `"-"`.
 * @param {Record<string, unknown>|undefined} raw
 * @returns {string}
 */
function resolvePriceLevel(raw) {
	// Priority 1: priceRange — format the actual range label.
	const priceRange = raw?.priceRange;
	const start = priceRange?.startPrice;
	const startVal =
		start && typeof start.units !== 'undefined' && start.units !== null ? Number(start.units) : NaN;
	if (Number.isFinite(startVal)) {
		const currency = start.currencyCode ?? '';
		const symbol = CURRENCIES.symbols?.[currency] ?? (currency ? `${currency} ` : '');

		const end = priceRange.endPrice;
		const endVal =
			end && typeof end.units !== 'undefined' && end.units !== null ? Number(end.units) : NaN;

		// Open-ended range (e.g. "More than $100") → "$100+".
		if (!Number.isFinite(endVal)) return `${formatMoney(symbol, startVal)}+`;
		return `${formatMoney(symbol, startVal)} - ${formatMoney(symbol, endVal)}`;
	}

	// Priority 2: priceLevel via the fixed map.
	const priceLevel = raw?.priceLevel;
	if (priceLevel && Object.prototype.hasOwnProperty.call(PRICE_LEVEL_MAP, priceLevel)) {
		return PRICE_LEVEL_MAP[priceLevel];
	}

	// Priority 3: fallback.
	return '-';
}

/** Format a whole-unit amount with the currency symbol + thousands separators. */
function formatMoney(symbol, value) {
	const rounded = Math.round(value);
	const formatted = rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
	return `${symbol}${formatted}`;
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
