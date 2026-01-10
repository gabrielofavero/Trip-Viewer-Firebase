const SORT_OPTIONS = {};

// Main Action
function _sort(render = false) {
  const { type, value } = _getSortPreferences() || {};

  CONTENT.sort((a, b) => {
    const A = _getItem(a.id) || {};
    const B = _getItem(b.id) || {};

    const r = (type === "planned") ?
      _comparePlanned(a.id, b.id, A, B, value) :
      _compare(A, B, type, value);

    if (r !== 0) return r;
    return nameOf(A).localeCompare(nameOf(B));
  });

  if (render) _applyContent();

  // ---- Comparators ----

  function _compare(a, b, type, value) {
    switch (type) {
      case "scores": {
        const sa = scoreOf(a);
        const sb = scoreOf(b);
        return value === "lowest_first" ? sa - sb : sb - sa;
      }

      case "prices": {
        const pa = priceRank(_normalizePriceBucket(a.valor));
        const pb = priceRank(_normalizePriceBucket(b.valor));
        return value === "lowest_first" ? pa - pb : pb - pa;
      }

      case "name": {
        const na = nameOf(a);
        const nb = nameOf(b);
        return value === "descending"
          ? nb.localeCompare(na)
          : na.localeCompare(nb);
      }

      default:
        return 0;
    }
  }

  function _comparePlanned(idA, idB, a, b, value) {
    const pa = _isPlanned(idA) ? 1 : 0;
    const pb = _isPlanned(idB) ? 1 : 0;

    const plannedCmp =
      value === "not_planned_first" ? pa - pb : pb - pa;

    if (plannedCmp !== 0) return plannedCmp;

    const scoreCmp = scoreOf(b) - scoreOf(a);
    if (scoreCmp !== 0) return scoreCmp;

    return 0;
  }

  // ---- Accessors ----

  function scoreOf(item) {
    const n = parseInt(item.nota, 10);
    return Number.isNaN(n) ? -Infinity : n;
  }

  function priceRank(bucket) {
    const map = { "-": 0, "$": 1, "$$": 2, "$$$": 3, "$$$$": 4 };
    return map[bucket] ?? Infinity;
  }

  function nameOf(item) {
    return (item.nome || "").toString().toLowerCase();
  }
}

// Options
function _loadSortOptions(force = false) {
  if (SORT_OPTIONS[ACTIVE_CATEGORY] && !force) {
    return;
  }

  _loadTitles();
  _loadFilterSortingData(SORT_OPTIONS.titles);

  SORT_OPTIONS[ACTIVE_CATEGORY] = {};
  const options = SORT_OPTIONS[ACTIVE_CATEGORY];

  if (_shouldDisplayScores()) {
    options.scores = {
      highest_first: translate('destination.sort.scores.highest_first'),
      lowest_first: translate('destination.sort.scores.lowest_first')
    }
  }

  if (_shouldDisplayPlanned()) {
    options.planned = {
      planned_first: translate('destination.sort.planned.planned_first'),
      not_planned_first: translate('destination.sort.planned.not_planned_first')
    }
  }

  if (_shouldDisplayPrices()) {
    options.prices = {
      lowest_first: translate('destination.sort.price.lowest_first'),
      highest_first: translate('destination.sort.price.highest_first')
    }
  }

  options.name = {
    ascending: translate('destination.sort.name.ascending'),
    descending: translate('destination.sort.name.descending')
  }

  function _loadTitles() {
    if (!SORT_OPTIONS.titles) {
      SORT_OPTIONS.titles = {
        name: translate('destination.sort.name.title'),
        planned: translate('destination.sort.planned.title'),
        scores: translate('destination.sort.scores.title'),
        prices: translate('destination.sort.price.title')
      };
    }
  }

}

// Drawer
function _openSortDrawer() {
  _openFilterSortDrawer({
    triggerId: 'sort',
    getInnerHTML: _getSortDrawerInnerHTML,
    clickAction: _sortDrawerOptionClickAction,
    loadAction: _sortDrawerOptionLoadAction
  });
}