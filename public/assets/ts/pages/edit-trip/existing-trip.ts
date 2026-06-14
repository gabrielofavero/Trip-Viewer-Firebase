import { PIN, switchPinVisibility, switchPinLabel, getCurrentPreferencePIN } from './categories/basic-data/protected-data.js';
import { setGastosData } from './edit-trip.js';
import { DOCUMENT_ID } from '../../data/state.js';
import { setCurrentPreferencePIN } from './categories/basic-data/set-protected-data.js';
import { setTravelers, updateTravelersButtonLabel } from './categories/travelers.js';
import { loadCustomizacaoImageData, setCurrentLight } from './categories/customization.js';
import { visibilityListenerAction } from './support/event-listeners.js';
import { addTransportation, addHospedagens, loadDestinations, loadItinerarySchedule, addGaleria } from './new-trip.js';
import { loadTransportationVisibility, updateTransportationTitle, applyTransportationTypeVisualization } from './categories/transportation.js';
import { ACCOMMODATION_IMAGES, setImagemButtonLabel, loadCheckIn, loadCheckOut } from './categories/accommodation.js';
import { loadDestinosAtivos, updateDestinosAtivosCardsHTML } from './categories/destination.js';
import { setProgramacaoData, applyLoadedItineraryData } from './categories/itinerary-module/itinerary-module.js';
import { displayError } from '../../utils/messages.js';
import { translate } from '../../i18n/translation.js';
import { getState } from '../../data/state.js';
import { cloneObject, getID, getOptionsFromSelect } from '../../utils/dom.js';
import { convertFromDateObject, getDateString, getTimeStringFromDate } from '../../utils/dates.js';
import { validateTravelersObject } from '../../models/traveler.model.js';
import { haveErrorFromGetRequest, get } from '../../data/firebase/database.js';
import { ERROR_FROM_GET_REQUEST } from '../../data/state.js';
import { buildDS, updateValueDS } from '../../ui/dynamic-select.js';
import { getHTMLpage, setPageName } from '../../app/main.js';

export async function loadTripData() {
	try {
		loadBasicTripData();
		loadCustomizacaoData();
		await loadExpensesData();
		loadTransportationData();
		loadAccommodationData();
		await loadDestinationsData();
		loadItineraryData();
		loadGaleriaData();

		setPageName(`${translate("labels.edit")} ${getState().title}`);
	} catch (error) {
		displayError(error);
		throw error;
	}
}

function loadBasicTripData() {
	getID("title").value = getState().titulo;
	getID("currency").value = getState().moeda;

	const inicio = convertFromDateObject(getState().inicio);
	const fim = convertFromDateObject(getState().fim);

	getID("inicio").value = getDateString(inicio, "yyyy-mm-dd");
	getID("fim").value = getDateString(fim, "yyyy-mm-dd");

	setTravelers(cloneObject(getState().pessoas));
	validateTravelersObject();
	updateTravelersButtonLabel();
	setCurrentPreferencePIN(getState().pin);
	switchPinVisibility();
	switchPinLabel();
}

export function loadCustomizacaoData(state?) {
	// Imagens
	const background = getState().imagem.background;
	const logoClaro = getState().imagem.claro;
	const logoEscuro = getState().imagem.escuro;

	if (getState().imagem.ativo === true) {
		getID("habilitado-imagens").checked = true;
		getID("habilitado-imagens-content").style.display = "block";
	}

	loadCustomizacaoImageData(background, "link-background");
	loadCustomizacaoImageData(logoClaro, "link-logo-light");
	loadCustomizacaoImageData(logoEscuro, "link-logo-dark");

	// Cores
	const claro = getID("claro");
	const escuro = getID("escuro");

	if (getState().cores.ativo === true) {
		getID("colors-enabled").checked = true;
		claro.value = getState().cores.claro;
		escuro.value = getState().cores.escuro;
		setCurrentLight(getState().cores.claro);
		getID("habilitado-cores-content").style.display = "block";
	}

	// Visibilidade
	const visibilidade = getState().visibilidade;
	if (visibilidade) {
		visibilityListenerAction(visibilidade);
		getID("dark-and-light").checked = visibilidade.claro && visibilidade.escuro;
		getID("light-exclusive").checked =
			visibilidade.claro && !visibilidade.escuro;
		getID("dark-exclusive").checked =
			!visibilidade.claro && visibilidade.escuro;
	}

	// Links Personalizados
	getID("habilitado-links").checked = getState().links.ativo;
	getID("link-attachments").value = getState().links.attachments;
	getID("link-drive").value = getState().links.drive;
	getID("link-maps").value = getState().links.maps;
	getID("link-pdf").value = getState().links.pdf;
	getID("link-ppt").value = getState().links.ppt;
	getID("link-sheet").value = getState().links.sheet;
	getID("link-vacina").value = getState().links.vacina;
}

async function loadExpensesData() {
	if (getState().modulos.gastos === true) {
		getID("enabled-expenses").checked = true;
		getID("enabled-expenses-content").style.display = "block";
	}

	const getPath = PIN.current
		? `expenses/protected/${PIN.current}/${DOCUMENT_ID}`
		: `expenses/${DOCUMENT_ID}`;

	setGastosData(await get(getPath, true, true));

	if (haveErrorFromGetRequest()) {
		displayError(ERROR_FROM_GET_REQUEST);
		return;
	}

	loadExpensesData();
}

async function loadTransportationData() {
	if (getState().modulos.transportes === true) {
		getID("transportation-enabled").checked = true;
		getID("transportation-enabled-content").style.display = "block";
		getID("transportation-add-box").style.display = "block";
	}
	getID(getState().transportes.visualizacao || "simple-view").checked =
		true;

	for (let j = 1; j <= getState().transportes.dados.length; j++) {
		addTransportation();
		const transporte = getState().transportes.dados[j - 1];

		getID(`${transporte.idaVolta}-${j}`).checked = true;

		const pessoa = transporte.pessoa;
		if (pessoa) {
			getID(`transportation-pessoa-${j}`).value = pessoa;
			updateValueDS(
				"transporte-pessoa",
				pessoa,
				`transportation-pessoa-select-${j}`,
			);
			buildDS("transporte-pessoa");
		}

		const partida = convertFromDateObject(transporte.datas.partida);
		const chegada = convertFromDateObject(transporte.datas.chegada);

		if (partida) {
			getID(`partida-${j}`).value = getDateString(partida, "yyyy-mm-dd");
			getID(`partida-horario-${j}`).value = getTimeStringFromDate(partida);
		}

		if (chegada) {
			getID(`chegada-${j}`).value = getDateString(chegada, "yyyy-mm-dd");
			getID(`chegada-horario-${j}`).value = getTimeStringFromDate(chegada);
		}

		getID(`transportation-tipo-${j}`).value = transporte.transporte;
		const empresa = transporte.empresa;
		if (empresa) {
			loadTransportationVisibility(j);
			if (getOptionsFromSelect(`empresa-select-${j}`).includes(empresa)) {
				getID(`empresa-select-${j}`).value = empresa;
			} else {
				getID(`empresa-select-${j}`).value = "outra";
				getID(`empresa-${j}`).value = empresa;
				loadTransportationVisibility(j);
			}
		}

		getID(`transportation-id-${j}`).value = transporte.id;
		getID(`transportation-duracao-${j}`).value = transporte.duracao;
		getID(`reserva-transportation-${j}`).value = transporte.reserva;
		getID(`ponto-partida-${j}`).value = transporte.pontos.partida;
		getID(`ponto-chegada-${j}`).value = transporte.pontos.chegada;
		getID(`transportation-link-${j}`).value = transporte.link;

		updateTransportationTitle(j);
	}
	applyTransportationTypeVisualization();
}

function loadAccommodationData() {
	if (getState().modulos.hospedagens === true) {
		getID("accommodations-enabled").checked = true;
		getID("habilitado-hospedagens-content").style.display = "block";
		getID("hospedagens-adicionar-box").style.display = "block";
	}

	for (let j = 1; j <= getState().hospedagens.length; j++) {
		addHospedagens();
		const hospedagem = getState().hospedagens[j - 1];
		ACCOMMODATION_IMAGES[j] = hospedagem.imagens || [];

		getID(`accommodations-id-${j}`).value = hospedagem.id;
		getID(`accommodations-cafe-${j}`).checked = hospedagem.cafe;
		getID(`accommodations-nome-${j}`).value = hospedagem.nome;
		getID(`accommodations-title-${j}`).innerText =
			hospedagem.nome || getID(`accommodations-title-${j}`).innerText;
		getID(`accommodations-endereco-${j}`).value = hospedagem.endereco;
		getID(`accommodations-description-${j}`).value = hospedagem.descricao;
		getID(`reserva-accommodations-${j}`).value = hospedagem.reserva || "";
		getID(`reserva-accommodations-link-${j}`).value = hospedagem.link;

		setImagemButtonLabel(j);
		loadCheckIn(hospedagem, j);
		loadCheckOut(hospedagem, j);
	}
}

async function loadDestinationsData() {
	if (
		getHTMLpage() === "edit-listing" ||
		getState().modulos.destinos === true
	) {
		if (getID("destinations-enabled")) {
			getID("destinations-enabled").checked = true;
		}
		getID("destinations-enabled-content").style.display = "block";
		getID("no-destinations").style.display = "none";
		getID("has-destinations").style.display = "block";
	} else {
		getID("no-destinations").style.display = "block";
		getID("has-destinations").style.display = "none";
	}

	loadDestinations();
	const cards = document.querySelectorAll('#destinations-checkboxes .destination-card');
	for (const destino of getState().destinos) {
		const id = destino.destinosID;
		for (const card of cards) {
			if (card.getAttribute("data-destino-id") === id) {
				card.classList.add("selected");
				// Move to top of selected group
				const container = getID("destinations-checkboxes");
				container.prepend(card);
				break;
			}
		}
	}
	await loadDestinosAtivos();
}

export function loadItineraryData() {
	if (getState().modulos.programacao === true) {
		getID("itinerary-enabled").checked = true;
		getID("itinerary-enabled-content").style.display = "block";
	}

	loadItinerarySchedule();

	let j = 1;
	while (getID(`itinerary-title-${j}`)) {
		const dados = getState().programacoes[j - 1];
		if (dados?.data) {
			applyLoadedItineraryData(j, dados);
		}
		j++;
	}
	updateDestinosAtivosCardsHTML("programacao");
	setProgramacaoData(cloneObject(getState().programacoes));
}

function loadGaleriaData() {
	if (getState().modulos.galeria === true) {
		getID("gallery-enabled").checked = true;
		getID("gallery-enabled-content").style.display = "block";
		getID("gallery-add-box").style.display = "block";
	}

	const galeriaSize = getState().galeria?.imagens.length;
	if (galeriaSize > 0) {
		for (let j = 1; j <= galeriaSize; j++) {
			const i = j - 1;
			addGaleria();

			const titulo = getState().galeria.titulos[i];
			if (titulo) {
				getID(`gallery-title-${j}`).value = titulo;
				getID(`gallery-title-${j}`).innerText = titulo;
			}

			const categoria = getState().galeria.categorias[i];
			if (categoria) {
				getID(`gallery-category-${j}`).value = categoria;
				updateValueDS(
					"galeria-categoria",
					categoria,
					`gallery-category-select-${j}`,
				);
				buildDS("galeria-categoria");
			}

			const descricao = getState().galeria.descricoes[i];
			if (descricao) {
				getID(`gallery-description-${j}`).value = descricao;
			}

			getID(`link-gallery-${j}`).value = getState().galeria.imagens[i];
		}
	}
}
