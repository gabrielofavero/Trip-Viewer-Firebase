var blockLoadingEnd = false;
var FIRESTORE_DESTINOS_DATA;

WAS_SAVED = false;
var CAN_EDIT = false;

const TODAY = _getTodayFormatted();
const TOMORROW = _getTomorrowFormatted();

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
    _loadNewRegiaoSelect('restaurantes');
    _openLastAccordion('restaurantes');
  });

  getID('lanches-adicionar').addEventListener('click', () => {
    _closeAccordions('lanches');
    _addLanches();
    _loadNewRegiaoSelect('lanches');
    _openLastAccordion('lanches');
  });

  getID('saidas-adicionar').addEventListener('click', () => {
    _closeAccordions('saidas');
    _addSaidas();
    _loadNewRegiaoSelect('saidas');
    _openLastAccordion('saidas');
  });

  getID('turismo-adicionar').addEventListener('click', () => {
    _closeAccordions('turismo');
    _addTurismo();
    _loadNewRegiaoSelect('turismo');
    _openLastAccordion('turismo');
  });

  getID('lojas-adicionar').addEventListener('click', () => {
    _closeAccordions('lojas');
    _addLojas();
    _loadNewRegiaoSelect('lojas');
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
  // Título Interativo
  getID(`${categoria}-nome-${i}`).addEventListener('change', () => _updateDestinosTitle(i, categoria));
  getID(`${categoria}-emoji-${i}`).addEventListener('change', () => _updateDestinosTitle(i, categoria));
  getID(`${categoria}-novo-${i}`).addEventListener('click', () => _updateDestinosTitle(i, categoria));

  // Validação de Emoji
  getID(`${categoria}-emoji-${i}`).addEventListener('input', () => _emojisOnInputAction(i, categoria));

  // Valor
  getID(`${categoria}-valor-${i}`).addEventListener('change', () => _valorListenerAction(i, categoria));

  // Região
  _loadRegiaoListeners(i, categoria);

  // Links
  getID(`${categoria}-website-${i}`).addEventListener('change', () => _validateLink(`${categoria}-website-${i}`));
  getID(`${categoria}-mapa-${i}`).addEventListener('change', () => _validateMapLink(`${categoria}-mapa-${i}`));
  getID(`${categoria}-instagram-${i}`).addEventListener('change', () => _validateInstagramLink(`${categoria}-instagram-${i}`));
  getID(`${categoria}-midia-${i}`).addEventListener('change', () => _validateMediaLink(`${categoria}-midia-${i}`));
}

function _valorListenerAction(i, categoria) {
  const valor = getID(`${categoria}-valor-${i}`);
  const outroValor = getID(`${categoria}-outro-valor-${i}`);

  if (valor.value == 'outro') {
    outroValor.style.display = 'block';
    outroValor.required = true;
  } else {
    outroValor.style.display = 'none';
    outroValor.required = false;
  }
}

function _updateDestinosTitle(i, categoria) {
  const titleDiv = getID(`${categoria}-title-text-${i}`);
  const emojiDiv = getID(`${categoria}-emoji-${i}`);

  const nome = getID(`${categoria}-nome-${i}`).value;
  const emoji = emojiDiv.value ? emojiDiv.value.replace(/[a-zA-Z0-9\s!-\/:-@\[-`{-~]/g, '') : "";

  if (emoji && nome) {
    titleDiv.innerText = `${nome} ${emoji}`
  } else if (nome) {
    titleDiv.innerText = nome;
  }

  getID(`${categoria}-title-icon-${i}`).style.display = getID(`${categoria}-novo-${i}`).checked ? 'block' : 'none';
}

function _emojisOnInputAction(i, categoria) {
  const emojiDiv = getID(`${categoria}-emoji-${i}`);
  const emojiUntreated = emojiDiv.value;
  const emojiTreated = emojiUntreated ? emojiUntreated.replace(/[a-zA-Z0-9\s!-\/:-@\[-`{-~]/g, '') : "";

  if (emojiTreated && emojiUntreated && emojiTreated !== emojiUntreated) {
    emojiDiv.value = emojiTreated;
  } else if (!emojiTreated && emojiUntreated) {
    emojiDiv.value = '';
    emojiDiv.placeholder = "Insira um Emoji Válido 🫠";
  }
}

async function getDesktopLink(originalLink) {
  try {
      const response = await fetch(originalLink, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3' } });
      const html = await response.text();
      const match = html.match(/"og:url" content="([^"]+)"/);
      if (match && match[1]) {
          return match[1];
      } else {
          return "Desktop link not found.";
      }
  } catch (error) {
      console.error('Error:', error);
      return "An error occurred while fetching the desktop link.";
  }
}