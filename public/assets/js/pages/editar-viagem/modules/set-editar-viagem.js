var uploadWallpapaer = false;
var uploadLogo = false;

function _buildTripObject() {
    let result = {
        viagem: {
            id: "",
            data: {
                cidades: [],
                compartilhamento: {},
                cores: {},
                fim: {},
                hospedagensRef: "",
                imagem: {},
                inicio: {},
                links: {
                    attachments: "",
                    documents: "",
                    drive: "",
                    maps: "",
                    pdf: "",
                    ppt: "",
                    sheet: "",
                    vacina: ""
                },
                modulos: {},
                moeda: "",
                programacoesRef: "",
                quantidadePessoas: 1,
                titulo: "",
                transportesRef: ""
            }
        },
        transporte: {
            id: "",
            data: {}
        },
        hospedagem: {
            id: "",
            data: {
                codigos: [],
                datas: [],
                endereco: [],
                hospedagem: [],
                links: [],
                reservas: [],
                viagem: ""
            }
        },
        programacao: {
            id: "",
            data: {
                programacao: [],
                viagem: ""
            }
        }
    }

    result.viagem.data.modulos = {
        hospedagens: document.getElementById('habilitado-hospedagem').checked,
        passeios: document.getElementById('habilitado-passeios').checked,
        programacao: document.getElementById('habilitado-programacao').checked,
        resumo: true,
        transportes: document.getElementById('habilitado-transporte').checked
    }

    const divTitulo = document.getElementById(`titulo`);
    const valueTitulo = divTitulo ? _returnEmptyIfNoValue(divTitulo.value) : "";
    result.viagem.data.titulo = valueTitulo;

    const divMoeda = document.getElementById(`moeda`);
    const valueMoeda = divMoeda ? _returnEmptyIfNoValue(divMoeda.value) : "";
    result.viagem.data.moeda = valueMoeda;

    const divInicio = document.getElementById(`inicio`);
    const valueInicio = divInicio ? _returnEmptyIfNoValue(divInicio.value) : "";
    result.viagem.data.inicio = _formattedDateToFirestoreDate(valueInicio);

    const divFim = document.getElementById(`fim`);
    const valueFim = divFim ? _returnEmptyIfNoValue(divFim.value) : "";
    result.viagem.data.fim = _formattedDateToFirestoreDate(valueFim);

    const divQuantidadePessoas = document.getElementById(`quantidadePessoas`);
    const valueQuantidadePessoas = divQuantidadePessoas ? _returnEmptyIfNoValue(divQuantidadePessoas.value) : "";
    result.viagem.data.quantidadePessoas = !isNaN(valueQuantidadePessoas) ? parseInt(valueQuantidadePessoas) : 0;

    result.viagem.data.compartilhamento = _buildCompartilhamentoObject();
    result.viagem.data.imagem = _buildImagemObject();
    
    result.viagem.data.cores = {
        claro: _returnEmptyIfNoValue(document.getElementById('claro').value),
        escuro: _returnEmptyIfNoValue(document.getElementById('escuro').value)
    }

    result.transporte.data = _buildTransporteObject();
    result.hospedagem.data = _buildHospedagemObject();
    result.programacao.data = _buildProgramacaoObject();
    result.viagem.data.cidades = _buildCidadesArray();

    if (tripID) {
        const path = `viagens/${tripID}`;
        result.viagem.id = path;
        result.transporte.data.viagem = path;
        result.hospedagem.data.viagem = path;
        result.programacao.data.viagem = path;

        if (FIRESTORE_DATA) {
            const hospedagensRef = _firestoreReferencetoPath(FIRESTORE_DATA.hospedagensRef);
            const programacoesRef = _firestoreReferencetoPath(FIRESTORE_DATA.programacoesRef);
            const transportesRef = _firestoreReferencetoPath(FIRESTORE_DATA.transportesRef);
    
            result.viagem.data.hospedagensRef = hospedagensRef;
            result.viagem.data.programacoesRef = programacoesRef;
            result.viagem.data.transportesRef = transportesRef;
    
            result.hospedagem.id = hospedagensRef;
            result.programacao.id = programacoesRef;
            result.transporte.id = transportesRef;
        }
    }

    return result;
}

function _buildCompartilhamentoObject() {
    const publica = document.getElementById('habilitado-publico').checked;
    const editores = document.getElementById('habilitado-editores').checked;
    var editoresArray = [];

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
        dono: '',
        editores: editoresArray
    }
}

function _buildImagemObject() {
    let result = {
        altura: '250px',
        ativo: false,
        background: '',
        claro: '',
        escuro: '',
    }

    if (FIRESTORE_DATA) {
        result.ativo = FIRESTORE_DATA.imagem.ativo;
        result.background = FIRESTORE_DATA.imagem.background;
        result.altura = FIRESTORE_DATA.imagem.altura;
        result.claro = FIRESTORE_DATA.imagem.claro;
        result.escuro = FIRESTORE_DATA.imagem.escuro;
    }

    if (document.getElementById('wallpaper').value) {
        uploadWallpapaer = true;
    }

    if (document.getElementById('logo').value) {
        uploadLogo = true;
        result.ativo = true;
    }

    return result;
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

        if (document.getElementById(`voo-${j}`).checked) {
            result.transportes.push('voo');
        } else if (document.getElementById(`carro-${j}`).checked) {
            result.transportes.push('carro');
        } else if (document.getElementById(`onibus-${j}`).checked) {
            result.transportes.push('onibus');
        } else {
            result.transportes.push('outro');
        }

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
            passeiosRef: ""
        }

        divSelectPasseios = document.getElementById(`select-passeios-${j}`);
        valueSelectPasseios = divSelectPasseios ? _returnEmptyIfNoValue(divSelectPasseios.value) : "";

        if (valueSelectPasseios && valueSelectPasseios != '0') {
            innerResult.passeiosRef = 'passeios/' + valueSelectPasseios;
            result.push(innerResult);
        }
    }
    
    return result;
}

async function _setViagem() {
    _startLoadingScreen();
    let message;
    _validateRequiredInputs();

    if (!_isModalOpen()) {
        const viagem = _buildTripObject();

        if (tripID && viagem) {
            message = await _updateTrip(viagem);
        } else if (viagem) {
            message = await _newTrip(viagem)
        }
        document.getElementById('modal-inner-text').innerText = message;
        document.getElementById('set-complete').style.display = 'block';
        document.getElementById('voltar-box').style.display = 'none';

        _stopLoadingScreen();
        _openModal('modal');
    }
}