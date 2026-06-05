// Listagem Existente
async function loadListData(FIRESTORE_DATA) {
	try {
		loadDadosBasicosListagemData(FIRESTORE_DATA);
		loadCustomizacaoData(FIRESTORE_DATA);
		loadDestinationsData();

		setPageName(`${translate("labels.edit")} ${FIRESTORE_DATA.titulo}`);
	} catch (error) {
		displayError(error);
		throw error;
	}
}

function loadDadosBasicosListagemData(FIRESTORE_DATA) {
	getID("titulo").value = FIRESTORE_DATA.titulo;
	getID("subtitulo").value = FIRESTORE_DATA.subtitulo;
	getID("descricao").value = FIRESTORE_DATA.descricao;
	getID("exibir-em-destinos").checked = FIRESTORE_DATA.versao.exibirEmDestinos;
}
