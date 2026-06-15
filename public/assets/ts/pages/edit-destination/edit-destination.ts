import { startLoadingScreen, stopLoadingScreen } from '../../utils/loading.js';
import { closeMessage, displayError, displayFullMessage, getContainersInput } from '../../utils/messages.js';
import { getTodayFormatted, getTomorrowFormatted } from '../../utils/dates.js';
import { cloneObject, firstCharToUpperCase, getID, getLastJ, getURLParam, removeChildWithValidation, removeRequired, setRequired } from '../../utils/dom.js';
import { addRemoveChildListenerDS, buildDS, newDynamicSelect, removeSelectorDS, updateValueDS } from '../../ui/dynamic-select.js';
import { hasUnsavedChanges, reEdit, snapshotFormState, validateInstagramLink, validateLink, validateMapLink, validateMediaLink } from '../../ui/fields.js';
import { hideContent, loadEditModule, showContent } from '../../theme/visibility.js';
import { closeAccordions, openLastAccordion } from '../../ui/accordion.js';
import { translate } from '../../i18n/translation.js';
import { deleteUserObjectDB, getSingleData } from '../../data/firebase/database.js';
import { loadVisibilityIndex } from '../home/support/visibility.js';
import { loadEditDestinationListeners } from './support/event-listeners.js';
import { getVisibility } from "../../theme/theme.js";
import { populateExistingDestinationForm } from "./existing-destination.js";
import { getDescription } from "./categories/description.js";
import { setDescription } from "./categories/description.js";
import { updateDescriptionButtonLabel } from "./categories/description.js";
import { loadCurrencySelects } from "./categories/price.js";
import { addDestination } from "./existing-destination.js";
import { addDestinationHTML } from "./existing-destination.js";
import { addSnacks } from "./new-destination.js";
import { addShopping } from "./new-destination.js";
import { addRestaurants } from "./new-destination.js";
import { addNightlife } from "./new-destination.js";
import { addTourism } from "./new-destination.js";
import { setDocumento } from "../../utils/set.js";
import { buildDestinosObject, updateTikTokLinks } from "./set-destination.js";
import { FIRESTORE_DESTINATIONS_DATA, SUCCESSFUL_SAVE, DOCUMENT_ID, setDocumentId, setFirestoreDestinationsData } from '../../data/state.js';
import { MESSAGE_PROPERTIES } from '../../utils/messages.js';
import { initEditTabs } from "../../ui/edit-tabs.js";

const TODAY = getTodayFormatted();
const TOMORROW = getTomorrowFormatted();

var SCHEDULE = {};

var REGIONS = [];

export async function loadEditDestinationPage() {
	loadEditDestinationListeners();

	setDocumentId(getURLParam("d"));

	loadVisibilityIndex();
	initEditTabs();
	loadHabilitados();
	newDynamicSelect("region");

	if (DOCUMENT_ID) {
		await loadDestinations();
	}

	loadEventListeners();
	stopLoadingScreen();
	snapshotFormState();
	$("body").css("overflow", "auto");
}

function loadHabilitados() {
	loadEditModule("restaurants");
	loadEditModule("snacks");
	loadEditModule("nightlife");
	loadEditModule("tourism");
	loadEditModule("shopping");
	loadEditModule("mapa");

	const mapa = getID("map-enabled");
	mapa.addEventListener("change", function () {
		if (mapa.checked) {
			setRequired("mapa-link");
		} else {
			removeRequired("mapa-link");
		}
	});
}

function loadEventListeners() {
	getID("restaurants-add").addEventListener("click", () => {
		closeAccordions("restaurants");
		addRestaurants();
		openLastAccordion("restaurants");
		buildDS("region");
	});

	getID("snacks-add").addEventListener("click", () => {
		closeAccordions("snacks");
		addSnacks();
		openLastAccordion("snacks");
		buildDS("region");
	});

	getID("nightlife-add").addEventListener("click", () => {
		closeAccordions("nightlife");
		addNightlife();
		openLastAccordion("nightlife");
		buildDS("region");
	});

	getID("tourism-add").addEventListener("click", () => {
		closeAccordions("tourism");
		addTourism();
		openLastAccordion("tourism");
		buildDS("region");
	});

	getID("shopping-add").addEventListener("click", () => {
		closeAccordions("shopping");
		addShopping();
		openLastAccordion("shopping");
		buildDS("region");
	});

	getID("save-btn").addEventListener("click", () => {
		startLoadingScreen();
		const type = "destinations";
		const dataBuildingFunctions = [buildDestinosObject, updateTikTokLinks];

		setDocumento({ type, dataBuildingFunctions });
	});

	getID("re-editar").addEventListener("click", () => {
		reEdit("destinations", SUCCESSFUL_SAVE);
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

	getID("currency").addEventListener("change", () => {
		if (getID("currency").value == "outra") {
			getID("other-currency").style.display = "block";
		} else {
			getID("other-currency").style.display = "none";
		}
		loadCurrencySelects();
	});

	getID("other-currency").addEventListener("change", () => {
		loadCurrencySelects();
	});

	window.addEventListener("beforeunload", (event) => {
		if (hasUnsavedChanges() && !SUCCESSFUL_SAVE) {
			event.preventDefault();
			event.returnValue = translate("messages.exit_confirmation");
		}
	});
}

export function addListenerToRemoveDestination(categoria, j) {
	const dynamicSelects = [
		{
		type: "region",
		selectID: `${categoria}-region-select-${j}`,
		},
	];
	addRemoveChildListenerDS(categoria, j, dynamicSelects);
}

async function loadDestinations() {
	getID("delete-text").style.display = "block";
	startLoadingScreen();

	const singleData = await getSingleData("destinations");
	setFirestoreDestinationsData(singleData);

	populateExistingDestinationForm();
	stopLoadingScreen();
}

// Listeners
export function addDestinationsListeners(categoria, j) {
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
	getID(`${categoria}-map-${j}`).addEventListener("change", () =>
		validateMapLink(`${categoria}-map-${j}`),
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

export function updateDestinationsTitle(j, categoria) {
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

export function emojisOnInputAction(j, categoria) {
	const emojiDiv = getID(`${categoria}-emoji-${j}`);
	const emojiUntreated = emojiDiv.value;
	const emojiTreated = emojiUntreated
		? emojiUntreated.replace(/[a-zA-Z0-9\s!-\/:-@\[-`{-~]/g, "")
		: "";

	if (emojiTreated && emojiUntreated && emojiTreated !== emojiUntreated) {
		emojiDiv.value = emojiTreated;
	} else if (!emojiTreated && emojiUntreated) {
		emojiDiv.value = "";
		emojiDiv.placeholder = translate("destination.errors.invalid_emoji");
	}
}

export function openMoveDestinationModal(j, categoria) {
	const properties = cloneObject(MESSAGE_PROPERTIES);

	properties.titulo =
		getID(`${categoria}-nome-${j}`).value ||
		translate("destination.move.title", { category: firstCharToUpperCase(categoria) });
	properties.containers = getContainersInput();
	properties.botoes = [
		{
			tipo: "cancelar",
		},
		{
			tipo: "confirmar",
			acao: `moveDestination(${j}, '${categoria}')`,
		},
	];

	const options: Record<string, string> = {};
	for (const cat of ["restaurants", "snacks", "nightlife", "tourism", "shopping"]) {
		options[cat] = translate(`destination.${cat}.title`);
	}

	let optionsString = "";

	for (const option in options) {
		if (option != categoria) {
			optionsString += `<option value="${option}">${options[option]}</option>`;
		}
	}

	properties.conteudo = `
  <div class="nice-form-group"">
    <label>${translate("destination.move.label")}</label>
      <select class="editar-select" id="move-select">
        ${optionsString}
      </select>
  </div>`;

	displayFullMessage(properties);
}

export function moveDestination(j, categoria) {
	const newCategoria = getID("move-select").value;
	const description = getDescription(categoria, j);

	if (categoria != newCategoria) {
		const destino = {
			novo: getID(`${categoria}-novo-${j}`).checked,
			nome: getID(`${categoria}-nome-${j}`).value,
			emoji: getID(`${categoria}-emoji-${j}`).value,
			website: getID(`${categoria}-website-${j}`).value,
			mapa: getID(`${categoria}-map-${j}`).value,
			instagram: getID(`${categoria}-instagram-${j}`).value,
			regiao: getID(`${categoria}-region-select-${j}`).value,
			valor: getID(`${categoria}-valor-${j}`).value,
			midia: getID(`${categoria}-midia-${j}`).value,
			nota: getID(`${categoria}-rating-${j}`).value,
		};

		const newJ = getLastJ(`${newCategoria}-box`) + 1;

		addDestination(newCategoria);
		addDestinationHTML(newCategoria, newJ, destino);
		setDescription(newCategoria, newJ, description);
		removeChildWithValidation(categoria, j);

		removeSelectorDS("region", `${categoria}-region-select-${j}`);
		updateValueDS(
			"region",
			destino.regiao,
			`${newCategoria}-region-select-${newJ}`,
		);
		buildDS("region");

		updateDescriptionButtonLabel(newCategoria, newJ);

		if (getID(`enabled-${newCategoria}-content`).children.length === 1) {
			getID(`enabled-${newCategoria}`).checked = true;
			showContent(newCategoria);
		}

		if (getID(`enabled-${categoria}-content`).children.length === 0) {
			getID(`enabled-${categoria}`).checked = false;
			hideContent(categoria);
		}
	}

	closeMessage();
}

export function deleteDestino() {
	const name = getID("title").value;

	const properties = cloneObject(MESSAGE_PROPERTIES);
	properties.titulo = translate("destination.delete.title");
	properties.conteudo = translate("destination.delete.message", { name });
	properties.botoes = [
		{
			tipo: "cancelar",
		},
		{
			tipo: "confirmar",
			acao: "deleteDestinoAction()",
		},
	];

	displayFullMessage(properties);
}

export async function deleteDestinoAction() {
	if (DOCUMENT_ID) {
		await deleteUserObjectDB(DOCUMENT_ID, "destinations");
		window.location.href = `../index?visibility=${getVisibility()}`;
	}
}

function getDestinoID(categoria, j) {
	return getID(`${categoria}-id-${j}`).value;
}
