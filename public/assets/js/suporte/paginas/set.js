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
        getID('modal-inner-text').innerHTML = !userID ? translate('labels.unauthenticated') : translate('messages.documents.save.error');;
        _stopLoadingScreen();
        _openModal('modal');
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
        await batch(op);
    }

    const result = await ops.commit();

    if (!result.success) {
        response = _getSetErrorTableHTML(result)
    }

    getID('modal-inner-text').innerHTML = response;
    _stopLoadingScreen();
    _openModal('modal');
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