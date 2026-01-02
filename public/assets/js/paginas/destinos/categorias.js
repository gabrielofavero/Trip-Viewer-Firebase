function _getFirstCategory() {
    const categorias = CONFIG.destinos.categorias.geral;
    const destinoCategorias = Object.keys(FIRESTORE_DESTINOS_DATA);
    return destinoCategorias.find(cat => categorias.includes(cat)) || 'turismo';
}

// Título
function _getTitulo(item) {
    if (item.nome && (item.emoji || item.headliner)) {
        return `${item.nome} ${item.emoji || '⭐'}`;
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
        case "-":
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