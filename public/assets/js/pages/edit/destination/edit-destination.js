import { newDynamicSelect, updateValueDS, buildDS, addRemoveChildListenerDS, removeSelectorDS } from "../../support/components/dynamic-select.js";
import { DOCUMENT_ID, getSingleData, deleteUserObject } from "../../support/firebase/database.js";
import { canUserEdit } from "../../support/firebase/user.js";
import { closeAccordions, openLastAccordion } from "../../support/html/accordion.js";
import { editFieldAgain, validateLink, validateMapLink, validateInstagramLink, validateMediaLink } from "../../support/html/fields.js";
import { SUCCESSFUL_SAVE } from "../../main/app.js";
import { initApp } from "../../main/app.js";
import { getID, getLastSecondaryID, onChange, onClick, onInput } from "../../support/pages/selectors.js";
import { translate } from "../../main/translate.js";
import { startLoadingScreen, stopLoadingScreen } from "../../support/pages/loading.js";
import { firstCharToUpperCase, getURLParam } from "../../support/data/data.js";
import { setRequired, removeRequired } from "../../support/html/fields.js";
import { getDefaultProperties, displayError, closeMessage, displayFullMessage, getContainersInput, getCancelMessageProperty, getConfirmMessageProperty } from "../../support/pages/messages.js";
import { setDocument, uploadAndSetImages } from "../../support/pages/set.js";
import { setDestination } from "./operations/set-destination.js";
import { loadEditModuleVisibility, removeChildWithValidation } from "../../support/pages/edit-module.js";
import { loadVisibilityIndex } from "../../index/support/index-visibility.js";

var blockLoadingEnd = false;
var FIRESTORE_DESTINOS_DATA;
var INPUT_DETECTED = false;

var CAN_EDIT = false;

var PROGRAMACAO = {};

var REGIOES = [];

document.addEventListener('DOMContentLoaded', async function () {
  startLoadingScreen();
  try {
    initApp();
    DOCUMENT_ID = getURLParam('d')

    loadVisibilityIndex();
    _loadHabilitados();
    newDynamicSelect('regiao');

    if (DOCUMENT_ID) {
      await _loadDestinos()
    } else {
      CAN_EDIT = true;
    }

    if (!CAN_EDIT) return;

    _loadEventListeners();

    if (!blockLoadingEnd) {
      stopLoadingScreen();
    }
    $('body').css('overflow', 'auto');

  } catch (error) {
    displayError(error);
    throw error;
  }
});

function _loadHabilitados() {
  loadEditModuleVisibility('restaurantes');
  loadEditModuleVisibility('lanches');
  loadEditModuleVisibility('saidas');
  loadEditModuleVisibility('turismo');
  loadEditModuleVisibility('lojas');
  loadEditModuleVisibility('mapa');

  const mapa = getID('habilitado-mapa');
  mapa.addEventListener('change', function () {
    if (mapa.checked) {
      setRequired('mapa-link');
    } else {
      removeRequired('mapa-link');
    }
  });
}

function _loadEventListeners() {
  getID('restaurantes-adicionar').addEventListener('click', () => {
    closeAccordions('restaurantes');
    _addRestaurantes();
    openLastAccordion('restaurantes');
    buildDS('regiao');
  });

  getID('lanches-adicionar').addEventListener('click', () => {
    closeAccordions('lanches');
    _addLanches();
    openLastAccordion('lanches');
    buildDS('regiao');
  });

  getID('saidas-adicionar').addEventListener('click', () => {
    closeAccordions('saidas');
    _addSaidas();
    openLastAccordion('saidas');
    buildDS('regiao');
  });

  getID('turismo-adicionar').addEventListener('click', () => {
    closeAccordions('turismo');
    _addTurismo();
    openLastAccordion('turismo');
    buildDS('regiao');
  });

  getID('lojas-adicionar').addEventListener('click', () => {
    closeAccordions('lojas');
    _addLojas();
    openLastAccordion('lojas');
    buildDS('regiao');
  });

  getID('salvar').addEventListener('click', () => {
    setDestination();
  });

  getID('re-editar').addEventListener('click', () => {
    editFieldAgain('destinos', SUCCESSFUL_SAVE);
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
  addRemoveChildListenerDS(categoria, j, dynamicSelects);
}

async function _loadDestinos() {
  blockLoadingEnd = true;
  getID('delete-text').style.display = 'block';
  startLoadingScreen();

  FIRESTORE_DESTINOS_DATA = await getSingleData('destinos');
  const canEdit = await canUserEdit(FIRESTORE_DESTINOS_DATA.compartilhamento.dono, []);

  if (canEdit) {
    _loadDestinationsData(FIRESTORE_DESTINOS_DATA);
    stopLoadingScreen();
  }
}

// Listeners
function _addDestinosListeners(categoria, j) {
  onChange(`#${categoria}-nome-${j}`, () => _updateDestinosTitle(j, categoria));
  onChange(`#${categoria}-emoji-${j}`, () => _updateDestinosTitle(j, categoria));
  onClick(`#${categoria}-novo-${j}`, () => _updateDestinosTitle(j, categoria));
  onInput(`#${categoria}-emoji-${j}`, () => _emojisOnInputAction(j, categoria));
  onChange(`#${categoria}-valor-${j}`, () => _valorListenerAction(j, categoria));
  onClick(`#restaurantes-descricao-button-${j}`, () => _openDescription(categoria, j));
  onChange(`#${categoria}-website-${j}`, () => validateLink(`${categoria}-website-${j}`));
  onChange(`#${categoria}-mapa-${j}`, () => validateMapLink(`${categoria}-mapa-${j}`));
  onChange(`#${categoria}-instagram-${j}`, () => validateInstagramLink(`${categoria}-instagram-${j}`));
  onChange(`#${categoria}-midia-${j}`, () => validateMediaLink(`${categoria}-midia-${j}`));
  onClick(`#move-${categoria}-${j}`, () => _openMoveDestinoModal(j, categoria));
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
    emojiDiv.placeholder = translate('messages.emoji');
  }
}

function _openMoveDestinoModal(j, categoria) {
  const propriedades = getDefaultProperties();

  propriedades.title = getID(`${categoria}-nome-${j}`).value;
  propriedades.containers = getContainersInput();
  propriedades.buttons = [getCancelMessageProperty(), getConfirmMessageProperty(() => _moveDestino(j, categoria))];

  const options = {
    restaurantes: translate('destination.restaurants.title'),
    lanches: translate('destination.snacks.title'),
    saidas: translate('destination.nightlife.title'),
    turismo: translate('destination.tourism.title'),
    lojas: translate('destination.shopping.title')
  }

  let optionsString = "";

  for (const option in options) {
    if (option != categoria) {
      optionsString += `<option value="${option}">${options[option]}</option>`;
    }
  }

  propriedades.conteudo = `
  <div class="nice-form-group"">
    <label>${translate('messages.move_to')}:</label>
      <select class="editar-select" id="move-select">
        ${optionsString}
      </select>
  </div>`

  displayFullMessage(propriedades);
}

function _moveDestino(j, categoria) {
  const newCategoria = getID('move-select').value;

  if (categoria != newCategoria) {

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

    const newJ = getLastSecondaryID(`${newCategoria}-box`) + 1;
    _addDestino(newCategoria);
    _addDestinoHTML(newCategoria, newJ, destino);
    removeChildWithValidation(categoria, j);

    removeSelectorDS('regiao', `${categoria}-regiao-select-${j}`);
    updateValueDS('regiao', destino.regiao, `${newCategoria}-regiao-select-${newJ}`);
    buildDS('regiao');

  }

  closeMessage();
}

export function deleteDestination() {
  const name = getID('titulo').value;

  const propriedades = getDefaultProperties();
  propriedades.title = translate('destination.delete.title');
  propriedades.content = translate('destination.delete.message', { name });
  propriedades.buttons = [getCancelMessageProperty(), getConfirmMessageProperty(_deleteDestinoAction)];

  displayFullMessage(propriedades);
}

async function _deleteDestinoAction() {
  if (DOCUMENT_ID) {
    await deleteUserObject(DOCUMENT_ID, "destinos");
    window.location.href = '../index.html';
  }
}