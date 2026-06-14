import { buildDS, updateValueDS } from '../../ui/dynamic-select.js';
import { displayError } from '../../utils/messages.js';
import { getID } from '../../utils/dom.js';
import { setPageName } from '../../app/main.js';
import { translate } from "../../i18n/translation.js";
import { FIRESTORE_DESTINATIONS_DATA } from "../../data/state.js";
import { setDescription } from "./categories/description.js";
import { updateDescriptionButtonLabel } from "./categories/description.js";
import { loadCurrencyOptions } from "./categories/price.js";
import { loadCurrencyValueAndVisibility } from "./categories/price.js";
import { addSnacks } from "./new-destination.js";
import { addShopping } from "./new-destination.js";
import { addRestaurants } from "./new-destination.js";
import { addNightlife } from "./new-destination.js";
import { addTourism } from "./new-destination.js";

// Destino Existente
export function populateExistingDestinationForm() {
	try {
		loadBasicDestinationData();
		loadExistingDestination("restaurants");
		loadExistingDestination("snacks");
		loadExistingDestination("nightlife");
		loadExistingDestination("tourism");
		loadExistingDestination("shopping");
		buildDS("region");

		loadMapData();
		setPageName(
			`${translate("labels.edit")} ${FIRESTORE_DESTINATIONS_DATA.title}`,
		);
	} catch (error) {
		displayError(error);
		throw error;
	}
}

// Modules: Existing Tour
function loadBasicDestinationData() {
	getID("title").value = FIRESTORE_DESTINATIONS_DATA.titulo;

	const currencyValue = FIRESTORE_DESTINATIONS_DATA.moeda;
	const currencyDiv = getID("currency");

	if (currencyDiv.querySelector(`option[value="${currencyValue}"]`)) {
		currencyDiv.value = currencyValue;
	} else {
		getID("other-currency").style.display = "block";
		getID("other-currency").value = currencyValue;
		currencyDiv.value = "outra";
	}

	loadCurrencyOptions();
}

function loadExistingDestination(categoria) {
	const enabled = FIRESTORE_DESTINATIONS_DATA.modulos[categoria] === true;
	getID(`enabled-${categoria}`).checked = enabled;
	getID(`enabled-${categoria}-content`).style.display = enabled
		? "block"
		: "none";
	getID(`${categoria}-add-box`).style.display = enabled
		? "block"
		: "none";

	const itemsArr = Object.entries(FIRESTORE_DESTINATIONS_DATA[categoria])
		.map(([id, value]) => ({
			id,
			...(value as Record<string, unknown>),
		}) as Record<string, unknown>)
		.sort((a, b) => {
			if (!a.criadoEm && !b.criadoEm) return 0;
			if (!a.criadoEm) return 1;
			if (!b.criadoEm) return -1;
			return new Date(a.criadoEm as string).getTime() - new Date(b.criadoEm as string).getTime();
		});

	for (let j = 1; j <= itemsArr.length; j++) {
		const item = itemsArr[j - 1];
		addDestination(categoria);
		addDestinationHTML(categoria, j, item);
		setDescription(categoria, j, item.descricao);
		updateDescriptionButtonLabel(categoria, j);
	}
}

export function addDestination(categoria) {
	switch (categoria) {
		case "restaurants":
			addRestaurants();
			break;
		case "snacks":
			addSnacks();
			break;
		case "nightlife":
			addNightlife();
			break;
		case "tourism":
			addTourism();
			break;
		case "shopping":
			addShopping();
	}
}

export function addDestinationHTML(categoria, j, item) {
	const id = item.id;
	if (id) {
		getID(`${categoria}-id-${j}`).value = id;
	}

	const criadoEm = item.criadoEm;
	if (criadoEm) {
		getID(`${categoria}-criadoEm-${j}`).value = criadoEm;
	}

	const novo = item.novo || false;
	getID(`${categoria}-novo-${j}`).checked = novo;
	getID(`${categoria}-title-icon-${j}`).style.display = novo ? "block" : "none";

	const nome = item.nome || "";
	getID(`${categoria}-nome-${j}`).value = nome;
	getID(`${categoria}-title-text-${j}`).innerText = nome;

	const emoji = item.emoji;
	getID(`${categoria}-emoji-${j}`).value = emoji;
	getID(`${categoria}-title-text-${j}`).innerText += ` ${emoji}`;

	updateDescriptionButtonLabel(categoria, j);
	getID(`${categoria}-website-${j}`).value = item.website || "";
	getID(`${categoria}-map-${j}`).value = item.mapa || "";
	getID(`${categoria}-instagram-${j}`).value = item.instagram || "";
	getID(`${categoria}-region-${j}`).value = item.regiao || "";

	updateValueDS("region", item.regiao, `${categoria}-region-select-${j}`);
	loadCurrencyValueAndVisibility(item.valor || "", categoria, j);

	getID(`${categoria}-midia-${j}`).value = item.midia || "";
	getID(`${categoria}-rating-${j}`).value = item.nota || "";
}

function loadMapData() {
	const mapaLink = getID("map-link");

	if (FIRESTORE_DESTINATIONS_DATA.modulos.mapa === true) {
		getID("map-enabled").checked = true;
		getID("map-enabled-content").style.display = "block";
		mapaLink.setAttribute("required", "");

		const mapa = FIRESTORE_DESTINATIONS_DATA.myMaps;
		if (mapa) {
			mapaLink.value = mapa;
		}
	} else {
		mapaLink.removeAttribute("required");
	}
}
