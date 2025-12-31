// Loading Action

function _loadSortAndFilterButtons() {
    getID('filter').querySelector('span').innerText = DESTINO.translations.filter.title;
    getID('order').querySelector('span').innerText = DESTINO.translations.sort.title;
}

function _loadFilterButtonVisibility() {
    const anyOptions = (_shouldDisplayPlanned() || _shouldDisplayScores() || _shouldDisplayRegions() || _shouldDisplayPrices());
    const display = anyOptions ? '' : 'none';
    getID('filter').style.display = display;
}

// User Actions
function _openFilterDrawer() {
    const title = getID('filter').innerText;
    const innerHTML = _getFilterInnerHTML();
    _openDrawer(title, innerHTML);
}

function _openSortDrawer() {
    const title = getID('order').innerText;
    const innerHTML = _getSortInnerHTML();
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
