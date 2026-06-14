import { getState, setState, DOCUMENT_ID, DESTINATIONS, FIRESTORE_NEW_DATA, SUCCESSFUL_SAVE, setDocumentId, setDestinations, setFirestoreNewData } from '../../data/state.js';
import { startLoadingScreen, stopLoadingScreen } from '../../utils/loading.js';
import { cloneObject, getChildIDs, getID, getOrderedDocumentByTitle, getURLParam, setRequired } from '../../utils/dom.js';
import { deleteUserObjectDB, getPermissoes, getSingleData } from '../../data/firebase/database.js';
import { getUserData, setUserData, USER_DATA } from '../../data/firebase/auth.js';
import { deleteUserObjectStorage, loadImageSelector, loadLogoSelector } from '../../data/firebase/storage.js';
import { hasUnsavedChanges, reEdit, snapshotFormState } from '../../ui/fields.js';
import { loadEditModule, searchDestinationsListenerAction } from '../../theme/visibility.js';
import { translate } from '../../i18n/translation.js';
import { displayFullMessage, MESSAGE_PROPERTIES, registerActions } from '../../utils/messages.js';
import { loadVisibilityIndex } from '../home/support/visibility.js';

var FIRESTORE_PROTECTED_DATA = {};
var PERMISSOES;

startLoadingScreen();

import { loadEditListingListeners } from './support/event-listeners.js';
import { getVisibility } from "../../theme/theme.js";
import { loadUploadSelector } from "../../data/firebase/storage.js";
import { loadListData } from "./existing-listing.js";
import { autoFillDarkColor } from "../edit-trip/categories/customization.js";
import { loadDestinations } from "../edit-trip/new-trip.js";
import { setDocumento } from "../../utils/set.js";
import { initEditTabs } from "../../ui/edit-tabs.js";
import { enhanceAllColorPickers } from "../../ui/color-picker-hex.js";

export async function loadEditListingPage() {
	loadEditListingListeners();

	// Register string-based button actions used in modals
	registerActions({ deleteListagemAction });

	setDocumentId(getURLParam("l"));
	PERMISSOES = await getPermissoes();

	loadVisibilityIndex();
	initEditTabs();
	loadHabilitados();

	setUserData(await getUserData());
	setDestinations(getOrderedDocumentByTitle(USER_DATA?.destinos || []));

	if (DOCUMENT_ID) {
		await carregarListagem();
	} else {
		loadDestinations();
	}

	loadImageSelector("background");
	loadLogoSelector();

	loadEventListeners();
	stopLoadingScreen();
	snapshotFormState();

	enhanceAllColorPickers();

	$("body").css("overflow", "auto");
}

function loadHabilitados() {
	loadEditModule("imagens");
	loadEditModule("cores");
	loadEditModule("links");
}

function loadUploadSelectors() {
	loadUploadSelector("background");
	loadUploadSelector("logo");
}

function loadEventListeners() {
	getID("cancel-btn").addEventListener("click", () => {
		window.location.href = "../index.html";
	});

	getID("home").addEventListener("click", () => {
		window.location.href = "../index.html";
	});

	getID("visualizar").addEventListener("click", () => {
		if (DOCUMENT_ID) {
			window.open(
				`../view?l=${DOCUMENT_ID}&visibility=${getVisibility()}`,
				"_blank",
			);
		} else {
			window.location.href = "../index.html";
		}
	});

	getID("save-btn").addEventListener("click", () => {
		setListagem();
	});

	getID("re-editar").addEventListener("click", () => {
		reEdit("listagens", SUCCESSFUL_SAVE);
	});

	getID("home").addEventListener("click", () => {
		window.location.href = "../index.html";
	});

	getID("destinations-search").addEventListener("input", () =>
		searchDestinationsListenerAction(),
	);

	window.addEventListener("beforeunload", (event) => {
		if (hasUnsavedChanges() && !SUCCESSFUL_SAVE) {
			event.preventDefault();
			event.returnValue = translate("messages.exit_confirmation");
		}
	});
	getID("claro").addEventListener("change", () => autoFillDarkColor());
}

async function carregarListagem() {
	getID("delete-text").style.display = "block";
	startLoadingScreen();

	setState(await getSingleData("listagens"));

	await loadListData(getState());
	stopLoadingScreen();
}

async function buildListObject() {
	setFirestoreNewData({
		compartilhamento: await buildCompartilhamentoObject(),
		cores: {
			ativo: getID("colors-enabled").checked,
			claro: getID("claro").value,
			escuro: getID("escuro").value,
		},
		descricao: getID("description").value,
		destinos: buildDestinosArray(),
		imagem: buildImagemObject(),
		links: buildLinksObject(),
		subtitulo: getID("subtitle").value,
		titulo: getID("title").value,
		versao: {
			ultimaAtualizacao: new Date().toISOString(),
			exibirEmDestinos: getID("show-in-destinations").checked,
		},
	});
}

function getIgnoredPathDestinos() {
	if (!getState()) return [];
	let result = [];
	for (let i = 0; i < getState().destinos.length; i++) {
		result.push(`destinations.${i}.destinations`);
	}
	return result;
}

async function setListagem() {
	for (const child of getChildIDs("has-destinations")) {
		const i = parseInt(child.split("-")[2]);
		setRequired(`select-destinations-${i}`);
	}

	const type = "listagens";
	const dataBuildingFunctions = [buildListObject];
	await setDocumento({ type, dataBuildingFunctions });
}

export function deleteListagem() {
	let listing = getID("title").value;
	listing = listing ? ` "${listing}"` : "";

	const properties = cloneObject(MESSAGE_PROPERTIES);
	properties.titulo = "Apagar Listagem";
	properties.conteudo = `Tem certeza que deseja realizar a exclusão da listagem${listing}? A ação não poderá ser desfeita.`;
	properties.botoes = [
		{
			tipo: "cancelar",
		},
		{
			tipo: "confirmar",
			acao: "deleteListagemAction()",
		},
	];

	displayFullMessage(properties);
}

export async function deleteListagemAction() {
	if (DOCUMENT_ID) {
		await deleteUserObjectDB(DOCUMENT_ID, "listagens");
		await deleteUserObjectStorage();
		window.location.href = "../index.html";
	}
}
