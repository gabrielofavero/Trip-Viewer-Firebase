var blockLoadingEnd = false;
var FIRESTORE_DATA;
var FIRESTORE_NEW_DATA = {};

var WAS_SAVED = false;
var CAN_EDIT = false;

_startLoadingScreen();

document.addEventListener('DOMContentLoaded', async function () {
  try {
    await _main();

    DOCUMENT_ID = _getURLParam('l');
    PERMISSOES = await _getPermissoes();

    _loadVisibilityIndex();
    _loadHabilitados();

    if (DOCUMENT_ID) {
      await _carregarListagem()
    } else {
      CAN_EDIT = true;
      DESTINOS = await _getUserList('destinos');
      _loadDestinos();
    }

    if (!CAN_EDIT) return;

    _loadImageSelector('background');
    _loadLogoSelector();

    _loadEventListeners();

    if (!blockLoadingEnd) {
      _stopLoadingScreen();
    }
    $('body').css('overflow', 'auto');

  } catch (error) {
    _displayError(error);
    if (window.location.href.includes('editar-template.html')) {
      _closeMessage();
    }
    throw error;
  }
});

function _loadHabilitados() {
  _loadEditModule('imagens');
  _loadEditModule('cores');
  _loadEditModule('links');
  _loadEditModule('editores');
}

function _loadUploadSelectors() {
  _loadUploadSelector('background');
  _loadUploadSelector('logo');
}

function _loadEventListeners() {
  getID('cancelar').addEventListener('click', () => {
    window.location.href = `index.html`;
  });

  getID('home').addEventListener('click', () => {
    window.location.href = `index.html`;
  });

  getID('visualizar').addEventListener('click', () => {
    if (DOCUMENT_ID) {
      window.location.href = `viagem.html?l=${DOCUMENT_ID}`;
    } else {
      window.location.href = `index.html`;
    }
  });

  getID('editores-adicionar').addEventListener('click', () => {
    _addEditores();
  });

  getID('logo-tamanho').addEventListener('input', (event) => {
    _formatAltura(event.target.value);
  });

  getID('salvar').addEventListener('click', () => {
    _setListagem();
  });

  getID('re-editar').addEventListener('click', () => {
    _reEdit('listagens', WAS_SAVED);
  });

  getID('cancelar').addEventListener('click', () => {
    _closeModal();
  });

  getID('apagar').addEventListener('click', async () => {
    if (DOCUMENT_ID) {
      await _deleteUserObjectDB(DOCUMENT_ID, "listagens");
      await _deleteUserObjectStorage();
      window.location.href = `index.html`;
    }
  });

  getID('home').addEventListener('click', () => {
    window.location.href = `index.html`;
  });

  getID('destinos-search').addEventListener('input', () => _searchDestinosListenerAction());
}

async function _carregarListagem() {
  getID('delete-text').style.display = 'block';
  blockLoadingEnd = true;
  _startLoadingScreen();

  FIRESTORE_DATA = await _getSingleData('listagens');
  CAN_EDIT = await _canEdit(FIRESTORE_DATA.compartilhamento.dono, FIRESTORE_DATA.compartilhamento.editores);

  if (CAN_EDIT) {
    await _loadListData(FIRESTORE_DATA);
    _stopLoadingScreen();
  }
}

async function _buildListObject() {
  FIRESTORE_NEW_DATA = {
    compartilhamento: await _buildCompartilhamentoObject(),
    cores: {
      ativo: getID('habilitado-cores').checked,
      claro: _returnEmptyIfNoValue(getID('claro').value),
      escuro: _returnEmptyIfNoValue(getID('escuro').value)
    },
    descricao: getID(`descricao`).value,
    destinos: _buildDestinosArray(),
    imagem: _buildImagemObject(),
    links: _buildLinksObject(),
    subtitulo: getID(`subtitulo`).value,
    titulo: getID(`titulo`).value,
    versao: {
      ultimaAtualizacao: new Date().toISOString(),
      exibirEmDestinos: getID(`exibir-em-destinos`).checked
    }
  }
}

function _getIgnoredPathDestinos() {
  if (!FIRESTORE_DATA) return [];
  let result = [];
  for (let i = 0; i < FIRESTORE_DATA.destinos.length; i++) {
    result.push(`destinos.${i}.destinos`);
  }
  return result;
}

async function _setListagem() {
  for (const child of _getChildIDs('com-destinos')) {
    const i = parseInt(child.split("-")[2]);
    _setRequired(`select-destinos-${i}`)
  }
  await _setDocumento('listagens');
}