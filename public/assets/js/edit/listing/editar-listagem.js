import { DOCUMENT_ID, getSingleData, deleteUserObject, getUserList } from "../../support/firebase/database.js";
import { deleteUserObjectStorage, loadImageSelector, loadLogoSelector } from "../../support/firebase/storage.js";
import { loadUserPermissions } from "../../support/firebase/user.js";
import { canUserEdit } from "../../support/firebase/user.js";
import { editFieldAgain, setRequired } from "../../support/html/fields.js";
import { SUCCESSFUL_SAVE } from "../../main/app.js";
import { initApp } from "../../main/app.js";
import { getID, getChildIDs } from "../../support/pages/selectors.js";
import { translate } from "../../main/translate.js";
import { startLoadingScreen, stopLoadingScreen } from "../../support/pages/loading.js";
import { getDefaultProperties, displayError } from "../../support/pages/messages.js";
import { getURLParam } from "../../support/data/data.js";
import { closeMessage, displayFullMessage } from "../../support/pages/messages.js";
import { setDocument, uploadAndSetImages } from "../../support/pages/set.js";
import { loadEditModuleVisibility } from "../../support/pages/edit-module.js";
import { searchDestination } from "../trip/categorias/destinos.js";

var blockLoadingEnd = false;
var FIRESTORE_DATA;

var CAN_EDIT = false;

var INPUT_DETECTED = false;

startLoadingScreen();

document.addEventListener('DOMContentLoaded', async function () {
  try {
    initApp();

    DOCUMENT_ID = getURLParam('l');
    await loadUserPermissions();

    _loadVisibilityIndex();
    _loadHabilitados();

    if (DOCUMENT_ID) {
      await _carregarListagem()
    } else {
      CAN_EDIT = true;
      DESTINOS = await getUserList('destinos');
      _loadDestinos();
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
    displayError(error);
    if (window.location.href.includes('editar-template.html')) {
      closeMessage();
    }
    throw error;
  }
});

function _loadHabilitados() {
  loadEditModuleVisibility('imagens');
  loadEditModuleVisibility('cores');
  loadEditModuleVisibility('links');
  loadEditModuleVisibility('editores');
}

function _loadUploadSelectors() {
  _loadUploadSelector('background');
  _loadUploadSelector('logo');
}

function _loadEventListeners() {
  getID('cancelar').addEventListener('click', () => {
    window.location.href = '../index.html';
  });

  getID('home').addEventListener('click', () => {
    window.location.href = '../index.html';
  });

  getID('visualizar').addEventListener('click', () => {
    if (DOCUMENT_ID) {
      window.open(`../view.html?l=${DOCUMENT_ID}`, '_blank');
    } else {
      window.location.href = '../index.html';
    }
  });

  getID('editores-adicionar').addEventListener('click', () => {
    _addEditores();
  });

  getID('salvar').addEventListener('click', () => {
    _setListagem();
  });

  getID('re-editar').addEventListener('click', () => {
    editFieldAgain('listagens', SUCCESSFUL_SAVE);
  });

  getID('home').addEventListener('click', () => {
    window.location.href = '../index.html';
  });

  getID('destinos-search').addEventListener('input', () => searchDestination());

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

async function _carregarListagem() {
  getID('delete-text').style.display = 'block';
  blockLoadingEnd = true;
  startLoadingScreen();

  FIRESTORE_DATA = await getSingleData('listagens');
  const canEdit = await canUserEdit(FIRESTORE_DATA.compartilhamento.dono, FIRESTORE_DATA.compartilhamento.editores);

  if (canEdit) {
    await _loadListData(FIRESTORE_DATA);
    stopLoadingScreen();
  }
}

async function _buildListObject() {
  FIRESTORE_NEW_DATA = {
    compartilhamento: await _buildCompartilhamentoObject(),
    cores: {
      ativo: getID('habilitado-cores').checked,
      claro: getID('claro').value,
      escuro: getID('escuro').value
    },
    descricao: getID(`descricao`).value,
    destinos: _buildDestinosArray(),
    imagem: _buildImagemObject(),
    links: _buildLinksObject(),
    subtitulo: getID(`subtitulo`).value,
    titulo: getID(`titulo`).value,
    versao: {
      ultimaAtualizacao: new Date().toISOString(),
      exibirEmDestinos: getID(`exibir-em-destinos`).checked
    }
  }
}

function _getIgnoredPathDestinos() {
  if (!FIRESTORE_DATA) return [];
  let result = [];
  for (let i = 0; i < FIRESTORE_DATA.destinos.length; i++) {
    result.push(`destinos.${i}.destinos`);
  }
  return result;
}

async function _setListagem() {
  for (const child of getChildIDs('com-destinos')) {
    const i = parseInt(child.split("-")[2]);
    setRequired(`select-destinos-${i}`)
  }
  await _setDocumento('listagens');
}

export function deleteListing() {
  let listagem = getID('titulo').value;
  listagem = listagem ? ` "${listagem}"` : '';

  const propriedades = getDefaultProperties();
  propriedades.title = translate('listing.delete.title');
  propriedades.content = translate('listing.delete.title', {name: listagem});
  propriedades.buttons = [getCancelMessageProperty(), getConfirmMessageProperty(_deleteListagemAction)];

  displayFullMessage(propriedades);
}

async function _deleteListagemAction() {
  if (DOCUMENT_ID) {
    await deleteUserObject(DOCUMENT_ID, "listagens");
    await deleteUserObjectStorage(FIRESTORE_DATA);
    window.location.href = '../index.html';
  }
}

async function setListing() {
  const before = [_buildListObject, uploadListingImagesBefore];
  const after = [uploadListingImagesAfter, verifyListingImages];
  await setDocument('listagens', [], before, after);
}

async function uploadListingImagesBefore() {
  await uploadAndSetImages('listagens', true)
}

async function uploadListingImagesAfter() {
  await uploadAndSetImages('listagens', false)
}

function verifyListingImages() {
  _verifyImageUploads('listagens');
}