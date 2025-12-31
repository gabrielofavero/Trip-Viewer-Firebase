
// User Actions
function _openFilterDrawer() {
    const title = getID('filter').innerText;
    const innerHTML = `<button class="option-btn">Newest First</button>`
    openDrawer(title, innerHTML);
}

function _openSortDrawer() {
    const title = getID('order').innerText;
    const innerHTML = `<button class="option-btn">Newest First</button>`
    openDrawer(title, innerHTML);
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
