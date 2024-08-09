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

var CUSTOM_UPLOADS = {};

async function _setDocumento(tipo) {
    const user = firebase.auth().currentUser;

    if (!user) {
        throw new Error('Usuário não autenticado');
    }

    let result;
    let responses = [];

    _startLoadingScreen(false);

    const customChecks = await eval(CONFIG.set[tipo].customChecks);
    _validateRequiredFields(customChecks);
    if (_isModalOpen()) return;

    for (const item of CONFIG.set[tipo].before) {
        await eval(item);
    }
    
    _validateIfDocumentChanged();
    if (_isModalOpen()) return;

    const newData = _getNewDataDocument(tipo);

    if (DOCUMENT_ID && newData) {
        result = await _update(`${tipo}/${DOCUMENT_ID}`, newData);
    } else if (newData) {
        result = await _create(tipo, newData);
        DOCUMENT_ID = result?.data?.id;
        const userList = await _getUserList(tipo);
        userList.push(DOCUMENT_ID);
        await _update(`usuarios/${USER_ID}`, { [tipo]: userList });
    }

    responses.push(result);
    if (result.success === true) {
        for (const extra of CONFIG.set[tipo].after) {
            responses.push(await eval(extra.funcao));
        }
    }

    getID('modal-inner-text').innerHTML = _buildSetMessage(tipo, responses);
    _stopLoadingScreen();
    _openModal('modal');
}

async function _setImages(tipo) {
    try {
        const body = {
            id: DOCUMENT_ID,
            type: tipo,
            background: TO_UPLOAD.background ? await _uploadBackground(tipo) : '',
            logoLight: TO_UPLOAD.logoLight ? await _uploadLogoLight(tipo) : '',
            logoDark: TO_UPLOAD.logoDark ? await _uploadLogoDark(tipo) : '',
            custom: CUSTOM_UPLOADS
        }

        await _updateImages(body);
        await _deleteUnusedImages(_getDataDocument(tipo), await _get(`${tipo}/${DOCUMENT_ID}`));

        return _buildDatabaseObject(true, 'Imagens salvas com sucesso');

    } catch (error) {
        console.error(error);
        IMAGE_UPLOAD_ERROR.status = true;
        return _buildDatabaseObject(false, error, error.message);
    }
}

function _buildSetMessage(tipo, extraResponses) {
    const success = extraResponses.every(response => response.success === true);

    if (success) {
        WAS_SAVED = true;
        return `Documento de ${tipo} atualizado com sucesso`;
    } else if (extraResponses[0].success === true) {
        return `Não foi possível atualizar o documento de ${tipo} por completo. Tente novamente ou <a href=\"mailto:gabriel.o.favero@live.com\">entre em contato com o administrador</a> para reportar o problema.
                <br><br>${_getErrorsHTML()}`;
    } else {
        return `Não foi possível atualizar o documento de ${tipo}. Tente novamente ou <a href=\"mailto:gabriel.o.favero@live.com\">entre em contato com o administrador</a> para reportar o problema.`;
    }

    function _getErrorsHTML() {
        let text = `<strong>Dados Gerais:</strong> ${_textBoolean(extraResponses[0].success)}`;
        for (let i = 1; i < extraResponses.length; i++) {
            text += `<br><strong>${CONFIG.set[tipo].after[i].titulo}:</strong> ${_textBoolean(extraResponses[i].success)}`;
        }
        return text;
    }

    function _textBoolean(bool) {
        return bool ? 'Salvo com sucesso' : 'Falha no salvamento';
    }
}