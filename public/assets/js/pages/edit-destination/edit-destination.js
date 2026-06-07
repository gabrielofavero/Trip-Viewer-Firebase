import { startLoadingScreen, stopLoadingScreen } from '../../utils/loading.js';
import { closeMessage, displayError, displayFullMessage, getContainersInput } from '../../utils/messages.js';
import { getTodayFormatted, getTomorrowFormatted } from '../../utils/dates.js';
import { cloneObject, firstCharToUpperCase, getLastJ, getURLParam, removeChildWithValidation, removeRequired, setRequired } from '../../utils/dom.js';
import { addRemoveChildListenerDS, buildDS, newDynamicSelect, removeSelectorDS, updateValueDS } from '../../ui/dynamic-select.js';
import { hasUnsavedChanges, reEdit, snapshotFormState, validateInstagramLink, validateLink, validateMapLink, validateMediaLink } from '../../ui/fields.js';
import { hideContent, loadEditModule, showContent } from '../../theme/visibility.js';
import { closeAccordions, openLastAccordion } from '../../ui/accordion.js';
import { translate } from '../../i18n/translation.js';
import { deleteUserObjectDB, getSingleData } from '../../data/firebase/database.js';
import { loadVisibilityIndex } from '../home/support/visibility.js';
import { loadEditDestinationListeners } from './support/event-listeners.js';
import { getVisibility } from "../../theme/theme.js";

var FIRESTORE_DESTINOS_DATA;
var SUCCESSFUL_SAVE = false;

const TODAY = getTodayFormatted();
const TOMORROW = getTomorrowFormatted();

var SCHEDULE = {};

var REGIONS = [];

export async function loadEditDestinationPage() {
	loadEditDestinationListeners();

	DOCUMENT_ID = getURLParam("d");

	loadVisibilityIndex();
	loadHabilitados();
	newDynamicSelect("regiao");

	if (DOCUMENT_ID) {
		await loadDestinations();
	}

	loadEventListeners();
	stopLoadingScreen();
	snapshotFormState();
	$("body").css("overflow", "auto");
}

function loadHabilitados() {
	loadEditModule("restaurantes");
	loadEditModule("lanches");
	loadEditModule("saidas");
	loadEditModule("turismo");
	loadEditModule("lojas");
	loadEditModule("mapa");

	const mapa = getID("habilitado-mapa");
	mapa.addEventListener("change", function () {
		if (mapa.checked) {
			setRequired("mapa-link");
		} else {
			removeRequired("mapa-link");
		}
	});
}

function loadEventListeners() {
	getID("restaurantes-adicionar").addEventListener("click", () => {
		closeAccordions("restaurantes");
		addRestaurantes();
		openLastAccordion("restaurantes");
		buildDS("regiao");
	});

	getID("lanches-adicionar").addEventListener("click", () => {
		closeAccordions("lanches");
		addLanches();
		openLastAccordion("lanches");
		buildDS("regiao");
	});

	getID("saidas-adicionar").addEventListener("click", () => {
		closeAccordions("saidas");
		addSaidas();
		openLastAccordion("saidas");
		buildDS("regiao");
	});

	getID("turismo-adicionar").addEventListener("click", () => {
		closeAccordions("turismo");
		addTurismo();
		openLastAccordion("turismo");
		buildDS("regiao");
	});

	getID("lojas-adicionar").addEventListener("click", () => {
		closeAccordions("lojas");
		addLojas();
		openLastAccordion("lojas");
		buildDS("regiao");
	});

	getID("save-btn").addEventListener("click", () => {
		startLoadingScreen();
		const type = "destinos";
		const dataBuildingFunctions = [_buildDestinosObject, _updateTikTokLinks];

		setDocumento({ type, dataBuildingFunctions });
	});

	getID("re-editar").addEventListener("click", () => {
		reEdit("destinos", SUCCESSFUL_SAVE);
	});

	getID("cancel-btn").addEventListener("click", () => {
		window.location.href = `../index?visibility=${getVisibility()}`;
	});

	getID("home").addEventListener("click", () => {
		window.location.href = `../index?visibility=${getVisibility()}`;
	});

	getID("visualizar").addEventListener("click", () => {
		if (DOCUMENT_ID) {
			window.open(
				`../destination?d=${DOCUMENT_ID}&visibility=${getVisibility()}`,
				"_blank",
			);
		} else {
			window.location.href = `../index?visibility=${getVisibility()}`;
		}
	});

	getID("moeda").addEventListener("change", () => {
		if (getID("moeda").value == "outra") {
			getID("outra-moeda").style.display = "block";
		} else {
			getID("outra-moeda").style.display = "none";
		}
		loadCurrencySelects();
	});

	getID("outra-moeda").addEventListener("change", () => {
		loadCurrencySelects();
	});

	window.addEventListener("beforeunload", (event) => {
		if (hasUnsavedChanges() && !SUCCESSFUL_SAVE) {
			event.preventDefault();
			event.returnValue = translate("messages.exit_confirmation");
		}
	});
}

function addListenerToRemoveDestination(categoria, j) {
	const dynamicSelects = [
		{
			type: "regiao",
			selectID: `${categoria}-regiao-select-${j}`,
		},
	];
	addRemoveChildListenerDS(categoria, j, dynamicSelects);
}

async function loadDestinations() {
	getID("delete-text").style.display = "block";
	startLoadingScreen();

	FIRESTORE_DESTINOS_DATA = await getSingleData("destinos");

	loadDestinationsData(FIRESTORE_DESTINOS_DATA);
	stopLoadingScreen();
}

// Listeners
function addDestinationsListeners(categoria, j) {
	// Interactive Title
	getID(`${categoria}-nome-${j}`).addEventListener("change", () =>
		updateDestinationsTitle(j, categoria),
	);
	getID(`${categoria}-emoji-${j}`).addEventListener("change", () =>
		updateDestinationsTitle(j, categoria),
	);
	getID(`${categoria}-novo-${j}`).addEventListener("click", () =>
		updateDestinationsTitle(j, categoria),
	);

	// Emoji Validation
	getID(`${categoria}-emoji-${j}`).addEventListener("input", () =>
		emojisOnInputAction(j, categoria),
	);

	// Valor
	getID(`${categoria}-valor-${j}`).addEventListener("change", () =>
		valorListenerAction(j, categoria),
	);

	// Region

	// Links
	getID(`${categoria}-website-${j}`).addEventListener("change", () =>
		validateLink(`${categoria}-website-${j}`),
	);
	getID(`${categoria}-mapa-${j}`).addEventListener("change", () =>
		validateMapLink(`${categoria}-mapa-${j}`),
	);
	getID(`${categoria}-instagram-${j}`).addEventListener("change", () =>
		validateInstagramLink(`${categoria}-instagram-${j}`),
	);
	getID(`${categoria}-midia-${j}`).addEventListener("change", () =>
		validateMediaLink(`${categoria}-midia-${j}`),
	);
}

function valorListenerAction(j, categoria) {
	const valor = getID(`${categoria}-valor-${j}`);
	const outroValor = getID(`${categoria}-outro-valor-${j}`);

	if (valor.value == "outro") {
		outroValor.style.display = "block";
		outroValor.required = true;
	} else {
		outroValor.style.display = "none";
		outroValor.required = false;
	}
}

function updateDestinationsTitle(j, categoria) {
	const titleDiv = getID(`${categoria}-title-text-${j}`);
	const emojiDiv = getID(`${categoria}-emoji-${j}`);

	const nome = getID(`${categoria}-nome-${j}`).value;
	const emoji = emojiDiv.value
		? emojiDiv.value.replace(/[a-zA-Z0-9\s!-\/:-@\[-`{-~]/g, "")
		: "";

	if (emoji && nome) {
		titleDiv.innerText = `${nome} ${emoji}`;
	} else if (nome) {
		titleDiv.innerText = nome;
	}

	getID(`${categoria}-title-icon-${j}`).style.display = getID(
		`${categoria}-novo-${j}`,
	).checked
		? "block"
		: "none";
}

function emojisOnInputAction(j, categoria) {
	const emojiDiv = getID(`${categoria}-emoji-${j}`);
	const emojiUntreated = emojiDiv.value;
	const emojiTreated = emojiUntreated
		? emojiUntreated.replace(/[a-zA-Z0-9\s!-\/:-@\[-`{-~]/g, "")
		: "";

	if (emojiTreated && emojiUntreated && emojiTreated !== emojiUntreated) {
		emojiDiv.value = emojiTreated;
	} else if (!emojiTreated && emojiUntreated) {
		emojiDiv.value = "";
		emojiDiv.placeholder = "Insira um Emoji Válido 🫠";
	}
}

export function openMoveDestinationModal(j, categoria) {
	const propriedades = cloneObject(MESSAGE_PROPERTIES);

	propriedades.titulo =
		getID(`${categoria}-nome-${j}`).value ||
		`Mover - ${firstCharToUpperCase(categoria)}`;
	propriedades.containers = getContainersInput();
	propriedades.botoes = [
		{
			tipo: "cancelar",
		},
		{
			tipo: "confirmar",
			acao: `moveDestination(${j}, '${categoria}')`,
		},
	];

	const options = {
		restaurantes: "Restaurantes",
		lanches: "Lanches",
		saidas: "Saídas",
		turismo: "Turismo",
		lojas: "Lojas",
	};

	let optionsString = "";

	for (const option in options) {
		if (option != categoria) {
			optionsString += `<option value="${option}">${options[option]}</option>`;
		}
	}

	propriedades.conteudo = `
  <div class="nice-form-group"">
    <label>Mover para:</label>
      <select class="editar-select" id="move-select">
        ${optionsString}
      </select>
  </div>`;

	displayFullMessage(propriedades);
}

function moveDestination(j, categoria) {
	const newCategoria = getID("move-select").value;
	const description = getDescription(categoria, j);

	if (categoria != newCategoria) {
		const destino = {
			novo: getID(`${categoria}-novo-${j}`).checked,
			nome: getID(`${categoria}-nome-${j}`).value,
			emoji: getID(`${categoria}-emoji-${j}`).value,
			website: getID(`${categoria}-website-${j}`).value,
			mapa: getID(`${categoria}-mapa-${j}`).value,
			instagram: getID(`${categoria}-instagram-${j}`).value,
			regiao: getID(`${categoria}-regiao-select-${j}`).value,
			valor: getID(`${categoria}-valor-${j}`).value,
			midia: getID(`${categoria}-midia-${j}`).value,
			nota: getID(`${categoria}-nota-${j}`).value,
		};

		const newJ = getLastJ(`${newCategoria}-box`) + 1;

		addDestino(newCategoria);
		addDestinoHTML(newCategoria, newJ, destino);
		setDescription(newCategoria, newJ, description);
		removeChildWithValidation(categoria, j);

		removeSelectorDS("regiao", `${categoria}-regiao-select-${j}`);
		updateValueDS(
			"regiao",
			destino.regiao,
			`${newCategoria}-regiao-select-${newJ}`,
		);
		buildDS("regiao");

		updateDescriptionButtonLabel(newCategoria, newJ);

		if (getID(`habilitado-${newCategoria}-content`).children.length === 1) {
			getID(`habilitado-${newCategoria}`).checked = true;
			showContent(newCategoria);
		}

		if (getID(`habilitado-${categoria}-content`).children.length === 0) {
			getID(`habilitado-${categoria}`).checked = false;
			hideContent(categoria);
		}
	}

	closeMessage();
}

export function deleteDestino() {
	const name = getID("titulo").value;

	const propriedades = cloneObject(MESSAGE_PROPERTIES);
	propriedades.titulo = translate("destination.delete.title");
	propriedades.conteudo = translate("destination.delete.message", { name });
	propriedades.botoes = [
		{
			tipo: "cancelar",
		},
		{
			tipo: "confirmar",
			acao: "deleteDestinoAction()",
		},
	];

	displayFullMessage(propriedades);
}

async function deleteDestinoAction() {
	if (DOCUMENT_ID) {
		await deleteUserObjectDB(DOCUMENT_ID, "destinos");
		window.location.href = `../index?visibility=${getVisibility()}`;
	}
}

function getID(categoria, j) {
	return getID(`${categoria}-id-${j}`).value;
}
