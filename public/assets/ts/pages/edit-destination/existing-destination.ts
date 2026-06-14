import { buildDS, updateValueDS } from '../../ui/dynamic-select.js';
import { displayError } from '../../utils/messages.js';
import { getID } from '../../utils/dom.js';
import { setPageName } from '../../app/main.js';
import { translate } from "../../i18n/translation.js";
import { FIRESTORE_DESTINATIONS_DATA } from "../../data/state.js";
import { setDescription } from "./categories/description.js";
import { updateDescriptionButtonLabel } from "./categories/description.js";
import { loadMoedaOptions } from "./categories/price.js";
import { loadMoedaValorAndVisibility } from "./categories/price.js";
import { addLanches } from "./new-destination.js";
import { addLojas } from "./new-destination.js";
import { addRestaurantes } from "./new-destination.js";
import { addSaidas } from "./new-destination.js";
import { addTurismo } from "./new-destination.js";

// Destino Existente
export function populateExistingDestinationForm() {
	try {
		loadDadosBasicosDestinosData();
		loadDestinoExistente("restaurantes");
		loadDestinoExistente("lanches");
		loadDestinoExistente("saidas");
		loadDestinoExistente("turismo");
		loadDestinoExistente("lojas");
		buildDS("region");

		loadMapaData();
		setPageName(
			`${translate("labels.edit")} ${FIRESTORE_DESTINATIONS_DATA.title}`,
		);
	} catch (error) {
		displayError(error);
		throw error;
	}
}

// Modules: Existing Tour
function loadDadosBasicosDestinosData() {
	getID("title").value = FIRESTORE_DESTINATIONS_DATA.titulo;

	const moedaValue = FIRESTORE_DESTINATIONS_DATA.moeda;
	const moedaDiv = getID("currency");

	if (moedaDiv.querySelector(`option[value="${moedaValue}"]`)) {
		moedaDiv.value = moedaValue;
	} else {
		getID("other-currency").style.display = "block";
		getID("other-currency").value = moedaValue;
		moedaDiv.value = "outra";
	}

	loadMoedaOptions();
}

function loadDestinoExistente(categoria) {
	const habilitado = FIRESTORE_DESTINATIONS_DATA.modulos[categoria] === true;
	getID(`enabled-${categoria}`).checked = habilitado;
	getID(`enabled-${categoria}-content`).style.display = habilitado
		? "block"
		: "none";
	getID(`${categoria}-add-box`).style.display = habilitado
		? "block"
		: "none";

	const destinosArr = Object.entries(FIRESTORE_DESTINATIONS_DATA[categoria])
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

	for (let j = 1; j <= destinosArr.length; j++) {
		const destino = destinosArr[j - 1];
		addDestino(categoria);
		addDestinoHTML(categoria, j, destino);
		setDescription(categoria, j, destino.descricao);
		updateDescriptionButtonLabel(categoria, j);
	}
}

export function addDestino(categoria) {
	switch (categoria) {
		case "restaurantes":
			addRestaurantes();
			break;
		case "lanches":
			addLanches();
			break;
		case "saidas":
			addSaidas();
			break;
		case "turismo":
			addTurismo();
			break;
		case "lojas":
			addLojas();
	}
}

export function addDestinoHTML(categoria, j, destino) {
	const id = destino.id;
	if (id) {
		getID(`${categoria}-id-${j}`).value = id;
	}

	const criadoEm = destino.criadoEm;
	if (criadoEm) {
		getID(`${categoria}-criadoEm-${j}`).value = criadoEm;
	}

	const novo = destino.novo || false;
	getID(`${categoria}-novo-${j}`).checked = novo;
	getID(`${categoria}-title-icon-${j}`).style.display = novo ? "block" : "none";

	const nome = destino.nome || "";
	getID(`${categoria}-nome-${j}`).value = nome;
	getID(`${categoria}-title-text-${j}`).innerText = nome;

	const emoji = destino.emoji;
	getID(`${categoria}-emoji-${j}`).value = emoji;
	getID(`${categoria}-title-text-${j}`).innerText += ` ${emoji}`;

	updateDescriptionButtonLabel(categoria, j);
	getID(`${categoria}-website-${j}`).value = destino.website || "";
	getID(`${categoria}-map-${j}`).value = destino.mapa || "";
	getID(`${categoria}-instagram-${j}`).value = destino.instagram || "";
	getID(`${categoria}-region-${j}`).value = destino.regiao || "";

	updateValueDS("region", destino.regiao, `${categoria}-region-select-${j}`);
	loadMoedaValorAndVisibility(destino.valor || "", categoria, j);

	getID(`${categoria}-midia-${j}`).value = destino.midia || "";
	getID(`${categoria}-rating-${j}`).value = destino.nota || "";
}

function loadMapaData() {
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
