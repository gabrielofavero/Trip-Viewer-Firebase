const FILTER_OPTIONS = {}

// Main Action
function _filter(render = false) {
    const preferences = _getFilterPreferences();
    const isPlannedEnabled = _shouldDisplayPlanned() && preferences.planned !== 'everything';
    const isPricesEnabled = _shouldDisplayPrices() && preferences.prices !== 'everything';
    const isScoresEnabled = _shouldDisplayScores() && preferences.scores !== 'everything';
    const isRegionsEnabled = _shouldDisplayRegions() && preferences.region !== 'everything' &&
        FILTER_SORT_DATA[ACTIVE_CATEGORY].region.has(preferences.region);

    for (const content of CONTENT) {
        const item = _getItem(content.id);
        if ((isPlannedEnabled && _shouldFilterByPlanned(content.id)) ||
            (isPricesEnabled && _shouldFilterByPrices(item)) ||
            (isScoresEnabled && _shouldFilterByScores(item)) ||
            (isRegionsEnabled && _shouldFilterByRegions(item))
        ) {
            content.filtered = true;
            continue;
        }
        content.filtered = false;
    }

    if (render) {
        _applyContent();
    }

    function _shouldFilterByPlanned(id) {
        const isPlanned = _isPlanned(id);
        return (isPlanned && preferences.planned === 'not_planned') || (!isPlanned && preferences.planned === 'planned');
    }

    function _shouldFilterByPrices(item) {
        const value = item.valor;

        if (value === '$$$$') {
            return true;
        }

        if (value != 'default' && preferences.prices != 'default') {
            return !_isPriceInBucketRange(preferences.prices, value);
        }

        return value != preferences.prices;
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
        return value !== preferences.region;
    }
}

// Options
function _loadFilterOptions(force = false) {
    if (FILTER_OPTIONS[ACTIVE_CATEGORY] && !force) {
        return;
    }

    _loadTitles();
    _loadFilterSortingData(FILTER_OPTIONS.titles);

    FILTER_OPTIONS[ACTIVE_CATEGORY] = {};
    const options = FILTER_OPTIONS[ACTIVE_CATEGORY];

    if (_shouldDisplayPlanned()) {
        options.planned = {
            planned: translate('destination.filter.planned.planned'),
            not_planned: translate('destination.filter.planned.not_planned')
        }
    }

    if (_shouldDisplayScores()) {
        options.scores = {
            "5": translate('destination.filter.scores.5'),
            "4": translate('destination.filter.scores.4'),
            "3": translate('destination.filter.scores.3'),
            "2": translate('destination.filter.scores.2')
        }
    }

    if (_shouldDisplayRegions()) {
        const regions = new Set(
            Array.from(FILTER_SORT_DATA[ACTIVE_CATEGORY].region)
                .map(r => r?.trim())
                .filter(Boolean)
                .sort((a, b) => a.localeCompare(b))
        );
        options.region = {
            none: translate('destination.filter.region.none'),
        }
        for (const region of regions) {
            options.region[region] = region;
        }
    }

    if (_shouldDisplayPrices()) {
        options.prices = {};
        const prices = Array.from(_getPrices());

        if (prices.length === 2 && prices[0] === '-' && ['$', '$$', '$$$'].includes(prices[1])) {
            prices.pop();
        }

        for (const price of prices) {
            options.prices[price] = _getPriceLabel(price);
        }
    }

    function _loadTitles() {
        if (!FILTER_OPTIONS.titles) {
            FILTER_OPTIONS.titles = {
                planned: translate('destination.filter.planned.title'),
                scores: translate('destination.filter.scores.title'),
                region: translate('destination.filter.region.title'),
                prices: translate('destination.filter.price.title')
            };
        }
    }
}

// Drawer
function _openFilterDrawer() {
    _openFilterSortDrawer({
        triggerId: 'filter',
        getInnerHTML: _getFilterDrawerInnerHTML,
        clickAction: _filterDrawerOptionClickAction,
        loadAction: _filterDrawerOptionLoadAction
    });
}

