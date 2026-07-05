// ======= Destination Model =======
// Pure data transformation functions for destination data
// Extracted from: destination/categories.js, destination/support/sort-and-filter/

import { getCurrencies } from '../app/config.js';
import { getUserLanguage, translate } from '../i18n/translation.js';
import { FIRESTORE_DESTINATIONS_DATA } from "../data/state.js";
import { FILTER_SORT_KEYS_ORDER } from "../pages/destination/support/sort-and-filter/sort-and-filter.js";
import { getPriceBuckets } from "../pages/destination/support/sort-and-filter/support/price-bucket.js";
import type { PlaceItem } from './new-schema.js';

// ======= Destination Value Formatting =======

export function getRatingTranslation(rating: string): string {
	switch (rating) {
		case "5":
		case "4":
		case "3":
		case "2":
		case "1":
			return translate(`destination.scores.${rating}`);
		default:
			return translate(`destination.scores.default`);
	}
}

export function getPriceValue(item: PlaceItem, values: Record<string, string>, currency: string): string {
	const price = item.price; // was "valor"
	switch (price) {
		case "default":
			return translate("destination.price.default");
		case "-":
			return translate("destination.price.free");
		case "$":
		case "$$":
		case "$$$":
		case "$$$$":
			return values[price];
		default:
			if (price) {
				return convertCustomPrice(price, currency);
			}
			return translate("destination.price.default");
	}
}

export function convertCustomPrice(value: string, currency: string): string {
	if (isNaN(Number(value)) || (!isNaN(Number(value)) && !currency)) {
		return value;
	} else return `${currency}${value}`;
}

export function getDescriptionValue(item: PlaceItem): string {
	const lang = getUserLanguage();
	return item.description?.[lang] || ""; // was "descricao"
}

// ======= Price Bucket Logic =======

export function getPriceBucket(value: number): string {
	const currencies = getCurrencies();
	const range = currencies.numericScale[FIRESTORE_DESTINATIONS_DATA.currency]; // was "moeda"
	if (isNaN(value)) return "default";
	if (value === 0) return "-";
	if (value >= range["$"][0] && value <= range["$"][1]) return "$";
	if (value >= range["$$"][0] && value <= range["$$"][0]) return "$$";
	if (value >= range["$$$"][0] && value <= range["$$$"][0]) return "$$$";
	if (value >= range["$$$$"][0]) return "$$$$";
	return "default";
}

export function parsePriceNumber(str) {
	if (!str) return NaN;
	if (String(str).trim() === "-") return 0;

	const cleaned = str
		.replace(/[^\d,.\-]/g, "")
		.replace(/\s+/g, "")
		.replace(",", ".");

	return Number(cleaned);
}

export function normalizePriceBucket(value) {
	const bucketValues = new Set(["-", "$", "$$", "$$$", "$$$$", "default"]);

	if (bucketValues.has(value)) {
		return value;
	}

	const bucket = findPriceBucket(value);
	return bucket.bucket;
}

export function buildPriceBuckets(prices) {
	const symbolicBuckets = new Set(["-", "$", "$$", "$$$", "$$$$", "default"]);
	const pricesArray = Array.from(prices);
	return pricesArray
		.map((raw: string) => {
			if (symbolicBuckets.has(raw)) {
				return {
					raw,
					value: 0,
					bucket: raw,
				};
			}

			const value = parsePriceNumber(raw);

			return {
				raw,
				value,
				bucket: getPriceBucket(value),
			};
		})
		.sort(
			(a, b) =>
				FILTER_SORT_KEYS_ORDER.prices.indexOf(a.bucket) -
				FILTER_SORT_KEYS_ORDER.prices.indexOf(b.bucket),
		);
}

export function findPriceBucket(raw) {
	const buckets = getPriceBuckets();

	const found = buckets.find((b) => b.raw === raw);
	if (found) return found;

	const value = parsePriceNumber(raw);

	return {
		raw,
		value,
		bucket: getPriceBucket(value),
	};
}

export function getPriceLabel(price) {
	switch (price) {
		case "default":
			return translate("destination.price.default");
		case "-":
			return translate("destination.price.free");
		default:
			return price;
	}
}

export function isPriceInBucketRange(filter, raw) {
	const rawBucket = normalizePriceBucket(raw);
	if (rawBucket === "default") return true;

	const rawRank = FILTER_SORT_KEYS_ORDER.prices.indexOf(rawBucket);
	const filterRank = FILTER_SORT_KEYS_ORDER.prices.indexOf(filter);

	if (rawRank === -1) return true;
	return rawRank === filterRank;
}
