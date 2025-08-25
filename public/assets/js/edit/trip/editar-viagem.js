import { newDynamicSelect } from "../../support/components/dynamic-select.js";
import { DOCUMENT_ID, getSingleData, deleteUserObject, getUserList, getUserPermissions } from "../../support/firebase/database.js";
import { deleteUserObjectStorage, loadImageSelector, loadLogoSelector } from "../../support/firebase/storage.js";
import { canUserEdit } from "../../support/firebase/user.js";
import { getID, initApp } from "../../main/app.js";
import { translate } from "../../main/translate.js";
import { startLoadingScreen, stopLoadingScreen } from "../../support/pages/loading.js";

var blockLoadingEnd = false;
var FIRESTORE_DATA;
var FIRESTORE_GASTOS_DATA;

var CAN_EDIT = false;
var NEW_TRIP = false;

const TODAY = _getTodayFormatted();
const TOMORROW = _getTomorrowFormatted();

startLoadingScreen();

document.addEventListener('DOMContentLoaded', async function () {
  try {
    initApp();

    DOCUMENT_ID = _getURLParam('v');
    await loadUserPermissions();

    _loadVisibilityIndex();
    _loadHabilitados();
    newDynamicSelect('galeria-categoria');
    newDynamicSelect('transporte-pessoa');

    if (DOCUMENT_ID) {
      await _loadTrip(true);
    } else {
      NEW_TRIP = true;
      CAN_EDIT = true;
      DESTINOS = await getUserList('destinos', true);
      _loadNewTrip();
    }

    if (!CAN_EDIT) return;

    loadImageSelector('background');
    loadLogoSelector();

    _loadEventListeners();

    if (!blockLoadingEnd) {
      stopLoadingScreen();
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

function _loadUploadSelectors() {
  _loadUploadSelector('background');
  _loadUploadSelector('logo');
}

async function _loadTrip(stripped = false) {
  getID('delete-text').style.display = 'block';
  blockLoadingEnd = true;
  startLoadingScreen();

  if (stripped) {
    const id = _getURLParam('v');
    FIRESTORE_DATA = await get(`viagens/${id}`);
  } else {
    FIRESTORE_DATA = await getSingleData('viagens');
  }

  const canEdit = await canUserEdit(FIRESTORE_DATA.compartilhamento.dono, FIRESTORE_DATA.compartilhamento.editores);

  if (canEdit) {
    await _loadTripData();
    stopLoadingScreen();
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
    await deleteUserObject(DOCUMENT_ID, "viagens");
    await deleteUserObjectStorage(FIRESTORE_DATA);
    window.location.href = `index.html`;
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