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

    let result = [];

    for (let i = 0; i < childIDs.length; i++) {
        let item = {};
        const j = parseInt(childIDs[i].split("-")[1]);

        item.novo = getID(`${type}-novo-${j}`).checked;
        item.nome = getID(`${type}-nome-${j}`).value;
        item.emoji = getID(`${type}-emoji-${j}`).value;
        item.descricao = getID(`${type}-descricao-${j}`).value;
        item.website = getID(`${type}-website-${j}`).value;
        item.instagram = getID(`${type}-instagram-${j}`).value;
        item.mapa = getID(`${type}-mapa-${j}`).value;
        item.regiao = _getDynamicSelectValue(type, 'regiao', j);
        item.midia = getID(`${type}-midia-${j}`).value;
        item.nota = getID(`${type}-nota-${j}`).value;

        const valor = getID(`${type}-valor-${j}`);
        item.valor = valor.innerHTML && valor.value != 'outro' ? valor.value : getID(`${type}-outro-valor-${j}`).value;

        result.push(item);
    }

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