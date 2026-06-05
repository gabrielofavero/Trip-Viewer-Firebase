const FILTER_SORT_KEYS_ORDER = {
	planned: ["planned", "not_planned"],
	prices: ["-", "$", "$$", "$$$", "$$$$", "default"],
	scores: ["5", "4", "3", "2", "1", "default"],
};

const FILTER_SORT_DATA = {};

// Loading Action
function loadSortAndFilter(force = false) {
	loadFilterOptions(force);
	loadSortOptions(force);
	loadSortAndFilterVisibility();
	sort();
	filter();
}

function loadSortAndFilterVisibility() {
	const onlyOne = CONTENT.length === 1;

	getID("sort").style.display = onlyOne ? "none" : "";
	getID("filter").style.display = onlyOne || noFilters() ? "none" : "";

	function noFilters() {
		return !(
			shouldDisplayPlanned() ||
			shouldDisplayScores() ||
			shouldDisplayRegions() ||
			shouldDisplayPrices()
		);
	}
}

function loadFilterSortingData(titles) {
	if (!FILTER_SORT_DATA[ACTIVE_CATEGORY]) {
		FILTER_SORT_DATA[ACTIVE_CATEGORY] = {};
	}
	for (const title in titles) {
		let data;
		switch (title) {
			case "region":
				data = getDataSet("regiao");
				data.delete("");
				break;
			case "planned":
				data = getDataSet("planejado");
				break;
			case "scores":
				data = getDataSet("nota");
				break;
			case "prices":
				data = getPriceBuckets();
		}
		FILTER_SORT_DATA[ACTIVE_CATEGORY][title] = data || new Set();
	}
}

// Drawer
function deactivateFilterSortContainerButtons() {
	const container = getID("filter-sort-container");
	if (!container) return;

	container
		.querySelectorAll(".filter-sort.active")
		.forEach((btn) => btn.classList.remove("active"));
}

function activateFilterSortContainerButton(buttonEl) {
	if (!buttonEl) return;

	deactivateFilterSortContainerButtons();
	buttonEl.classList.add("active");
}

function openFilterSortDrawer({
	triggerId,
	getInnerHTML,
	clickAction,
	loadAction,
}) {
	const trigger = getID(triggerId);
	const title = trigger.innerText;

	if (isDrawerOpen() && title === getID("drawerTitle").innerText) {
		closeDrawer();
		return;
	}

	const actions = {
		beforeOpen: closeAddedDestination,
		click: clickAction,
		load: loadAction,
		close: deactivateFilterSortContainerButtons,
	};

	openDrawer(title, getInnerHTML(), actions);
	activateFilterSortContainerButton(trigger);
}

// Helpers
function shouldDisplayRegions() {
	const REGIONS = getDataSet("regiao");
	REGIONS.delete("");
	return REGIONS.size > 1;
}

function shouldDisplayPlanned() {
	const item = PLANNED_DESTINATION[ACTIVE_CATEGORY];
	if (!item || Object.keys(PLANNED_DESTINATION[ACTIVE_CATEGORY]) <= 1) {
		return false;
	}
	return true;
}

function shouldDisplayScores() {
	const notas = getDataSet("nota");
	return notas.size > 1;
}

function shouldDisplayPrices() {
	const precos = getPrices();
	return precos.size > 1;
}
