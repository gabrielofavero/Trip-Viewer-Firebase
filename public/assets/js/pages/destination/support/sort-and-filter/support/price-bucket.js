// ======= Price Bucket =======
// Price bucket functions moved to models/destination.js — imported here for backward compat

import {
	_getPriceBucket,
	_buildPriceBuckets,
	_findPriceBucket,
	_parsePriceNumber,
	_normalizePriceBucket,
	_getPriceLabel,
	_isPriceInBucketRange,
} from '../../../../../models/destination.js';

// BACKWARD COMPAT: attach to window during migration
window._getPriceBucket = _getPriceBucket;
window._buildPriceBuckets = _buildPriceBuckets;
window._findPriceBucket = _findPriceBucket;
window._parsePriceNumber = _parsePriceNumber;
window._normalizePriceBucket = _normalizePriceBucket;
window._getPriceLabel = _getPriceLabel;
window._isPriceInBucketRange = _isPriceInBucketRange;

function _getPrices() {
	const buckets = _getPriceBuckets();
	return new Set(
		buckets
			.map((p) => p.bucket)
			.filter((b) => b !== "$$$$"), // This has the same behavior af everything
	);
}

function _getPriceBuckets() {
	if (FILTER_SORT_DATA?.[ACTIVE_CATEGORY]?.prices) {
		return FILTER_SORT_DATA[ACTIVE_CATEGORY].prices;
	}

	const prices = _getDataSet("valor");
	return _buildPriceBuckets(prices);
}
