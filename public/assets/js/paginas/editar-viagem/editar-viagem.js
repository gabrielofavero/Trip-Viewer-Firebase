var blockLoadingEnd = false;
var FIRESTORE_DATA;
var FIRESTORE_GASTOS_DATA;

var SUCCESSFUL_SAVE = false;
var CAN_EDIT = false;
var NEW_TRIP = false;

const TODAY = _getTodayFormatted();
const TOMORROW = _getTomorrowFormatted();

_startLoadingScreen();

document.addEventListener('DOMContentLoaded', async function () {
  try {
    _main();

    DOCUMENT_ID = _getURLParam('v');
    PERMISSOES = await _getPermissoes();

    _loadVisibilityIndex();
    _loadHabilitados();
    _loadDraggables();
    _newDynamicSelect('galeria-categoria');
    _newDynamicSelect('transporte-pessoa');

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
  _loadEditModule('galeria');
}

function _loadDraggables() {
  _initializeSortableForGroup('transporte');
  _initializeSortableForGroup('hospedagens')
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

function _deleteViagem() {
  let viagem = getID('titulo').value;
  viagem = viagem ? ` "${viagem}"` : '';

  const propriedades = _cloneObject(MENSAGEM_PROPRIEDADES);
  propriedades.titulo = translate('trip.delete.title');
  propriedades.conteudo = translate('trip.delete.message', { name: viagem });
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
    window.location.href = `../index.html`;
  }
}

function _getDataSelectOptions(j) {
  const values = DATAS.map(data => _jsDateToKey(data));
  const labels = DATAS.map(data => _getDateTitle(data, 'mini'));
  let result = j ? '' : `<option value="" selected>${translate('datetime.select_date')}</option>`;

  for (let i = 0; i < values.length; i++) {
    result += `<option value="${values[i]}" ${j && i + 1 === j ? 'selected' : ''}>${labels[i]}</option>`;
  }

  return result;
}