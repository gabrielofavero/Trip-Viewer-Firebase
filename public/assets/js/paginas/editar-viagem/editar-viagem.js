var blockLoadingEnd = false;
var FIRESTORE_DATA;

var WAS_SAVED = false;
var CAN_EDIT = false;

var changedOnce = false;

const TODAY = _getTodayFormatted();
const TOMORROW = _getTomorrowFormatted();

var GALERIA_CATEGORIAS = [];
var LINEUP_GENEROS = [];
var LINEUP_PALCOS = [];

_startLoadingScreen();

document.addEventListener('DOMContentLoaded', async function () {
  try {
    _main();

    const urlParams = new URLSearchParams(window.location.search);
    DOCUMENT_ID = urlParams.get('v');
    PERMISSOES = await _getPermissoes();

    _loadVisibilityIndex();
    _loadHabilitados();

    if (DOCUMENT_ID) {
      await _loadTrip(true);
    } else {
      CAN_EDIT = true;
      DESTINOS = await _getUserList('destinos', true);
      _loadNewTrip();
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
    _displayErrorMessage(error);
    if (window.location.href.includes('editar-template.html')) {
      _closeDisplayMessage();
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

async function _loadTrip(stripped=false) {
  getID('delete-text').style.display = 'block';
  blockLoadingEnd = true;
  _startLoadingScreen();

  if (stripped) {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('v');
    FIRESTORE_DATA = await _get(`viagens/${id}`);
  } else {
    FIRESTORE_DATA = await _getSingleData('viagens');
  }

  CAN_EDIT = await _canEdit(FIRESTORE_DATA.compartilhamento.dono, FIRESTORE_DATA.compartilhamento.editores);

  if (CAN_EDIT) {
    await _loadTripData(FIRESTORE_DATA);
    _stopLoadingScreen();
  }
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