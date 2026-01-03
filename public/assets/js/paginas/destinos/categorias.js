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
function _getNotaIcon(item) {
    switch (item.nota) {
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

function _getNotaClass(item) {
    switch (item.nota) {
        case "5":
        case "4":
        case "3":
        case "2":
        case "1":
            return `nota-${item.nota}`;
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
    return item.descricao[lang] || "";
}