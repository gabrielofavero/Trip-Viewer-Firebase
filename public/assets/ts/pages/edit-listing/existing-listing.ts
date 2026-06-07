import { getState, DOCUMENT_ID } from '../../data/state.js';
import { displayError } from '../../utils/messages.js';
import { getID } from '../../utils/dom.js';
import { setPageName, getHTMLpage } from '../../app/main.js';
import { translate } from "../../i18n/translation.js";
import { loadDestinations } from "../edit-trip/new-trip.js";
import { loadDestinosAtivos } from "../edit-trip/categories/destination.js";
import { loadCustomizacaoData } from "../edit-trip/existing-trip.js";

// Listagem Existente
export async function loadListData(state?) {
	try {
		loadDadosBasicosListagemData(getState());
		loadCustomizacaoData(getState());
		await loadDestinationsData();

		setPageName(`${translate("labels.edit")} ${getState().titulo}`);
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
		if (getID("habilitado-destinos")) {
			getID("habilitado-destinos").checked = true;
		}
		getID("habilitado-destinos-content").style.display = "block";
		getID("sem-destinos").style.display = "none";
		getID("com-destinos").style.display = "block";
	} else {
		getID("sem-destinos").style.display = "block";
		getID("com-destinos").style.display = "none";
	}

	loadDestinations();
	const checkboxes = document.querySelectorAll(
		'#destinos-checkboxes input[type="checkbox"]',
	);
	for (const destino of getState().destinos) {
		const id = destino.destinosID;
		for (const checkbox of checkboxes) {
			const cb = checkbox as HTMLInputElement;
			if (cb.value === id) {
				cb.checked = true;
				break;
			}
		}
	}
	await loadDestinosAtivos();
}

function loadDadosBasicosListagemData(state) {
	getID("titulo").value = state.titulo;
	getID("subtitulo").value = state.subtitulo;
	getID("descricao").value = state.descricao;
	getID("exibir-em-destinos").checked = state.versao.exibirEmDestinos;
}
