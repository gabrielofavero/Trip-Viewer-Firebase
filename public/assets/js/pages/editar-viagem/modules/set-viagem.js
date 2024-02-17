var uploadBackground = false;
var uploadLogoLight = false;
var uploadLogoDark = false;
var uploadGaleria = [];

var CLEAR_IMAGES = {
    background: false,
    claro: false,
    escuro: false
}

async function _buildTripObject() {
    let result = {
        id: "",
        data: {
            cidades: [],
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
        hospedagens: document.getElementById('habilitado-hospedagem').checked,
        passeios: document.getElementById('habilitado-passeios').checked,
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
    result.data.cidades = _buildCidadesArray();
    result.data.galeria = _buildGaleriaObject();

    if (tripID) {
        result.id = tripID;
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
        uploadBackground = true;
    } else if (result.background && FIREBASE_IMAGES.background && !result.background.includes(FIREBASE_IMAGE_ORIGIN)) {
        CLEAR_IMAGES.background = true;
    }

    if (document.getElementById('upload-logo-light').value) {
        uploadLogoLight = true;
    } else if (result.claro && FIREBASE_IMAGES.claro && !result.claro.includes(FIREBASE_IMAGE_ORIGIN)) {
        CLEAR_IMAGES.claro = true;
    }

    if (document.getElementById('upload-logo-dark').value) {
        uploadLogoDark = true;
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
        empresas: [],
        idaVolta: [],
        pontos: [],
        reservas: [],
        trajetos: [],
        transportes: [],
        viagem: ""
    }

    const childIds = _getChildIDs('transporte-box');

    for (var i = 0; i < childIds.length; i++) {
        const j = parseInt(childIds[i].split("-")[1]);

        if (document.getElementById(`ida-${j}`).checked) {
            result.idaVolta.push('ida');
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

        const divEmpresa = document.getElementById(`empresa-${j}`);
        const valueEmpresa = divEmpresa ? _returnEmptyIfNoValue(divEmpresa.value) : "";
        result.empresas.push(valueEmpresa.toLowerCase());

        const divReserva = document.getElementById(`reserva-transp-${j}`);
        const valueReserva = divReserva ? _returnEmptyIfNoValue(divReserva.value) : "";
        result.reservas.push(valueReserva);

        const divCidadePartida = document.getElementById(`cidade-partida-${j}`);
        const valueCidadePartida = divCidadePartida ? _returnEmptyIfNoValue(divCidadePartida.value) : "";

        const divCidadeChegada = document.getElementById(`cidade-chegada-${j}`);
        const valueCidadeChegada = divCidadeChegada ? _returnEmptyIfNoValue(divCidadeChegada.value) : "";

        if (valueCidadePartida && valueCidadeChegada) {
            result.trajetos.push(`${valueCidadePartida} → ${valueCidadeChegada}`);
        }

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

        result.pontos.push(pontos);
    }

    return result;
}

function _buildHospedagemObject() {
    let result = {
        codigos: [],
        datas: [],
        endereco: [],
        hospedagem: [],
        links: [],
        reservas: [],
        viagem: ""
    }

    const childIds = _getChildIDs('hospedagem-box');

    for (var i = 0; i < childIds.length; i++) {
        const j = parseInt(childIds[i].split("-")[1]);

        const divNome = document.getElementById(`hospedagem-nome-${j}`);
        const valueNome = divNome ? _returnEmptyIfNoValue(divNome.value) : "";
        result.hospedagem.push(valueNome);

        const divEndereco = document.getElementById(`hospedagem-endereco-${j}`);
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

        const divCodigo = document.getElementById(`hospedagem-codigo-${j}`);
        const valueCodigo = divCodigo ? _returnEmptyIfNoValue(divCodigo.value) : "";
        result.codigos.push(valueCodigo);

        const divReserva = document.getElementById(`reserva-hospedagem-${j}`);
        const valueReserva = divReserva ? _returnEmptyIfNoValue(divReserva.value) : "";
        result.reservas.push(valueReserva);

        const divLink = document.getElementById(`link-hospedagem-${j}`);
        const valueLink = divLink ? _returnEmptyIfNoValue(divLink.value) : "";
        result.links.push(valueLink);
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

function _buildCidadesArray() {
    let result = [];
    const childIds = _getChildIDs('com-passeios');

    for (var i = 0; i < childIds.length; i++) {
        const j = parseInt(childIds[i].split("-")[2]);
        var innerResult = {
            passeiosID: ""
        }

        divSelectPasseios = document.getElementById(`select-passeios-${j}`);
        valueSelectPasseios = divSelectPasseios ? _returnEmptyIfNoValue(divSelectPasseios.value) : "";

        if (valueSelectPasseios) {
            innerResult.passeiosID = valueSelectPasseios;
            result.push(innerResult);
        }
    }

    return result;
}

function _buildGaleriaObject() {
    let result = {
        filtros: [],
        imagens: []
    }

    const childIds = _getChildIDs('galeria-box');
    for (var i = 0; i < childIds.length; i++) {
        const j = parseInt(childIds[i].split("-")[1]);
        const filter = _firstCharToUpperCaseAllWords(document.getElementById(`galeria-categoria-${j}`).value);
        const title = document.getElementById(`galeria-titulo-${j}`).value;
        const descricao = document.getElementById(`galeria-descricao-${j}`).value;

        var link = "";

        if (document.getElementById(`enable-link-galeria-${j}`).checked) {
            link = document.getElementById(`link-galeria-${j}`).value;
        } else {
            uploadGaleria.push(j);
        }

        if (!result.filtros.includes(filter)) {
            result.filtros.push(filter);
        }

        result.imagens.push({
            link: link,
            titulo: title,
            descricao: descricao,
            filtro: filter
        });
    }

    return result;
}

async function _setViagem() {
    _startLoadingScreen();

    if (document.getElementById('habilitado-passeios').checked) {
        for (const child of _getChildIDs('com-passeios')) {
            const i = parseInt(child.split("-")[2]);
            _setRequired(`select-passeios-${i}`)
        }
    }

    _validateRequiredFields();

    if (!_isModalOpen()) {
        const viagem = await _buildTripObject();
        let result;

        if (tripID && viagem) {
            result = await _updateUserObjectDB(viagem.data, viagem.id, "viagens");
        } else if (viagem) {
            result = await _newUserObjectDB(viagem.data, "viagens");
            tripID = result?.data?.id;
        }

        let message = result.message;

        if (result.success == true) {
            wasSaved = true;

            if (uploadLogoLight || uploadLogoDark || uploadBackground || uploadGaleria.length > 0) {
                let newMessage = '';
                let logoLight = '';
                let logoDark = ''
                let background = '';
                let galeria = [];

                if (uploadLogoLight) {
                    logoLight = await _uploadLogoLight(tripID, 'trips');
                }

                if (uploadLogoDark) {
                    logoDark = await _uploadLogoDark(tripID, 'trips');
                }

                if (uploadBackground) {
                    background = await _uploadBackground(tripID, 'trips');
                }

                if (uploadGaleria.length > 0) {
                    galeria = await _uploadGaleria(tripID, uploadGaleria);
                }

                body = {
                    id: tripID,
                    type: "viagens",
                    background: background,
                    logoLight: logoLight,
                    logoDark: logoDark,
                    galeria: galeria
                }

                newMessage = await _updateImages(body)

                if (!newMessage.includes('sucesso')) {
                    message += '. Falha no upload de imagem(s): ' + newMessage;
                } else {
                    await _checkAndClearFirebaseImages(tripID);
                }
            }
        }

        document.getElementById('modal-inner-text').innerText = message;

        _stopLoadingScreen();
        _openModal('modal');
    }
}