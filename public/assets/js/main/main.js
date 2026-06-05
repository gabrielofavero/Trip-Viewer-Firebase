/* ======= Main JS =======
    - Template Name: MyResume - v4.5.0
    - Template URL: https://bootstrapmade.com/free-html-bootstrap-template-my-resume/
    - Author: BootstrapMade.com
    - License: https://bootstrapmade.com/license/
    - Modified by: Gabriel Fávero
*/

const APP = {
	projectId: null,
	version: null,
};

// Easy Selectors
const select = (el, all = false) => {
	el = el.trim();
	if (all) {
		return [...document.querySelectorAll(el)];
	} else {
		return document.querySelector(el);
	}
};

const on = (type, el, listener, all = false) => {
	if (el === "document") {
		document.addEventListener(type, listener);
	} else if (el === "window") {
		window.addEventListener(type, listener);
	} else {
		let selectEl = all
			? [...document.querySelectorAll(el)]
			: [document.querySelector(el)];
		selectEl.forEach((e) => e && e.addEventListener(type, listener));
	}
};

const onscroll = (el, listener) => {
	el.addEventListener("scroll", listener);
};

const getID = (id) => {
	return document.getElementById(id);
};

import { loadAllConfigs, setLanguage, getVersoes } from '../core/config.js';

async function main() {
	try {
		await loadAllConfigs(getLanguagePackName());
		translatePage();
		initializeApp();
		loadLangSelectorSelect();
		loadPage();
	} catch (error) {
		displayError("Initialization Error:" + error.message);
	}
}

async function loadTranslationLite() {
	await setLanguage(getLanguagePackName());
	translatePage();
	if (document.querySelector(".lang-button")) {
		loadLangSelectorSelect();
	}
}

function loadPage() {
	setPageName();
	switch (getHTMLpage()) {
		case "index":
			loadIndexPage();
			break;
		case "view":
			loadViewPage();
			break;
		case "destination":
			loadDestinationPage();
			break;
		case "expenses":
			loadExpensesPage();
			break;
		case "edit-listing":
			loadEditListingPage();
			break;
		case "edit-destination":
			loadEditDestinationPage();
			break;
		case "edit-trip":
			loadEditTripPage();
			break;
		case "itinerary":
			loadItineraryPage();
			return;
		default:
			displayError(`Page "${getHTMLpage()}" not found.`);
			break;
	}
}

function getHTMLpage() {
	let result = window.location.pathname.replace(".html", "");
	switch (result) {
		case "/":
			return "index";
		case "/view":
			return "view";
		case "/destination":
			return "destination";
		case "/expenses":
			return "expenses";
		case "/edit/listing":
			return "edit-listing";
		case "/edit/destination":
			return "edit-destination";
		case "/edit/trip":
			return "edit-trip";
		default:
			return result.slice(1);
	}
}

function getPageURL() {
	const isAltPrd =
		window.location.hostname === "trip-viewer-prd.firebaseapp.com";

	const base = isAltPrd ? "https://trip-viewer.com" : window.location.origin;

	const url = new URL(window.location.pathname + window.location.search, base);

	url.searchParams.delete("visibility");

	return url.toString();
}

function openLinkInNewTab(url) {
	var win = window.open(url, "_blank");
	win.focus();
}

function initializeApp() {
	APP.projectId = firebase.app().options.projectId;
	const versoes = getVersoes();
	APP.version = versoes[APP.projectId]?.version?.system || "Unknown";
}

function setPageName(pageName) {
	const isDev = APP.projectId === "trip-viewer-dev";
	const host = location.hostname;
	const isLocal = host === "localhost" || !Number.isNaN(Number(host));
	const tag = isLocal ? (isDev ? "[LOCAL DEV]" : "[LOCAL PRD]") : isDev ? "[DEV]" : "";
	const cleanTitle = document.title
		.replace(/\[LOCAL (DEV|PRD)\]\s*/g, "")
		.replace(/\[DEV\]\s*/g, "")
		.replace(/\[PRD\]\s*/g, "")
		.trim();

	const resolvedPageName = pageName ?? cleanTitle;
	const newTitle = tag ? `${tag} ${resolvedPageName}` : resolvedPageName;

	if (document.title !== newTitle) {
		document.title = newTitle;
	}
}

// Global error handlers - catches all unhandled errors
window.addEventListener("unhandledrejection", function (event) {
	console.error("Unhandled promise rejection:", event.reason);
	displayError(
		event.reason?.message || event.reason || "An unexpected error occurred",
	);
	event.preventDefault(); // Prevent default browser error handling
});

window.addEventListener("error", function (event) {
	console.error("Global error:", event.error || event.message);
	displayError(
		event.error?.message || event.message || "An unexpected error occurred",
	);
	event.preventDefault(); // Prevent default browser error handling
});
