const SORT_OPTIONS = {};

function _sort(render = false) {
    const preferences = _getSortPreferences();
    const { type, value } = preferences || {};

    CONTENT.sort((a, b) => {
        const primary = comparePrimary(a, b, type, value);
        if (primary !== 0) return primary;

        if (type !== "scores") {
            const secondary = compareSecondaryScores(a, b);
            if (secondary !== 0) return secondary;
        }

        return nameOf(a).localeCompare(nameOf(b));
    });

    if (render) {
        _applyContent();
    }

    function comparePrimary(a, b, type, value) {
        switch (type) {

            case "scores": {
                const sa = scoreOf(a);
                const sb = scoreOf(b);

                if (value === "highest_first") return sb - sa;
                if (value === "lowest_first") return sa - sb;
                return 0;
            }

            case "prices": {
                const pa = priceRank(_normalizePriceBucket(a.valor));
                const pb = priceRank(_normalizePriceBucket(b.valor));

                if (value === "lowest_first") return pa - pb;
                if (value === "highest_first") return pb - pa;
                return 0;
            }

            case "planned": {
                const pa = plannedOf(a);
                const pb = plannedOf(b);

                if (value === "planned_first") return pb - pa;
                if (value === "not_planned_first") return pa - pb;
                return 0;
            }

            case "name": {
                const na = nameOf(a);
                const nb = nameOf(b);

                if (value === "ascending") return na.localeCompare(nb);
                if (value === "descending") return nb.localeCompare(na);
                return 0;
            }

            default:
                return 0;
        }
    }

    function compareSecondaryScores(a, b) {
        return scoreOf(b) - scoreOf(a); // best → worst
    }

    function scoreOf(item) {
        const n = parseInt(item.nota, 10);
        return Number.isNaN(n) ? -Infinity : n;
    }

    function priceRank(bucket) {
        const map = { "-": 0, "$": 1, "$$": 2, "$$$": 3, "$$$$": 4 };
        return map[bucket] ?? Infinity; // unknown → worst
    }

    function nameOf(item) {
        return (item.titulo || "").toString().toLowerCase();
    }

    function plannedOf(item) {
        return item.planejado === true ? 1 : 0;
    }
}

function _loadSortOptions(force = false) {
    if (SORT_OPTIONS[DESTINO.activeCategory] && !force) {
        return;
    }

    const s = DESTINO.translations.sort;
    _loadTitles(s);
    _loadFilterSortingData(SORT_OPTIONS.titles);

    SORT_OPTIONS[DESTINO.activeCategory] = {};
    const options = SORT_OPTIONS[DESTINO.activeCategory];

    if (_shouldDisplayScores()) {
        options.scores = {
            highest_first: s.scores.highest_first,
            lowest_first: s.scores.lowest_first
        }
    }

    if (_shouldDisplayPlanned()) {
        options.planned = {
            planned_first: s.planned.planned_first,
            not_planned_first: s.planned.not_planned_first
        }
    }

    if (_shouldDisplayPrices()) {
        options.prices = {
            lowest_first: s.price.lowest_first,
            highest_first: s.price.highest_first
        }
    }

    options.name = {
        ascending: s.name.ascending,
        descending: s.name.descending
    }

    function _loadTitles(s) {
        if (!SORT_OPTIONS.titles) {
            SORT_OPTIONS.titles = {
                name: s.name.title,
                planned: s.planned.title,
                scores: s.scores.title,
                prices: s.price.title
            };
        }
    }

}