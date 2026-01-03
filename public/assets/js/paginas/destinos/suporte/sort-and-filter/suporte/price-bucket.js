function _getPrices() {
    const buckets = _getPriceBuckets();
    return new Set(
        buckets
            .map(p => p.bucket)
            .filter(b => b !== "$$$$") // This has the same behavior af everything
    );
}

function _getPriceBuckets() {
    if (FILTER_SORT_DATA?.[ACTIVE_CATEGORY]?.prices) {
        return FILTER_SORT_DATA[ACTIVE_CATEGORY].prices;
    }

    const prices = _getDataSet('valor');
    return _buildPriceBuckets(prices);
}

function _getPriceBucket(value) {
    const range = CONFIG.moedas.escala_numerica[FIRESTORE_DESTINOS_DATA.moeda];
    if (isNaN(value)) return "default";
    if (value === 0) return "-";
    if (value >= range['$'][0] && value <= range['$'][1]) return "$";
    if (value >= range['$$'][0] && value <= range['$$'][0]) return "$$";
    if (value >= range['$$$'][0] && value <= range['$$$'][0]) return "$$$";
    if (value >= range['$$$$'][0]) return "$$$$";
    return "default";
}

function _buildPriceBuckets(prices) {
    const symbolicBuckets = new Set(["-", "$", "$$", "$$$", "$$$$", "default"]);
    const pricesArray = Array.from(prices);
    return pricesArray
        .map(raw => {
            if (symbolicBuckets.has(raw)) {
                return {
                    raw,
                    value: 0,
                    bucket: raw
                };
            }

            const value = _parsePriceNumber(raw);

            return {
                raw,
                value,
                bucket: _getPriceBucket(value)
            };
        })
        .sort(
            (a, b) =>
                FILTER_SORT_KEYS_ORDER.prices.indexOf(a.bucket) -
                FILTER_SORT_KEYS_ORDER.prices.indexOf(b.bucket)
        );
}

function _findPriceBucket(raw) {
    const buckets = _getPriceBuckets();

    const found = buckets.find(b => b.raw === raw);
    if (found) return found;

    const value = _parsePriceNumber(raw);

    return {
        raw,
        value,
        bucket: _getPriceBucket(value)
    };
}

function _parsePriceNumber(str) {
    if (!str) return NaN;
    if (String(str).trim() === "-") return 0;

    const cleaned = str
        .replace(/[^\d,.\-]/g, "")
        .replace(/\s+/g, "")
        .replace(",", ".");

    return Number(cleaned);
}

function _normalizePriceBucket(value) {
    const bucketValues = new Set([
        "-", "$", "$$", "$$$", "$$$$", "default"
    ]);

    if (bucketValues.has(value)) {
        return value;
    }

    const bucket = _findPriceBucket(value);
    return bucket.bucket;
}

function _getPriceLabel(price) {
    switch (price) {
        case "default":
            return translate('destination.price.default');
        case "-":
            return translate('destination.price.free');
        default:
            const moedas = CONFIG.moedas.escala[FIRESTORE_DESTINOS_DATA.moeda];
            const value = moedas[price];
            return `${translate('destination.filter.price.up_to')} ${value.split(' - ')[1]}`;
    }
}

function _isPriceInBucketRange(bucket, value) {
    const order = ["-", "$", "$$", "$$$"];

    const bucketNorm = _normalizePriceBucket(bucket);
    const valueNorm = _normalizePriceBucket(value);

    const bucketIndex = order.indexOf(bucketNorm);
    const valueIndex = order.indexOf(valueNorm);

    if (bucketIndex === -1 || valueIndex === -1) {
        return false;
    }

    return valueIndex <= bucketIndex;
}