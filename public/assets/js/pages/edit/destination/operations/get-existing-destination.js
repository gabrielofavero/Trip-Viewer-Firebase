import { updateValueDS, buildDS } from "../../../support/components/dynamic-select.js";
import { getID } from "../../../support/pages/selectors.js";
import { translate } from "../../../main/translate.js";
import { displayError } from "../../../support/pages/messages.js";

// Destino Existente
function _loadDestinationsData() {
  try {
    _loadDadosBasicosDestinosData();
    _loadDestinoExistente('restaurantes');
    _loadDestinoExistente('lanches');
    _loadDestinoExistente('saidas');
    _loadDestinoExistente('turismo');
    _loadDestinoExistente('lojas');
    buildDS('regiao');
    
    _loadMapaData();
    document.title = `${translate('labels.edit')} ${FIRESTORE_DESTINOS_DATA.titulo}`;

  } catch (error) {
    displayError(error);
    throw error;
  }
}

// Módulos: Passeio Existente
function _loadDadosBasicosDestinosData() {
  getID('titulo').value = FIRESTORE_DESTINOS_DATA.titulo;

  const moedaValue = FIRESTORE_DESTINOS_DATA.moeda;
  const moedaDiv = getID('moeda');

  if (moedaDiv.querySelector(`option[value="${moedaValue}"]`)) {
    moedaDiv.value = moedaValue;
  } else {
    getID('outra-moeda').style.display = 'block';
    getID('outra-moeda').value = moedaValue;
    moedaDiv.value = 'outra';
  }

  _loadMoedaOptions();
}

function _loadDestinoExistente(categoria) {
  const habilitado = (FIRESTORE_DESTINOS_DATA.modulos[categoria] === true);
  getID(`habilitado-${categoria}`).checked = habilitado;
  getID(`habilitado-${categoria}-content`).style.display = habilitado ? 'block' : 'none';
  getID(`${categoria}-adicionar-box`).style.display = habilitado ? 'block' : 'none';

  const size = FIRESTORE_DESTINOS_DATA[categoria].length;
  if (size > 0) {
    for (let j = 1; j <= size; j++) {
      const i = j - 1;
      const destino = FIRESTORE_DESTINOS_DATA[categoria][i];
      _addDescricao(categoria, i, destino.descricao);
      _addDestino(categoria);
      _addDestinoHTML(categoria, j, destino);
    }
  }
}

function _addDestino(categoria) {
  switch (categoria) {
    case 'restaurantes':
      _addRestaurantes();
      break;
    case 'lanches':
      _addLanches();
      break;
    case 'saidas':
      _addSaidas();
      break;
    case 'turismo':
      _addTurismo();
      break;
    case 'lojas':
      _addLojas();
  }
}

function _addDestinoHTML(categoria, j, destino) {
  const id = destino.id;
  if (id) {
    getID(`${categoria}-id-${j}`).value = id;
  }

  const novo = destino.novo || false;
  getID(`${categoria}-novo-${j}`).checked = novo;
  getID(`${categoria}-title-icon-${j}`).style.display = novo ? 'block' : 'none';

  const nome = destino.nome || '';
  getID(`${categoria}-nome-${j}`).value = nome;
  getID(`${categoria}-title-text-${j}`).innerText = nome;

  const emoji = destino.emoji;
  getID(`${categoria}-emoji-${j}`).value = emoji;
  getID(`${categoria}-title-text-${j}`).innerText += ` ${emoji}`;

  _updateDescriptionButtonLabel(categoria, j);
  getID(`${categoria}-website-${j}`).value = destino.website || '';
  getID(`${categoria}-mapa-${j}`).value = destino.mapa || '';
  getID(`${categoria}-instagram-${j}`).value = destino.instagram || '';
  getID(`${categoria}-regiao-${j}`).value = destino.regiao || '';

  updateValueDS('regiao', destino.regiao, `${categoria}-regiao-select-${j}`);
  _loadMoedaValorAndVisibility(destino.valor || '', categoria, j);

  getID(`${categoria}-midia-${j}`).value = destino.midia || '';
  getID(`${categoria}-nota-${j}`).value = destino.nota || '';
}

function _loadMapaData() {
  const mapaLink = getID('mapa-link');

  if (FIRESTORE_DESTINOS_DATA.modulos.mapa === true) {
    getID('habilitado-mapa').checked = true;
    getID('habilitado-mapa-content').style.display = 'block';
    mapaLink.setAttribute('required', "");

    const mapa = FIRESTORE_DESTINOS_DATA.myMaps;
    if (mapa) {
      mapaLink.value = mapa;
    }
  } else {
    mapaLink.removeAttribute('required');
  }
}