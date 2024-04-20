var blockLoadingEnd = false;
var tripID;
var FIRESTORE_DATA;
var wasSaved = false;
var changedOnce = false;
_startLoadingScreen();

document.addEventListener('DOMContentLoaded', function () {
  try {
    _main();

    const urlParams = new URLSearchParams(window.location.search);
    tripID = urlParams.get('v');

    _loadVisibilityIndex();
    _loadHabilitados();

    if (tripID) {
      _loadTrip()
    } else {
      _loadNewTrip();
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
  _loadEditModule('transporte');
  _loadEditModule('hospedagem');
  _loadEditModule('programacao');
  _loadEditModule('destinos');
  _loadEditModule('lineup');
  _loadEditModule('galeria');
}

function _loadUploadSelectors() {
  _loadUploadSelector('background');
  _loadUploadSelector('logo');
}

function _loadEventListeners() {
  document.getElementById('transporte-adicionar').addEventListener('click', () => {
    _addTransporte();
  });

  document.getElementById('hospedagem-adicionar').addEventListener('click', () => {
    _addHospedagem();
  });

  document.getElementById('destinos-adicionar').addEventListener('click', () => {
    _addDestinos();
  });

  document.getElementById('lineup-adicionar').addEventListener('click', () => {
    _addLineup();
  });

  document.getElementById('galeria-adicionar').addEventListener('click', () => {
    _addGaleria();
  });

  document.getElementById('cancelar').addEventListener('click', () => {
    window.location.href = `index.html`;
  });

  document.getElementById('home').addEventListener('click', () => {
    window.location.href = `index.html`;
  });

  document.getElementById('visualizar').addEventListener('click', () => {
    if (tripID) {
      window.location.href = `viagem.html?v=${tripID}`;
    } else {
      window.location.href = `index.html`;
    }
  });

  document.getElementById('inicio').addEventListener('input', () => {
    _loadProgramacao();
    document.getElementById('fim').value = _getNextDay(document.getElementById('inicio').value);
    if (!tripID || (tripID && !changedOnce)) {
      changedOnce = true;
      document.getElementById('fim').value = _getNextDay(document.getElementById('inicio').value);
    }
  });

  document.getElementById('fim').addEventListener('change', () => {
    _loadProgramacao();
  });

  document.getElementById('editores-adicionar').addEventListener('click', () => {
    _addEditores();
  });

  document.getElementById('logo-tamanho').addEventListener('input', (event) => {
    _formatAltura(event.target.value);
  });

  document.getElementById('salvar').addEventListener('click', () => {
    _setViagem();
  });

  document.getElementById('re-editar').addEventListener('click', () => {
    _reEdit(tripID, 'viagens', wasSaved);
  });

  document.getElementById('cancelar').addEventListener('click', () => {
    _closeModal();
  });

  document.getElementById('apagar').addEventListener('click', async () => {
    if (tripID) {
      await _deleteUserObjectDB(tripID, "viagens");
      window.location.href = `index.html`;
    }
  });

  document.getElementById('home').addEventListener('click', () => {
    window.location.href = `index.html`;
  });

  document.getElementById('upload-background').addEventListener('change', function (event) {
    _checkFileSize('upload-background');
  });

  document.getElementById('upload-logo-light').addEventListener('change', function (event) {
    _checkFileSize('upload-logo-light');
  });

  document.getElementById('upload-logo-dark').addEventListener('change', function (event) {
    _checkFileSize('upload-logo-dark');
  });
}

async function _loadTrip() {
  document.getElementById('delete-text').style.display = 'block';
  blockLoadingEnd = true;
  _startLoadingScreen();
  FIRESTORE_DATA = await _getSingleData('viagens');
  await _loadTripData(FIRESTORE_DATA);
  _stopLoadingScreen();
}

async function _uploadGaleria(id = tripID, uploadGaleria = uploadGaleria) {
  let result = [];
  for (const i of uploadGaleria) {
    const url = await _uploadImage(`trips/${id}/galeria/${i}.jpg`, `upload-galeria-${i}`);
    result.push(url);
  }
  return result;
}