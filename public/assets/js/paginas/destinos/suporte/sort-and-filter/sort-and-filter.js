const FILTER_SORT_KEYS_ORDER = {
    planned: ['planned', 'not_planned'],
    prices: ["-", "$", "$$", "$$$", "$$$$", 'default'],
    scores: ["5", "4", "3", "2", "1", "default"]
}

const FILTER_SORT_DATA = {};

// Loading Action
function _loadSortAndFilter(force = false) {
    _loadFilterOptions(force);
    _loadSortOptions(force);
    _loadSortAndFilterVisibility();
    _sort();
    _filter();
}

function _loadSortAndFilterVisibility() {
    const anyOptions = (_shouldDisplayPlanned() || _shouldDisplayScores() || _shouldDisplayRegions() || _shouldDisplayPrices());
    const display = anyOptions ? '' : 'none';
    getID('filter').style.display = display;
}

function _loadFilterSortingData(titles) {
    if (!FILTER_SORT_DATA[ACTIVE_CATEGORY]) {
        FILTER_SORT_DATA[ACTIVE_CATEGORY] = {};
    }
    for (const title in titles) {
        let data;
        switch (title) {
            case 'region':
                data = new Set(_getDataValues().map(item => item.regiao));
                data.delete('');
                break;
            case 'planned':
                data = new Set(_getDataValues().map(item => _isPlanned(item.id) || false));
                break;
            case 'scores':
                data = new Set(_getDataValues().map(item => item.nota));
                break;
            case 'prices':
                data = _getPriceBuckets();
        }
        FILTER_SORT_DATA[ACTIVE_CATEGORY][title] = data || new Set();
    }
}

// Helpers
function _shouldDisplayRegions() {
    const regioes = new Set(_getDataValues().map(item => item.regiao));
    regioes.delete('');
    return regioes.size > 1;
}

function _shouldDisplayPlanned() {
    const planejado = new Set(_getDataValues().map(item => _isPlanned(item.id) || false));
    return planejado.size > 1;
}

function _shouldDisplayScores() {
    const notas = new Set(_getDataValues().map(item => item.nota));
    return notas.size > 1;
}

function _shouldDisplayPrices() {
    const precos = _getPrices();
    return precos.size > 1;
}