const FILTER_OPTIONS = {}

function _filter(render = false) {
    const preferences = _getFilterPreferences();
    const isPlannedEnabled = _shouldDisplayPlanned() && preferences.planned !== 'everything';
    const isPricesEnabled = _shouldDisplayPrices() && preferences.prices !== 'everything';
    const isScoresEnabled = _shouldDisplayScores() && preferences.scores !== 'everything';
    const isRegionsEnabled = _shouldDisplayRegions() && preferences.regions !== 'everything' &&
        FILTER_SORT_DATA[DESTINO.activeCategory].region.has(preferences.regions);

    for (const item of CONTENT) {
        if ((isPlannedEnabled && _shouldFilterByPlanned(item)) ||
            (isPricesEnabled && _shouldFilterByPrices(item)) ||
            (isScoresEnabled && _shouldFilterByScores(item)) ||
            (isRegionsEnabled && _shouldFilterByRegions(item))
        ) {
            item.filtered = true;
            continue;
        }
        item.filtered = false;
    }

    function _shouldFilterByPlanned(item) {
        return (item.planejado && preferences.planned === 'not_planned') || (!item.planejado && preferences.planned === 'planned');
    }

    function _shouldFilterByPrices(item) {
        const value = item.valor;

        if (["default", "$$$$"].includes(value)) {
            return true;
        }

        return !_isPriceInBucketRange(preferences.prices, value);
    }

    function _shouldFilterByScores(item) {
        const value = item.nota;

        if (['default', '1'].includes(value)) {
            return true;
        }

        return Number(value) < Number(preferences.scores);   
    }

    function _shouldFilterByRegions(item) {
        const value = item.regiao;
        if (!value) {
            return true;
        }
        return value !== preferences.regions;
    }

    if (render) {
        _applyContent();
    }
}

function _loadFilterOptions(force = false) {
    if (FILTER_OPTIONS[DESTINO.activeCategory] && !force) {
        return;
    }

    const f = DESTINO.translations.filter;
    _loadTitles(f);
    _loadFilterSortingData(FILTER_OPTIONS.titles);

    FILTER_OPTIONS[DESTINO.activeCategory] = {};
    const options = FILTER_OPTIONS[DESTINO.activeCategory];

    if (_shouldDisplayPlanned()) {
        options.planned = {
            planned: f.planned.planned,
            not_planned: f.planned.not_planned
        }
    }

    if (_shouldDisplayScores()) {
        options.scores = {
            "5": f.scores['5'],
            "4": f.scores['4'],
            "3": f.scores['3'],
            "2": f.scores['2']
        }
    }

    if (_shouldDisplayRegions()) {
        const regions = new Set(
            Array.from(FILTER_SORT_DATA[DESTINO.activeCategory].regions)
                .map(r => r?.trim())
                .filter(Boolean)
                .sort((a, b) => a.localeCompare(b))
        );
        options.regions = {
            none: f.region.none,
        }
        for (const region of regions) {
            options.regions[region] = region;
        }
    }

    if (_shouldDisplayPrices()) {
        options.prices = {};
        for (const price of _getPrices()) {
            options.prices[price] = _getPriceLabel(price, f);
        }
    }

    function _loadTitles(f) {
        if (!FILTER_OPTIONS.titles) {
            FILTER_OPTIONS.titles = {
                planned: f.planned.title,
                scores: f.scores.title,
                region: f.region.title,
                prices: f.price.title
            };
        }
    }
}