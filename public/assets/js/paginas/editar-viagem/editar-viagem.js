var blockLoadingEnd = false;
var FIRESTORE_DATA;
var FIRESTORE_GASTOS_DATA;

var WAS_SAVED = false;
var CAN_EDIT = false;
var NEW_TRIP = false;

const TODAY = _getTodayFormatted();
const TOMORROW = _getTomorrowFormatted();

_startLoadingScreen();

document.addEventListener('DOMContentLoaded', async function () {
  try {
    await _main();

    DOCUMENT_ID = _getURLParam('v');
    PERMISSOES = await _getPermissoes();

    _loadVisibilityIndex();
    _loadHabilitados();
    _newDynamicSelect('galeria-categoria');
    _newDynamicSelect('lineup-genero');
    _newDynamicSelect('lineup-palco');

    if (DOCUMENT_ID) {
      await _loadTrip(true);
    } else {
      NEW_TRIP = true;
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
    if (error?.responseJSON?.error) {
      _displayError(error.responseJSON.error)
    } else {
      _displayError(error);
    }
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
  _loadEditModule('gastos');
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

async function _loadTrip(stripped = false) {
  getID('delete-text').style.display = 'block';
  blockLoadingEnd = true;
  _startLoadingScreen();

  if (stripped) {
    const id = _getURLParam('v');
    FIRESTORE_DATA = await _get(`viagens/${id}`);
  } else {
    FIRESTORE_DATA = await _getSingleData('viagens');
  }

  CAN_EDIT = await _canEdit(FIRESTORE_DATA.compartilhamento.dono, FIRESTORE_DATA.compartilhamento.editores);

  if (CAN_EDIT) {
    await _loadTripData();
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

function _deleteViagem() {
  let viagem = getID('titulo').value;
  viagem = viagem ? ` "${viagem}"` : '';

  const propriedades = _cloneObject(MENSAGEM_PROPRIEDADES);
  propriedades.titulo = 'Apagar Viagem';
  propriedades.conteudo = `Tem certeza que deseja realizar a exclusão da viagem${viagem}? A ação não poderá ser desfeita.`;
  propriedades.botoes = [{
    tipo: 'cancelar',
  }, {
    tipo: 'confirmar',
    acao: '_deleteViagemAction()'
  }];

  _displayFullMessage(propriedades);
}

async function _deleteViagemAction() {
  if (DOCUMENT_ID) {
    await _deleteUserObjectDB(DOCUMENT_ID, "viagens");
    await _deleteUserObjectStorage();
    window.location.href = `index.html`;
}
}