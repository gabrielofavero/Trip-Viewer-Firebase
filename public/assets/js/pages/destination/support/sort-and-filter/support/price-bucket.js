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

// BACKWARD COMPAT: attach to window during migration
window.getPriceBucket = getPriceBucket;
window.buildPriceBuckets = buildPriceBuckets;
window.findPriceBucket = findPriceBucket;
window.parsePriceNumber = parsePriceNumber;
window.normalizePriceBucket = normalizePriceBucket;
window.getPriceLabel = getPriceLabel;
window.isPriceInBucketRange = isPriceInBucketRange;

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
