var CUSTOM_UPLOADS = {
    hospedagens: [],
    galeria: []
};
var SET_RESPONSES = [];

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

async function _uploadAndSetImages(tipo) {
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
                FIRESTORE_NEW_DATA.imagem.logoLight = logoLight.link;
            }
        }

        if (getID('upload-logo-dark').value) {
            const logoDark = await _uploadImage(`${tipo}/${DOCUMENT_ID}`, getID('upload-logo-dark')?.files[0]);
            if (logoDark.link) {
                FIRESTORE_NEW_DATA.imagem.logoDark = logoDark.link;
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
}

function _buildSetMessage(tipo) {
    const allPassed = SET_RESPONSES.every(response => response.sucesso === true);
    const allFailed = SET_RESPONSES.every(response => response.sucesso === false);

    if (allPassed) {
        SUCCESSFUL_SAVE = true;
        return `Documento de ${tipo} atualizado com sucesso`;
    } else if (allFailed) {
        return `Não foi possível atualizar o documento de ${tipo} por completo. Tente novamente ou <a href=\"mailto:gabriel.o.favero@live.com\">entre em contato com o administrador</a> para reportar o problema.
                <br><br>${_getSetResponsesHTML()}`;
    } else {
        return `Não foi possível atualizar o documento de ${tipo}. Tente novamente ou <a href=\"mailto:gabriel.o.favero@live.com\">entre em contato com o administrador</a> para reportar o problema.`;
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