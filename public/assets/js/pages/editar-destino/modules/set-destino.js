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
    result.compartilhamento.dono = FIRESTORE_PLACES_DATA?.compartilhamento?.dono || await _getUID();

    let moeda = getID(`moeda`).value;
    if (moeda == "outra") moeda = getID(`outra-moeda`).value;
    result.moeda = moeda;

    result.modulos = _buildDestinoModulos();
    result.restaurantes = _buildDestinoCategoryObject("restaurantes");
    result.lanches = _buildDestinoCategoryObject("lanches");
    result.saidas = _buildDestinoCategoryObject("saidas");
    result.turismo = _buildDestinoCategoryObject("turismo");
    result.lojas = _buildDestinoCategoryObject("lojas");

    return result;
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
        hyperlink: {
            name: [],
            video: [],
        },
        nome: [],
        nota: [],
        novo: [],
        regiao: [],
        valor: [],
    }

    for (let i = 0; i < childIDs.length; i++) {
        const j = parseInt(childIDs[i].split("-")[1]);

        const divNovo = getID(`${type}-novo-${j}`);
        result.novo.push(divNovo && divNovo.checked);

        const divNome = getID(`${type}-nome-${j}`);
        const valueNome = divNome ? _returnEmptyIfNoValue(divNome.value) : "";
        result.nome.push(valueNome);

        const divEmoji = getID(`${type}-emoji-${j}`);
        const valueEmoji = divEmoji ? _returnEmptyIfNoValue(divEmoji.value) : "";
        result.emoji.push(valueEmoji);

        const divDescricao = getID(`${type}-descricao-${j}`);
        const valueDescricao = divDescricao ? _returnEmptyIfNoValue(divDescricao.value) : "";
        result.descricao.push(valueDescricao);

        const divLink = getID(`${type}-link-${j}`);
        const valueLink = divLink ? _returnEmptyIfNoValue(divLink.value) : "";
        result.hyperlink.name.push(valueLink);

        const divRegiao = getID(`${type}-regiao-${j}`);
        const valueRegiao = divRegiao ? _returnEmptyIfNoValue(divRegiao.value) : "";
        result.regiao.push(valueRegiao);

        const divValor = getID(`${type}-valor-${j}`);
        const valueValor = divValor ? _returnEmptyIfNoValue(divValor.value) : "";
        result.valor.push(valueValor);

        const divMidia = getID(`${type}-midia-${j}`);
        const valueMidia = divMidia ? _returnEmptyIfNoValue(divMidia.value) : "";
        result.hyperlink.video.push(valueMidia);

        const divNota = getID(`${type}-nota-${j}`);
        const valueNota = divNota ? _returnEmptyIfNoValue(divNota.value) : "";
        result.nota.push(valueNota);
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
        const destino = await _buildDestinosObject();
        let result;

        if (DOCUMENT_ID && destino) {
            result = await _updateUserObjectDB(destino, DOCUMENT_ID, "destinos");
        } else if (destino) {
            result = await _newUserObjectDB(destino, "destinos");
        }

        console.log(result);

        getID('modal-inner-text').innerHTML = result.message;

        wasSaved = result.success;

        _stopLoadingScreen();
        _openModal('modal');
    }
}