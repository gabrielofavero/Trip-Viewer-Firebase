const FILTER_PREFERENCES = {
	planned: "everything",
	scores: "everything",
	region: "everything",
	prices: "everything",
};

const SORT_PREFERENCES = {
	type: "scores",
	value: "highest_first",
};

// Getters
export function getFilterPreferences() {
	const filter = sessionStorage.getItem("destinations-filtered-preferences");
	if (filter) {
		return JSON.parse(filter);
	}
	return FILTER_PREFERENCES;
}

export function getSortPreferences() {
	const sort = sessionStorage.getItem("destinations-sorted-preferences");
	if (sort) {
		return JSON.parse(sort);
	}
	return SORT_PREFERENCES;
}

// Setters
function setFilterPreferences() {
	sessionStorage.setItem(
		"destinations-filtered-preferences",
		JSON.stringify(FILTER_PREFERENCES),
	);
}

function setSortPreferences() {
	sessionStorage.setItem(
		"destinations-sorted-preferences",
		JSON.stringify(SORT_PREFERENCES),
	);
}

function setFilterPreference(type, value) {
	if (!(type in FILTER_PREFERENCES)) {
		return;
	}
	FILTER_PREFERENCES[type] = value;
	setFilterPreferences();
}

function setSortPreference(type, value) {
	SORT_PREFERENCES.type = type;
	SORT_PREFERENCES.value = value;
	setSortPreferences();
}
