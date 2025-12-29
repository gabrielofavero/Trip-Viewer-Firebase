var CUSTOM_UPLOADS = {
    hospedagens: [],
    galeria: []
};
var SET_RESPONSES = [];
var UPLOAD_AFTER_SET = false;

async function _setDocumento({ type, checks = [], dataBuildingFunctions = [], batchFunctions = [] }) {
    try {
        const uid = await _getUID();
    const ops = _createBatchOps();
    let response = translate('messages.documents.save.success');

    if (!uid || !type) {
        _throwSetError(!uid ? translate('labels.unauthenticated') : translate('messages.documents.save.error'));
        return
    }

    _startLoadingScreen();

    for (const check of checks) {
        await check();
    };

    if (_isModalOpen()) return;

    _validateRequiredFields();
    if (_isModalOpen()) return;

    for (const build of dataBuildingFunctions) {
        await build();
    }

    if (!_hasUnsavedChanges()) {
        _throwSetError(`${translate('messages.documents.save.no_new_data')}`)
        return;
    };

    const documentData = _getNewDataDocument(type);

    if (DOCUMENT_ID && documentData) {
        ops.update(`${type}/${DOCUMENT_ID}`, documentData);
    } else if (documentData) {
        const id = ops.create(`${type}/${DOCUMENT_ID}`, documentData);
        DOCUMENT_ID = id;
    }

    _setUserData(ops, uid, type, documentData)

    for (const batch of batchFunctions) {
        await batch(ops);
    }

    const result = await ops.commit();

    if (!result.success) {
        _throwSetError(translate('messages.documents.save.error'));
        return;
    }

    SUCCESSFUL_SAVE = true;
    getID('modal-inner-text').innerHTML = response;
    _stopLoadingScreen();
    _openModal('modal');
    }
    catch (e) {
        console.log(e);
        _throwSetError(translate('messages.documents.save.error'));
    }
}

function _throwSetError(message) {
    SUCCESSFUL_SAVE = false;
    getID('modal-inner-text').innerHTML = message;
    _stopLoadingScreen();
    _openModal('modal');
}

function _setUserData(ops, uid, type, documentData) {
    const newData = _getSingleUserData(type, documentData);
    if (Object.keys(newData) === 0) {
        _throwSetError('Error while fetching user data');
        return;
    }

    ops.update(`usuarios/${uid}`, {
        [`${type}.${DOCUMENT_ID}`]: newData
    });

    function _getSingleUserData(type, data) {
        switch (type) {
            case 'destinos':
                return {
                    moeda: data.moeda,
                    titulo: data.titulo,
                    versao: data.versao,
                }
            case 'listagens':
                return {
                    cores: data.cores,
                    descricao: data.descricao,
                    imagem: data.imagem,
                    subtitulo: data.subtitulo,
                    titulo: data.titulo,
                    versao: data.versao,
                }
            case 'viagens':
                return {
                    cores: data.cores,
                    fim: data.fim,
                    imagem: data.imagem,
                    inicio: data.inicio,
                    modulos: data.modulos,
                    pin: data.pin,
                    titulo: data.titulo,
                    versao: data.versao,
                }
        }
    }
}