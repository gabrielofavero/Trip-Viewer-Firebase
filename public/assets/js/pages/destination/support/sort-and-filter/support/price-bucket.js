// ======= Price Bucket =======
// Price bucket functions moved to models/destination.js — imported here for backward compat

import {
	getPriceBucket,
	buildPriceBuckets,
	findPriceBucket,
	parsePriceNumber,
	normalizePriceBucket,
	getPriceLabel,
	isPriceInBucketRange,
} from '../../../../../models/destination.js';



function getPrices() {
	const buckets = getPriceBuckets();
	return new Set(
		buckets
			.map((p) => p.bucket)
			.filter((b) => b !== "$$$$"), // This has the same behavior af everything
	);
}

function getPriceBuckets() {
	if (FILTER_SORT_DATA?.[ACTIVE_CATEGORY]?.prices) {
		return FILTER_SORT_DATA[ACTIVE_CATEGORY].prices;
	}

	const prices = getDataSet("valor");
	return buildPriceBuckets(prices);
}
