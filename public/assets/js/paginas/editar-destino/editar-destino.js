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
    DOCUMENT_ID = _getURLParam('d')

    _loadVisibilityIndex();
    _loadHabilitados();
    _newDynamicSelect('regiao');

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
    _displayError(error);
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
    _setDocumento('destinos');
  });

  getID('re-editar').addEventListener('click', () => {
    _reEdit('destinos', WAS_SAVED);
  });

  getID('cancelar').addEventListener('click', () => {
    window.location.href = `index.html`;
  });

  getID('home').addEventListener('click', () => {
    window.location.href = `index.html`;
  });

  getID('visualizar').addEventListener('click', () => {
    if (DOCUMENT_ID) {
      window.location.href = `viagem.html?d=${DOCUMENT_ID}`;
    } else {
      window.location.href = `index.html`;
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
  CAN_EDIT = await _canEdit(FIRESTORE_DESTINOS_DATA.compartilhamento.dono, []);

  if (CAN_EDIT) {
    _loadDestinationsData(FIRESTORE_DESTINOS_DATA);
    _stopLoadingScreen();
  }
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

function _OpenMoveDestinoModal(j, categoria) {
  const propriedades = _cloneObject(MENSAGEM_PROPRIEDADES);
  propriedades.titulo = getID(`${categoria}-nome-${j}`).value || 'Mover Destino';
  propriedades.containers = _getContainersInput();
  propriedades.botoes = [{
    tipo: 'cancelar',
  }, {
    tipo: 'confirmar',
    acao: `_moveDestino(${j}, '${categoria}')`,
  }];

  propriedades.conteudo = `
  <div class="nice-form-group"">
    <label>Mover para:</label>
      <select class="editar-select" id="move-select">
        <option value="restaurantes">Restaurantes</option>
        <option value="lanches">Lanches</option>
        <option value="saidas">Saídas</option>
        <option value="turismo">Turismo</option>
        <option value="lojas">Lojas</option>
      </select>
  </div>`

  _displayFullMessage(propriedades);
  getID('move-select').value = categoria;
}

function _moveDestino(j, categoria) {
  const newCategoria = getID('move-select').value;

  if (categoria != newCategoria) {
    _addDestino(categoria);

    const destino = {
      novo: getID(`${categoria}-novo-${j}`).checked,
      nome: getID(`${categoria}-nome-${j}`).value,
      emoji: getID(`${categoria}-emoji-${j}`).value,
      descricao: getID(`${categoria}-descricao-${j}`).value,
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
    _removeChildWithValidation(categoria, j);

    _removeSelectorDS('regiao', `${categoria}-regiao-select-${j}`);
    _updateValueDS('regiao', destino.regiao, `${newCategoria}-regiao-select-${newJ}`);
    _buildDS('regiao');

  }

  _closeMessage();
}

function _deleteDestino() {
  let destino = getID('titulo').value;
  destino = destino ? ` "${destino}"` : '';

  const propriedades = _cloneObject(MENSAGEM_PROPRIEDADES);
  propriedades.titulo = 'Apagar Destino';
  propriedades.conteudo = `Tem certeza que deseja realizar a exclusão do destino${destino}? A ação não poderá ser desfeita.`;
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
    window.location.href = `index.html`;
  }
}