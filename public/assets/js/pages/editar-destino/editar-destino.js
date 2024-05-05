var blockLoadingEnd = false;
var FIRESTORE_DESTINOS_DATA;

WAS_SAVED = false;
var CAN_EDIT = false;

const TODAY = _getTodayFormatted();
const TOMORROW = _getTomorrowFormatted();

var CONFIG;

var PROGRAMACAO = {};

var REGIOES = [];

document.addEventListener('DOMContentLoaded', async function () {
  _startLoadingScreen();
  try {
    _main();
    CONFIG = await _getConfig();
    const urlParams = new URLSearchParams(window.location.search);
    DOCUMENT_ID = urlParams.get('d');

    _loadVisibilityIndex();
    _loadHabilitados();

    if (DOCUMENT_ID) {
      await _loadDestinos()
    } else {
      CAN_EDIT = true;
    }

    if (!CAN_EDIT) return;

    _loadEventListeners();

    if (!blockLoadingEnd) {
      _stopLoadingScreen();
    }
    $('body').css('overflow', 'auto');

  } catch (error) {
    _displayErrorMessage(error);
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

  const mapa = getID('habilitado-mapa');
  mapa.addEventListener('change', function () {
    if (mapa.checked) {
      _setRequired('mapa-link');
    } else {
      _removeRequired('mapa-link');
    }
  });
}

function _loadEventListeners() {
  getID('restaurantes-adicionar').addEventListener('click', () => {
    _closeAccordions('restaurantes');
    _addRestaurantes();
    _openLastAccordion('restaurantes');
  });

  getID('lanches-adicionar').addEventListener('click', () => {
    _closeAccordions('lanches');
    _addLanches();
    _openLastAccordion('lanches');
  });

  getID('saidas-adicionar').addEventListener('click', () => {
    _closeAccordions('saidas');
    _addSaidas();
    _openLastAccordion('saidas');
  });

  getID('turismo-adicionar').addEventListener('click', () => {
    _closeAccordions('turismo');
    _addTurismo();
    _openLastAccordion('turismo');
  });

  getID('lojas-adicionar').addEventListener('click', () => {
    _closeAccordions('lojas');
    _addLojas();
    _openLastAccordion('lojas');
  });

  getID('salvar').addEventListener('click', () => {
    _setDestino();
  });

  getID('re-editar').addEventListener('click', () => {
    _reEdit('destinos', WAS_SAVED);
  });

  getID('cancelar').addEventListener('click', () => {
    _closeModal();
  });

  getID('home').addEventListener('click', () => {
    window.location.href = `index.html`;
  });

  getID('apagar').addEventListener('click', async () => {
    if (DOCUMENT_ID) {
      await _deleteUserObjectDB(DOCUMENT_ID, "destinos");
      window.location.href = `index.html`;
    }
  });

  getID('home').addEventListener('click', () => {
    window.location.href = `index.html`;
  });

  getID('moeda').addEventListener('change', () => {
    if (getID('moeda').value == "outra") {
      getID('outra-moeda').style.display = 'block';
    } else {
      getID('outra-moeda').style.display = 'none';
    }
    _loadCurrencySelects();
  });

  getID('outra-moeda').addEventListener('change', () => {
    _loadCurrencySelects();
  });
}

async function _loadDestinos() {
  blockLoadingEnd = true;
  getID('delete-text').style.display = 'block';
  _startLoadingScreen();

  FIRESTORE_DESTINOS_DATA = await _getSingleData('destinos');
  CAN_EDIT = await _canEdit(FIRESTORE_DESTINOS_DATA.compartilhamento.dono, []);

  if (CAN_EDIT) {
    _loadDestinationsData(FIRESTORE_DESTINOS_DATA);
    _stopLoadingScreen();
  }
}

// Listeners
function _addDestinosListeners(categoria, i) {
  // Nome
  getID(`${categoria}-nome-${i}`).addEventListener('change', function () {
    _accordionDestinosOnChange(i, categoria);
  });

  // Emoji
  const emoji = getID(`${categoria}-emoji-${i}`);
  if (emoji) {
    emoji.addEventListener('change', function () {
      _accordionDestinosOnChange(i, categoria);
    });
  }

  // Novo
  getID(`${categoria}-novo-${i}`).addEventListener('click', function () {
    _accordionDestinosOnChange(i, categoria);
  });

  // Valor
  const valor = getID(`${categoria}-valor-${i}`);
  const outroValor = getID(`${categoria}-outro-valor-${i}`);
  valor.addEventListener('change', () => {
    if (valor.value == 'outro') {
      outroValor.style.display = 'block';
      outroValor.required = true;
    } else {
      outroValor.style.display = 'none';
      outroValor.required = false;
    }
  });

  // Região
  _loadRegiaoListeners(i, categoria);

  // Abrir-Fechar Accordion
  $(`#collapse-${categoria}-${i}`).on('show.bs.collapse', function () {
    _removeDragListeners(categoria);
  });
  $(`#collapse-${categoria}-${i}`).on('hide.bs.collapse', function () {
    _addDragListeners(categoria);
  });
}

function _accordionDestinosOnChange(i, type) {
  const titleDiv = getID(`${type}-title-text-${i}`);
  const emojiDiv = getID(`${type}-emoji-${i}`);
  const novoIcon = getID(`${type}-title-icon-${i}`);

  const nome = getID(`${type}-nome-${i}`).value;
  const emojiUntreated = emojiDiv ? emojiDiv.value : "";
  const emojiTreated = emojiDiv ? emojiUntreated.replace(/[a-zA-Z0-9\s!-\/:-@\[-`{-~]/g, '') : "";

  if (emojiTreated && nome) {
    titleDiv.innerText = `${nome} ${emojiTreated}`
  } else if (nome) {
    titleDiv.innerText = nome;
  }

  if (emojiTreated && emojiUntreated && emojiTreated !== emojiUntreated) {
    emojiDiv.value = emojiTreated;
  } else if (!emojiTreated && emojiUntreated) {
    emojiDiv.value = '';
    emojiDiv.placeholder = "Insira um Emoji Válido 🫠";
  }

  if (getID(`${type}-novo-${i}`).checked) {
    novoIcon.style.display = 'block';
  } else {
    novoIcon.style.display = 'none';
  }
}
