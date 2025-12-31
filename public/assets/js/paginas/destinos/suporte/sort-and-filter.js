
// User Actions
function _openFilterDrawer() {
    openDrawer("filter");
}

function _openSortDrawer() {
    openDrawer("order");
}

// Drawer
function openDrawer(titleText, innerHTML) {
    const title = document.getElementById("drawerTitle");
    const content = document.getElementById("drawerContent");
    const overlay = document.getElementById("overlay");
    const drawer = document.getElementById("drawer");

    title.textContent = titleText;
    content.innerHTML = innerHTML;

    overlay.style.display = "block";
    drawer.getBoundingClientRect();
    drawer.classList.add("open");
}

function closeDrawer() {
    const overlay = document.getElementById("overlay");
    const drawer = document.getElementById("drawer");

    drawer.classList.remove("open");

    setTimeout(() => overlay.style.display = "none", 280);
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
