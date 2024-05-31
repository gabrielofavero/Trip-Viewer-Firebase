var TO_UPLOAD = {
    background: false,
    logoLight: false,
    logoDark: false,
    hospedagens: false,
    galeria: false
};

var UPLOAD_FILES = {
    hospedagens: [],
    galeria: []
};

var CLEAR_IMAGES = {
    background: false,
    claro: false,
    escuro: false
}

var FIRESTORE_NEW_DATA = {};

async function _buildTripObject() {
    let result = {
        id: "",
        data: {
            destinos: [],
            compartilhamento: {},
            cores: {},
            fim: {},
            galeria: {},
            hospedagens: {
                codigos: [],
                datas: [],
                endereco: [],
                hospedagem: [],
                links: [],
                reservas: [],
                viagem: ""
            },
            imagem: {},
            inicio: {},
            lineup: {},
            links: {},
            modulos: {},
            moeda: "",
            programacoes: {
                programacao: [],
                viagem: ""
            },
            quantidadePessoas: 1,
            titulo: "",
            transportes: {},
            versao: {
                ultimaAtualizacao: new Date().toISOString()
            }
        }
    }

    result.data.modulos = {
        hospedagens: getID('habilitado-hospedagens').checked,
        destinos: getID('habilitado-destinos').checked,
        lineup: getID(`habilitado-lineup`).checked,
        programacao: getID('habilitado-programacao').checked,
        resumo: true,
        transportes: getID('habilitado-transporte').checked,
        galeria: getID('habilitado-galeria').checked
    }

    const divTitulo = getID(`titulo`);
    result.data.titulo = divTitulo ? _returnEmptyIfNoValue(divTitulo.value) : "";

    const divMoeda = getID(`moeda`);
    result.data.moeda = divMoeda ? _returnEmptyIfNoValue(divMoeda.value) : "";

    const divInicio = getID(`inicio`);
    const valueInicio = divInicio ? _returnEmptyIfNoValue(divInicio.value) : "";
    result.data.inicio = _formattedDateToFirestoreDate(valueInicio);

    const divFim = getID(`fim`);
    const valueFim = divFim ? _returnEmptyIfNoValue(divFim.value) : "";
    result.data.fim = _formattedDateToFirestoreDate(valueFim);

    const divQuantidadePessoas = getID(`quantidadePessoas`);
    const valueQuantidadePessoas = divQuantidadePessoas ? _returnEmptyIfNoValue(divQuantidadePessoas.value) : "";
    result.data.quantidadePessoas = !isNaN(valueQuantidadePessoas) ? parseInt(valueQuantidadePessoas) : 0;

    result.data.compartilhamento = await _buildCompartilhamentoObject();
    result.data.imagem = _buildImagemObject();
    result.data.links = _buildLinksObject();

    result.data.cores = {
        ativo: getID('habilitado-cores').checked,
        claro: _returnEmptyIfNoValue(getID('claro').value),
        escuro: _returnEmptyIfNoValue(getID('escuro').value)
    }

    result.data.transportes = _buildTransporteObject();
    result.data.hospedagens = _buildHospedagemObject();
    result.data.programacoes = _buildProgramacaoObject();
    result.data.destinos = _buildDestinosArray();
    result.data.lineup = _buildLineupObject();
    result.data.galeria = _buildGaleriaObject();

    if (DOCUMENT_ID) {
        result.id = DOCUMENT_ID;
    }

    return result;
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
        visualizacaoSimplificada: getID('separar').checked
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
            id: _getCategoriaID('transporte', j),
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
            id: _getCategoriaID('hospedagens', j),
            imagem: _getImage('hospedagens', j),
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
    let result = [];
    const childIDs = _getChildIDs('destinos-checkboxes');

    for (const child of childIDs) {
        const j = _getJ(child);
        const checkbox = getID(`check-destinos-${j}`);
        if (checkbox.checked) {
            result.push({
                destinosID: checkbox.value
            })
        }
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
            const divImagem = getID(`link-galeria-${j}`);
            const valueImagem = divImagem ? _returnEmptyIfNoValue(divImagem.value) : "";
            const valueResult = valueImagem ? _getImageObject(valueImagem, 'galeria') : "";

            result.imagens.push(valueResult);
            UPLOAD_FILES.galeria.push({});
        }
    }

    return result;
}

async function _setViagem() {
    _startLoadingScreen(false);

    if (getID('habilitado-destinos').checked) {
        for (const child of _getChildIDs('com-destinos')) {
            const i = parseInt(child.split("-")[2]);
            _setRequired(`select-destinos-${i}`)
        }
    }

    _validateRequiredFields();

    if (!_isModalOpen()) {
        const viagem = await _buildTripObject();
        FIRESTORE_NEW_DATA = viagem.data;
        let result;

        if (DOCUMENT_ID && viagem) {
            result = await _updateUserObjectDB(viagem.data, DOCUMENT_ID, "viagens");
        } else if (viagem) {
            result = await _newUserObjectDB(viagem.data, "viagens");
            DOCUMENT_ID = result?.data?.id;
        }

        let message = result.message;

        if (result.success == true) {
            WAS_SAVED = true;

            try {
                const body = {
                    id: DOCUMENT_ID,
                    type: "viagens",
                    background: TO_UPLOAD.background ? await _uploadBackground('viagens') : '',
                    logoLight: TO_UPLOAD.logoLight ? await _uploadLogoLight('viagens') : '',
                    logoDark: TO_UPLOAD.logoDark ? await _uploadLogoDark('viagens') : '',
                    custom: {
                        hospedagens: TO_UPLOAD.hospedagens ? await _uploadViagemItens(UPLOAD_FILES.hospedagens, 'hospedagens') : [],
                        galeria: TO_UPLOAD.galeria > 0 ? await _uploadGaleria(UPLOAD_FILES.galeria) : []
                    }
                }

                await _updateImages(body);
                await _deleteUnusedImages(FIRESTORE_DATA, await _get(`viagens/${DOCUMENT_ID}`));

            } catch (error) {
                IMAGE_UPLOAD_ERROR.status = true;
                console.error(error);
            }

            if (IMAGE_UPLOAD_ERROR.status === true) {
                const errorsHTML = _printObjectHTML(IMAGE_UPLOAD_ERROR.messages);
                message += `, porém houve um erro ao tentar salvar as imagens: ${errorsHTML}`;
            }
        }

        getID('modal-inner-text').innerHTML = message;

        _stopLoadingScreen();
        _openModal('modal');
    }
}

function _getImage(tipo, j) {
    if (getID(`enable-upload-${tipo}-${j}`).checked) {
        TO_UPLOAD.hospedagens = true;
        UPLOAD_FILES.hospedagens.push(j)
        return {};
    }
    UPLOAD_FILES.hospedagens.push({});

    const divImagem = getID(`link-${tipo}-${j}`);
    const valueImagem = divImagem ? _returnEmptyIfNoValue(divImagem.value) : "";
    return valueImagem ? _getImageObject(valueImagem, tipo) : "";
}