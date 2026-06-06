// ======= Destination Model =======
// Pure data transformation functions for destination data
// Extracted from: destination/categories.js, destination/support/sort-and-filter/

import { getCurrencies } from '../app/config.js';
import { getUserLanguage, translate } from '../i18n/translation.js';
import { FIRESTORE_DESTINOS_DATA } from "../pages/destination/destination";
import { FILTER_SORT_KEYS_ORDER } from "../pages/destination/support/sort-and-filter/sort-and-filter";

// ======= Destination Value Formatting =======

export function getNotaTranslation(nota) {
	switch (nota) {
		case "5":
		case "4":
		case "3":
		case "2":
		case "1":
			return translate(`destination.scores.${nota}`);
		default:
			return translate(`destination.scores.default`);
	}
}

export function getValorValue(item, valores, moeda) {
	switch (item.valor) {
		case "default":
			return translate("destination.price.default");
		case "-":
			return translate("destination.price.free");
		case "$":
		case "$$":
		case "$$$":
		case "$$$$":
			return valores[item.valor];
		default:
			if (item.valor) {
				return convertCustomValor(item.valor, moeda);
			}
			return translate("destination.price.default");
	}
}

export function convertCustomValor(valor, moeda) {
	if (isNaN(valor) || (!isNaN(valor) && !moeda)) {
		return valor;
	} else return `${moeda}${valor}`;
}

export function getDescricaoValue(item) {
	const lang = getUserLanguage();
	return item.descricao?.[lang] || "";
}

// ======= Price Bucket Logic =======

export function getPriceBucket(value) {
	const moedas = getCurrencies();
	const range = moedas.escala_numerica[FIRESTORE_DESTINOS_DATA.moeda];
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
		.map((raw) => {
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
	return rawRank > filterRank;
}
