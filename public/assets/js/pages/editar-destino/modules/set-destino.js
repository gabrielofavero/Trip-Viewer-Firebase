let FIRESTORE_DESTINOS_NEW_DATA = {};

async function _buildDestinosObject() {
    let result = {
        lanches: {},
        lojas: {},
        restaurantes: {},
        saidas: {},
        turismo: {},
        titulo: "",
        moeda: "",
        myMaps: "",
        modulos: {},
        compartilhamento: {},
        versao: {}
    }

    result.titulo = getID(`titulo`).value;
    result.myMaps = getID(`mapa-link`).value;
    result.versao.ultimaAtualizacao = new Date().toISOString();
    result.compartilhamento.dono = FIRESTORE_DESTINOS_DATA?.compartilhamento?.dono || await _getUID();

    let moeda = getID(`moeda`).value;
    if (moeda == "outra") moeda = getID(`outra-moeda`).value;
    result.moeda = moeda;

    result.modulos = _buildDestinoModulos();
    result.restaurantes = _buildDestinoCategoryObject("restaurantes");
    result.lanches = _buildDestinoCategoryObject("lanches");
    result.saidas = _buildDestinoCategoryObject("saidas");
    result.turismo = _buildDestinoCategoryObject("turismo");
    result.lojas = _buildDestinoCategoryObject("lojas");

    FIRESTORE_DESTINOS_NEW_DATA = result;
}

function _buildDestinoModulos() {
    let result = {
        lanches: false,
        lineup: false,
        lojas: false,
        mapa: false,
        restaurantes: false,
        saidas: false,
        turismo: false
    }

    const divRestaurantes = getID(`habilitado-restaurantes`);
    if (divRestaurantes) {
        result.restaurantes = divRestaurantes.checked;
    }

    const divLanches = getID(`habilitado-lanches`);
    if (divLanches) {
        result.lanches = divLanches.checked;
    }

    const divSaidas = getID(`habilitado-saidas`);
    if (divSaidas) {
        result.saidas = divSaidas.checked;
    }

    const divTurismo = getID(`habilitado-turismo`);
    if (divTurismo) {
        result.turismo = divTurismo.checked;
    }

    const divLojas = getID(`habilitado-lojas`);
    if (divLojas) {
        result.lojas = divLojas.checked;
    }

    const divMapa = getID(`habilitado-mapa`);
    if (divMapa) {
        result.mapa = divMapa.checked;
    }

    return result;
}

function _buildDestinoCategoryObject(type) {
    const childIDs = _getChildIDs(`${type}-box`);

    let result = {
        descricao: [],
        emoji: [],
        instagram: [],
        mapa: [],
        midia: [],
        nome: [],
        nota: [],
        novo: [],
        regiao: [],
        valor: [],
        website: [],
    }

    for (let i = 0; i < childIDs.length; i++) {
        const j = parseInt(childIDs[i].split("-")[1]);

        const divNovo = getID(`${type}-novo-${j}`);
        result.novo.push(divNovo && divNovo.checked);

        const nome = getID(`${type}-nome-${j}`).value;
        result.nome.push(nome);

        const emoji = getID(`${type}-emoji-${j}`).value;
        result.emoji.push(emoji);

        const descricao = getID(`${type}-descricao-${j}`).value;
        result.descricao.push(descricao);

        const website = getID(`${type}-website-${j}`).value;
        result.website.push(website);

        const instagram = getID(`${type}-instagram-${j}`).value;
        result.instagram.push(instagram);

        const mapa = getID(`${type}-mapa-${j}`).value;
        result.mapa.push(mapa);

        const regiao = _getDynamicSelectValue(type, 'regiao', j);
        result.regiao.push(regiao);

        const valorDiv = getID(`${type}-valor-${j}`);
        const outroValor = getID(`${type}-outro-valor-${j}`).value;
        const valor = valorDiv.innerHTML && valorDiv.value != 'outro' ? valorDiv.value : outroValor;
        result.valor.push(valor);

        const midia = getID(`${type}-midia-${j}`).value;
        result.midia.push(midia);

        const nota = getID(`${type}-nota-${j}`).value;
        result.nota.push(nota);
    }

    result.novo = _removeEmptyValuesFromEndArray(result.novo);
    result.nome = _removeEmptyValuesFromEndArray(result.nome);
    result.emoji = _removeEmptyValuesFromEndArray(result.emoji);
    result.descricao = _removeEmptyValuesFromEndArray(result.descricao);
    result.hyperlink.name = _removeEmptyValuesFromEndArray(result.hyperlink.name);
    result.hyperlink.video = _removeEmptyValuesFromEndArray(result.hyperlink.video);
    result.regiao = _removeEmptyValuesFromEndArray(result.regiao);
    result.valor = _removeEmptyValuesFromEndArray(result.valor);
    result.nota = _removeEmptyValuesFromEndArray(result.nota);

    return result;
}

async function _setDestino() {
    _startLoadingScreen(false);
    _validateRequiredFields();

    if (!_isModalOpen()) {
        await _buildDestinosObject();
        let result;

        if (DOCUMENT_ID && FIRESTORE_DESTINOS_NEW_DATA) {
            result = await _updateUserObjectDB(FIRESTORE_DESTINOS_NEW_DATA, DOCUMENT_ID, "destinos");
        } else if (FIRESTORE_DESTINOS_NEW_DATA) {
            result = await _newUserObjectDB(FIRESTORE_DESTINOS_NEW_DATA, "destinos");
        }

        getID('modal-inner-text').innerHTML = result.message;

        WAS_SAVED = result.success;

        _stopLoadingScreen();
        _openModal('modal');
    }
}