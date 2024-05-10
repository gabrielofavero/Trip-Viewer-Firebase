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
        const childIds = _getChildIDs('habilitado-editores-content');
        for (var i = 0; i < childIds.length; i++) {
            const j = parseInt(childIds[i].split("-")[1]);
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
    let result = {
        datas: [],
        duracoes: [],
        empresas: [],
        idaVolta: [],
        links: [],
        pontos: [],
        reservas: [],
        transportes: [],
        viagem: "",
        visualizacaoSimplificada: true
    }

    if (getID('separar').checked) {
        result.visualizacaoSimplificada = false;
    }

    const childIds = _getChildIDs('transporte-box');

    for (var i = 0; i < childIds.length; i++) {
        const j = parseInt(childIds[i].split("-")[1]);

        if (getID(`ida-${j}`).checked) {
            result.idaVolta.push('ida');
        } else if (getID(`durante-${j}`).checked) {
            result.idaVolta.push('durante');
        } else {
            result.idaVolta.push('volta');
        }

        var data = {
            partida: "",
            chegada: ""
        }

        const partidaData = getID(`partida-${j}`).value;
        const partidaHorario = getID(`partida-horario-${j}`).value;
        const partidaValue = _formattedDateToFirestoreDate(partidaData, partidaHorario);
        data.partida = partidaValue;

        const chegadaData = getID(`chegada-${j}`).value;
        const chegadaHorario = getID(`chegada-horario-${j}`).value;
        const chegadaValue = _formattedDateToFirestoreDate(chegadaData, chegadaHorario);
        data.chegada = chegadaValue;

        result.datas.push(data);

        result.transportes.push(getID(`transporte-tipo-${j}`).value);

        const divDuracao = getID(`transporte-duracao-${j}`);
        const valueDuracao = divDuracao ? _returnEmptyIfNoValue(divDuracao.value) : "";
        result.duracoes.push(valueDuracao);

        const valueEmpresa = _getValueEmpresa(j);
        result.empresas.push(valueEmpresa);

        const divReserva = getID(`reserva-transporte-${j}`);
        const valueReserva = divReserva ? _returnEmptyIfNoValue(divReserva.value) : "";
        result.reservas.push(valueReserva);

        var pontos = {
            partida: "",
            chegada: ""
        }

        const divPontoPartida = getID(`ponto-partida-${j}`);
        const valuePontoPartida = divPontoPartida ? _returnEmptyIfNoValue(divPontoPartida.value) : "";
        pontos.partida = valuePontoPartida;

        const divPontoChegada = getID(`ponto-chegada-${j}`);
        const valuePontoChegada = divPontoChegada ? _returnEmptyIfNoValue(divPontoChegada.value) : "";
        pontos.chegada = valuePontoChegada;

        const divLink = getID(`transporte-link-${j}`);
        const valueLink = divLink ? _returnEmptyIfNoValue(divLink.value) : "";
        result.links.push(valueLink);

        result.pontos.push(pontos);
    }

    return result;
}

function _getValueEmpresa(j) {
    const divSelect = getID(`empresa-select-${j}`);
    const divEmpresa = getID(`empresa-${j}`);

    if (divSelect && divEmpresa) {
        if (divSelect.value == 'outra' || divSelect.value == 'selecione') {
            return _returnEmptyIfNoValue(divEmpresa.value);
        } else {
            return divSelect.value;
        }
    }

    return "";
}

function _buildHospedagemObject() {
    let result = {
        cafe: [],
        codigos: [],
        datas: [],
        descricao: [],
        endereco: [],
        hospedagem: [],
        imagens: [],
        links: [],
        viagem: ""
    }

    const childIds = _getChildIDs('hospedagens-box');

    for (var i = 0; i < childIds.length; i++) {
        const j = parseInt(childIds[i].split("-")[1]);

        const divCafe = getID(`hospedagens-cafe-${j}`);
        result.cafe.push(divCafe.checked);

        const divNome = getID(`hospedagens-nome-${j}`);
        const valueNome = divNome ? _returnEmptyIfNoValue(divNome.value) : "";
        result.hospedagem.push(valueNome);

        const divEndereco = getID(`hospedagens-endereco-${j}`);
        const valueEndereco = divEndereco ? _returnEmptyIfNoValue(divEndereco.value) : "";
        result.endereco.push(valueEndereco);

        const data = {
            checkin: "",
            checkout: ""
        }

        const checkinData = getID(`check-in-${j}`).value;
        const checkinHorario = getID(`check-in-horario-${j}`).value;
        const checkinValue = _formattedDateToFirestoreDate(checkinData, checkinHorario);
        data.checkin = checkinValue;

        const checkoutData = getID(`check-out-${j}`).value;
        const checkoutHorario = getID(`check-out-horario-${j}`).value;
        const checkoutValue = _formattedDateToFirestoreDate(checkoutData, checkoutHorario);
        data.checkout = checkoutValue;

        result.datas.push(data);

        const divCodigo = getID(`hospedagens-codigo-${j}`);
        const valueCodigo = divCodigo ? _returnEmptyIfNoValue(divCodigo.value) : "";
        result.codigos.push(valueCodigo);

        const divDescricao = getID(`hospedagens-descricao-${j}`);
        const valueDescricao = divDescricao ? _returnEmptyIfNoValue(divDescricao.value) : "";
        result.descricao.push(valueDescricao);

        const divLink = getID(`reserva-hospedagens-link-${j}`);
        const valueLink = divLink ? _returnEmptyIfNoValue(divLink.value) : "";
        result.links.push(valueLink);

        if (getID(`enable-upload-hospedagens-${j}`).checked) {
            TO_UPLOAD.hospedagens = true;
            result.imagens.push({});
            UPLOAD_FILES.hospedagens.push(j)
        } else {
            const divImagem = getID(`link-hospedagens-${j}`);
            const valueImagem = divImagem ? _returnEmptyIfNoValue(divImagem.value) : "";
            const valueResult = valueImagem ? _getImageObject(valueImagem, 'hospedagens') : "";

            result.imagens.push(valueResult);
            UPLOAD_FILES.hospedagens.push({});
        }
    }
    return result;
}

function _buildProgramacaoObject() {
    let result = {
        programacao: [],
        viagem: ""
    }

    const childIds = _getChildIDs('programacao-box');

    for (var i = 0; i < childIds.length; i++) {
        const j = parseInt(childIds[i].split("-")[1]);
        let innerResult = {
            manha: [],
            tarde: [],
            noite: [],
            titulo: ""
        }
        divTitulo = getID(`programacao-inner-title-${j}`);
        innerResult.titulo = divTitulo ? _returnEmptyIfNoValue(divTitulo.value) : "";

        const dataOriginal = getID(`programacao-title-${j}`).innerText;
        const dataSplit = dataOriginal.split("/");
        const data = `${dataSplit[2]}-${dataSplit[1]}-${dataSplit[0]}`;
        innerResult.data = _formattedDateToFirestoreDate(data);

        innerResult.manha = _getInnerProgramacao('manha', j);
        innerResult.tarde = _getInnerProgramacao('tarde', j);
        innerResult.noite = _getInnerProgramacao('noite', j);

        result.programacao.push(innerResult);
    }

    return result;
}

function _getInnerProgramacao(turno, j) {
    let array = [];
    for (let i = 1; i <= 3; i++) {
        div = getID(`${turno}-${i}-${j}`);
        value = div ? _returnEmptyIfNoValue(div.value) : "";
        if (value) {
            array.push(value);
        }
    }
    return array;
}

function _buildDestinosArray() {
    let result = [];
    const childIds = _getChildIDs('com-destinos');

    for (var i = 0; i < childIds.length; i++) {
        const j = parseInt(childIds[i].split("-")[2]);
        var innerResult = {
            destinosID: ""
        }

        divSelectDestinos = getID(`select-destinos-${j}`);
        valueSelectDestinos = divSelectDestinos ? _returnEmptyIfNoValue(divSelectDestinos.value) : "";

        if (valueSelectDestinos) {
            innerResult.destinosID = valueSelectDestinos;
            result.push(innerResult);
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
                hyperlink: {
                    name: []
                },
                nome: [],
                nota: [],
                palco: [],
                site: [],
            };
        }
    }

    for (let i = 0; i < childIDs.length; i++) {
        const j = parseInt(childIDs[i].split("-")[1]);
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
        result[selectValue].hyperlink.name.push(valueMidia);

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

    const childIds = _getChildIDs('galeria-box');
    for (var i = 0; i < childIds.length; i++) {
        const j = parseInt(childIds[i].split("-")[1]);

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
        let result;

        if (DOCUMENT_ID && viagem) {
            result = await _updateUserObjectDB(viagem.data, DOCUMENT_ID, "viagens");
        } else if (viagem) {
            result = await _newUserObjectDB(viagem.data, "viagens");
            DOCUMENT_ID = result?.data?.id;
        }

        FIRESTORE_NEW_DATA = viagem.data;
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
                        hospedagens: TO_UPLOAD.hospedagens ? await _uploadHospedagem(UPLOAD_FILES.hospedagens) : [],
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