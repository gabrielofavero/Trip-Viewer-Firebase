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

function _getNotaClass (item) {
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

function _getNotaText(item, isLineup) {
    return isLineup ? _getNotaTextLineup(item) : _getNotaTextGeneric(item);
}

function _getNotaTextGeneric(item) {
    switch (item.nota) {
        case "5":
            return "Passeio Obrigatório!";
        case "4":
            return "Ótimo Passeio";
        case "3":
            return "Passeio Razoável";
        case "2":
            return "Passeio com Baixa Prioridade";
        case "1":
            return "Passeio Não Recomendado";
        default:
            return "Passeio Sem Avaliação"
    }
}

function _getNotaTextLineup(item) {
    switch (item.nota) {
        case "5":
            return "Obrigatório Assistir";
        case "4":
            return "Recomendado Assistir";
        case "3":
            return "Opção Razoável para Assistir";
        case "2":
            return "Assistir apenas se sobrar tempo";
        case "1":
            return "Não Assistir";
        default:
            return "Prioridade não definida"
    }
}

// Links
function _getLinkOnClick(item, tipo) {
    if (item[tipo]) {
        return ` onclick="openLinkInNewTab('${item[tipo]}')"`
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
function _getValorValue(item, isLineup) {
    if (isLineup) return "";
    else return _convertValor(item.valor);
}

function _convertValor(valor) {
    if (valor && DESTINO.valores && DESTINO.valores[valor]) return DESTINO.valores[valor]
    if (valor) return _convertCustomValor(valor)
    if (DESTINO.valores) return DESTINO.valores["default"]
    return "Valor Desconhecido";
}

function _convertCustomValor(valor) {
    if (isNaN(valor) || (!isNaN(valor) && !DESTINO.moeda)) {
        return valor;
    } else return `${DESTINO.moeda}${valor}`;
}

// Descrição
function _getDescricaoValue(item, isLineup) {
    if (isLineup) return "";
    else return item.descricao || "";
}