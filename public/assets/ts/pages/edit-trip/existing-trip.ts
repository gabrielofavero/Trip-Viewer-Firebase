import { PIN, switchPinVisibility, switchPinLabel, getCurrentPreferencePIN } from './categories/basic-data/protected-data.js';
import { setExpensesData } from './edit-trip.js';
import { DOCUMENT_ID } from '../../data/state.js';
import { setCurrentPreferencePIN } from './categories/basic-data/set-protected-data.js';
import { setTravelers, updateTravelersButtonLabel } from './categories/travelers.js';
import { loadCustomizacaoImageData, setCurrentLight } from './categories/customization.js';
import { visibilityListenerAction } from './support/event-listeners.js';
import { addTransportation, addAccommodations, loadDestinations, loadItinerarySchedule, addGallery } from './new-trip.js';
import { loadTransportationVisibility, updateTransportationTitle, applyTransportationTypeVisualization } from './categories/transportation.js';
import { ACCOMMODATION_IMAGES, setImagemButtonLabel, loadCheckIn, loadCheckOut } from './categories/accommodation.js';
import { loadActiveDestinations, updateActiveDestinationsCardsHTML } from './categories/destination.js';
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
	getID("title").value = getState().title;
	getID("currency").value = getState().currency;

	const start = convertFromDateObject(getState().start);
	const end = convertFromDateObject(getState().end);

	getID("start").value = getDateString(start, "yyyy-mm-dd");
	getID("end").value = getDateString(end, "yyyy-mm-dd");

	setTravelers(cloneObject(getState().people));
	validateTravelersObject();
	updateTravelersButtonLabel();
	setCurrentPreferencePIN(getState().pin);
	switchPinVisibility();
	switchPinLabel();
}

export function loadCustomizacaoData(state?) {
	// Images
	const background = getState().image.background;
	const logoLight = getState().image.light;
	const logoDark = getState().image.dark;

	if (getState().image.active === true) {
		getID("images-enabled").checked = true;
		getID("images-enabled-content").style.display = "block";
	}

	loadCustomizacaoImageData(background, "link-background");
	loadCustomizacaoImageData(logoLight, "link-logo-light");
	loadCustomizacaoImageData(logoDark, "link-logo-dark");

	// Cores
	const lightColor = getID("light-color");
	const darkColor = getID("dark-color");

	if (getState().cores.ativo === true) {
		getID("colors-enabled").checked = true;
		lightColor.value = getState().cores.claro;
		darkColor.value = getState().cores.escuro;
		setCurrentLight(getState().cores.claro);
		getID("colors-enabled-content").style.display = "block";
	}

	// Visibility
	const visibility = getState().visibility;
	if (visibility) {
		visibilityListenerAction(visibility);
		getID("dark-and-light").checked = visibility.light && visibility.dark;
		getID("light-exclusive").checked =
			visibility.light && !visibility.dark;
		getID("dark-exclusive").checked =
			!visibility.light && visibility.dark;
	}

	// Custom Links
	getID("links-enabled").checked = getState().links.active;
	getID("link-attachments").value = getState().links.attachments;
	getID("link-drive").value = getState().links.drive;
	getID("link-maps").value = getState().links.maps;
	getID("link-pdf").value = getState().links.pdf;
	getID("link-ppt").value = getState().links.ppt;
	getID("link-sheet").value = getState().links.sheet;
	getID("link-vacina").value = getState().links.vaccine;
}

async function loadExpensesData() {
	if (getState().modules.expenses === true) {
		getID("enabled-expenses").checked = true;
		getID("enabled-expenses-content").style.display = "block";
	}

	const getPath = PIN.current
		? `expenses/protected/${PIN.current}/${DOCUMENT_ID}`
		: `expenses/${DOCUMENT_ID}`;

	setExpensesData(await get(getPath, true, true));

	if (haveErrorFromGetRequest()) {
		displayError(ERROR_FROM_GET_REQUEST);
		return;
	}

	loadExpensesData();
}

async function loadTransportationData() {
	if (getState().modules.transportation === true) {
		getID("transportation-enabled").checked = true;
		getID("transportation-enabled-content").style.display = "block";
		getID("transportation-add-box").style.display = "block";
	}
	getID(getState().transportation.visualizacao || "simple-view").checked =
		true;

	for (let j = 1; j <= getState().transportation.dados.length; j++) {
		addTransportation();
		const transporte = getState().transportation.dados[j - 1];

		getID(`${transporte.idaVolta}-${j}`).checked = true;

		const pessoa = transporte.pessoa;
		if (pessoa) {
			getID(`transportation-person-${j}`).value = pessoa;
			updateValueDS(
				"transportation-person",
				pessoa,
				`transportation-person-select-${j}`,
			);
			buildDS("transportation-person");
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
	if (getState().modules.accommodations === true) {
		getID("accommodations-enabled").checked = true;
		getID("accommodations-enabled-content").style.display = "block";
		getID("accommodations-add-box").style.display = "block";
	}

	for (let j = 1; j <= getState().accommodations.length; j++) {
		addAccommodations();
		const accommodation = getState().accommodations[j - 1];
		ACCOMMODATION_IMAGES[j] = accommodation.images || [];

		getID(`accommodations-id-${j}`).value = accommodation.id;
		getID(`accommodations-cafe-${j}`).checked = accommodation.breakfast;
		getID(`accommodations-nome-${j}`).value = accommodation.name;
		getID(`accommodations-title-${j}`).innerText =
			accommodation.name || getID(`accommodations-title-${j}`).innerText;
		getID(`accommodations-endereco-${j}`).value = accommodation.address;
		getID(`accommodations-description-${j}`).value = accommodation.description;
		getID(`reserva-accommodations-${j}`).value = accommodation.reserva || "";
		getID(`reserva-accommodations-link-${j}`).value = accommodation.link;

		setImagemButtonLabel(j);
		loadCheckIn(accommodation, j);
		loadCheckOut(accommodation, j);
	}
}

async function loadDestinationsData() {
	if (
		getHTMLpage() === "edit-listing" ||
		getState().modules.destinations === true
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
	for (const destino of getState().destinations) {
		const id = destino.destinationId;
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
	await loadActiveDestinations();
}

export function loadItineraryData() {
	if (getState().modules.itinerary === true) {
		getID("itinerary-enabled").checked = true;
		getID("itinerary-enabled-content").style.display = "block";
	}

	loadItinerarySchedule();

	let j = 1;
	while (getID(`itinerary-title-${j}`)) {
		const dados = getState().schedules[j - 1];
		if (dados?.data) {
			applyLoadedItineraryData(j, dados);
		}
		j++;
	}
	updateActiveDestinationsCardsHTML("itinerary");
	setProgramacaoData(cloneObject(getState().schedules));
}

function loadGaleriaData() {
	if (getState().modules.gallery === true) {
		getID("gallery-enabled").checked = true;
		getID("gallery-enabled-content").style.display = "block";
		getID("gallery-add-box").style.display = "block";
	}

	const gallerySize = getState().gallery?.images.length;
	if (gallerySize > 0) {
		for (let j = 1; j <= gallerySize; j++) {
			const i = j - 1;
			addGallery();

			const title = getState().gallery.titles[i];
			if (title) {
				getID(`gallery-title-${j}`).value = title;
				getID(`gallery-title-${j}`).innerText = title;
			}

			const category = getState().gallery.categories[i];
			if (category) {
				getID(`gallery-category-${j}`).value = category;
				updateValueDS(
					"gallery-category",
					category,
					`gallery-category-select-${j}`,
				);
				buildDS("gallery-category");
			}

			const description = getState().gallery.descriptions[i];
			if (description) {
				getID(`gallery-description-${j}`).value = description;
			}

			getID(`link-gallery-${j}`).value = getState().gallery.images[i];
		}
	}
}
