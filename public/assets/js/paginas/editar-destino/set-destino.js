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

function _buildDestinoCategoryObject(tipo) {
    const childIDs = _getChildIDs(`${tipo}-box`);

    let result = [];

    for (let i = 0; i < childIDs.length; i++) {
        let item = {};
        const j = _getJ(childIDs[i]);

        item.id = _getIfDoesNotExistCategoriaID(tipo, j);
        item.novo = getID(`${tipo}-novo-${j}`).checked;
        item.nome = getID(`${tipo}-nome-${j}`).value;
        item.emoji = getID(`${tipo}-emoji-${j}`).value;
        item.descricao = getID(`${tipo}-descricao-${j}`).value;
        item.website = getID(`${tipo}-website-${j}`).value;
        item.instagram = getID(`${tipo}-instagram-${j}`).value;
        item.mapa = getID(`${tipo}-mapa-${j}`).value;
        item.regiao = _getDynamicSelectValue(tipo, 'regiao', j);
        item.midia = getID(`${tipo}-midia-${j}`).value;
        item.nota = getID(`${tipo}-nota-${j}`).value;

        const valor = getID(`${tipo}-valor-${j}`);
        item.valor = valor.innerHTML && valor.value != 'outro' ? valor.value : getID(`${tipo}-outro-valor-${j}`).value;

        result.push(item);
    }

    return result;
}

async function _updateTikTokLinks() {
    let toUpdate = false;
    const urls = {};
    for (const categoria of CONFIG.destinos.categorias.passeios) {
        const midias = FIRESTORE_DESTINOS_NEW_DATA[categoria].map(item => item.midia)
        if (midias.length > 0 && midias.some(midia => midia.includes('https://vm.tiktok.com/'))) {
            toUpdate = true;
        }
        urls[categoria] = midias;
    }
    if (toUpdate) {
        try {
            const response = await _postCloudFunction('convertTikTokLinks', { urls });
            const data = response.urls;
            for (const categoria of CONFIG.destinos.categorias.passeios) {
                for (let i = 0; i < FIRESTORE_DESTINOS_NEW_DATA[categoria].length; i++) {
                    FIRESTORE_DESTINOS_NEW_DATA[categoria][i].midia = data[categoria][i];
                }
            }
        } catch (error) {
            _displayError(error);
            console.error(error);
        }
    }
}

async function _setDestino() {
    _startLoadingScreen(false);
    _validateRequiredFields();

    if (!_isModalOpen()) {
        await _buildDestinosObject();
        await _updateTikTokLinks();
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