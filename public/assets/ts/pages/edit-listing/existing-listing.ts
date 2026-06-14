import { getState, DOCUMENT_ID } from '../../data/state.js';
import { displayError } from '../../utils/messages.js';
import { getID } from '../../utils/dom.js';
import { setPageName, getHTMLpage } from '../../app/main.js';
import { translate } from "../../i18n/translation.js";
import { loadDestinations } from "../edit-trip/new-trip.js";
import { loadActiveDestinations } from "../edit-trip/categories/destination.js";
import { loadCustomizacaoData } from "../edit-trip/existing-trip.js";

// Listagem Existente
export async function loadListData(state?) {
	try {
		loadDadosBasicosListagemData(getState());
		loadCustomizacaoData(getState());
		await loadDestinationsData();

		setPageName(`${translate("labels.edit")} ${getState().title}`);
	} catch (error) {
		displayError(error);
		throw error;
	}
}

async function loadDestinationsData() {
	if (
		getHTMLpage() === "edit-listing" ||
		getState().modulos?.destinos === true
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
				const container = getID("destinations-checkboxes");
				container.prepend(card);
				break;
			}
		}
	}
	await loadActiveDestinations();
}

function loadDadosBasicosListagemData(state) {
	getID("title").value = state.titulo;
	getID("subtitle").value = state.subtitulo;
	getID("description").value = state.descricao;
	getID("show-in-destinations").checked = state.versao.exibirEmDestinos;
}
