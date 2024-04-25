var blockLoadingEnd = false;
var FIRESTORE_PLACES_DATA;
wasSaved = false;
_startLoadingScreen();

document.addEventListener('DOMContentLoaded', function () {
  try {
    _main();

    const urlParams = new URLSearchParams(window.location.search);
    DOCUMENT_ID = urlParams.get('d');

    _loadVisibilityIndex();
    _loadHabilitados();

    if (DOCUMENT_ID) {
      _loadDestinations()
    }

    _loadEventListeners();

    if (!blockLoadingEnd) {
      _stopLoadingScreen();
    }
    $('body').css('overflow', 'auto');

  } catch (error) {
    _displayErrorMe6ssage(error);
    throw error;
  }
});

function _loadHabilitados() {
  _loadEditModule('restaurantes');
  _loadEditModule('lanches');
  _loadEditModule('saidas');
  _loadEditModule('turismo');
  _loadEditModule('lojas');
  _loadEditModule('mapa');

  const mapa = document.getElementById('habilitado-mapa');
  mapa.addEventListener('change', function () {
    if (mapa.checked) {
      _setRequired('mapa-link');
    } else {
      _removeRequired('mapa-link');
    }
  });
}

function _loadEventListeners() {
  document.getElementById('restaurantes-adicionar').addEventListener('click', () => {
    _addRestaurantes();
  });

  document.getElementById('lanches-adicionar').addEventListener('click', () => {
    _addLanches();
  });

  document.getElementById('saidas-adicionar').addEventListener('click', () => {
    _addSaidas();
  });

  document.getElementById('turismo-adicionar').addEventListener('click', () => {
    _addTurismo();
  });

  document.getElementById('lojas-adicionar').addEventListener('click', () => {
    _addLojas();
  });

  document.getElementById('salvar').addEventListener('click', () => {
    _setDestino();
  });

  document.getElementById('re-editar').addEventListener('click', () => {
    _reEdit('destinos', wasSaved);
  });

  document.getElementById('cancelar').addEventListener('click', () => {
    _closeModal();
  });

  document.getElementById('home').addEventListener('click', () => {
    window.location.href = `index.html`;
  });

  document.getElementById('apagar').addEventListener('click', async () => {
    if (DOCUMENT_ID) {
      await _deleteUserObjectDB(DOCUMENT_ID, "destinos");
      window.location.href = `index.html`;
    }
  });

  document.getElementById('home').addEventListener('click', () => {
    window.location.href = `index.html`;
  });
}

async function _loadDestinations() {
  blockLoadingEnd = true;
  document.getElementById('delete-text').style.display = 'block';
  _startLoadingScreen();
  FIRESTORE_PLACES_DATA = await _getSingleData('destinos');
  console.log(FIRESTORE_PLACES_DATA);
  _loadDestinationsData(FIRESTORE_PLACES_DATA);
  _stopLoadingScreen();
}
