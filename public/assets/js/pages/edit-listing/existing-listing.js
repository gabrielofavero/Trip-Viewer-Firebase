import { getState } from '../../data/state.js';

// Listagem Existente
async function loadListData(getState()) {
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

function loadDadosBasicosListagemData(getState()) {
	getID("titulo").value = getState().titulo;
	getID("subtitulo").value = getState().subtitulo;
	getID("descricao").value = getState().descricao;
	getID("exibir-em-destinos").checked = getState().versao.exibirEmDestinos;
}
