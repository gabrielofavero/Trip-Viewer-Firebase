var blockLoadingEnd = false;
var FIRESTORE_DATA;
var wasSaved = false;
var changedOnce = false;

const TODAY = _getTodayFormatted();
const TOMORROW = _getTomorrowFormatted();

var PROGRAMACAO = {};

var GALERIA_CATEGORIAS = [];
var LINEUP_GENEROS = [];
var LINEUP_PALCOS = [];

_startLoadingScreen();

document.addEventListener('DOMContentLoaded', async function () {
  try {
    _main();

    const urlParams = new URLSearchParams(window.location.search);
    DOCUMENT_ID = urlParams.get('v');
    
    const canEdit = await _canEdit();
    if (!canEdit) return;
    
    PERMISSOES = await _getPermissoes();

    _loadVisibilityIndex();
    _loadHabilitados();

    if (DOCUMENT_ID) {
      _loadTrip()
    } else {
      DESTINOS = await _getUserList('destinos');
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
  _loadEditModule('hospedagens');
  _loadEditModule('programacao');
  _loadEditModule('destinos');
  _loadEditModule('lineup');
  _loadEditModule('galeria');
}

function _loadUploadSelectors() {
  _loadUploadSelector('background');
  _loadUploadSelector('logo');
}

async function _loadTrip() {
  getID('delete-text').style.display = 'block';
  blockLoadingEnd = true;
  _startLoadingScreen();
  FIRESTORE_DATA = await _getSingleData('viagens');
  await _loadTripData(FIRESTORE_DATA);
  _stopLoadingScreen();
}

async function _uploadViagemItens(uploadItens, item) {
  let result = FIRESTORE_NEW_DATA[item].imagens;
  for (let i = 0; i < uploadItens.length; i++) {
    if (!isNaN(uploadItens[i])) {
      const upload = await _uploadImage(`viagens/${DOCUMENT_ID}/${item}`, `upload-${item}-${uploadItens[i]}`);
      if (upload.link != null) {
        result[i] = upload;
      }
    }
  }
  return result;
}