var FIRESTORE_NEW_DATA = {};
var FIRESTORE_GASTOS_NEW_DATA = {};

async function _buildTripObject() {
    FIRESTORE_NEW_DATA = {
        destinos: _buildDestinosArray(),
        compartilhamento: await _buildCompartilhamentoObject(),
        cores: _buildCoresObject(),
        fim: getID(`fim`).value ? _formattedDateToFirestoreDate(getID(`fim`).value) : "",
        gastosPin: getID('pin-enable').checked,
        galeria: _buildGaleriaObject(),
        hospedagens: _buildHospedagemObject(),
        imagem: _buildImagemObject(),
        inicio: getID(`inicio`).value ? _formattedDateToFirestoreDate(getID(`inicio`).value) : "",
        lineup: _buildLineupObject(),
        links: _buildLinksObject(),
        modulos: _buildModulosObject(),
        moeda: getID(`moeda`).value,
        programacoes: _buildProgramacaoObject(),
        quantidadePessoas: !isNaN(getID(`quantidadePessoas`).value) ? parseInt(getID(`quantidadePessoas`).value) : 1,
        titulo: getID(`titulo`).value,
        transportes: _buildTransporteObject(),
        versao: {
            ultimaAtualizacao: new Date().toISOString()
        }
    }
}

async function _buildGastosObject() {
    FIRESTORE_GASTOS_NEW_DATA = {
        compartilhamento: await _buildCompartilhamentoObject(),
        gastosDurante: _getGastos('gastosDurante'),
        gastosPrevios: _getGastos('gastosPrevios'),
        moeda: getID(`moeda`).value,
        pin: _getPin(),
        versao: {
            ultimaAtualizacao: new Date().toISOString()
        }
    }

    function _getGastos(categoria) {
        const result = [];
        for (const tipoObj of INNER_GASTOS[categoria]) {
            result.concat(tipoObj.gastos);
        }
        return result;
    }

    function _getPin() {
        if (getID('pin-enable').checked) {
            return PIN_GASTOS ? PIN_GASTOS : FIRESTORE_GASTOS_DATA?.pin || "";
        } else return "";
    }
}

function _buildModulosObject() {
    return {
        hospedagens: getID('habilitado-hospedagens').checked,
        destinos: getID('habilitado-destinos').checked,
        gastos: getID('habilitado-gastos').checked,
        lineup: getID(`habilitado-lineup`).checked,
        programacao: getID('habilitado-programacao').checked,
        resumo: true,
        transportes: getID('habilitado-transporte').checked,
        galeria: getID('habilitado-galeria').checked
    }
}

function _buildCoresObject() {
    return {
        ativo: getID('habilitado-cores').checked,
        claro: _returnEmptyIfNoValue(getID('claro').value),
        escuro: _returnEmptyIfNoValue(getID('escuro').value)
    }
}

async function _buildCompartilhamentoObject() {
    const publica = getID('habilitado-publico').checked;
    const editores = getID('habilitado-editores').checked;
    var editoresArray = [];
    var dono;

    if (FIRESTORE_DATA) {
        dono = FIRESTORE_DATA.compartilhamento.dono;
    } else {
        dono = await _getUID();
    }

    if (editores) {
        const childIDs = _getChildIDs('habilitado-editores-content');
        for (var i = 0; i < childIDs.length; i++) {
            const j = _getJ(childIDs[i]);
            const divEditor = getID(`editores-email-${j}`);
            const valueEditor = divEditor ? _returnEmptyIfNoValue(divEditor.value) : "";
            editoresArray.push(valueEditor);
        }
    }

    return {
        ativo: publica,
        dono: dono,
        editores: editoresArray
    }
}

function _buildImagemObject() {
    let result = {
        ativo: getID('habilitado-imagens').checked,
        altura: `${getID('logo-tamanho').value * 25}px`,
        background: getID('link-background').value || "",
        claro: getID('link-logo-light').value || "",
        escuro: getID('link-logo-dark').value || "",
    }

    if (getID('upload-background').value) {
        TO_UPLOAD.background = true;
    } else if (result.background && FIREBASE_IMAGES.background && !result.background.includes(FIREBASE_IMAGE_ORIGIN)) {
        CLEAR_IMAGES.background = true;
    }

    if (getID('upload-logo-light').value) {
        TO_UPLOAD.logoLight = true;
    } else if (result.claro && FIREBASE_IMAGES.claro && !result.claro.includes(FIREBASE_IMAGE_ORIGIN)) {
        CLEAR_IMAGES.claro = true;
    }

    if (getID('upload-logo-dark').value) {
        TO_UPLOAD.logoDark = true;
    } else if (result.escuro && FIREBASE_IMAGES.escuro && !result.escuro.includes(FIREBASE_IMAGE_ORIGIN)) {
        CLEAR_IMAGES.escuro = true;
    }

    return result;
}

function _buildLinksObject() {
    return {
        ativo: getID('habilitado-links').checked,
        attachments: getID('link-attachments').value || "",
        drive: getID('link-drive').value || "",
        maps: getID('link-maps').value || "",
        pdf: getID('link-pdf').value || "",
        ppt: getID('link-ppt').value || "",
        sheet: getID('link-sheet').value || "",
        vacina: getID('link-vacina').value || "",
    }
}

function _buildTransporteObject() {
    const result = {
        dados: [],
        visualizacaoSimplificada: getID('condensar').checked
    }
    for (const child of _getChildIDs('transporte-box')) {
        const j = _getJ(child);
        result.dados.push({
            datas: {
                chegada: _formattedDateToFirestoreDate(getID(`chegada-${j}`).value, getID(`chegada-horario-${j}`).value),
                partida: _formattedDateToFirestoreDate(getID(`partida-${j}`).value, getID(`partida-horario-${j}`).value)
            },
            duracao: getID(`transporte-duracao-${j}`).value,
            empresa: _getValueEmpresa(j),
            id: _getIfDoesNotExistCategoriaID('transporte', j),
            idaVolta: getID(`ida-${j}`).checked ? 'ida' : getID(`volta-${j}`).checked ? 'volta' : 'durante',
            link: getID(`transporte-link-${j}`).value,
            pontos: {
                chegada: getID(`ponto-chegada-${j}`).value,
                partida: getID(`ponto-partida-${j}`).value
            },
            reserva: getID(`reserva-transporte-${j}`).value,
            transporte: getID(`transporte-tipo-${j}`).value,
        });
    }
    return result;
}

function _buildHospedagemObject() {
    let result = [];
    for (const id of _getChildIDs('hospedagens-box')) {
        const j = _getJ(id);
        result.push({
            cafe: getID(`hospedagens-cafe-${j}`).checked,
            datas: {
                checkin: _formattedDateToFirestoreDate(getID(`check-in-${j}`).value, getID(`check-in-horario-${j}`).value),
                checkout: _formattedDateToFirestoreDate(getID(`check-out-${j}`).value, getID(`check-out-horario-${j}`).value)
            },
            descricao: getID(`hospedagens-descricao-${j}`).value,
            endereco: getID(`hospedagens-endereco-${j}`).value,
            id: _getIfDoesNotExistCategoriaID('hospedagens', j),
            imagem: _getHospedagemImage('hospedagens', j),
            link: getID(`reserva-hospedagens-link-${j}`).value,
            nome: getID(`hospedagens-nome-${j}`).value,
        });
    }
    return result;
}

function _buildProgramacaoObject() {
    let result = [];

    for (let j = 1; j <= DATAS.length; j++) {
        const innerResult = {
            data: _convertToFirestoreDate(DATAS[j - 1]),
            destinosIDs: [],
            titulo: '',
            madrugada: [],
            manha: [],
            tarde: [],
            noite: []
        }

        innerResult.destinosIDs = _getDestinosFromCheckbox('programacao', j);

        const tituloSelectValue = getID(`programacao-inner-title-select-${j}`).value;
        if (tituloSelectValue == 'outro') {
            innerResult.titulo = getID(`programacao-inner-title-${j}`).value;
        } else {
            innerResult.titulo = tituloSelectValue;
        }

        if (DATAS[j - 1] && DATAS[j - 1] && INNER_PROGRAMACAO[_jsDateToKey(DATAS[j - 1])]) {
            const turnos = INNER_PROGRAMACAO[_jsDateToKey(DATAS[j - 1])];
            innerResult.madrugada = turnos.madrugada;
            innerResult.manha = turnos.manha;
            innerResult.tarde = turnos.tarde;
            innerResult.noite = turnos.noite;
        }
        result.push(innerResult);
    }

    return result;
}

function _buildDestinosArray() {
    const result = [];
    _loadDestinosOrdenados();
    for (const destino of DESTINOS_ATIVOS) {
        result.push({
            destinosID: destino.destinosID
        })
    }
    return result;
}

function _buildLineupObject() {
    const childIDs = _getChildIDs("lineup-box");

    let result = {};

    for (const child of childIDs) {
        const i = child.split("-")[1];
        const selectValue = getID(`lineup-local-${i}`).value || 'generico';
        if (!result[selectValue]) {
            result[selectValue] = {
                data: [],
                genero: [],
                head: [],
                horario: [],
                midia: [],
                nome: [],
                nota: [],
                palco: [],
                site: [],
            };
        }
    }

    for (let i = 0; i < childIDs.length; i++) {
        const j = _getJ(childIDs[i]);
        const selectValue = getID(`lineup-local-${j}`).value || 'generico';

        const divHead = getID(`lineup-headliner-${j}`);
        result[selectValue].head.push(divHead && divHead.checked);

        const divNome = getID(`lineup-nome-${j}`);
        const valueNome = divNome ? _returnEmptyIfNoValue(divNome.value) : "";
        result[selectValue].nome.push(valueNome);

        const valueGenero = _getDynamicSelectValue('lineup', 'genero', j);
        result[selectValue].genero.push(valueGenero);

        const valuePalco = _getDynamicSelectValue('lineup', 'palco', j);
        result[selectValue].palco.push(valuePalco);

        const divData = getID(`lineup-data-${j}`);
        const valueData = divData ? _returnEmptyIfNoValue(divData.value) : "";
        result[selectValue].data.push(valueData);

        const divInicio = getID(`lineup-horario-${j}`);
        const valueInicio = divInicio ? _returnEmptyIfNoValue(divInicio.value) : "";

        const divFim = getID(`lineup-horario-fim-${j}`);
        const valueFim = divFim ? _returnEmptyIfNoValue(divFim.value) : "";

        if (valueInicio || valueFim) {
            result[selectValue].horario.push(`${valueInicio} - ${valueFim}`);
        } else {
            result[selectValue].horario.push("");
        }

        divMidia = getID(`lineup-midia-${j}`);
        valueMidia = divMidia ? _returnEmptyIfNoValue(divMidia.value) : "";
        result[selectValue].midia.push(valueMidia);

        divNota = getID(`lineup-nota-${j}`);
        valueNota = divNota ? _returnEmptyIfNoValue(divNota.value) : "";
        result[selectValue].nota.push(valueNota);
    }

    return result;
}

function _buildGaleriaObject() {
    let result = {
        descricoes: [],
        categorias: [],
        imagens: [],
        titulos: []
    }

    const childIDs = _getChildIDs('galeria-box');
    for (var i = 0; i < childIDs.length; i++) {
        const j = _getJ(childIDs[i]);

        const descricao = getID(`galeria-descricao-${j}`).value || "";
        result.descricoes.push(descricao);

        const categoria = _getDynamicSelectValue('galeria', 'categoria', j);
        result.categorias.push(categoria);

        const titulo = getID(`galeria-titulo-${j}`).value || "";
        result.titulos.push(titulo);

        if (getID(`enable-upload-galeria-${j}`).checked) {
            TO_UPLOAD.galeria = true;
            result.imagens.push({});
            UPLOAD_FILES.galeria.push(j)
        } else {
            result.imagens.push(_getImageObject(getID(`link-galeria-${j}`).value, 'galeria'));
            UPLOAD_FILES.galeria.push({});
        }
    }

    return result;
}

async function _setViagem() {
    if (getID('habilitado-destinos').checked) {
        for (const child of _getChildIDs('com-destinos')) {
            const i = parseInt(child.split("-")[2]);
            _setRequired(`select-destinos-${i}`)
        }
    }

    CUSTOM_UPLOADS = {
        hospedagens: TO_UPLOAD.hospedagens ? await _uploadViagemItens(UPLOAD_FILES.hospedagens, 'hospedagens') : [],
        galeria: TO_UPLOAD.galeria > 0 ? await _uploadGaleria(UPLOAD_FILES.galeria) : []
    }

    _setDocumento('viagens');
}

async function _setGastos() {
    await _buildGastosObject();
    if (FIRESTORE_GASTOS_DATA) {
        return await _update(`gastos/${DOCUMENT_ID}`, FIRESTORE_GASTOS_NEW_DATA);
    } else {
        return await _create('gastos', FIRESTORE_GASTOS_NEW_DATA, DOCUMENT_ID);
    }
}