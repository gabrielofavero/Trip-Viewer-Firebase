const FILTER_SORT_KEYS_ORDER = {
	planned: ["planned", "not_planned"],
	prices: ["-", "$", "$$", "$$$", "$$$$", "default"],
	scores: ["5", "4", "3", "2", "1", "default"],
};

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
	const onlyOne = CONTENT.length === 1;

	getID("sort").style.display = onlyOne ? "none" : "";
	getID("filter").style.display = onlyOne || _noFilters() ? "none" : "";

	function _noFilters() {
		return !(
			_shouldDisplayPlanned() ||
			_shouldDisplayScores() ||
			_shouldDisplayRegions() ||
			_shouldDisplayPrices()
		);
	}
}

function _loadFilterSortingData(titles) {
	if (!FILTER_SORT_DATA[ACTIVE_CATEGORY]) {
		FILTER_SORT_DATA[ACTIVE_CATEGORY] = {};
	}
	for (const title in titles) {
		let data;
		switch (title) {
			case "region":
				data = _getDataSet("regiao");
				data.delete("");
				break;
			case "planned":
				data = _getDataSet("planejado");
				break;
			case "scores":
				data = _getDataSet("nota");
				break;
			case "prices":
				data = _getPriceBuckets();
		}
		FILTER_SORT_DATA[ACTIVE_CATEGORY][title] = data || new Set();
	}
}

// Drawer
function _deactivateFilterSortContainerButtons() {
	const container = getID("filter-sort-container");
	if (!container) return;

	container
		.querySelectorAll(".filter-sort.active")
		.forEach((btn) => btn.classList.remove("active"));
}

function _activateFilterSortContainerButton(buttonEl) {
	if (!buttonEl) return;

	_deactivateFilterSortContainerButtons();
	buttonEl.classList.add("active");
}

function _openFilterSortDrawer({
	triggerId,
	getInnerHTML,
	clickAction,
	loadAction,
}) {
	const trigger = getID(triggerId);
	const title = trigger.innerText;

	if (_isDrawerOpen() && title === getID("drawerTitle").innerText) {
		_closeDrawer();
		return;
	}

	const actions = {
		beforeOpen: _closeAddedDestino,
		click: clickAction,
		load: loadAction,
		close: _deactivateFilterSortContainerButtons,
	};

	_openDrawer(title, getInnerHTML(), actions);
	_activateFilterSortContainerButton(trigger);
}

// Helpers
function _shouldDisplayRegions() {
	const regioes = _getDataSet("regiao");
	regioes.delete("");
	return regioes.size > 1;
}

function _shouldDisplayPlanned() {
	const item = PLANNED_DESTINATION[ACTIVE_CATEGORY];
	if (!item || Object.keys(PLANNED_DESTINATION[ACTIVE_CATEGORY]) <= 1) {
		return false;
	}
	return true;
}

function _shouldDisplayScores() {
	const notas = _getDataSet("nota");
	return notas.size > 1;
}

function _shouldDisplayPrices() {
	const precos = _getPrices();
	return precos.size > 1;
}
