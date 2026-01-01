const FILTER_SORT_KEYS_ORDER = {
    planned: ['planned', 'not_planned'],
    prices: ["-", "$", "$$", "$$$", "$$$$", 'default'],
    scores: ["5", "4", "3", "2", "1", "default"]
}

const FILTER_OPTIONS = {}
const SORT_OPTIONS = {};

const FILTER_SORT_DATA = {};

// Main Actions
function _filter() {
    const preferences = _getFilterPreferences();
}

function _sort() {
    const preferences = _getSortPreferences();

}


// Loading Action
function _loadSortAndFilter(force = false) {
    _loadFilterOptions(force);
    _loadSortingOptions(force);
    _loadSortAndFilterVisibility();
}

function _loadSortAndFilterLabels() {
    getID('filter').querySelector('span').innerText = DESTINO.translations.filter.title;
    getID('order').querySelector('span').innerText = DESTINO.translations.sort.title;
}

function _loadSortAndFilterVisibility() {
    const anyOptions = (_shouldDisplayPlanned() || _shouldDisplayScores() || _shouldDisplayRegions() || _shouldDisplayPrices());
    const display = anyOptions ? '' : 'none';
    getID('filter').style.display = display;
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
        for (const price of FILTER_SORT_DATA[DESTINO.activeCategory].prices) {
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

    function _getPriceLabel(price, f) {
        const translations = DESTINO[DESTINO.activeCategory].valores;
        const value = translations[price];
        return ["-", 'default'].includes(price) ? value : `${f.price.up_to} ${value.split(' - ')[1]}`;
    }
}

function _loadSortingOptions(force = false) {
    if (SORT_OPTIONS[DESTINO.activeCategory] && !force) {
        return;
    }

    const s = DESTINO.translations.sort;
    _loadTitles(s);
    _loadFilterSortingData(SORT_OPTIONS.titles);

    SORT_OPTIONS[DESTINO.activeCategory] = {};
    const options = SORT_OPTIONS[DESTINO.activeCategory];

    options.name = {
        ascending: s.name.ascending,
        descending: s.name.descending
    }

    if (_shouldDisplayPlanned()) {
        options.planned = {
            planned_first: s.planned.planned_first,
            not_planned_first: s.planned.not_planned_first
        }
    }

    if (_shouldDisplayScores()) {
        options.scores = {
            highest_first: s.scores.highest_first,
            lowest_first: s.scores.lowest_first
        }
    }

    if (_shouldDisplayPrices()) {
        options.prices = {
            lowest_first: s.price.lowest_first,
            highest_first: s.price.highest_first
        }
    }

    function _loadTitles(s) {
        if (!SORT_OPTIONS.titles) {
            SORT_OPTIONS.titles = {
                name: s.name.title,
                planned: s.planned.title,
                scores: s.scores.title,
                prices: s.price.title
            };
        }
    }

}

function _loadFilterSortingData(titles) {
    if (!FILTER_SORT_DATA[DESTINO.activeCategory]) {
        FILTER_SORT_DATA[DESTINO.activeCategory] = {};
    }
    for (const title in titles) {
        let data;
        switch (title) {
            case 'regions':
                data = new Set(DESTINO[DESTINO.activeCategory].data.map(item => item.regiao));
                data.delete('');
                break;
            case 'planned':
                data = new Set(DESTINO[DESTINO.activeCategory].data.map(item => item.planejado || false));
                break;
            case 'scores':
                data = new Set(DESTINO[DESTINO.activeCategory].data.map(item => item.nota));
                break;
            case 'prices':
                data = _getPrices();
        }
        FILTER_SORT_DATA[DESTINO.activeCategory][title] = data || new Set();
    }
}


// Helpers
function _shouldDisplayRegions() {
    const regioes = new Set(DESTINO[DESTINO.activeCategory].data.map(item => item.regiao));
    regioes.delete('');
    return regioes.size > 1;
}

function _shouldDisplayPlanned() {
    const planejado = new Set(DESTINO[DESTINO.activeCategory].data.map(item => item.planejado || false));
    return planejado.size > 1;
}

function _shouldDisplayScores() {
    const notas = new Set(DESTINO[DESTINO.activeCategory].data.map(item => item.nota));
    return notas.size > 1;
}

function _shouldDisplayPrices() {
    const precos = _getPrices();
    return precos.size > 1;
}

function _getPrices() {
    if (FILTER_SORT_DATA?.[DESTINO.activeCategory]?.prices) {
        return FILTER_SORT_DATA[DESTINO.activeCategory].prices;
    }

    const prices = new Set(DESTINO[DESTINO.activeCategory].data.map(item => item.valor));
    const priceBuckets = _getPriceBuckets(Array.from(prices));
    return new Set(priceBuckets.map(p => p.bucket));

    function _parsePriceNumber(str) {
        if (!str) return NaN;

        if (String(str).trim() === "-") return 0;

        const cleaned = str
            .replace(/[^\d,.\-]/g, "")
            .replace(/\s+/g, "")
            .replace(",", ".");

        return Number(cleaned);
    }

    function _getPriceBucket(value) {
        if (isNaN(value)) return "default";
        if (value === 0) return "-";
        if (value >= 1 && value <= 25) return "$";
        if (value >= 26 && value <= 50) return "$$";
        if (value >= 51 && value <= 99) return "$$$";
        if (value >= 100) return "$$$$";
        return "default";
    }

    function _getPriceBuckets(prices) {
        return prices.map(p => ({
            raw: p,
            value: _parsePriceNumber(p),
        }))
            .map(p => ({
                ...p,
                bucket: _getPriceBucket(p.value)
            }))
            .sort((a, b) =>
                FILTER_SORT_KEYS_ORDER.prices.indexOf(a.bucket) - FILTER_SORT_KEYS_ORDER.prices.indexOf(b.bucket)
            );
    }
}

function _getSortedArray(arr, key) {
    if (!FILTER_SORT_KEYS_ORDER[key]) {
        return arr;
    }

    const sorted = [...arr];
    sorted.sort((a, b) => {
        const order = FILTER_SORT_KEYS_ORDER[key];
        return order.indexOf(a) - order.indexOf(b);
    });
    return sorted;
}