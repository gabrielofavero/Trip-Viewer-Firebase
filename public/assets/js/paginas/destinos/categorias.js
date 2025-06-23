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

function _getNotaText(item, notas) {
    return notas[item.nota] || notas['default'] || "Não Avaliado";
}

// Links
function _getLinkOnClick(item, tipo) {
    if (item[tipo]) {
        return ` onclick="_openLinkInNewTab('${item[tipo]}')"`
    } else return "";
}

// Lineup
function _getDisplayHorario(item, isLineup) {
    if (isLineup) return item.horario ? "block" : "none";
    else return "none";
}

function _getPalcoRegiaoValue(item, isLineup) {
    if (isLineup) return item.palco || "";
    else return item.regiao || "";
}

// Valor
function _getValorValue(item, isLineup, valores, moeda) {
    if (isLineup) return "";
    switch (item.valor) {
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
function _getDescricaoValue(item, isLineup) {
    if (isLineup) return "";
    else return item.descricao || "";
}