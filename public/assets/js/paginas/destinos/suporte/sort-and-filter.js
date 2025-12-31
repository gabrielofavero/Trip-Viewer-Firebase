let PRICE_ORDER = ["-", "$", "$$", "$$$", "$$$$", 'default'];

// User Actions
function _openFilterDrawer() {
    const title = getID('filter').innerText;
    const innerHTML = _getFilterInnerHTML();
    _openDrawer(title, innerHTML);
}

function _openSortDrawer() {
    const title = getID('order').innerText;
    const innerHTML = `<button class="option-btn">Newest First</button>`
    _openDrawer(title, innerHTML);
}

// Drawer
function _openDrawer(titleText, innerHTML) {
    const overlay = getID("overlay");
    const drawer = getID("drawer");
    const title = getID("drawerTitle");
    const content = getID("drawerContent");

    title.textContent = titleText;
    content.innerHTML = innerHTML;

    overlay.style.display = "block";
    drawer.getBoundingClientRect();
    drawer.classList.add("open");
}

function _closeDrawer() {
    const overlay = getID("overlay");
    const drawer = getID("drawer");
    drawer.classList.remove("open");
    setTimeout(() => {
        overlay.style.display = "none";
    }, 280);
}




function _filterDestinations() {

}

function _sortDestinations() {

}

// Content Handling
function _getFilteredAndSortedDestinations(content) {
    return content;
}

function _getFilteredContent(content) {

}

function _getSortedContent() {

}


// Preferences
function _setFilteredPreferences(preferences) {
    sessionStorage.setItem("destinos-filtered-preferences", preferences);
}

function _setSortedPreferences(preferences) {
    sessionStorage.setItem("destinos-sorted-preferences", preferences);
}

function _getFilteredPreferences() {
    sessionStorage.getItem("destinos-filtered-preferences");
}

function _getSortedPreferences() {
    sessionStorage.getItem("destinos-sorted-preferences");
}

// InnerHTMLs
function _getFilterInnerHTML() {
    const f = DESTINO.translations.filter;
    return `
    <div class="drawer-container" data-type="exclusive">
        <div class="drawer-title">${f.planned.title}</div>
        <button class="option-btn" data-value="everything">${f.show_everything}</button>
        <button class="option-btn" data-value="planned">${f.planned.planned}</button>
        <button class="option-btn" data-value="not_planed">${f.planned.not_planed}</button>
    </div>
    <div class="drawer-container" data-type="exclusive">
        <div class="drawer-title">${f.scores.title}</div>
        <button class="option-btn" data-value="everything">${f.show_everything}</button>
        <button class="option-btn" data-value="5">${f.scores['5']}</button>
        <button class="option-btn" data-value="4">${f.scores['4']}</button>
        <button class="option-btn" data-value="3">${f.scores['3']}</button>
        <button class="option-btn" data-value="2">${f.scores['2']}</button>
    </div>
    ${_getRegionsHTML(f)}
    ${_getPricesHTML(f)}
    `

    function _getRegionsHTML(f) {
        const regions = new Set(DESTINO[DESTINO.activeCategory].data.map(item => item.regiao));
        if (regions.has('')) {
            regions.delete('');
        }
        if (regions.size <= 1) {
            return '';
        }

        let optionsHTML = '';
        regions.forEach(region => {
            optionsHTML += `<button class="option-btn" data-value="${region}">${region}</button>`;
        });

        return `
        <div class="drawer-container" data-type="exclusive">
            <div class="drawer-title">${f.region.title}</div>
            <button class="option-btn" data-value="everything">${f.show_everything}</button>
            <button class="option-btn" data-value="none">${f.region.none}</button>
            ${optionsHTML}
        </div>
        `
    }

    function _getPricesHTML(f) {
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
        <div class="drawer-container" data-type="exclusive">
            <div class="drawer-title">${f.price.title}</div>
            <button class="option-btn" data-value="everything">${f.show_everything}</button>
            ${optionsHTML}
        </div>
        `
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

    function _getPrices() {
        const prices = new Set(DESTINO[DESTINO.activeCategory].data.map(item => item.valor));
        const priceBuckets = _getPriceBuckets(Array.from(prices));
        return new Set(priceBuckets.map(p => p.bucket));
    }
}
