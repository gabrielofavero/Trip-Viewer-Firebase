var FIRESTORE_NEW_DATA = {};
var FIRESTORE_GASTOS_NEW_DATA = {};
var FIRESTORE_GASTOS_PROTECTED_NEW_DATA = {};

async function _buildTripObject() {
    FIRESTORE_NEW_DATA = {
        destinos: _buildDestinosArray(),
        compartilhamento: await _buildCompartilhamentoObject(),
        cores: _buildCoresObject(),
        fim: getID(`fim`).value ? _formattedDateToDateObject(getID(`fim`).value) : "",
        gastosPin: getID('pin-enable').checked,
        galeria: _buildGaleriaObject(),
        hospedagens: _buildHospedagemObject(),
        imagem: _buildImagemObject(),
        inicio: getID(`inicio`).value ? _formattedDateToDateObject(getID(`inicio`).value) : "",
        links: _buildLinksObject(),
        modulos: _buildModulosObject(),
        moeda: getID(`moeda`).value,
        programacoes: _buildProgramacaoObject(),
        pessoas: TRAVELERS,
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
}

function _buildGastosProtectedObject() {
    FIRESTORE_GASTOS_PROTECTED_NEW_DATA = {
        compartilhamento: FIRESTORE_GASTOS_NEW_DATA.compartilhamento,
        pin: PIN_GASTOS.new
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
    return {
        ativo: getID('habilitado-imagens').checked,
        background: getID('link-background').value || "",
        claro: getID('link-logo-light').value || "",
        escuro: getID('link-logo-dark').value || "",
    }
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
        visualizacao: getID('people-view').checked ? 'people-view' : getID('leg-view').checked ? 'leg-view' : 'simple-view'
    }
    for (const child of _getChildIDs('transporte-box')) {
        const j = _getJ(child);
        result.dados.push({
            datas: {
                chegada: _formattedDateToDateObject(getID(`chegada-${j}`).value, getID(`chegada-horario-${j}`).value),
                partida: _formattedDateToDateObject(getID(`partida-${j}`).value, getID(`partida-horario-${j}`).value)
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
            pessoa: getID(`transporte-pessoa-select-${j}`).value,
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
                checkin: _formattedDateToDateObject(getID(`check-in-${j}`).value, getID(`check-in-horario-${j}`).value),
                checkout: _formattedDateToDateObject(getID(`check-out-${j}`).value, getID(`check-out-horario-${j}`).value)
            },
            descricao: getID(`hospedagens-descricao-${j}`).value,
            endereco: getID(`hospedagens-endereco-${j}`).value,
            id: _getOrCreateCategoriaID('hospedagens', j),
            imagens: _getHospedagemImages(j),
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
            data: _convertToDateObject(DATAS[j - 1]),
            destinosIDs: [],
            titulo: {
                valor: '',
                traduzir: false,
                destinos: false
            },
            madrugada: [],
            manha: [],
            tarde: [],
            noite: []
        }

        innerResult.destinosIDs = _getDestinosFromCheckbox('programacao', j);

        const tituloSelectValue = getID(`programacao-inner-title-select-${j}`).value;
        if (tituloSelectValue == 'outro') {
            innerResult.titulo.valor = getID(`programacao-inner-title-${j}`).value;
        } else {
            innerResult.titulo.valor = tituloSelectValue;
        }

        innerResult.titulo.traduzir = ['departure', 'return', 'during', 'departure_and_destinations', 'return_and_destinations'].includes(tituloSelectValue);
        innerResult.titulo.destinos = ['departure_and_destinations', 'return_and_destinations', 'all_destinations'].includes(tituloSelectValue);

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
            data: data ? _keyToDateObject(data) : "",
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
            result.imagens.push('');
            CUSTOM_UPLOADS.galeria.push({
                file: getID(`upload-galeria-${j}`)?.files[0],
                position: j
            });
        } else {
            result.imagens.push(getID(`link-galeria-${j}`).value);
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

    const customChecks = _validateSavedPIN;
    const before = [
      _buildTripObject,
      _buildGastosObject,
      _buildGastosProtectedObject,
      () => _uploadAndSetImages('viagens', true)
    ]
    const after = [
      () => _uploadAndSetImages('viagens', false),
      () => _verifyImageUploads('viagens'),
      _setGastos
    ];

    _setDocumento('viagens', { customChecks, before, after });
}

async function _setGastos() {
    const responses = [];
    // Without PIN
    if (getID('pin-disable').checked) {
        if (PIN_GASTOS.current) {
            // 1. Existing Document (With PIN) -> Without PIN
            responses.push(await _delete(`gastos/protected/${PIN_GASTOS.current}/${DOCUMENT_ID}`));
            responses.push(await _override(`gastos/${DOCUMENT_ID}`, FIRESTORE_GASTOS_NEW_DATA));
        } else if (FIRESTORE_GASTOS_DATA) {
            // 2. Existing Document (Without PIN) -> Without PIN
            responses.push(await _update(`gastos/${DOCUMENT_ID}`, FIRESTORE_GASTOS_NEW_DATA));
        } else {
            //3. New Document (Without PIN)
            responses.push(await _create('gastos', FIRESTORE_GASTOS_NEW_DATA, DOCUMENT_ID));
        }
    }

    // With PIN
    else if (getID('pin-enable').checked) {
        if (!PIN_GASTOS.current) {
            // 4. Existing Document (Without PIN) -> With PIN
            responses.push(await _delete(`gastos/${DOCUMENT_ID}`));
            responses.push(await _create('gastos', FIRESTORE_GASTOS_PROTECTED_NEW_DATA, DOCUMENT_ID));
            responses.push(await _deepCreate(`gastos/protected/${PIN_GASTOS.new}`, FIRESTORE_GASTOS_NEW_DATA, DOCUMENT_ID));
        } else if (PIN_GASTOS.current != PIN_GASTOS.new && PIN_GASTOS.new) {
            // 5. Existing Document (With PIN) -> With PIN (Different)
            responses.push(await _delete(`gastos/protected/${PIN_GASTOS.current}/${DOCUMENT_ID}`));
            responses.push(await _deepCreate(`gastos/protected/${PIN_GASTOS.new}`, FIRESTORE_GASTOS_NEW_DATA, DOCUMENT_ID));
        } else if (FIRESTORE_GASTOS_DATA && PIN_GASTOS.current) {
            // 6. Existing Document (With PIN) -> With PIN (Same)
            responses.push(await _update(`gastos/protected/${PIN_GASTOS.current}/${DOCUMENT_ID}`, FIRESTORE_GASTOS_NEW_DATA));
        } else if (PIN_GASTOS.current) {
            // 7. New Document (With PIN)
            responses.push(await _deepCreate(`gastos/protected/${PIN_GASTOS.current}`, FIRESTORE_GASTOS_NEW_DATA, DOCUMENT_ID));
        }
    }

    if (responses.length > 0) {
        const masterResponse = _combineDatabaseResponses(responses);
        _addSetResponse(translate('trip.expenses.title'), masterResponse.success);
    }
}

function _verifyImageUploads(type) {
    if (DOCUMENT_ID && !IMAGE_UPLOAD_STATUS.hasErrors) {
        const path = `${type}/${DOCUMENT_ID}`;

        const documentLinks = [];

        if (FIRESTORE_NEW_DATA.imagem.background) {
            documentLinks.push(FIRESTORE_NEW_DATA.imagem.background);
        }

        if (FIRESTORE_NEW_DATA.imagem.claro) {
            documentLinks.push(FIRESTORE_NEW_DATA.imagem.claro);
        }

        if (FIRESTORE_NEW_DATA.imagem.escuro) {
            documentLinks.push(FIRESTORE_NEW_DATA.imagem.escuro);
        }

        if (type == 'viagens') {
            const hospedagemLinks = FIRESTORE_NEW_DATA.hospedagens.map(hospedagem => {
                return hospedagem.imagens.map(imagem => imagem.link);
            }).flat();
            documentLinks.push(...hospedagemLinks);
            documentLinks.push(...FIRESTORE_NEW_DATA.galeria.imagens)
        }

        _deleteUnusedImages(path, documentLinks);
    }

    _addSetResponse(translate('labels.image.check'), !IMAGE_UPLOAD_STATUS.hasErrors);
}