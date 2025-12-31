let PRICE_ORDER = ["-", "$", "$$", "$$$", "$$$$", 'default'];
let PRICES_FILTERED;

function _getFilterInnerHTML() {
    PRICES_FILTERED = null;
    const f = DESTINO.translations.filter;
    return `
    ${_getPlannedHTML(f)}
    ${_getScoresHTML(f)}
    ${_getRegionsHTML(f)}
    ${_getPricesHTML(f)}
    `

    function _getPlannedHTML(f) {
        if (!_shouldDisplayPlanned()) {
            return '';
        }
        return `
        <div class="drawer-container">
            <div class="drawer-title">${f.planned.title}</div>
            <button class="option-btn" data-value="everything">${f.show_everything}</button>
            <button class="option-btn" data-value="planned">${f.planned.planned}</button>
            <button class="option-btn" data-value="not_planed">${f.planned.not_planed}</button>
        </div>
        `
    }

    function _getScoresHTML(f) {
        if (!_shouldDisplayScores()) {
            return '';
        }
        return `
        <div class="drawer-container">
            <div class="drawer-title">${f.scores.title}</div>
            <button class="option-btn" data-value="everything">${f.show_everything}</button>
            <button class="option-btn" data-value="5">${f.scores['5']}</button>
            <button class="option-btn" data-value="4">${f.scores['4']}</button>
            <button class="option-btn" data-value="3">${f.scores['3']}</button>
            <button class="option-btn" data-value="2">${f.scores['2']}</button>
        </div>`
    }

    function _getRegionsHTML(f) {
        if (!_shouldDisplayRegions()) {
            return '';
        }

        let optionsHTML = '';
        regions.forEach(region => {
            optionsHTML += `<button class="option-btn" data-value="${region}">${region}</button>`;
        });

        return `
        <div class="drawer-container">
            <div class="drawer-title">${f.region.title}</div>
            <button class="option-btn" data-value="everything">${f.show_everything}</button>
            <button class="option-btn" data-value="none">${f.region.none}</button>
            ${optionsHTML}
        </div>
        `
    }

    function _getPricesHTML(f) {
        if (!_shouldDisplayPrices()) {
            return '';
        }

        const translations = DESTINO[DESTINO.activeCategory].valores;
        const prices = _getPrices();

        if (prices.size <= 1) {
            return '';
        }

        let optionsHTML = '';
        prices.forEach(price => {
            const value = translations[price];
            const label = ["-", 'default'].includes(price) ? value : `${f.price.up_to} ${value.split(' - ')[1]}`;
            optionsHTML += `<button class="option-btn" data-value="${price}">${label}</button>`;
        });

        return `
        <div class="drawer-container">
            <div class="drawer-title">${f.price.title}</div>
            <button class="option-btn" data-value="everything">${f.show_everything}</button>
            ${optionsHTML}
        </div>
        `
    }
}

function _getSortInnerHTML() {
    PRICES_FILTERED = null;
    const s = DESTINO.translations.sort;
    return `
    ${_getNameHTML(s)}
    ${_getPlannedHTML(s)}
    ${_getScoresHTML(s)}
    ${_getPricesHTML(s)}
    `

    function _getNameHTML(s) {
        return `
        <div class="drawer-container">
            <div class="drawer-title">${s.name.title}</div>
            <button class="option-btn" data-value="ascending">${s.name.ascending}</button>
            <button class="option-btn" data-value="descending">${s.name.descending}</button>
        </div>`
    }

    function _getPlannedHTML(s) {
        if (!_shouldDisplayPlanned()) {
            return '';
        }
        return `
        <div class="drawer-container">
            <div class="drawer-title">${s.planned.title}</div>
            <button class="option-btn" data-value="planned_first">${s.planned.planned_first}</button>
            <button class="option-btn" data-value="not_planned_first">${s.planned.not_planned_first}</button>
        </div>`
    }

    function _getScoresHTML(s) {
        if (!_shouldDisplayScores()) {
            return '';
        }
        return `
        <div class="drawer-container">
            <div class="drawer-title">${s.score.title}</div>
            <button class="option-btn" data-value="highest_first">${s.score.highest_first}</button>
            <button class="option-btn" data-value="lowest_first">${s.score.lowest_first}</button>
        </div>`
    }

    function _getPricesHTML(s) {
        if (!_shouldDisplayPrices()) {
            return '';
        }
        return `
        <div class="drawer-container">
            <div class="drawer-title">${s.price.title}</div>
            <button class="option-btn" data-value="lowest_first">${s.price.lowest_first}</button>
            <button class="option-btn" data-value="highest_first">${s.price.highest_first}</button>
        </div>`
    }
}

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
    if (!PRICES_FILTERED) {
        const prices = new Set(DESTINO[DESTINO.activeCategory].data.map(item => item.valor));
        const priceBuckets = _getPriceBuckets(Array.from(prices));
        PRICES_FILTERED = new Set(priceBuckets.map(p => p.bucket));
    }
    return PRICES_FILTERED;

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
                PRICE_ORDER.indexOf(a.bucket) - PRICE_ORDER.indexOf(b.bucket)
            );
    }
}