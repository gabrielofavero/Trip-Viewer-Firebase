var FIRESTORE_NEW_DATA = {};
var FIRESTORE_PROTECTED_NEW_DATA = {}

var FIRESTORE_GASTOS_NEW_DATA = {};
var FIRESTORE_GASTOS_PROTECTED_NEW_DATA = {};

async function _buildTripObject() {
    switch (_getCurrentPreferencePIN()) {
        case 'all-data':
            FIRESTORE_NEW_DATA = await _getUnprotectedTripObject();
            FIRESTORE_PROTECTED_NEW_DATA = await _getTripObjectFull(false);
            break;
        case 'sensitive-only':
            FIRESTORE_NEW_DATA = await _getTripObjectFull(true);
            FIRESTORE_PROTECTED_NEW_DATA = _getSensitiveTripObject();
            break;
        default:
            FIRESTORE_NEW_DATA = await _getTripObjectFull(false);
            FIRESTORE_PROTECTED_NEW_DATA = {};
    }
}

async function _getUnprotectedTripObject() {
    return {
        destinos: _getDestinosArray(),
        compartilhamento: await _getCompartilhamentoObject(),
        cores: _getCoresObject(),
        fim: getID(`fim`).value ? _formattedDateToDateObject(getID(`fim`).value) : "",
        galeria: {},
        hospedagens: [],
        imagem: _getImagemObject(),
        inicio: getID(`inicio`).value ? _formattedDateToDateObject(getID(`inicio`).value) : "",
        links: {},
        modulos: {},
        moeda: getID(`moeda`).value,
        programacoes: {},
        pessoas: {},
        titulo: getID(`titulo`).value,
        transportes: _getVisibilidadeObject(),
        versao: {
            ultimaAtualizacao: new Date().toISOString()
        },
        visibilidade: {},
        pin: _getCurrentPreferencePIN()
    }
}

function _getSensitiveTripObject() {
    const hospedagens = _getProtectedHospedagemObject();
    const transportes = _getProtectedTransporteObject();

    if (Object.keys(hospedagens).length === 0 && Object.keys(transportes).length === 0) {
        return {};
    }
    
    return {
        hospedagens: hospedagens,
        transportes: transportes,
        pin: _getCurrentPreferencePIN()
    }
}

async function _getTripObjectFull(protectedReservationCodes = false) {
    return {
        destinos: _getDestinosArray(),
        compartilhamento: await _getCompartilhamentoObject(),
        cores: _getCoresObject(),
        fim: getID(`fim`).value ? _formattedDateToDateObject(getID(`fim`).value) : "",
        galeria: _getGaleriaObject(),
        hospedagens: _getHospedagemArray(protectedReservationCodes),
        imagem: _getImagemObject(),
        inicio: getID(`inicio`).value ? _formattedDateToDateObject(getID(`inicio`).value) : "",
        links: _getLinksObject(),
        modulos: _getModulosObject(),
        moeda: getID(`moeda`).value,
        programacoes: _getProgramacaoArray(),
        pessoas: TRAVELERS,
        titulo: getID(`titulo`).value,
        transportes: _getTransporteObject(protectedReservationCodes),
        versao: {
            ultimaAtualizacao: new Date().toISOString()
        },
        visibilidade: _getVisibilidadeObject(),
        pin: _getCurrentPreferencePIN()
    }
}

async function _buildGastosObject() {
    switch (_getCurrentPreferencePIN()) {
        case 'all-data':
        case 'sensitive-only':
            FIRESTORE_GASTOS_PROTECTED_NEW_DATA = await _getGastosObject();
            FIRESTORE_GASTOS_NEW_DATA = _objectExistsAndHasKeys(FIRESTORE_GASTOS_PROTECTED_NEW_DATA) ? await _getUnprotectedGastosObject() : {};
            break;
        default:
            FIRESTORE_GASTOS_NEW_DATA = await _getGastosObject(false);
            FIRESTORE_PROTECTED_NEW_DATA = {};
    }
    }

function _getModulosObject() {
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

function _getCoresObject() {
    return {
        ativo: getID('habilitado-cores').checked,
        claro: getID('claro').value,
        escuro: getID('escuro').value
    }
}

async function _getCompartilhamentoObject() {
    return {
        ativo: true,
        dono: FIRESTORE_DATA ? FIRESTORE_DATA.compartilhamento.dono : await _getUID(),
        editores: []
    }
}

function _getImagemObject() {
    return {
        ativo: getID('habilitado-imagens').checked,
        background: getID('link-background').value || "",
        claro: getID('link-logo-light').value || "",
        escuro: getID('link-logo-dark').value || "",
    }
}

function _getLinksObject() {
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

function _getVisibilidadeObject() {
    return {
        claro: getID('dark-and-light').checked || getID('light-exclusive').checked,
        escuro: getID('dark-and-light').checked || getID('dark-exclusive').checked
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
            const data = _getCurrentPreferencePIN() === 'all-data' ? FIRESTORE_PROTECTED_NEW_DATA : FIRESTORE_NEW_DATA;
            const hospedagens = data.hospedagens || [];
            const hospedagemLinks = (hospedagens ?? [])
            .flatMap(hospedagem =>
              (hospedagem?.imagens ?? [])
                .map(imagem => imagem?.link)
                .filter(Boolean)
            );

            const imagens = data?.galeria?.imagens || [];
            documentLinks.push(...hospedagemLinks);
            documentLinks.push(...imagens)
        }

        _deleteUnusedImages(path, documentLinks);
    }

    _addSetResponse(translate('labels.image.check'), !IMAGE_UPLOAD_STATUS.hasErrors);
}

async function _setViagem() {
    if (getID('habilitado-destinos').checked) {
        for (const child of _getChildIDs('com-destinos')) {
            const i = parseInt(child.split("-")[2]);
            _setRequired(`select-destinos-${i}`)
        }
    }

    const customChecks = _validatePinField;
    const before = [
      _buildTripObject,
      _buildGastosObject,
      () => _uploadAndSetImages('viagens', true)
    ]
    const after = [
      () => _uploadAndSetImages('viagens', false),
      () => _verifyImageUploads('viagens'),
      _setProtectedDataAndExpenses
    ];

    _setDocumento('viagens', { customChecks, before, after });
}