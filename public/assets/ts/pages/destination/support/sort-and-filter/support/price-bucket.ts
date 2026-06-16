// ======= Price Bucket =======
// Price bucket functions moved to models/destination.model.js — imported here for backward compat

import { getDataSet, ACTIVE_CATEGORY } from "../../../destination.js";
import { FILTER_SORT_DATA } from "../sort-and-filter.js";
import {
	getPriceBucket,
	buildPriceBuckets,
	findPriceBucket,
	parsePriceNumber,
	normalizePriceBucket,
	getPriceLabel,
	isPriceInBucketRange,
} from '../../../../../models/destination.model.js';



export function getPrices() {
	const buckets = getPriceBuckets();
	return new Set(
		buckets
			.map((p) => p.bucket)
			.filter((b) => b !== "$$$$"), // This has the same behavior af everything
	);
}

export function getPriceBuckets() {
	if (FILTER_SORT_DATA?.[ACTIVE_CATEGORY]?.prices) {
		return FILTER_SORT_DATA[ACTIVE_CATEGORY].prices;
	}

	const prices = getDataSet("price");
	return buildPriceBuckets(prices);
}
