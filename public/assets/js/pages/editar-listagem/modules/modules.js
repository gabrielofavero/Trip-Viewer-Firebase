// Listagem Existente
function _loadListData(FIRESTORE_DATA) {
    try {
      _loadDadosBasicosListagemData(FIRESTORE_DATA);
      _loadCompartilhamentoData(FIRESTORE_DATA);
      _loadCustomizacaoData(FIRESTORE_DATA);
      _loadPasseiosData(FIRESTORE_DATA);
  
    } catch (e) {
      _displayErrorMessage(e);
      throw e;
    }
  }

  function _loadDadosBasicosListagemData(FIRESTORE_DATA) {
    document.getElementById('titulo').value = FIRESTORE_DATA.titulo;
    document.getElementById('descricao').value = FIRESTORE_DATA.descricao;
    document.getElementById('moeda').value = FIRESTORE_DATA.moeda;
  }