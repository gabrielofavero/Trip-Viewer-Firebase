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

function _main() {
	const config = {};
	return Promise.all([
		$.getJSON("/assets/json/cores.json").then((data) => (config.cores = data)),
		$.getJSON("/assets/json/destinos.json").then(
			(data) => (config.destinos = data),
		),
		$.getJSON("/assets/json/information.json").then(
			(data) => (config.information = data),
		),
		$.getJSON("/assets/json/moedas.json").then(
			(data) => (config.moedas = data),
		),
		$.getJSON("/assets/json/transportes.json").then(
			(data) => (config.transportes = data),
		),
		$.getJSON("/assets/json/icons.json").then((data) => (config.icons = data)),
		$.getJSON("/assets/json/version.json").then(
			(data) => (config.versoes = data),
		),
		$.getJSON(`/assets/json/languages/${_getLanguagePackName()}.json`).then(
			(data) => (config.language = data),
		),
	])
		.then(() => {
			CONFIG = config;
			_translatePage();
			_initializeApp();
			_loadLangSelectorSelect();
			_loadPage();
		})
		.catch((error) => {
			_displayError("Initialization Error:" + error.message);
		});
}

async function _loadTranslationLite() {
	const language = await $.getJSON(
		`/assets/json/languages/${_getLanguagePackName()}.json`,
	);
	CONFIG = { language };
	_translatePage();
	if (document.querySelector(".lang-button")) {
		_loadLangSelectorSelect();
	}
}

function _loadPage() {
	switch (_getHTMLpage()) {
		case "index":
			_loadIndexPage();
			break;
		case "viagem":
			_loadViagemPage();
			break;
		case "destinos":
			_loadDestinosPage();
			break;
		case "gastos":
			_loadGastosPage();
			break;
		case "editar-listagem":
			_loadEditarListagemPage();
			break;
		case "editar-destino":
			_loadEditarDestinoPage();
			break;
		case "editar-viagem":
			_loadEditarViagemPage();
			break;
		case "itinerary":
			return;
		default:
			_displayError(`Page "${_getHTMLpage()}" not found.`);
			break;
	}
}

function _getHTMLpage() {
	let result = window.location.pathname.replace(".html", "");
	switch (result) {
		case "/":
			return "index";
		case "/view":
			return "viagem";
		case "/destination":
			return "destinos";
		case "/expenses":
			return "gastos";
		case "/edit/listing":
			return "editar-listagem";
		case "/edit/destination":
			return "editar-destino";
		case "/edit/trip":
			return "editar-viagem";
		default:
			return result.slice(1);
	}
}

function _openLinkInNewTab(url) {
	var win = window.open(url, "_blank");
	win.focus();
}

function _initializeApp() {
	APP.projectId = firebase.app().options.projectId;
	APP.version = CONFIG.versoes[APP.projectId]?.version?.system || "Unknown";
}
