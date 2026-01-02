const FILTER_PREFERENCES = {
    planned: "everything",
    scores: "everything",
    region: "everything",
    prices: "everything"
}

const SORT_PREFERENCES = {
    type: "scores",
    value: "highest_first"
}


// Getters
function _getFilterPreferences() {
    const filter = sessionStorage.getItem("destinos-filtered-preferences");
    if (filter) {
        return JSON.parse(filter);
    }
    return FILTER_PREFERENCES;
}

function _getSortPreferences() {
    const sort = sessionStorage.getItem("destinos-sorted-preferences");
    if (sort) {
        return JSON.parse(sort);
    }
    return SORT_PREFERENCES;
}


// Setters
function _setFilterPreferences() {
    sessionStorage.setItem("destinos-filtered-preferences", JSON.stringify(FILTER_PREFERENCES));
}

function _setSortPreferences() {
    sessionStorage.setItem("destinos-sorted-preferences", JSON.stringify(SORT_PREFERENCES));
}

function _setFilterPreference(type, value) {
    if (!(type in FILTER_PREFERENCES)) {
        return;
    }
    FILTER_PREFERENCES[type] = value;
    _setFilterPreferences();
}

function _setSortPreference(type, value) {
    SORT_PREFERENCES.type = type;
    SORT_PREFERENCES.value = value;
    _setSortPreferences();
}