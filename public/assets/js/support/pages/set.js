import { setSuccessfulSave } from "../../main/app.js";
import { translate } from "../../main/translate.js";
import { getNewDataDocument } from "../data/data.js";
import { validateIfDocumentChanged } from "../data/object.js";
import { DOCUMENT_ID, FIRESTORE_DATA, FIRESTORE_NEW_DATA, create, getUserListIDs, update } from "../firebase/database.js";
import { IMAGE_UPLOAD_STATUS, uploadImage } from "../firebase/storage.js";
import { getUID } from "../firebase/user.js";
import { isModalOpen } from "../styles/visibilidade.js";
import { startLoadingScreen, stopLoadingScreen } from "./loading.js";
import { getID } from "./selectors.js";

var SET_RESPONSES = [];
var UPLOAD_AFTER_SET = false;

export async function setDocument(type, validations = [], beforeFunctions = [], afterFunctions = []) {
    const userID = await getUID();

    if (!userID) {
        throw new Error(translate('labels.unauthenticad'));
    }

    let mainResponse, userSavingResponse;
    startLoadingScreen(false);

    await runFunctions(validations);
    if (isModalOpen()) return;

    await runFunctions(beforeFunctions);

    validateIfDocumentChanged(FIRESTORE_DATA);
    if (isModalOpen()) return;

    const newData = getNewDataDocument(type);

    if (DOCUMENT_ID && newData) {
        mainResponse = await update(`${type}/${DOCUMENT_ID}`, newData);
    } else if (newData) {
        mainResponse = await create(type, newData);
        DOCUMENT_ID = mainResponse?.data?.id;
        if (DOCUMENT_ID) {
            const userListIDs = await getUserListIDs(type);
            userListIDs.push(DOCUMENT_ID);
            userSavingResponse = await update(`usuarios/${userID}`, { [type]: userListIDs });
        }
    }

    addToSetResponse(translate('messages.documents.save.main'), mainResponse.success);
    if (userSavingResponse) {
        addToSetResponse(translate('messages.documents.save.user'), userSavingResponse.success);
    }

    if (mainResponse.success === true) {
        runFunctions(afterFunctions);
    }

    getID('modal-inner-text').innerHTML = buildSetMessage();
    stopLoadingScreen();
    _openModal('modal');
}

async function runFunctions(functions) {
    for (const func of functions) {
        await func();
    }
}

export async function uploadAndSetImages(tipo, isBeforeSet) {
    if (!DOCUMENT_ID && isBeforeSet) {
        UPLOAD_AFTER_SET = true;
        return;
    } else if (!DOCUMENT_ID && !isBeforeSet) {
        addToSetResponse(translate('labels.image.upload'), false);
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

    addToSetResponse(translate('labels.image.upload'), !IMAGE_UPLOAD_STATUS.hasErrors);

    if (UPLOAD_AFTER_SET) {
        const newData = getNewDataDocument(tipo);
        if (DOCUMENT_ID && newData) {
            mainResponse = await update(`${tipo}/${DOCUMENT_ID}`, newData);
            addToSetResponse(translate('labels.image.add'), true);
        } else {
            addToSetResponse(translate('labels.image.add'), false);
        }
    }
}

function buildSetMessage() {
    const allPassed = SET_RESPONSES.every(response => response.sucesso === true);
    const allFailed = SET_RESPONSES.every(response => response.sucesso === false);

    if (allPassed) {
        setSuccessfulSave(true);
        return translate('messages.documents.save.success');
    } else if (allFailed) {
        return `${translate('messages.documents.save.incomplete')}. <a href=\"mailto:gabriel.o.favero@live.com\">${translate('messages.errors.contact_admin')}</a> ${translate('messages.errors.to_report')}
                <br><br>${getSetResponsesHTML()}`;
    } else {
        return `Não foi possível atualizar ${titulo || altTitulo2}.  <a href=\"mailto:gabriel.o.favero@live.com\">${translate('messages.errors.contact_admin')}</a> ${translate('messages.errors.to_report')}`;
    }

    function getSetResponsesHTML() {
        const setResponses = [];
        for (const response of SET_RESPONSES) {
            setResponses.push(`<strong>${response.titulo}:</strong><br>${response.sucesso ? 'Salvo com sucesso' : 'Falha no salvamento'}<br>`);
        }
        return setResponses.join('<br>');
    }
}

export function addToSetResponse(titulo, sucesso) {
    SET_RESPONSES.push({ titulo, sucesso });
}