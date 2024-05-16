// Título
function _getTitulo(data) {
    if (data.titulo && (data.emoji || data.headliner)) {
        return `${data.titulo} ${data.emoji || '⭐'}`;
    } else return data.titulo;
}

function _getDisplayDestinosTitulo(data) {
    if (data.nota || data.mapa || data.site || data.instagram) return "flex";
    else return "none";
}


// Nota
function _getNotaIcon(data) {
    switch (data.nota) {
        case "5":
        case "4":
        case "3":
        case "2":
        case "1":
            return `nota-${data.nota}`;
        default:
            return "nota-ausente"
    }
}

function _getNotaIcon(data) {
    switch (data.nota) {
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


// Links
function _getDisplayLinksContainer(data, isLineup) {
    if (!isLineup && (data.mapa || data.site || data.instagram)) return "flex";
    else return "none";
}

function _getLinkOnClick(data, tipo) {
    if (data[tipo]) {
        return ` onclick="openLinkInNewTab('${data[tipo]}')"`
    } else return "";
}


// Lineup
function _getDisplayHeadliner(data, isLineup) {
    if (isLineup && data.headliner) return "block";
    else return "none";
}

function _getPalcoRegiaoDisplay(data, isLineup) {
    if (isLineup) return data.palco ? "block" : "none";
    else return data.regiao ? "block" : "none";
}

function _getPalcoRegiaoValue(data, isLineup) {
    if (isLineup) return data.palco || "";
    else return data.regiao || "";
}


// Valor
function _getValorVisibility(data, isLineup) {
    if (isLineup) return "none";
    else return data.valor ? "block" : "none";
}

function _getValorValue(data, isLineup) {
    if (isLineup) return "";
    else return _getValor(data.valor);
}

function _getValor(valor) {
    if (valor && DESTINO.valores && DESTINO.valores[valor]) return DESTINO.valores[valor]
    if (valor) return _getCustomValor(valor)
    if (DESTINO.valores) return DESTINO.valores["default"]
    return "Valor Desconhecido";
}

function _getCustomValor(valor) {
    if (isNaN(valor) || (!isNaN(valor) && !DESTINO.moeda)) {
        return valor;
    } else return `${DESTINO.moeda}${valor}`;
}


// Descrição
function _getDescricaoVisibility(data, isLineup) {
    if (isLineup) return "none";
    else return data.descricao ? "block" : "none";
}

function _getDescricaoValue(data, isLineup) {
    if (isLineup) return "";
    else return data.descricao || "";
}