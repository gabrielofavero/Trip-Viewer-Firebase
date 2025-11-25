var blockLoadingEnd = false;
var FIRESTORE_DESTINOS_DATA;
var INPUT_DETECTED = false;

SUCCESSFUL_SAVE = false;

const TODAY = _getTodayFormatted();
const TOMORROW = _getTomorrowFormatted();

var PROGRAMACAO = {};

var REGIOES = [];

document.addEventListener('DOMContentLoaded', async function () {
  _startLoadingScreen();
  try {
    _main();
  } catch (error) {
    _displayError(error);
  }
});

async function _loadEditarDestinoPage() {
  DOCUMENT_ID = _getURLParam('d')

  _loadVisibilityIndex();
  _loadHabilitados();
  _newDynamicSelect('regiao');

  if (DOCUMENT_ID) {
    await _loadDestinos()
  }

  _loadEventListeners();

  if (!blockLoadingEnd) {
    _stopLoadingScreen();
  }
  $('body').css('overflow', 'auto');
}

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
    _buildDS('regiao');
  });

  getID('lanches-adicionar').addEventListener('click', () => {
    _closeAccordions('lanches');
    _addLanches();
    _openLastAccordion('lanches');
    _buildDS('regiao');
  });

  getID('saidas-adicionar').addEventListener('click', () => {
    _closeAccordions('saidas');
    _addSaidas();
    _openLastAccordion('saidas');
    _buildDS('regiao');
  });

  getID('turismo-adicionar').addEventListener('click', () => {
    _closeAccordions('turismo');
    _addTurismo();
    _openLastAccordion('turismo');
    _buildDS('regiao');
  });

  getID('lojas-adicionar').addEventListener('click', () => {
    _closeAccordions('lojas');
    _addLojas();
    _openLastAccordion('lojas');
    _buildDS('regiao');
  });

  getID('salvar').addEventListener('click', () => {
    const before = [
      _buildDestinosObject,
      _updateTikTokLinks
    ]

    _setDocumento('destinos', { before });
  });

  getID('re-editar').addEventListener('click', () => {
    _reEdit('destinos', SUCCESSFUL_SAVE);
  });

  getID('cancelar').addEventListener('click', () => {
    window.location.href = '../index.html';
  });

  getID('home').addEventListener('click', () => {
    window.location.href = '../index.html';
  });

  getID('visualizar').addEventListener('click', () => {
    if (DOCUMENT_ID) {
      window.open(`../view.html?d=${DOCUMENT_ID}`, '_blank');
    } else {
      window.location.href = '../index.html';
    }
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

  document.addEventListener("input", (event) => {
    if (event.target.tagName === "INPUT" || event.target.tagName === "TEXTAREA") {
      INPUT_DETECTED = true;
    }
  });

  window.addEventListener("beforeunload", (event) => {
    if (INPUT_DETECTED && !SUCCESSFUL_SAVE) {
      event.preventDefault();
      event.returnValue = translate('messages.exit_confirmation');
    }
  });
}

function _addListenerToRemoveDestino(categoria, j) {
  const dynamicSelects = [{
    type: 'regiao',
    selectID: `${categoria}-regiao-select-${j}`,
  }]
  _addRemoveChildListenerDS(categoria, j, dynamicSelects);
}

async function _loadDestinos() {
  blockLoadingEnd = true;
  getID('delete-text').style.display = 'block';
  _startLoadingScreen();

  FIRESTORE_DESTINOS_DATA = await _getSingleData('destinos');

  _loadDestinationsData(FIRESTORE_DESTINOS_DATA);
  _stopLoadingScreen();
}

// Listeners
function _addDestinosListeners(categoria, j) {
  // Título Interativo
  getID(`${categoria}-nome-${j}`).addEventListener('change', () => _updateDestinosTitle(j, categoria));
  getID(`${categoria}-emoji-${j}`).addEventListener('change', () => _updateDestinosTitle(j, categoria));
  getID(`${categoria}-novo-${j}`).addEventListener('click', () => _updateDestinosTitle(j, categoria));

  // Validação de Emoji
  getID(`${categoria}-emoji-${j}`).addEventListener('input', () => _emojisOnInputAction(j, categoria));

  // Valor
  getID(`${categoria}-valor-${j}`).addEventListener('change', () => _valorListenerAction(j, categoria));

  // Região

  // Links
  getID(`${categoria}-website-${j}`).addEventListener('change', () => _validateLink(`${categoria}-website-${j}`));
  getID(`${categoria}-mapa-${j}`).addEventListener('change', () => _validateMapLink(`${categoria}-mapa-${j}`));
  getID(`${categoria}-instagram-${j}`).addEventListener('change', () => _validateInstagramLink(`${categoria}-instagram-${j}`));
  getID(`${categoria}-midia-${j}`).addEventListener('change', () => _validateMediaLink(`${categoria}-midia-${j}`));
}

function _valorListenerAction(j, categoria) {
  const valor = getID(`${categoria}-valor-${j}`);
  const outroValor = getID(`${categoria}-outro-valor-${j}`);

  if (valor.value == 'outro') {
    outroValor.style.display = 'block';
    outroValor.required = true;
  } else {
    outroValor.style.display = 'none';
    outroValor.required = false;
  }
}

function _updateDestinosTitle(j, categoria) {
  const titleDiv = getID(`${categoria}-title-text-${j}`);
  const emojiDiv = getID(`${categoria}-emoji-${j}`);

  const nome = getID(`${categoria}-nome-${j}`).value;
  const emoji = emojiDiv.value ? emojiDiv.value.replace(/[a-zA-Z0-9\s!-\/:-@\[-`{-~]/g, '') : "";

  if (emoji && nome) {
    titleDiv.innerText = `${nome} ${emoji}`
  } else if (nome) {
    titleDiv.innerText = nome;
  }

  getID(`${categoria}-title-icon-${j}`).style.display = getID(`${categoria}-novo-${j}`).checked ? 'block' : 'none';
}

function _emojisOnInputAction(j, categoria) {
  const emojiDiv = getID(`${categoria}-emoji-${j}`);
  const emojiUntreated = emojiDiv.value;
  const emojiTreated = emojiUntreated ? emojiUntreated.replace(/[a-zA-Z0-9\s!-\/:-@\[-`{-~]/g, '') : "";

  if (emojiTreated && emojiUntreated && emojiTreated !== emojiUntreated) {
    emojiDiv.value = emojiTreated;
  } else if (!emojiTreated && emojiUntreated) {
    emojiDiv.value = '';
    emojiDiv.placeholder = "Insira um Emoji Válido 🫠";
  }
}

function _openMoveDestinoModal(j, categoria) {
  const propriedades = _cloneObject(MENSAGEM_PROPRIEDADES);

  propriedades.titulo = getID(`${categoria}-nome-${j}`).value || `Mover - ${_firstCharToUpperCase(categoria)}`;
  propriedades.containers = _getContainersInput();
  propriedades.botoes = [{
    tipo: 'cancelar',
  }, {
    tipo: 'confirmar',
    acao: `_moveDestino(${j}, '${categoria}')`,
  }];

  const options = {
    restaurantes: "Restaurantes",
    lanches: "Lanches",
    saidas: "Saídas",
    turismo: "Turismo",
    lojas: "Lojas"
  }

  let optionsString = "";

  for (const option in options) {
    if (option != categoria) {
      optionsString += `<option value="${option}">${options[option]}</option>`;
    }
  }

  propriedades.conteudo = `
  <div class="nice-form-group"">
    <label>Mover para:</label>
      <select class="editar-select" id="move-select">
        ${optionsString}
      </select>
  </div>`

  _displayFullMessage(propriedades);
}

function _moveDestino(j, categoria) {
  const newCategoria = getID('move-select').value;
  const description = _getDescription(categoria, j);

  if (categoria != newCategoria) {

    const destino = {
      novo: getID(`${categoria}-novo-${j}`).checked,
      nome: getID(`${categoria}-nome-${j}`).value,
      emoji: getID(`${categoria}-emoji-${j}`).value,
      website: getID(`${categoria}-website-${j}`).value,
      mapa: getID(`${categoria}-mapa-${j}`).value,
      instagram: getID(`${categoria}-instagram-${j}`).value,
      regiao: getID(`${categoria}-regiao-select-${j}`).value,
      valor: getID(`${categoria}-valor-${j}`).value,
      midia: getID(`${categoria}-midia-${j}`).value,
      nota: getID(`${categoria}-nota-${j}`).value,
    }

    const newJ = _getLastJ(`${newCategoria}-box`) + 1;

    _addDestino(newCategoria);
    _addDestinoHTML(newCategoria, newJ, destino);
    _setDescription(newCategoria, newJ, description);
    _removeChildWithValidation(categoria, j);

    _removeSelectorDS('regiao', `${categoria}-regiao-select-${j}`);
    _updateValueDS('regiao', destino.regiao, `${newCategoria}-regiao-select-${newJ}`);
    _buildDS('regiao');

  }

  _closeMessage();
}

function _deleteDestino() {
  const name = getID('titulo').value;

  const propriedades = _cloneObject(MENSAGEM_PROPRIEDADES);
  propriedades.titulo = translate('destination.delete.title');
  propriedades.conteudo = translate('destination.delete.message', { name });
  propriedades.botoes = [{
    tipo: 'cancelar',
  }, {
    tipo: 'confirmar',
    acao: '_deleteDestinoAction()'
  }];

  _displayFullMessage(propriedades);
}

async function _deleteDestinoAction() {
  if (DOCUMENT_ID) {
    await _deleteUserObjectDB(DOCUMENT_ID, "destinos");
    window.location.href = '../index.html';
  }
}

function _getID(categoria, j) {
  return getID(`${categoria}-id-${j}`).value;
}