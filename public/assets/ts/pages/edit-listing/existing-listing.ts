import { getState } from '../../data/state.js';
import { displayError } from '../../utils/messages.js';
import { getID } from '../../utils/dom.js';
import { setPageName } from '../../app/main.js';
import { translate } from "../../i18n/translation.js";
import { loadDestinationsData } from "../destination/destination.js";
import { loadCustomizacaoData } from "../edit-trip/existing-trip.js";

// Listagem Existente
export async function loadListData(state?) {
	try {
		loadDadosBasicosListagemData(getState());
		loadCustomizacaoData(getState());
		loadDestinationsData();

		setPageName(`${translate("labels.edit")} ${getState().titulo}`);
	} catch (error) {
		displayError(error);
		throw error;
	}
}

function loadDadosBasicosListagemData(state) {
	getID("titulo").value = state.titulo;
	getID("subtitulo").value = state.subtitulo;
	getID("descricao").value = state.descricao;
	getID("exibir-em-destinos").checked = state.versao.exibirEmDestinos;
}
