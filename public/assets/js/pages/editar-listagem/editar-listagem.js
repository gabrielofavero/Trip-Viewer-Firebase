var blockLoadingEnd = false;
var listID;
var FIRESTORE_DATA;
var wasSaved = false;
_startLoadingScreen();

document.addEventListener('DOMContentLoaded', function () {
  try {
    _main();

    const urlParams = new URLSearchParams(window.location.search);
    listID = urlParams.get('l');

    _loadVisibilityIndex();
    _loadHabilitados();

    if (listID) {
      _carregarListagem()
    } else {
      _loadDestinos();
    }

    _loadImageSelector('background');
    _loadLogoSelector();

    _loadEventListeners();

    if (!blockLoadingEnd) {
      _stopLoadingScreen();
    }
    $('body').css('overflow', 'auto');

  } catch (error) {
    _displayErrorMessage(error);
    if (window.location.href.includes('editar-template.html')) {
      _overrideError();
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
  document.getElementById('destinos-adicionar').addEventListener('click', () => {
    _addDestinos();
  });

  document.getElementById('cancelar').addEventListener('click', () => {
    window.location.href = `index.html`;
  });

  document.getElementById('home').addEventListener('click', () => {
    window.location.href = `index.html`;
  });

  document.getElementById('visualizar').addEventListener('click', () => {
    if (listID) {
      window.location.href = `viagem.html?l=${tripID}`;
    } else {
      window.location.href = `index.html`;
    }
  });

  document.getElementById('editores-adicionar').addEventListener('click', () => {
    _addEditores();
  });

  document.getElementById('logo-tamanho').addEventListener('input', (event) => {
    _formatAltura(event.target.value);
  });
  
  document.getElementById('salvar').addEventListener('click', () => {
    _setListagem();
  });

  document.getElementById('re-editar').addEventListener('click', () => {
    _reEdit(listID, 'listagens', wasSaved);
  });

  document.getElementById('cancelar').addEventListener('click', () => {
    _closeModal();
  });

  document.getElementById('apagar').addEventListener('click', async () => {
    if (listID) {
      await _deleteUserObjectDB(listID, "listagens");
      window.location.href = `index.html`;
    }
  });

  document.getElementById('home').addEventListener('click', () => {
    window.location.href = `index.html`;
  });
}

async function _carregarListagem() {
  document.getElementById('delete-text').style.display = 'block';
  blockLoadingEnd = true;
  _startLoadingScreen();
  FIRESTORE_DATA = await _getSingleData('listagens');
  await _loadListData(FIRESTORE_DATA);
  _stopLoadingScreen();
}