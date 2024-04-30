var blockLoadingEnd = false;
var FIRESTORE_PLACES_DATA;
wasSaved = false;

const TODAY = _getTodayFormatted();
const TOMORROW = _getTomorrowFormatted();

var PROGRAMACAO = {};

document.addEventListener('DOMContentLoaded', function () {
  _startLoadingScreen();
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
    _addRestaurantes();
  });

  getID('lanches-adicionar').addEventListener('click', () => {
    _addLanches();
  });

  getID('saidas-adicionar').addEventListener('click', () => {
    _addSaidas();
  });

  getID('turismo-adicionar').addEventListener('click', () => {
    _addTurismo();
  });

  getID('lojas-adicionar').addEventListener('click', () => {
    _addLojas();
  });

  getID('salvar').addEventListener('click', () => {
    _setDestino();
  });

  getID('re-editar').addEventListener('click', () => {
    _reEdit('destinos', wasSaved);
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
  });
}

async function _loadDestinations() {
  blockLoadingEnd = true;
  getID('delete-text').style.display = 'block';
  _startLoadingScreen();
  FIRESTORE_PLACES_DATA = await _getSingleData('destinos');
  _loadDestinationsData(FIRESTORE_PLACES_DATA);
  _stopLoadingScreen();
}

// Listeners
function _applyDestinosListeners(i, type) {
  const nome = getID(`${type}-nome-${i}`);
  nome.addEventListener('change', function () {
      _accordionDestinosOnChange(i, type);
  });

  const emoji = getID(`${type}-emoji-${i}`);
  if (emoji) {
      emoji.addEventListener('change', function () {
          _accordionDestinosOnChange(i, type);
      });
  }

  const novo = getID(`${type}-novo-${i}`);
  novo.addEventListener('click', function () {
      _accordionDestinosOnChange(i, type);
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
