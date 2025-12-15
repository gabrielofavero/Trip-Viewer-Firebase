var CUSTOM_UPLOADS = {
    hospedagens: [],
    galeria: []
};
var SET_RESPONSES = [];
var UPLOAD_AFTER_SET = false;

async function _setDocumento({ type, checks = [], dataBuildingFunctions = [], batchFunctions = [] }) {
    const userID = await _getUID();
    const ops = _createBatchOps();
    let response = translate('messages.documents.save.success');

    if (!userID || !type) {
        const message = !userID ? translate('labels.unauthenticated') : translate('messages.documents.save.error');
        _throwSetError(message);
        return
    }

    let mainResponse, userSavingResponse;
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

    const wasChanged = _validateIfDocumentChanged();
    if (!wasChanged) {
        const errorMsgPath = `messages.documents.save.no_new_data`;
        getID('modal-inner-text').innerText = `${translate('messages.documents.save.error')}. ${translate(errorMsgPath)}`;

        SUCCESSFUL_SAVE = false;
        _openModal();
        _stopLoadingScreen();
        return;
    };

    const newData = _getNewDataDocument(type);

    if (DOCUMENT_ID && newData) {
        ops.update(`${type}/${DOCUMENT_ID}`, newData);
    } else if (newData) {
        ops.set(`${type}/${DOCUMENT_ID}`, newData);
        DOCUMENT_ID = mainResponse?.data?.id;
        if (DOCUMENT_ID) {
            const userListIDs = await _getUserListIDs(type);
            userListIDs.push(DOCUMENT_ID);
            userSavingResponse = ops.update(`usuarios/${userID}`, { [type]: userListIDs });
        }
    }

    for (const batch of batchFunctions) {
        await batch(ops);
    }

    const result = await ops.commit();

    if (!result.success) {
        response = _getSetErrorTableHTML(result)
    }

    getID('modal-inner-text').innerHTML = response;
    _stopLoadingScreen();
    _openModal('modal');
}

function _throwSetError(message) {
    getID('modal-inner-text').innerHTML = message;
    _stopLoadingScreen();
    _openModal('modal');
}

async function _setUserData(ops, type, id, data) {
    if (!type || !id || !data || Object.keys(data).length === 0) {
        _throwSetError('Invalid User Data');
        return;
    }

    const uid = await _getUID();
    if (!USER_DATA) {
        USER_DATA = await _getUserData(uid);
    }

    const newData = _getSingleUserData(type, data);

    if (Object.keys(newData) === 0) {
        _throwSetError('Error while fetching user data');
        return;
    }

    ops.update(`usuarios/${uid}`, {
        [`${type}.${id}`]: newData
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
                    titulo: data.titulo,
                    versao: data.versao,
                }
        }
    }
}


function _getSetErrorTableHTML(result) {
    if (!result || result.success) return '';

    let html = '<table><thead><tr>';
    html += '<th>Type</th><th>Path</th><th>Data</th>';
    html += '</tr></thead><tbody>';

    for (const op of result.operations || []) {
        html += '<tr>';
        html += `<td>${op.type}</td>`;
        html += `<td>${op.path}</td>`;
        html += `<td><pre>${escapeHTML(JSON.stringify(op.data ?? null, null, 2))}</pre></td>`;
        html += '</tr>';
    }

    html += '</tbody></table>';
    return html;

    function escapeHTML(str) {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
}