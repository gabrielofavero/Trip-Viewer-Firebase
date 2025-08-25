import { DOCUMENT_ID, getSingleData, deleteUserObject, getUserList } from "../../support/firebase/database.js";
import { deleteUserObjectStorage, loadImageSelector, loadLogoSelector } from "../../support/firebase/storage.js";
import { loadUserPermissions } from "../../support/firebase/user.js";
import { canUserEdit } from "../../support/firebase/user.js";
import { editFieldAgain } from "../../support/html/fields.js";
import { SUCCESSFUL_SAVE } from "../../main/app.js";
import { getID, initApp } from "../../main/app.js";
import { translate } from "../../main/translate.js";

var blockLoadingEnd = false;
var FIRESTORE_DATA;
var FIRESTORE_NEW_DATA = {};

var CAN_EDIT = false;

var INPUT_DETECTED = false;

_startLoadingScreen();

document.addEventListener('DOMContentLoaded', async function () {
  try {
    initApp();

    DOCUMENT_ID = _getURLParam('l');
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
      _stopLoadingScreen();
    }
    $('body').css('overflow', 'auto');

  } catch (error) {
    _displayError(error);
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

  getID('destinos-search').addEventListener('input', () => _searchDestinosListenerAction());

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
  _startLoadingScreen();

  FIRESTORE_DATA = await getSingleData('listagens');
  const canEdit = await canUserEdit(FIRESTORE_DATA.compartilhamento.dono, FIRESTORE_DATA.compartilhamento.editores);

  if (canEdit) {
    await _loadListData(FIRESTORE_DATA);
    _stopLoadingScreen();
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
  for (const child of _getChildIDs('com-destinos')) {
    const i = parseInt(child.split("-")[2]);
    _setRequired(`select-destinos-${i}`)
  }
  await _setDocumento('listagens');
}

function _deleteListagem() {
  let listagem = getID('titulo').value;
  listagem = listagem ? ` "${listagem}"` : '';

  const propriedades = _cloneObject(MENSAGEM_PROPRIEDADES);
  propriedades.titulo = 'Apagar Listagem';
  propriedades.conteudo = `Tem certeza que deseja realizar a exclusão da listagem${listagem}? A ação não poderá ser desfeita.`;
  propriedades.botoes = [{
    tipo: 'cancelar',
  }, {
    tipo: 'confirmar',
    acao: '_deleteListagemAction()'
  }];

  _displayFullMessage(propriedades);
}

async function _deleteListagemAction() {
  if (DOCUMENT_ID) {
    await deleteUserObject(DOCUMENT_ID, "listagens");
    await deleteUserObjectStorage(FIRESTORE_DATA);
    window.location.href = '../index.html';
  }
}