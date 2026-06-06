import { getState, setState } from '../../data/state.js';

var FIRESTORE_PROTECTED_DATA = {};
var FIRESTORE_NEW_DATA = {};

var SUCCESSFUL_SAVE = false;

startLoadingScreen();

export async function loadEditListingPage() {
	DOCUMENT_ID = getURLParam("l");
	PERMISSOES = await getPermissoes();

	loadVisibilityIndex();
	loadHabilitados();

	USER_DATA = await getUserData();
	DESTINOS = getOrderedDocumentByTitle(USER_DATA.destinos);

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

	getID("destinos-search").addEventListener("input", () =>
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
	FIRESTORE_NEW_DATA = {
		compartilhamento: await buildCompartilhamentoObject(),
		cores: {
			ativo: getID("habilitado-cores").checked,
			claro: getID("claro").value,
			escuro: getID("escuro").value,
		},
		descricao: getID(`descricao`).value,
		destinos: buildDestinosArray(),
		imagem: buildImagemObject(),
		links: buildLinksObject(),
		subtitulo: getID(`subtitulo`).value,
		titulo: getID(`titulo`).value,
		versao: {
			ultimaAtualizacao: new Date().toISOString(),
			exibirEmDestinos: getID(`exibir-em-destinos`).checked,
		},
	};
}

function getIgnoredPathDestinos() {
	if (!getState()) return [];
	let result = [];
	for (let i = 0; i < getState().destinos.length; i++) {
		result.push(`destinos.${i}.destinos`);
	}
	return result;
}

async function setListagem() {
	for (const child of getChildIDs("com-destinos")) {
		const i = parseInt(child.split("-")[2]);
		setRequired(`select-destinos-${i}`);
	}

	const type = "listagens";
	const dataBuildingFunctions = [buildListObject];
	await setDocumento({ type, dataBuildingFunctions });
}

function deleteListagem() {
	let listagem = getID("titulo").value;
	listagem = listagem ? ` "${listagem}"` : "";

	const propriedades = cloneObject(MESSAGE_PROPERTIES);
	propriedades.titulo = "Apagar Listagem";
	propriedades.conteudo = `Tem certeza que deseja realizar a exclusão da listagem${listagem}? A ação não poderá ser desfeita.`;
	propriedades.botoes = [
		{
			tipo: "cancelar",
		},
		{
			tipo: "confirmar",
			acao: "deleteListagemAction()",
		},
	];

	displayFullMessage(propriedades);
}

async function deleteListagemAction() {
	if (DOCUMENT_ID) {
		await deleteUserObjectDB(DOCUMENT_ID, "listagens");
		await deleteUserObjectStorage();
		window.location.href = "../index.html";
	}
}
