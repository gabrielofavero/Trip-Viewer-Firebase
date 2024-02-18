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

    const divTitulo = document.getElementById(`titulo`);
    const valueTitulo = divTitulo ? _returnEmptyIfNoValue(divTitulo.value) : "";
    result.titulo = valueTitulo;

    const divMoeda = document.getElementById(`moeda`);
    const valueMoeda = divMoeda ? _returnEmptyIfNoValue(divMoeda.value) : "";
    result.moeda = valueMoeda;

    const divMyMaps = document.getElementById(`mapa-link`);
    const valueMyMaps = divMyMaps ? _returnEmptyIfNoValue(divMyMaps.value) : "";
    result.myMaps = valueMyMaps;

    
    result.versao.ultimaAtualizacao = new Date().toLocaleString();

    result.compartilhamento.dono = FIRESTORE_PLACES_DATA ? FIRESTORE_PLACES_DATA.compartilhamento.dono : await _getUID();

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

    const divRestaurantes = document.getElementById(`habilitado-restaurantes`);
    if (divRestaurantes) {
        result.restaurantes = divRestaurantes.checked;
    }

    const divLanches = document.getElementById(`habilitado-lanches`);
    if (divLanches) {
        result.lanches = divLanches.checked;
    }

    const divSaidas = document.getElementById(`habilitado-saidas`);
    if (divSaidas) {
        result.saidas = divSaidas.checked;
    }

    const divTurismo = document.getElementById(`habilitado-turismo`);
    if (divTurismo) {
        result.turismo = divTurismo.checked;
    }

    const divLojas = document.getElementById(`habilitado-lojas`);
    if (divLojas) {
        result.lojas = divLojas.checked;
    }

    const divMapa = document.getElementById(`habilitado-mapa`);
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

        const divNovo = document.getElementById(`${type}-novo-${j}`);
        const valueNovo = (divNovo && divNovo.checked) ? "✔" : "";
        result.novo.push(valueNovo);

        const divNome = document.getElementById(`${type}-nome-${j}`);
        const valueNome = divNome ? _returnEmptyIfNoValue(divNome.value) : "";
        result.nome.push(valueNome);

        const divEmoji = document.getElementById(`${type}-emoji-${j}`);
        const valueEmoji = divEmoji ? _returnEmptyIfNoValue(divEmoji.value) : "";
        result.emoji.push(valueEmoji);

        const divDescricao = document.getElementById(`${type}-descricao-${j}`);
        const valueDescricao = divDescricao ? _returnEmptyIfNoValue(divDescricao.value) : "";
        result.descricao.push(valueDescricao);

        const divLink = document.getElementById(`${type}-link-${j}`);
        const valueLink = divLink ? _returnEmptyIfNoValue(divLink.value) : "";
        result.hyperlink.name.push(valueLink);

        const divRegiao = document.getElementById(`${type}-regiao-${j}`);
        const valueRegiao = divRegiao ? _returnEmptyIfNoValue(divRegiao.value) : "";
        result.regiao.push(valueRegiao);

        const divValor = document.getElementById(`${type}-valor-${j}`);
        const valueValor = divValor ? _returnEmptyIfNoValue(divValor.value) : "";
        result.valor.push(valueValor);

        const divMidia = document.getElementById(`${type}-midia-${j}`);
        const valueMidia = divMidia ? _returnEmptyIfNoValue(divMidia.value) : "";
        result.hyperlink.video.push(valueMidia); 

        const divNota = document.getElementById(`${type}-nota-${j}`);
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
    _startLoadingScreen();
    _validateRequiredFields();

    if (!_isModalOpen()) {
        const destino = await _buildDestinosObject();
        let result;

        if (destinosID && destino) {
            result = await _updateUserObjectDB(destino, destinosID, "destinos");
        } else if (destino) {
            result = await _newUserObjectDB(destino, "destinos");
        }

        console.log(result);

        document.getElementById('modal-inner-text').innerText = result.message;

        wasSaved = result.success;

        _stopLoadingScreen();
        _openModal('modal');
    }
}