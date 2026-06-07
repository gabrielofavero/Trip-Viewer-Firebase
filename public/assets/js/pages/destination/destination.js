import { getDestinos } from '../../app/config.js';
import { displayError } from '../../utils/messages.js';
import { setState } from '../../data/state.js';
import { getID, getJs, getURLParams } from '../../utils/dom.js';
import { translate } from '../../i18n/translation.js';
import { stopLoadingScreen } from '../../utils/loading.js';
import { loadCloseCustomSelectListeners, loadCustomSelect } from '../../ui/custom-select.js';
import { getPageURL, setPageName } from '../../app/main.js';
import { loadDestinationListeners } from './support/event-listeners.js';
import { loadActiveCategory } from "./categories.js";
import { updateActiveCategory } from "./categories.js";
import { adjustEditVisibility } from "./edit-destination.js";
import { restoreIfEditing } from "./edit-destination.js";
import { getDestinationsHTML } from "./support/content.js";
import { adjustInstagramMedia } from "./support/media-embed.js";
import { adjustMediaEmbeds } from "./support/media-embed.js";
import { loadEmbed } from "./support/media-embed.js";
import { loadMedia } from "./support/media-embed.js";
import { unloadMedia } from "./support/media-embed.js";
import { unloadMedias } from "./support/media-embed.js";
import { loadSortAndFilter } from "./support/sort-and-filter/sort-and-filter.js";
import { adjustDrawer } from "./support/sort-and-filter/support/drawer.js";
import { getTripData } from "./support/trip.js";
import { loadPlannedDestination } from "./support/trip.js";
import { applyDestinationsMediaHeight } from "./support/visibility.js";
import { loadDestinationVisibility } from "./support/visibility.js";

export var FIRESTORE_DESTINOS_DATA;
export var CONTENT = [];
export var ACTIVE_CATEGORY;

export async function loadDestinationsData() {
	const urlParams = getURLParams();
	DOCUMENT_ID = urlParams["d"];

	if (!DOCUMENT_ID) {
		const error = translate("messages.errors.missing_data");
		throw error;
	}

	const [tripData, destinosData] = await Promise.all([
		getTripData(urlParams["v"]),
		get(`destinos/${DOCUMENT_ID}`),
	]);

	FIRESTORE_DESTINOS_DATA = destinosData;
	setState(tripData);

	loadPlannedDestination();
	loadActiveCategory(urlParams);
}

export async function loadDestinationPage() {
	console.log(this.window.location.href);

	loadDestinationListeners();

	await loadDestinationsData();

	const title = FIRESTORE_DESTINOS_DATA.titulo || "TripViewer";
	setPageName(title);
	getID("title").innerText = title;

	await loadDestinationVisibility();

	if (
		ACTIVE_CATEGORY &&
		(ACTIVE_CATEGORY === "mapa" ||
			Object.keys(FIRESTORE_DESTINOS_DATA[ACTIVE_CATEGORY]).length > 0)
	) {
		loadDestinationCustomSelect();
		window.addEventListener("resize", () => {
			applyDestinationsMediaHeight();
			adjustMediaEmbeds();
		});
	} else {
		const error = translate("messages.errors.missing_data");
		throw error;
	}
}

function loadDestinationByType(activeCategory) {
	const content = getID("content");
	const filterSortContainer = getID("filter-sort-container");

	content.innerHTML = "";
	CONTENT = [];
	MEDIA_HYPERLINKS = {};

	if (activeCategory === "myMaps") {
		content.classList = "map-content";
		loadMapDestination(FIRESTORE_DESTINOS_DATA.myMaps);
		filterSortContainer.style.display = "none";
		document.querySelector(".add-container").style.display = "none";
		return;
	} else {
		content.classList = "";
		filterSortContainer.style.display = "";
	}

	const destino = FIRESTORE_DESTINOS_DATA[activeCategory];
	const keys = Object.keys(destino);
	for (let j = 1; j <= keys.length; j++) {
		const id = keys[j - 1];
		const item = destino[id];
		const innerHTML = getDestinationsHTML({ j, id, item });
		loadEmbed(item?.midia, j);
		CONTENT.push({ id, innerHTML });
	}

	loadSortAndFilter();
	applyContent();
	applyDestinationsMediaHeight();
	adjustInstagramMedia();
	adjustEditVisibility();
	stopLoadingScreen();
}

function loadMapDestination(link) {
	if (!link || !link.includes("mid=")) {
		console.error("Link do My Maps inválido.");
		return;
	}
	const mid = link.split("mid=")[1].split("&")[0];
	getID("content").innerHTML =
		`<iframe class="map-iframe" src="https://www.google.com/maps/d/embed?mid=${mid}&ehbc=2E312F" width="640" height="480"></iframe>`;
}

// Setters
export function applyContent() {
	const div = getID("content");
	div.innerHTML = "";
	for (const content of CONTENT) {
		if (content.filtered) {
			continue;
		}
		div.innerHTML += content.innerHTML;
	}
}

function orderInnerHTMLs(innerContents) {
	innerContents.sort((a, b) => {
		if (a.nota === "?") return 1;
		if (b.nota === "?") return -1;

		if (b.nota !== a.nota) {
			return b.nota - a.nota;
		}

		return a.titulo.localeCompare(b.titulo);
	});

	return innerContents.map((item) => item.innerHTML);
}

// Actions
export function processAccordion(j) {
	restoreIfEditing(j);
	adjustDrawer();
	toggleMedia(j);
	unloadMedias(j);
	closeAccordions(j);
	adjustEditVisibility(j);
}

function toggleMedia(j) {
	const button = getID(`destinos-titulo-${j}`);
	const midia = `midia-${j}`;
	if (button.classList.contains("collapsed")) {
		unloadMedia(midia);
	} else {
		loadMedia(midia);
		applyDestinationsMediaHeight();
	}
}

function closeAccordions(exclude) {
	for (const j of getJs("content")) {
		if (j !== exclude) {
			$(`#collapse-destinos-${j}`).collapse("hide");
		}
	}
}

function loadDestinationCustomSelect() {
	const customSelect = {
		id: "destinations-select",
		options: getDestinationCustomSelectOptions(),
		activeOption: ACTIVE_CATEGORY === "mapa" ? "myMaps" : ACTIVE_CATEGORY,
		action: loadDestinationCustomSelectAction,
	};

	loadCustomSelect(customSelect);
	loadCloseCustomSelectListeners();

	function getDestinationCustomSelectOptions() {
		const result = [];
		const destinos = getDestinos();
		const values = destinos.categorias.ids;
		for (const value in FIRESTORE_DESTINOS_DATA) {
			if (
				!values.includes(value) ||
				(value !== "myMaps" &&
					Object.keys(FIRESTORE_DESTINOS_DATA[value]).length === 0)
			) {
				continue;
			}

			const key = destinos.translation[value];
			const label = translate(`destination.${key}.title`);
			result.push({ value, label });
		}
		return result;
	}

	function loadDestinationCustomSelectAction(value) {
		adjustDrawer();
		updateActiveCategory(value);
		loadDestinationByType(value);
	}
}

export function getDataSet(key) {
	const category = ACTIVE_CATEGORY;
	if (!category) return new Set();

	const data = FIRESTORE_DESTINOS_DATA?.[category] ?? {};
	return new Set(
		Object.values(data)
			.map((item) => item?.[key])
			.filter((v) => v !== undefined && v !== null),
	);
}

export function getDestinationID(j) {
	const destino = getID(`destinos-${j}`);
	return destino.getAttribute("data-id");
}

export function getItemFromJ(j) {
	const id = getDestinationID(j);
	return getItem(id);
}

export function getItem(id) {
	return FIRESTORE_DESTINOS_DATA[ACTIVE_CATEGORY][id];
}

function getItemValue(id, key) {
	const item = getItem(id);
	return item ? item[key] : null;
}

export function isPlanned(id) {
	const value = PLANNED_DESTINATION?.[ACTIVE_CATEGORY]?.[id];
	return value && Object.keys(value).length > 0;
}

export async function refreshDestination() {
	FIRESTORE_DESTINOS_DATA = await get(`destinos/${DOCUMENT_ID}`);
	loadDestinationByType(ACTIVE_CATEGORY);
}

function share() {
	const title = FIRESTORE_DESTINOS_DATA.titulo || document.title;
	const text = translate("destination.share", {
		name: FIRESTORE_DESTINOS_DATA.titulo,
	});
	const url = getPageURL();
	navigator.share({ title, text, url });
}
