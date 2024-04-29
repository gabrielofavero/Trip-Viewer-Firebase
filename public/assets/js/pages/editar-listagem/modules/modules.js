// Listagem Existente
async function _loadListData(FIRESTORE_DATA) {
  try {
    DESTINOS = await _getUserList('destinos');
    _loadDadosBasicosListagemData(FIRESTORE_DATA);
    _loadCompartilhamentoData(FIRESTORE_DATA);
    _loadCustomizacaoData(FIRESTORE_DATA);
    _loadDestinosData(FIRESTORE_DATA);

  } catch (e) {
    _displayErrorMessage(e);
    throw e;
  }
}

function _loadDadosBasicosListagemData(FIRESTORE_DATA) {
  getID('titulo').value = FIRESTORE_DATA.titulo;
  getID('subtitulo').value = FIRESTORE_DATA.subtitulo;
  getID('descricao').value = FIRESTORE_DATA.descricao;
  getID('exibir-em-destinos').checked = FIRESTORE_DATA.versao.exibirEmDestinos;
}