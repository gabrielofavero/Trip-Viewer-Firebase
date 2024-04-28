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
        hospedagens: document.getElementById('habilitado-hospedagens').checked,
        destinos: document.getElementById('habilitado-destinos').checked,
        lineup: document.getElementById(`habilitado-lineup`).checked,
        programacao: document.getElementById('habilitado-programacao').checked,
        resumo: true,
        transportes: document.getElementById('habilitado-transporte').checked,
        galeria: document.getElementById('habilitado-galeria').checked
    }

    const divTitulo = document.getElementById(`titulo`);
    result.data.titulo = divTitulo ? _returnEmptyIfNoValue(divTitulo.value) : "";

    const divMoeda = document.getElementById(`moeda`);
    result.data.moeda = divMoeda ? _returnEmptyIfNoValue(divMoeda.value) : "";

    const divInicio = document.getElementById(`inicio`);
    const valueInicio = divInicio ? _returnEmptyIfNoValue(divInicio.value) : "";
    result.data.inicio = _formattedDateToFirestoreDate(valueInicio);

    const divFim = document.getElementById(`fim`);
    const valueFim = divFim ? _returnEmptyIfNoValue(divFim.value) : "";
    result.data.fim = _formattedDateToFirestoreDate(valueFim);

    const divQuantidadePessoas = document.getElementById(`quantidadePessoas`);
    const valueQuantidadePessoas = divQuantidadePessoas ? _returnEmptyIfNoValue(divQuantidadePessoas.value) : "";
    result.data.quantidadePessoas = !isNaN(valueQuantidadePessoas) ? parseInt(valueQuantidadePessoas) : 0;

    result.data.compartilhamento = await _buildCompartilhamentoObject();
    result.data.imagem = _buildImagemObject();
    result.data.links = _buildLinksObject();

    result.data.cores = {
        ativo: document.getElementById('habilitado-cores').checked,
        claro: _returnEmptyIfNoValue(document.getElementById('claro').value),
        escuro: _returnEmptyIfNoValue(document.getElementById('escuro').value)
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
    const publica = document.getElementById('habilitado-publico').checked;
    const editores = document.getElementById('habilitado-editores').checked;
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
            const divEditor = document.getElementById(`editores-email-${j}`);
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
        ativo: document.getElementById('habilitado-imagens').checked,
        altura: `${document.getElementById('logo-tamanho').value * 25}px`,
        background: document.getElementById('link-background').value || "",
        claro: document.getElementById('link-logo-light').value || "",
        escuro: document.getElementById('link-logo-dark').value || "",
    }

    if (document.getElementById('upload-background').value) {
        TO_UPLOAD.background = true;
    } else if (result.background && FIREBASE_IMAGES.background && !result.background.includes(FIREBASE_IMAGE_ORIGIN)) {
        CLEAR_IMAGES.background = true;
    }

    if (document.getElementById('upload-logo-light').value) {
        TO_UPLOAD.logoLight = true;
    } else if (result.claro && FIREBASE_IMAGES.claro && !result.claro.includes(FIREBASE_IMAGE_ORIGIN)) {
        CLEAR_IMAGES.claro = true;
    }

    if (document.getElementById('upload-logo-dark').value) {
        TO_UPLOAD.logoDark = true;
    } else if (result.escuro && FIREBASE_IMAGES.escuro && !result.escuro.includes(FIREBASE_IMAGE_ORIGIN)) {
        CLEAR_IMAGES.escuro = true;
    }

    return result;
}

function _buildLinksObject() {
    return {
        ativo: document.getElementById('habilitado-links').checked,
        attachments: document.getElementById('link-attachments').value || "",
        drive: document.getElementById('link-drive').value || "",
        maps: document.getElementById('link-maps').value || "",
        pdf: document.getElementById('link-pdf').value || "",
        ppt: document.getElementById('link-ppt').value || "",
        sheet: document.getElementById('link-sheet').value || "",
        vacina: document.getElementById('link-vacina').value || "",
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

    if (document.getElementById('separar').checked) {
        result.visualizacaoSimplificada = false;
    }

    const childIds = _getChildIDs('transporte-box');

    for (var i = 0; i < childIds.length; i++) {
        const j = parseInt(childIds[i].split("-")[1]);

        if (document.getElementById(`ida-${j}`).checked) {
            result.idaVolta.push('ida');
        } else if (document.getElementById(`durante-${j}`).checked) {
            result.idaVolta.push('durante');
        } else {
            result.idaVolta.push('volta');
        }

        var data = {
            partida: "",
            chegada: ""
        }

        const partidaData = document.getElementById(`partida-${j}`).value;
        const partidaHorario = document.getElementById(`partida-horario-${j}`).value;
        const partidaValue = _formattedDateToFirestoreDate(partidaData, partidaHorario);
        data.partida = partidaValue;

        const chegadaData = document.getElementById(`chegada-${j}`).value;
        const chegadaHorario = document.getElementById(`chegada-horario-${j}`).value;
        const chegadaValue = _formattedDateToFirestoreDate(chegadaData, chegadaHorario);
        data.chegada = chegadaValue;

        result.datas.push(data);
        
        result.transportes.push(document.getElementById(`transporte-codigo-${j}`).value);

        const divDuracao = document.getElementById(`transporte-duracao-${j}`);
        const valueDuracao = divDuracao ? _returnEmptyIfNoValue(divDuracao.value) : "";
        result.duracoes.push(valueDuracao);

        const valueEmpresa = _getValueEmpresa(j);
        result.empresas.push(valueEmpresa.toLowerCase());

        const divReserva = document.getElementById(`reserva-transp-${j}`);
        const valueReserva = divReserva ? _returnEmptyIfNoValue(divReserva.value) : "";
        result.reservas.push(valueReserva);

        var pontos = {
            partida: "",
            chegada: ""
        }

        const divPontoPartida = document.getElementById(`ponto-partida-${j}`);
        const valuePontoPartida = divPontoPartida ? _returnEmptyIfNoValue(divPontoPartida.value) : "";
        pontos.partida = valuePontoPartida;

        const divPontoChegada = document.getElementById(`ponto-chegada-${j}`);
        const valuePontoChegada = divPontoChegada ? _returnEmptyIfNoValue(divPontoChegada.value) : "";
        pontos.chegada = valuePontoChegada;

        const divLink = document.getElementById(`link-transp-${j}`);
        const valueLink = divLink ? _returnEmptyIfNoValue(divLink.value) : "";
        result.links.push(valueLink);

        result.pontos.push(pontos);
    }

    return result;
}

function _getValueEmpresa(j) {
    const divSelect = document.getElementById(`empresa-select-${j}`);
    const divEmpresa = document.getElementById(`empresa-${j}`);

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
        codigos: [],
        datas: [],
        descricao: [],
        endereco: [],
        hospedagem: [],
        imagens: [],
        links: [],
        reservas: [],
        viagem: ""
    }

    const childIds = _getChildIDs('hospedagens-box');

    for (var i = 0; i < childIds.length; i++) {
        const j = parseInt(childIds[i].split("-")[1]);

        const divNome = document.getElementById(`hospedagens-nome-${j}`);
        const valueNome = divNome ? _returnEmptyIfNoValue(divNome.value) : "";
        result.hospedagem.push(valueNome);

        const divEndereco = document.getElementById(`hospedagens-endereco-${j}`);
        const valueEndereco = divEndereco ? _returnEmptyIfNoValue(divEndereco.value) : "";
        result.endereco.push(valueEndereco);

        const data = {
            checkin: "",
            checkout: ""
        }

        const checkinData = document.getElementById(`check-in-${j}`).value;
        const checkinHorario = document.getElementById(`check-in-horario-${j}`).value;
        const checkinValue = _formattedDateToFirestoreDate(checkinData, checkinHorario);
        data.checkin = checkinValue;

        const checkoutData = document.getElementById(`check-out-${j}`).value;
        const checkoutHorario = document.getElementById(`check-out-horario-${j}`).value;
        const checkoutValue = _formattedDateToFirestoreDate(checkoutData, checkoutHorario);
        data.checkout = checkoutValue;

        result.datas.push(data);

        const divCodigo = document.getElementById(`hospedagens-codigo-${j}`);
        const valueCodigo = divCodigo ? _returnEmptyIfNoValue(divCodigo.value) : "";
        result.codigos.push(valueCodigo);

        const divDescricao = document.getElementById(`hospedagens-descricao-${j}`);
        const valueDescricao = divDescricao ? _returnEmptyIfNoValue(divDescricao.value) : "";
        result.descricao.push(valueDescricao);

        const divReserva = document.getElementById(`reserva-hospedagens-${j}`);
        const valueReserva = divReserva ? _returnEmptyIfNoValue(divReserva.value) : "";
        result.reservas.push(valueReserva);

        const divLink = document.getElementById(`link-reserva-hospedagens-${j}`);
        const valueLink = divLink ? _returnEmptyIfNoValue(divLink.value) : "";
        result.links.push(valueLink);

        if (document.getElementById(`enable-upload-hospedagens-${j}`).checked) {
            TO_UPLOAD.hospedagens = true;
            result.imagens.push({});
            UPLOAD_FILES.hospedagens.push(j)
        } else {
            const divImagem = document.getElementById(`link-hospedagens-${j}`);
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
        divTitulo = document.getElementById(`programacao-inner-title-${j}`);
        innerResult.titulo = divTitulo ? _returnEmptyIfNoValue(divTitulo.value) : "";

        const dataOriginal = document.getElementById(`programacao-title-${j}`).innerText;
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
        div = document.getElementById(`${turno}-${i}-${j}`);
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

        divSelectDestinos = document.getElementById(`select-destinos-${j}`);
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
        const selectValue = document.getElementById(`lineup-local-${i}`).value || 'generico';
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
        const selectValue = document.getElementById(`lineup-local-${j}`).value || 'generico';

        const divHead = document.getElementById(`lineup-headliner-${j}`);
        const valueHead = (divHead && divHead.checked) ? "✔" : "";
        result[selectValue].head.push(valueHead);

        const divNome = document.getElementById(`lineup-nome-${j}`);
        const valueNome = divNome ? _returnEmptyIfNoValue(divNome.value) : "";
        result[selectValue].nome.push(valueNome);

        const valueGenero = _getDynamicSelectValue('lineup', 'genero', j);
        result[selectValue].genero.push(valueGenero);

        const valuePalco = _getDynamicSelectValue('lineup', 'palco', j);
        result[selectValue].palco.push(valuePalco);

        const divData = document.getElementById(`lineup-data-${j}`);
        const valueData = divData ? _returnEmptyIfNoValue(divData.value) : "";
        result[selectValue].data.push(valueData);

        const divInicio = document.getElementById(`lineup-horario-${j}`);
        const valueInicio = divInicio ? _returnEmptyIfNoValue(divInicio.value) : "";

        const divFim = document.getElementById(`lineup-horario-fim-${j}`);
        const valueFim = divFim ? _returnEmptyIfNoValue(divFim.value) : "";

        if (valueInicio || valueFim) {
            result[selectValue].horario.push(`${valueInicio} - ${valueFim}`);
        } else {
            result[selectValue].horario.push("");
        }

        divMidia = document.getElementById(`lineup-midia-${j}`);
        valueMidia = divMidia ? _returnEmptyIfNoValue(divMidia.value) : "";
        result[selectValue].hyperlink.name.push(valueMidia);

        divNota = document.getElementById(`lineup-nota-${j}`);
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

        const descricao = document.getElementById(`galeria-descricao-${j}`).value || "";
        result.descricoes.push(descricao);

        const categoria = _getDynamicSelectValue('galeria', 'categoria', j);
        result.categorias.push(categoria);

        const titulo = document.getElementById(`galeria-titulo-${j}`).value || "";
        result.titulos.push(titulo);

        if (document.getElementById(`enable-upload-galeria-${j}`).checked) {
            TO_UPLOAD.galeria = true;
            result.imagens.push({});
            UPLOAD_FILES.galeria.push(j)
        } else {
            const divImagem = document.getElementById(`link-galeria-${j}`);
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

    if (document.getElementById('habilitado-destinos').checked) {
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
            wasSaved = true;

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

        document.getElementById('modal-inner-text').innerHTML = message;

        _stopLoadingScreen();
        _openModal('modal');
    }
}