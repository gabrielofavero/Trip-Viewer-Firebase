import { stopLoadingScreen } from '../../utils/loading.js';
import { displayError } from '../../utils/messages.js';

var REFRESHED = false;
var TYPE = "viagens";
var PIN = null;

var START_DATE = {
	date: null,
	text: "",
};

var END_DATE = {
	date: null,
	text: "",
};

var TRAVELERS;

document.addEventListener("DOMContentLoaded", async function () {
	try {
		startLoadingTimer();
		mainView();
	} catch (error) {
		displayError(error);
		throw error;
	}
});

export async function loadViewPage() {
	const urlParams = getURLParams();
	TYPE = urlParams["l"] ? "listagens" : urlParams["d"] ? "destinos" : "viagens";
	DOCUMENT_ID = urlParams["l"] || urlParams["d"] || urlParams["v"];

	window.addEventListener("scroll", () => {
		if (window.scrollY > 0) {
			if (!REFRESHED) {
				refreshCategorias();
				REFRESHED = true;
			}
		} else {
			REFRESHED = false;
		}
	});

	const firestoreData = await getSingleData(TYPE);

	if (haveErrorFromGetRequest()) {
		displayError(getErrorFromGetRequestMessage(), true);
		stopLoadingScreen();
		return;
	}

	if (!haveErrorFromGetRequest()) {
		if (firestoreData.pin === "all-data") {
			loadProtectedData(firestoreData);
		} else {
			setFirestoreData(firestoreData);
		}
	}
}

async function syncModules() {
	try {
		if (CALL_SYNC.length > 0) {
			const callSyncOrder = [
				_loadSummary,
				_loadTransportation,
				_loadAccommodations,
				_loadDestinations,
				_loadGallery,
			];
			CALL_SYNC.sort((a, b) => {
				const indexA = callSyncOrder.indexOf(a.name);
				const indexB = callSyncOrder.indexOf(b.name);
				return indexA - indexB;
			});
			for (let fn of CALL_SYNC) {
				fn();
			}
		} else {
			console.warn("No functions to sync");
		}
		// Loading Screen
		stopLoadingScreen();
		adjustDestinationsHTML();
	} catch (error) {
		displayError(error);
		throw error;
	}
}

function prepareViewData() {
	if (FIRESTORE_DATA.inicio && FIRESTORE_DATA.fim) {
		loadInicioFim();
	}

	loadVisibility();
	adjustCardsHeightsListener();
	loadCloseCustomSelectListeners();

	loadHeader();
	loadModules();
	loadViewEmbed();
}

function loadInicioFim(data = FIRESTORE_DATA) {
	START_DATE.date = convertFromDateObject(data.inicio);
	END_DATE.date = convertFromDateObject(data.fim);

	START_DATE.text = `${data.inicio.day}/${data.inicio.month}`;
	END_DATE.text = `${data.fim.day}/${data.fim.month}`;
}

function loadHeader() {
	loadTitle();

	if (TYPE == "destinos" && FIRESTORE_DATA.versao?.ultimaAtualizacao) {
		getID("hero-subtitle").innerHTML = getLastUpdatedOnText(
			FIRESTORE_DATA.versao.ultimaAtualizacao,
		);
	}

	if (FIRESTORE_DATA?.versao.exibirEmDestinos) {
		let datas = [new Date(FIRESTORE_DATA.versao.ultimaAtualizacao)];

		for (const destino of FIRESTORE_DATA.destinos) {
			const ultimaAtualizacao = destino.destinos.versao.ultimaAtualizacao;
			if (ultimaAtualizacao) {
				datas.push(new Date(ultimaAtualizacao));
			}
		}

		const mostRecentDate = datas.reduce((a, b) => (a > b ? a : b));
		getID("destinations-update").innerHTML = getLastUpdatedOnText(mostRecentDate);
	}

	if (FIRESTORE_DATA.descricao) {
		getID("destinations-description").innerHTML = FIRESTORE_DATA.descricao;
		getID("destinations-description").style.display = "block";
	}

	if (FIRESTORE_DATA.links?.ativo) {
		getID("social-links").style.display = "block";

		if (FIRESTORE_DATA.links.attachments) {
			getID("attachmentsLink").href = FIRESTORE_DATA.links.attachments;
		} else {
			getID("attachmentsLink").style.display = "none";
		}

		if (FIRESTORE_DATA.links.sheet) {
			getID("sheetLink").href = FIRESTORE_DATA.links.sheet;
		} else {
			getID("sheetLink").style.display = "none";
		}

		if (FIRESTORE_DATA.links.ppt) {
			getID("pptLink").href = FIRESTORE_DATA.links.ppt;
		} else {
			getID("pptLink").style.display = "none";
		}

		if (FIRESTORE_DATA.links.drive) {
			getID("driveLink").href = FIRESTORE_DATA.links.drive;
		} else {
			getID("driveLink").style.display = "none";
		}

		if (FIRESTORE_DATA.links.vacina) {
			getID("vaccineLink").href = FIRESTORE_DATA.links.vacina;
		} else {
			getID("vaccineLink").style.display = "none";
		}

		if (FIRESTORE_DATA.links.pdf) {
			getID("pdfLink").href = FIRESTORE_DATA.links.pdf;
		} else {
			getID("pdfLink").style.display = "none";
		}

		if (FIRESTORE_DATA.links.maps) {
			getID("mapsLink").href = FIRESTORE_DATA.links.maps;
		} else {
			getID("mapsLink").style.display = "none";
		}
	}

	loadHeaderImageAndLogo();
}

function loadTitle(data = FIRESTORE_DATA) {
	setPageName(data.titulo);
	getID("header1").innerHTML = data.titulo;
	getID("header2").style.display = "none";

	if (data.subtitulo) {
		getID("hero-subtitle").innerHTML = data.subtitulo;
	}
}

function loadHeaderImageAndLogo(data = FIRESTORE_DATA) {
	if (data.imagem?.ativo) {
		const background = data.imagem.background;
		const claro = data.imagem.claro;
		const escuro = data.imagem.escuro;

		if (background) {
			var hero = getID("hero");
			hero.style.background = 'url("' + background + '") top center no-repeat';
			hero.style.backgroundSize = "cover";
		}

		if (claro) {
			LOGO_LIGHT = claro;
			if (escuro) {
				LOGO_DARK = escuro;
			} else {
				LOGO_DARK = LOGO_LIGHT;
			}

			getID("header2").src = isOnDarkMode() ? LOGO_DARK : LOGO_LIGHT;
			getID("header1").style.display = "none";
			getID("header2").style.display = "block";
			document.querySelectorAll(".header-text").forEach((element) => {
				element.style.textAlign = "center";
			});
		}
	}
}

function loadModules() {
	loadSharingModule();
	loadSummaryModule();
	loadExpensesModule();
	loadTransportationModule();
	loadAccommodationsModule();
	loadItineraryScheduleModule();
	loadDestinationsModule();
	loadGalleryModule();

	function loadSharingModule() {
		const share = getID("share");
		if (navigator.share && window.location.hostname != "localhost") {
			share.addEventListener("click", () => {
				shareTrip();
			});
		} else {
			share.style.display = "none";
		}

		function shareTrip() {
			const title = FIRESTORE_DATA.titulo || document.title;
			const text = getSharingText();
			const url = getPageURL();
			navigator.share({ title, text, url });
		}

		function getSharingText() {
			switch (TYPE) {
				case "listagens":
					return translate("listing.share", { name: FIRESTORE_DATA.titulo });
				case "destinos":
					return translate("destination.share", {
						name: FIRESTORE_DATA.titulo,
					});
				case "viagem":
				case "viagens":
					return translate("trip.share", {
						name: FIRESTORE_DATA.titulo,
						start: START_DATE.text,
						end: END_DATE.text,
					});
				default:
					return translate("messages.share");
			}
		}
	}

	function loadSummaryModule() {
		if (FIRESTORE_DATA.modulos?.resumo === true) {
			CALL_SYNC.push(_loadSummary);
		} else {
			getID("keypointsNav").innerHTML = "";
			getID("keypoints").innerHTML = "";
			getID("keypoints").style.display = "none";
		}
	}

	function loadExpensesModule() {
		const ativo = FIRESTORE_DATA.modulos?.gastos === true;
		localStorage.setItem(
			"gastos",
			JSON.stringify({ ativo, pin: FIRESTORE_DATA.pin || "no-pin" }),
		);

		if (ativo) {
			openExpensesEmbed();
			ACTIVE_EMBEDS["expenses"] = true;
		} else {
			getID("expensesNav").innerHTML = "";
			getID("expenses").innerHTML = "";
			getID("expenses").style.display = "none";
		}
	}

	function loadTransportationModule() {
		if (FIRESTORE_DATA.modulos?.transportes === true) {
			CALL_SYNC.push(_loadTransportation);
		} else {
			getID("transportationNav").innerHTML = "";
			getID("transportation").innerHTML = "";
			getID("transportation").style.display = "none";
		}
	}

	function loadAccommodationsModule() {
		if (FIRESTORE_DATA.modulos?.hospedagens === true) {
			CALL_SYNC.push(_loadAccommodations);
		} else {
			getID("stayNav").innerHTML = "";
			getID("stay").innerHTML = "";
			getID("stay").style.display = "none";
		}
	}

	function loadItineraryScheduleModule() {
		if (FIRESTORE_DATA.modulos?.programacao === true) {
			CALL_SYNC.push(_loadItinerarySchedule);
		} else {
			getID("scheduleCalendarNav").innerHTML = "";
			getID("scheduleCalendar").innerHTML = "";
			getID("scheduleCalendar").style.display = "none";
		}
	}

	function loadDestinationsModule() {
		switch (TYPE) {
			case "viagens":
				if (
					FIRESTORE_DATA.modulos?.destinos === true &&
					FIRESTORE_DATA.destinos?.length > 0
				) {
					loadDestinationsDefault();
				} else {
					disableDestinations();
				}
				break;
			case "listagens":
				loadDestinationsDefault();
				break;
			case "destinos":
				loadDestinationsExclusive();
				break;
		}

		function loadDestinationsDefault() {
			loadDestinationsCustomSelect();
			loadDestinationsHTML(DESTINOS[0]);

			if (DESTINOS.length === 1) {
				setUniqueDestinationText();
				ACTIVE_DESTINATION = DESTINOS[0].destinosID;
			}

			CALL_SYNC.push(_loadDestinations);
		}

		function loadDestinationsExclusive() {
			const destinosID = getURLParam("d");
			const destinos = FIRESTORE_DATA;

			DESTINOS = [{ destinosID, destinos }];
			ACTIVE_DESTINATION = destinosID;

			getID("destinations-select").style.display = "none";

			setUniqueDestinationText();
			loadDestinationsHTML(DESTINOS[0]);

			CALL_SYNC.push(_loadDestinations);
		}

		function disableDestinations() {
		getID("destinations").style.display = "none";
		getID("destinationsNav").innerHTML = "";
		}

		function setUniqueDestinationText() {
			const titulo = DESTINOS[0].destinos.titulo;
		getID("destinations-title").innerHTML = titulo;
		getID("destinationsNavText").innerHTML = titulo;
		}
	}

	function loadGalleryModule() {
		if (FIRESTORE_DATA.modulos?.galeria === true) {
			CALL_SYNC.push(_loadGallery);
		} else {
			getID("portfolioM").innerHTML = "";
			getID("portfolio").style.display = "none";
		}
	}
}

function setFirestoreData(firestoreData) {
	FIRESTORE_DATA = firestoreData;
	console.log("Firestore Database data loaded successfully");
	loadDocumentData();
}

function loadDocumentData() {
	prepareViewData();
	syncModules();
	loadViewVisibility();
	adjustPortfolioHeight();
	refreshCategorias();

	if (FIRESTORE_DATA.pin == "sensitive-only") {
		loadSensitiveReservations();
	}

	$("body").css("overflow", "auto");

	if (!MESSAGE_MODAL_OPEN) {
		setTimeout(() => {
			adjustCardsHeights();
			adjustPortfolioHeight();
			refreshCategorias();
		}, 1000);
	}
}

function loadProtectedData(firestoreData) {
	loadTitle(firestoreData);
	loadInicioFim(firestoreData);
	loadHeaderImageAndLogo(firestoreData);
	loadVisibility(firestoreData.cores);
	requestDocumentPin();
}
