import { startLoadingScreen, stopLoadingScreen } from '../../utils/loading.js';
import { getState, setState, DOCUMENT_ID, setDocumentId } from '../../data/state.js';
import { getID, getURLParam, on, select } from '../../utils/dom.js';
import { translate } from '../../i18n/translation.js';
import { closeMessage, displayError, displayPrompt, openToast } from '../../utils/messages.js';
import { getItineraryContent } from '../../models/itinerary.model.js';
import { isOnDarkMode, loadVisibility, switchVisibility } from '../../theme/visibility.js';
import { loadEmbedVisibility } from '../../ui/embed.js';
import { get, haveErrorFromGetRequest } from '../../data/firebase/database.js';
import { setPageName } from '../../app/main.js';
import { requestPin } from '../../utils/pin.js';

var FIRESTORE_PROTECTED_DATA;

import { loadItineraryListeners } from './support/event-listeners.js';
import { requestInvalidPin } from "../../utils/pin.js";

export async function loadItineraryPage() {
	loadItineraryListeners();

	setDocumentId(getURLParam("v"));
	setPageName(translate("trip.itinerary.title"));

	if (!DOCUMENT_ID) {
		displayError(
			`${translate("messages.documents.get.error")}. ${translate(translate("messages.documents.get.no_code"))}`,
		);
	}

	setState(await get(`viagens/${DOCUMENT_ID}`));
	if (!getState()) {
		displayError(
			`${translate("messages.documents.get.error")}. ${translate(translate("messages.documents.get.not_found"))}`,
		);
	}

	loadItineraryVisibility();
	getID("title").innerText = getState().titulo;

	switch (getState().pin) {
		case "all-data":
			stopLoadingScreen();
			requestPinItinerary(true);
			return;
		case "sensitive-only":
			stopLoadingScreen();
			displaySensitiveItineraryPrompt();
			return;
		default:
			await loadItinerary();
	}
}

async function loadItinerary() {
	if (
		document.querySelector(".input-container") ||
		document.querySelector(".message-container")
	) {
		closeMessage();
	}

	getID("content").innerHTML = await getItineraryContent("page");

	getID("print").addEventListener("click", () => print());
	getID("export").addEventListener("click", () => exportItinerary());

	initializeMobileMenu();
}

// Mobile Menu
function initializeMobileMenu() {
	// Mobile nav toggle
	on("click", ".mobile-nav-toggle", function (e) {
		select("body").classList.toggle("mobile-nav-active");
		this.classList.toggle("bi-list");
		this.classList.toggle("bi-x");
	});

	// Mobile menu item handlers
	getID("mobile-night-mode")?.addEventListener("click", (e) => {
		e.preventDefault();
		switchVisibility();
		closeMobileMenu();
		loadNightModeButtonLabel();
	});

	getID("mobile-export")?.addEventListener("click", (e) => {
		e.preventDefault();
		exportItinerary();
		closeMobileMenu();
	});

	getID("mobile-print")?.addEventListener("click", (e) => {
		e.preventDefault();
		print();
		closeMobileMenu();
	});
}

function closeMobileMenu() {
	let body = select("body");
	if (body.classList.contains("mobile-nav-active")) {
		body.classList.remove("mobile-nav-active");
		let navbarToggle = select(".mobile-nav-toggle");
		navbarToggle.classList.toggle("bi-list");
		navbarToggle.classList.toggle("bi-x");
	}
}

// Visibility
function loadItineraryVisibility() {
	loadVisibility();
	loadEmbedVisibility();
	loadNightModeButtonLabel();
}

function loadNightModeButtonLabel() {
	const label = isOnDarkMode()
		? translate("labels.light_mode")
		: translate("labels.dark_mode");
	getID("mobile-night-mode-label").innerText = label;
}

// Messages
function requestPinItinerary(mandatory = false) {
	if (document.querySelector(".message-container")) {
		closeMessage();
	}

	const confirmAction = `loadProtectedItinerary(${mandatory})`;
	const cancelAction = mandatory ? null : "loadItinerary()";
	requestPin({ confirmAction, cancelAction, precontent: undefined });
}

function requestPinItineraryInvalido(mandatory = false) {
	const confirmAction = `loadProtectedItinerary(${mandatory})`;
	const cancelAction = mandatory ? null : "loadItinerary()";
	requestInvalidPin({ confirmAction, cancelAction, precontent: undefined });
}

function displaySensitiveItineraryPrompt() {
	const titulo = translate("trip.protected");
	const conteudo = translate("messages.protected.prompt");
	const yesAction = "requestPinItinerary()";
	const noAction = "loadItinerary()";
	const critico = true;
	displayPrompt({ titulo, conteudo, yesAction, noAction, critico });
}

async function loadProtectedItinerary(mandatory = false) {
	const pin = getID("pin-code")?.innerText || "";
	const pinType = getState().pin;
	closeMessage();
	startLoadingScreen();

	try {
		const protectedData = await get(`viagens/protected/${pin}/${DOCUMENT_ID}`);
		if (haveErrorFromGetRequest() || !protectedData) {
			stopLoadingScreen();
			requestPinItineraryInvalido(mandatory);
			return;
		}

		if (pinType == "sensitive-only") {
			FIRESTORE_PROTECTED_DATA = protectedData;
		} else {
			setState(protectedData);
		}

		loadItinerary();
	} catch (error) {
		if (error?.message == "Missing or insufficient permissions.") {
			console.warn(error.message);
			requestPinItineraryInvalido(mandatory);
		} else {
			console.error(error);
			displayError(translate("messages.errors.unknown"));
		}
		stopLoadingScreen();
	}

	stopLoadingScreen();
}

async function exportItinerary() {
	const html = await getItineraryContent("notes");
	const plainText = await getItineraryContent("text");

	await navigator.clipboard.write([
		new ClipboardItem({
			"text/html": new Blob([html], { type: "text/html" }),
			"text/plain": new Blob([plainText], { type: "text/plain" }),
		}),
	]);

	openToast(translate("messages.itinerary_copied"));
}
