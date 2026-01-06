// Active Category
function _loadActiveCategory(urlParams) {
    let type = urlParams['type'];
    const originals = CONFIG.destinos.original;

    if (!type || !originals[type]) {
        type = _getFirstCategory()
    }

    ACTIVE_CATEGORY = originals[type];

    function _getFirstCategory() {
        const types = CONFIG.destinos.categorias.ids;
        const destinoIDs = Object.keys(FIRESTORE_DESTINOS_DATA);
        for (const type of types) {
            if (destinoIDs.includes(type)) {
                return type;
            }
        }
        throw translate('messages.error.missing_data');
    }
}

function _updateActiveCategory(category) {
    const urlParam = _getURLParams()?.['type'];
    const translations = CONFIG.destinos.translation;
    const param = translations[category];

    if (urlParam === param) {
        return;
    }

    ACTIVE_CATEGORY = category;
    const url = new URL(window.location);
    url.searchParams.set('type', param);
    window.history.replaceState({}, '', url);
}

// Título
function _getTitulo(item) {
    if (item.nome && (item.emoji)) {
        return `${item.nome} ${item.emoji}`;
    } else return item.nome;
}

// Nota
function _getNotaIcon(nota) {
    switch (nota) {
        case "5":
            return "ph:number-five-bold";
        case "4":
            return "ph:number-four-bold";
        case "3":
            return "ph:number-three-bold";
        case "2":
            return "ph:number-two-bold";
        case "1":
            return "ph:number-one-bold";
        default:
            return "ic:outline-question-mark"
    }
}

function _getNotaClass(nota) {
    switch (nota) {
        case "5":
        case "4":
        case "3":
        case "2":
        case "1":
            return `nota-${nota}`;
        default:
            return "nota-ausente"
    }
}

// Links
function _getLinkOnClick(item, tipo) {
    if (item[tipo]) {
        return ` onclick="_openLinkInNewTab('${item[tipo]}')"`
    } else return "";
}

// Valor
function _getValorValue(item, valores, moeda) {
    switch (item.valor) {
        case "default":
            return translate('destination.price.default');
        case "-":
            return translate('destination.price.free');
        case "$":
        case "$$":
        case "$$$":
        case "$$$$":
            return valores[item.valor]
        default:
            if (item.valor) {
                return _convertCustomValor(item.valor, moeda);
            }
            return translate('destination.price.default');
    }
}

function _convertCustomValor(valor, moeda) {
    if (isNaN(valor) || (!isNaN(valor) && !moeda)) {
        return valor;
    } else return `${moeda}${valor}`;
}

// Descrição
function _getDescricaoValue(item) {
    const lang = _getUserLanguage();
    return item.descricao?.[lang] || "";
}

// Planejado
function _getPlanejado(id) {
    const plannedItem = PLANNED_DESTINATION[ACTIVE_CATEGORY]?.[id];
    return _getPlanejadoValue(plannedItem);
}

function _getPlanejadoValue(plannedItem) {
    if (!plannedItem) {
        return "";
    }

    const date = _convertFromDateObject(plannedItem.data);
    const weekday = _getWeekday(date.getDay());
    const day = plannedItem.data.day;
    const month = _getMonth(plannedItem.data.month - 1).toLowerCase();
    const turno = _getTurno(plannedItem.turno).toLowerCase();
    const turnoLabel = turno ? ` (${turno})` : '';
    return `${translate('labels.planned')}: ${weekday}, ${translate('datetime.titles.day_month', { day, month })}${turnoLabel}`
}

function _getTurno(turno) {
    switch (turno) {
        case 'madrugada':
            return translate('datetime.time_of_day.early_hours');
        case 'manha':
            return translate('datetime.time_of_day.morning');
        case 'tarde':
            return translate('datetime.time_of_day.afternoon');
        case 'noite':
            return translate('datetime.time_of_day.evening');
        default:
            return undefined;
    }
}