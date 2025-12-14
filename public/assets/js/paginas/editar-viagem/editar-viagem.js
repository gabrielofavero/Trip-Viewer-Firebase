var blockLoadingEnd = false;
var FIRESTORE_DATA;
var FIRESTORE_GASTOS_DATA;

var SUCCESSFUL_SAVE = false;
var NEW_TRIP = false;

const TODAY = _getTodayFormatted();
const TOMORROW = _getTomorrowFormatted();

_startLoadingScreen();

document.addEventListener('DOMContentLoaded', async function () {
  try {
    _main();
  } catch (error) {
    if (error?.responseJSON?.error) {
      _displayError(error.responseJSON.error)
    } else {
      _displayError(error);
    }
  }
});

async function _loadEditarViagemPage() {
  DOCUMENT_ID = _getURLParam('v');
  PERMISSOES = await _getPermissoes();

  _loadVisibilityIndex();
  _loadHabilitados();
  _loadDraggablesWithAccordions(['transporte', 'hospedagens']);
  _newDynamicSelect('galeria-categoria');
  _newDynamicSelect('transporte-pessoa');

  USER_DATA = await _getUserData();
  DESTINOS = _getOrderedDocumentByTitle(USER_DATA.destinos);

  if (DOCUMENT_ID) {
    await _loadTrip(true);
  } else {
    NEW_TRIP = true;
    _loadNewTrip();
  }

  _loadImageSelector('background');
  _loadLogoSelector();

  _loadEventListeners();

  if (!blockLoadingEnd) {
    _stopLoadingScreen();
  }
  $('body').css('overflow', 'auto');
}

function _loadHabilitados() {
  _loadEditModule('imagens');
  _loadEditModule('cores');
  _loadEditModule('links');
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
  _startLoadingScreen();

  await _loadPinData();
  let protectedData;

  if (PIN.current) {
    protectedData = await _get(`viagens/protected/${PIN.current}/${DOCUMENT_ID}`, true, true);
  }

  switch (protectedData?.pin) {
    case 'all-data':
      FIRESTORE_DATA = stripped ? protectedData : await _getTripDataWithDestinos(protectedData);
      break;
    case 'sensitive-only':
      FIRESTORE_DATA = _getMergedTripObject(await _getTravelDocument(stripped), protectedData);
      break;
    default:
      FIRESTORE_DATA = await _getTravelDocument(stripped);
  }

  await _loadTripData();
  _stopLoadingScreen();
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
  if (!DOCUMENT_ID) return;

  const tasks = [
    _deleteUserObjectDB(DOCUMENT_ID, "viagens"),
    _deleteUserObjectStorage(),
    _delete(`gastos/${DOCUMENT_ID}`, true)
  ];

  if (PIN.current) {
    tasks.push(
      _delete(`protegido/${DOCUMENT_ID}`, true),
      _delete(`viagens/protected/${PIN.current}/${DOCUMENT_ID}`, true),
      _delete(`gastos/protected/${PIN.current}/${DOCUMENT_ID}`, true),
    );
  }

  await Promise.all(tasks);
  window.location.href = "../index.html";
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

async function _getTravelDocument(stripped = false) {
  return stripped ? await _get(`viagens/${DOCUMENT_ID}`) : await _getSingleData('viagens')
}

function _getMergedTripObject(tripData, protectedData) {
  for (let i = 0; i < tripData.transportes.dados.length; i++) {
    const id = tripData.transportes.dados[i].id;
    tripData.transportes.dados[i].reserva = protectedData.transportes[id]?.reserva || '';
    tripData.transportes.dados[i].link = protectedData.transportes[id]?.link || '';
  }

  for (let i = 0; i < tripData.hospedagens.length; i++) {
    const id = tripData.hospedagens[i].id;
    tripData.hospedagens[i].reserva = protectedData.hospedagens[id]?.reserva || '';
    tripData.hospedagens[i].link = protectedData.hospedagens[id]?.link || '';
  }

  return tripData;
}