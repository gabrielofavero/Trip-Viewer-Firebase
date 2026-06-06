import { getID } from '../../../utils/dom.js';
import { hasUnsavedChanges, reEdit, validateImageLink, validateLink } from '../../../ui/fields.js';
import { searchDestinationsListenerAction, closeModal } from '../../../theme/visibility.js';
import { translate } from '../../../i18n/translation.js';
import { getNextInputDay, getPreviousInputDay, inputDateToJsDate } from '../../../utils/dates.js';
import { addRemoveChildListenerDS } from '../../../ui/dynamic-select.js';
import { registerActions } from '../../../ui/actions.js';
import { openTravelersInfo } from '../categories/travelers.js';
import { requestPinEditarGastos } from '../categories/basic-data/protected-data.js';
import { deleteTrip } from '../edit-trip.js';
import { openInnerExpense, deleteInnerGasto } from '../categories/expenses.js';
import { openAttributions } from '../../../utils/attributions.js';
import { closeToast } from '../../../utils/messages.js';
import { openAccommodationImages, openInnerAccommodationImage } from '../categories/accommodation.js';
import { openInnerItinerary, openInnerItineraryItem, openInnerItinerarySwap, deleteInnerProgramacao } from '../categories/itinerary-module/inner-itinerary/inner-itinerary.js';

// Loader
function loadEventListeners() {
	// Register data-action handlers via the shared delegated handler (ui/actions.js)
	registerActions({
		"open-travelers-info": () => openTravelersInfo(),
		"request-pin-expenses": () => requestPinEditarGastos(),
		"delete-trip": () => deleteTrip(),
		"open-inner-expense": (target) => {
			const category = target.getAttribute("data-category");
			if (category) openInnerExpense(category);
		},
		"open-attributions": () => openAttributions(),
		"close-modal": (target) => {
			const modalId = target.getAttribute("data-modal") || "delete-modal";
			closeModal(modalId);
		},
		"close-toast": () => closeToast(),
		"open-accommodation-images": (target) => {
			const index = parseInt(target.getAttribute("data-index"));
			if (!isNaN(index)) openAccommodationImages(index);
		},
		"open-inner-itinerary": (target) => {
			const index = parseInt(target.getAttribute("data-index"));
			if (!isNaN(index)) openInnerItinerary(index);
		},
		"open-inner-accommodation-image": (target) => {
			const index = parseInt(target.getAttribute("data-index"));
			if (!isNaN(index)) openInnerAccommodationImage(index);
		},
		"delete-inner-expense": (target) => {
			const category = target.getAttribute("data-category");
			const type = target.getAttribute("data-type");
			const index = parseInt(target.getAttribute("data-index"));
			if (category && type && !isNaN(index)) deleteInnerGasto(category, type, index);
		},
		"open-inner-itinerary-detail": (target) => {
			const j = parseInt(target.getAttribute("data-j"));
			const k = parseInt(target.getAttribute("data-k"));
			const turno = target.getAttribute("data-turno");
			if (!isNaN(j) && !isNaN(k) && turno) openInnerItinerary(j, k, turno);
		},
		"open-inner-itinerary-item": (target) => {
			const index = parseInt(target.getAttribute("data-index"));
			if (!isNaN(index)) openInnerItineraryItem(index);
		},
		"open-inner-itinerary-swap": () => openInnerItinerarySwap(),
		"delete-inner-itinerary": (target) => {
			const j = parseInt(target.getAttribute("data-j"));
			const k = parseInt(target.getAttribute("data-k"));
			const turno = target.getAttribute("data-turno");
			if (!isNaN(j) && !isNaN(k) && turno) deleteInnerProgramacao(j, k, turno);
		},
	});

	// Inputs
	getID("inicio").addEventListener("change", () => inicioListenerAction());
	getID("fim").addEventListener("change", () => fimListenerAction());

	// Botões
	getID("save-btn").addEventListener("click", () => setTripData());
	getID("re-editar").addEventListener("click", () =>
		reEdit("viagens", SUCCESSFUL_SAVE),
	);
	getID("visualizar").addEventListener("click", () =>
		visualizarListenerAction(),
	);
	getID("home").addEventListener(
		"click",
		() => (window.location.href = "../index.html"),
	);
	getID("home").addEventListener(
		"click",
		() => (window.location.href = "../index.html"),
	);
	getID("cancel-btn").addEventListener(
		"click",
		() => (window.location.href = "../index.html"),
	);
	getID("transporte-adicionar").addEventListener("click", () =>
		transportationAddListenerAction(),
	);
	getID("hospedagens-adicionar").addEventListener("click", () =>
		accommodationsAddListenerAction(),
	);
	getID("galeria-adicionar").addEventListener("click", () =>
		galeriaAdicionarListenerAction(),
	);
	getID("pin-disabled").addEventListener("click", switchPin);
	getID("pin-sensitive-only").addEventListener("click", switchPin);
	getID("pin-all-data").addEventListener("click", switchPin);
	getID("claro").addEventListener("change", () => autoFillDarkColor());

	// Visibilidade do Ida e Volta (Transporte)
	getID("simple-view").addEventListener("change", () =>
		applyTransportationTypeVisualization(),
	);
	getID("leg-view").addEventListener("change", () =>
		applyTransportationTypeVisualization(),
	);
	getID("people-view").addEventListener("change", () =>
		applyTransportationTypeVisualization(),
	);

	// Validação de Imagens no módulo de Customização
	getID("link-background").addEventListener("change", () =>
		validateImageLink("link-background"),
	);
	getID("link-logo-light").addEventListener("change", () =>
		validateImageLink("link-logo-light"),
	);
	getID("link-logo-dark").addEventListener("change", () =>
		validateImageLink("link-logo-dark"),
	);

	// Validação de Links no módulo de Customização
	getID("link-attachments").addEventListener("change", () =>
		validateLink("link-attachments"),
	);
	getID("link-drive").addEventListener("change", () =>
		validateLink("link-drive"),
	);
	getID("link-maps").addEventListener("change", () =>
		validateLink("link-maps"),
	);
	getID("link-pdf").addEventListener("change", () => validateLink("link-pdf"));
	getID("link-ppt").addEventListener("change", () => validateLink("link-ppt"));
	getID("link-sheet").addEventListener("change", () =>
		validateLink("link-sheet"),
	);
	getID("link-vacina").addEventListener("change", () =>
		validateLink("link-vacina"),
	);

	// Barra de pesquisa em destinos
	getID("destinos-search").addEventListener("input", () =>
		searchDestinationsListenerAction(),
	);

	// Radios
	getID("dark-and-light").addEventListener("change", () =>
		visibilityListenerAction(),
	);
	getID("light-exclusive").addEventListener("change", () =>
		visibilityListenerAction(),
	);
	getID("dark-exclusive").addEventListener("change", () =>
		visibilityListenerAction(),
	);

	window.addEventListener("beforeunload", (event) => {
		if (hasUnsavedChanges() && !SUCCESSFUL_SAVE) {
			event.preventDefault();
			event.returnValue = translate("messages.exit_confirmation");
		}
	});
}

// Actions
function inicioListenerAction() {
	const inicioDiv = getID("inicio");
	const fimDiv = getID("fim");

	const inicio = inicioDiv.value;
	const fim = fimDiv.value;

	if (
		NEW_TRIP ||
		!fim ||
		inputDateToJsDate(fim).getTime() < inputDateToJsDate(inicio).getTime()
	) {
		fimDiv.value = getNextInputDay(inicio);
	}

	reloadItinerary();
}

function fimListenerAction() {
	const inicioDiv = getID("inicio");
	const fimDiv = getID("fim");

	const inicio = inicioDiv.value;
	const fim = fimDiv.value;

	if (
		!inicio ||
		inputDateToJsDate(fim).getTime() < inputDateToJsDate(inicio).getTime()
	) {
		inicioDiv.value = getPreviousInputDay(fim);
	}

	reloadItinerary();
}

function visualizarListenerAction() {
	if (DOCUMENT_ID) {
		window.open(
			`../view.html?v=${DOCUMENT_ID}&visibility=${getVisibility()}`,
			"_blank",
		);
	} else {
		window.location.href = "../index.html";
	}
}

function addRemoveTransportationListener(j) {
	const dynamicSelects = [
		{
			type: "transporte-pessoa",
			selectID: `transporte-pessoa-select-${j}`,
		},
	];
	addRemoveChildListenerDS("transporte", j, dynamicSelects);
}

function addRemoveGaleriaListener(j) {
	const dynamicSelects = [
		{
			type: "galeria-categoria",
			selectID: `galeria-categoria-select-${j}`,
		},
	];
	addRemoveChildListenerDS("galeria", j, dynamicSelects);
}

function visibilityListenerAction(visibilidade) {
	if (!visibilidade) {
		visibilidade = buildVisibilidadeObject();
	}

	getID("tema-claro").style.display = visibilidade.claro ? "block" : "none";
	getID("tema-escuro").style.display = visibilidade.escuro ? "block" : "none";
}
