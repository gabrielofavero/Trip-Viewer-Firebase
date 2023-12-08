function _buildPasseiosObject() {
    let result = {
        lanches: {},
        lojas: {},
        restaurantes: {},
        saidas: {},
        turismo: {},
        lineup: {},
        titulo: "",
        moeda: "",
        myMaps: "",
        modulos: {},
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

    result.modulos = _buildPasseioModulos();
    result.restaurantes = _buildPasseioCategoryObject("restaurantes");
    result.lanches = _buildPasseioCategoryObject("lanches");
    result.saidas = _buildPasseioCategoryObject("saidas");
    result.turismo = _buildPasseioCategoryObject("turismo");
    result.lojas = _buildPasseioCategoryObject("lojas");
    result.lineup = _buildPasseioLineupObject();

    return result;
}

function _buildPasseioModulos() {
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

    const divLineup = document.getElementById(`habilitado-lineup`);
    if (divLineup) {
        result.lineup = divLineup.checked;
    }

    return result;
}

function _buildPasseioCategoryObject(type) {
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

function _buildPasseioLineupObject() {
    const childIDs = _getChildIDs("lineup-box");

    let result = {
        descricao: [],
        head: [],
        horario: [],
        hyperlink: {
            name: []
        },
        nome: [],
        nota: [],
        palco: [],
        site: [],
    }

    for (let i = 0; i < childIDs.length; i++) {
        const j = parseInt(childIDs[i].split("-")[1]);

        const divHead = document.getElementById(`lineup-headliner-${j}`);
        const valueHead = (divHead && divHead.checked) ? "✔" : "";
        result.head.push(valueHead);

        const divNome = document.getElementById(`lineup-nome-${j}`);
        const valueNome = divNome ? _returnEmptyIfNoValue(divNome.value) : "";
        result.nome.push(valueNome);

        const divDescricao = document.getElementById(`lineup-descricao-${j}`);
        const valueDescricao = divDescricao ? _returnEmptyIfNoValue(divDescricao.value) : "";
        result.descricao.push(valueDescricao);

        const divPalco = document.getElementById(`lineup-palco-${j}`);
        const valuePalco = divPalco ? _returnEmptyIfNoValue(divPalco.value) : "";
        result.palco.push(valuePalco);

        const divInicio = document.getElementById(`lineup-horario-${j}`);
        const valueInicio = divInicio ? _returnEmptyIfNoValue(divInicio.value) : "";

        const divFim = document.getElementById(`lineup-horario-fim-${j}`);
        const valueFim = divFim ? _returnEmptyIfNoValue(divFim.value) : "";

        if (valueInicio || valueFim) {
            result.horario.push(`${valueInicio} - ${valueFim}`);
        } else {
            result.horario.push("");
        }

        divMidia = document.getElementById(`lineup-midia-${j}`);
        valueMidia = divMidia ? _returnEmptyIfNoValue(divMidia.value) : "";
        result.hyperlink.name.push(valueMidia);

        divNota = document.getElementById(`lineup-nota-${j}`);
        valueNota = divNota ? _returnEmptyIfNoValue(divNota.value) : "";
        result.nota.push(valueNota);
    }

    return result;
}