import { startLoadingScreen, stopLoadingScreen } from './loading.js';
import { getUID } from '../data/firebase/auth.js';
import { createBatchOps } from '../data/firebase/database.js';
import { translate } from '../i18n/translation.js';
import { isModalOpen, openModal } from '../theme/visibility.js';
import { hasUnsavedChanges, validateRequiredFields } from '../ui/fields.js';
import { getID, getNewDataDocument } from './dom.js';
import { DOCUMENT_ID, SUCCESSFUL_SAVE, setDocumentId, setSuccessfulSaveFn } from '../data/state.js';

export var CUSTOM_UPLOADS = {
	hospedagens: [],
	galeria: [],
};
var SET_RESPONSES: { message: string; success: boolean }[] = [];
var UPLOAD_AFTER_SET = false;

export function addSetResponse(message: string, success: boolean) {
	SET_RESPONSES.push({ message, success });
}

export async function setDocumento({
	type,
	checks = [],
	dataBuildingFunctions = [],
	batchFunctions = [],
}) {
	try {
		const uid = await getUID();
		const ops = createBatchOps();
		let response = translate("messages.documents.save.success");

		if (!uid || !type) {
			throwSetError(
				!uid
					? translate("labels.unauthenticated")
					: translate("messages.documents.save.error"),
			);
			return;
		}

		startLoadingScreen();

		for (const check of checks) {
			await check();
		}

		if (isModalOpen()) return;

		validateRequiredFields();
		if (isModalOpen()) return;

		for (const build of dataBuildingFunctions) {
			await build();
		}

		if (!hasUnsavedChanges()) {
			throwSetError(`${translate("messages.documents.save.no_new_data")}`);
			return;
		}

		const documentData = getNewDataDocument(type);

		if (DOCUMENT_ID && documentData) {
			ops.update(`${type}/${DOCUMENT_ID}`, documentData);
		} else if (documentData) {
			const id = ops.create(type, documentData);
			setDocumentId(id);
		}

		setUserData(ops, uid, type, documentData);

		for (const batch of batchFunctions) {
			await batch(ops);
		}

		const result = await ops.commit();

		if (!result.success) {
			throwSetError(translate("messages.documents.save.error"));
			return;
		}

		setSuccessfulSaveFn(true);
		getID("modal-inner-text").innerHTML = response;
		stopLoadingScreen();
		openModal("modal");
	} catch (e) {
		console.log(e);
		throwSetError(translate("messages.documents.save.error"));
	}
}

function throwSetError(message) {
	setSuccessfulSaveFn(false);
	getID("modal-inner-text").innerHTML = message;
	stopLoadingScreen();
	openModal("modal");
}

function setUserData(ops, uid, type, documentData) {
	const newData = getSingleUserData(type, documentData);
	if (Object.keys(newData).length === 0) {
		throwSetError("Error while fetching user data");
		return;
	}

	ops.update(`usuarios/${uid}`, {
		[`${type}.${DOCUMENT_ID}`]: newData,
	});

	function getSingleUserData(type, data) {
		switch (type) {
			case "destinos":
				return {
					moeda: data.moeda,
					titulo: data.titulo,
					versao: data.versao,
				};
			case "listagens":
				return {
					cores: data.cores,
					descricao: data.descricao,
					imagem: data.imagem,
					subtitulo: data.subtitulo,
					titulo: data.titulo,
					versao: data.versao,
				};
			case "viagens":
				return {
					cores: data.cores,
					fim: data.fim,
					imagem: data.imagem,
					inicio: data.inicio,
					modulos: data.modulos,
					pin: data.pin,
					titulo: data.titulo,
					versao: data.versao,
				};
		}
	}
}
