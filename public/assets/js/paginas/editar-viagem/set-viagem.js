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
        links: _buildLinksObject(),
        modulos: _buildModulosObject(),
        moeda: getID(`moeda`).value,
        programacoes: _buildProgramacaoObject(),
        quantidadePessoas: !isNaN(getID(`quantidadePessoas`).value) ? parseInt(getID(`quantidadePessoas`).value) : 1,
        titulo: getID(`titulo`).value,
        transportes: _buildTransporteObject(),
        versao: {
            ultimaAtualizacao: new Date().toISOString()
        },
        visibilidade: _buildVisibilidadeObject()
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
        let result = [];
        for (const tipoObj of INNER_GASTOS[categoria]) {
            result = [...result, ...tipoObj.gastos];
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
        programacao: getID('habilitado-programacao').checked,
        resumo: true,
        transportes: getID('habilitado-transporte').checked,
        galeria: getID('habilitado-galeria').checked
    }
}

function _buildCoresObject() {
    return {
        ativo: getID('habilitado-cores').checked,
        claro: getID('claro').value,
        escuro: getID('escuro').value
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
            const valueEditor = divEditor ? divEditor.value || '' : "";
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
            id: _getOrCreateCategoriaID('transporte', j),
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
            id: _getOrCreateCategoriaID('hospedagens', j),
            imagem: _getHospedagemImage('hospedagens', j),
            reserva: getID(`reserva-hospedagens-${j}`).value,
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
    let result = [];

    for (const j of _getJs('lineup-box')) {
        const data = getID(`lineup-data-${j}`).value;
        result.push({
            id: _getOrCreateCategoriaID('lineup', j),
            headliner: getID(`lineup-headliner-${j}`).checked,
            nome: getID(`lineup-nome-${j}`).value,
            local: getID(`lineup-local-${j}`).value,
            genero: getID(`lineup-genero-select-${j}`).value,
            palco: getID(`lineup-palco-select-${j}`).value,
            data: data ? _keyToFirestoreDate(data) : "",
            inicio: getID(`lineup-inicio-${j}`).value,
            fim: getID(`lineup-fim-${j}`).value,
            midia: getID(`lineup-midia-${j}`).value,
            nota: getID(`lineup-nota-${j}`).value,
        })
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

function _buildVisibilidadeObject() {
    return {
        claro: getID('dark-and-light').checked || getID('light-exclusive').checked,
        escuro: getID('dark-and-light').checked || getID('dark-exclusive').checked
    }
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