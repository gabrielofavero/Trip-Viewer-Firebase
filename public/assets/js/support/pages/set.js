import { DOCUMENT_ID, create, update, getUserListIDs } from "../firebase/database.js";
import { IMAGE_UPLOAD_STATUS, uploadImage } from "../firebase/storage.js";

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
        mainResponse = await update(`${tipo}/${DOCUMENT_ID}`, newData);
    } else if (newData) {
        mainResponse = await create(tipo, newData);
        DOCUMENT_ID = mainResponse?.data?.id;
        if (DOCUMENT_ID) {
            const userListIDs = await getUserListIDs(tipo);
            userListIDs.push(DOCUMENT_ID);
            userSavingResponse = await update(`usuarios/${userID}`, { [tipo]: userListIDs });
        }
    }

    _addSetResponse(translate('messages.documents.save.main'), mainResponse.success);
    if (userSavingResponse) {
        _addSetResponse(translate('messages.documents.save.user'), userSavingResponse.success);
    }

    if (mainResponse.success === true) {
        for (const afterItem of CONFIG.set[tipo].after) {
            await eval(afterItem);
        }
    }

    getID('modal-inner-text').innerHTML = _buildSetMessage();
    _stopLoadingScreen();
    _openModal('modal');
}

async function _uploadAndSetImages(tipo, isBeforeSet) {
    if (!DOCUMENT_ID && isBeforeSet) {
        UPLOAD_AFTER_SET = true;
        return;
    } else if (!DOCUMENT_ID && !isBeforeSet) {
        _addSetResponse(translate('labels.image.upload'), false);
        return;
    } else if ((!UPLOAD_AFTER_SET && !isBeforeSet) || (UPLOAD_AFTER_SET && isBeforeSet)) {
        return;
    }
    try {
        if (getID('upload-background').value) {
            const background = await uploadImage(`${tipo}/${DOCUMENT_ID}`, getID('upload-background')?.files[0]);
            if (background.link) {
                FIRESTORE_NEW_DATA.imagem.background = background.link;
            }
        }

        if (getID('upload-logo-light').value) {
            const logoLight = await uploadImage(`${tipo}/${DOCUMENT_ID}`, getID('upload-logo-light')?.files[0]);
            if (logoLight.link) {
                FIRESTORE_NEW_DATA.imagem.claro = logoLight.link;
            }
        }

        if (getID('upload-logo-dark').value) {
            const logoDark = await uploadImage(`${tipo}/${DOCUMENT_ID}`, getID('upload-logo-dark')?.files[0]);
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

    _addSetResponse(translate('labels.image.upload'), !IMAGE_UPLOAD_STATUS.hasErrors);

    if (UPLOAD_AFTER_SET) {
        const newData = _getNewDataDocument(tipo);
        if (DOCUMENT_ID && newData) {
            mainResponse = await update(`${tipo}/${DOCUMENT_ID}`, newData);
            _addSetResponse(translate('labels.image.add'), true);
        } else {
            _addSetResponse(translate('labels.image.add'), false);
        }
    }
}

function _buildSetMessage() {
    const allPassed = SET_RESPONSES.every(response => response.sucesso === true);
    const allFailed = SET_RESPONSES.every(response => response.sucesso === false);

    if (allPassed) {
        SUCCESSFUL_SAVE = true;
        return translate('messages.documents.save.success');
    } else if (allFailed) {
        return `${translate('messages.documents.save.incomplete')}. <a href=\"mailto:gabriel.o.favero@live.com\">${translate('messages.errors.contact_admin')}</a> ${translate('messages.errors.to_report')}
                <br><br>${_getSetResponsesHTML()}`;
    } else {
        return `Não foi possível atualizar ${titulo || altTitulo2}.  <a href=\"mailto:gabriel.o.favero@live.com\">${translate('messages.errors.contact_admin')}</a> ${translate('messages.errors.to_report')}`;
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