var CUSTOM_UPLOADS = {
    hospedagens: [],
    galeria: []
};
var SET_RESPONSES = [];
var UPLOAD_AFTER_SET = false;

async function _setDocumento(tipo) {
    const userID = await _getUID();

    if (!userID) {
        throw new Error('Usuário não autenticado');
    }

    let mainResponse, userSavingResponse;
    _startLoadingScreen(false);

    const customChecks = await eval(CONFIG.set[tipo].customChecks);
    _validateRequiredFields(customChecks);
    if (_isModalOpen()) return;

    for (const beforeItem of CONFIG.set[tipo].before) {
        await eval(beforeItem);
    }

    _validateIfDocumentChanged();
    if (_isModalOpen()) return;

    const newData = _getNewDataDocument(tipo);

    if (DOCUMENT_ID && newData) {
        mainResponse = await _update(`${tipo}/${DOCUMENT_ID}`, newData);
    } else if (newData) {
        mainResponse = await _create(tipo, newData);
        DOCUMENT_ID = mainResponse?.data?.id;
        if (DOCUMENT_ID) {
            const userListIDs = await _getUserListIDs(tipo);
            userListIDs.push(DOCUMENT_ID);
            userSavingResponse = await _update(`usuarios/${userID}`, { [tipo]: userListIDs });
        }
    }

    _addSetResponse('Salvamento Principal', mainResponse.success);
    if (userSavingResponse) {
        _addSetResponse('Salvamento do Usuário', userSavingResponse.success);
    }

    if (mainResponse.success === true) {
        for (const afterItem of CONFIG.set[tipo].after) {
            await eval(afterItem);
        }
    }

    getID('modal-inner-text').innerHTML = _buildSetMessage(tipo);
    _stopLoadingScreen();
    _openModal('modal');
}

async function _uploadAndSetImages(tipo, isBeforeSet) {
    if (!DOCUMENT_ID && isBeforeSet) {
        UPLOAD_AFTER_SET = true;
        return;
    } else if (!DOCUMENT_ID && !isBeforeSet) {
        _addSetResponse('Upload de Imagens', false);
        return;
    } else if ((!UPLOAD_AFTER_SET && !isBeforeSet) || (UPLOAD_AFTER_SET && isBeforeSet)) {
        return;
    }
    try {
        if (getID('upload-background').value) {
            const background = await _uploadImage(`${tipo}/${DOCUMENT_ID}`, getID('upload-background')?.files[0]);
            if (background.link) {
                FIRESTORE_NEW_DATA.imagem.background = background.link;
            }
        }

        if (getID('upload-logo-light').value) {
            const logoLight = await _uploadImage(`${tipo}/${DOCUMENT_ID}`, getID('upload-logo-light')?.files[0]);
            if (logoLight.link) {
                FIRESTORE_NEW_DATA.imagem.claro = logoLight.link;
            }
        }

        if (getID('upload-logo-dark').value) {
            const logoDark = await _uploadImage(`${tipo}/${DOCUMENT_ID}`, getID('upload-logo-dark')?.files[0]);
            if (logoDark.link) {
                FIRESTORE_NEW_DATA.imagem.escuro = logoDark.link;
            }
        }

        if (tipo == 'viagens') {
            await _uploadAndSetHospedagemImages();
            await _uploadAndSetGaleriaImages();
        }

    } catch (error) {
        console.error(error);
        IMAGE_UPLOAD_STATUS.hasErrors = true;
    }

    _addSetResponse('Upload de Imagens', !IMAGE_UPLOAD_STATUS.hasErrors);

    if (UPLOAD_AFTER_SET) {
        const newData = _getNewDataDocument(tipo);
        if (DOCUMENT_ID && newData) {
            mainResponse = await _update(`${tipo}/${DOCUMENT_ID}`, newData);
            _addSetResponse('Inserção de Imagens no documento', true);
        } else {
            _addSetResponse('Inserção de Imagens no documento', false);
        }
    }
}

function _buildSetMessage(tipo) {
    const allPassed = SET_RESPONSES.every(response => response.sucesso === true);
    const allFailed = SET_RESPONSES.every(response => response.sucesso === false);

    const doc = _getNewDataDocument(tipo);
    const titulo = doc?.titulo ? `"${doc.titulo}"` : '';
    const altTitulo1 = `Documento de ${tipo}`;
    const altTitulo2 = `o documento de ${tipo}`;

    if (allPassed) {
        SUCCESSFUL_SAVE = true;
        return `${titulo || altTitulo1} atualizado com sucesso`;
    } else if (allFailed) {
        return `Não foi possível atualizar ${titulo || altTitulo2} por completo. Tente novamente ou <a href=\"mailto:gabriel.o.favero@live.com\">entre em contato com o administrador</a> para reportar o problema.
                <br><br>${_getSetResponsesHTML()}`;
    } else {
        return `Não foi possível atualizar ${titulo || altTitulo2}. Tente novamente ou <a href=\"mailto:gabriel.o.favero@live.com\">entre em contato com o administrador</a> para reportar o problema.`;
    }

    function _getSetResponsesHTML() {
        const setResponses = [];
        for (const response of SET_RESPONSES) {
            setResponses.push(`<strong>${response.titulo}:</strong><br>${response.sucesso ? 'Salvo com sucesso' : 'Falha no salvamento'}<br>`);
        }
        return setResponses.join('<br>');
    }
}

function _addSetResponse(titulo, sucesso) {
    SET_RESPONSES.push({ titulo, sucesso });
}