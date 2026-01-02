// Destino Existente
function _loadDestinationsData() {
  try {
    _loadDadosBasicosDestinosData();
    _loadDestinoExistente('restaurantes');
    _loadDestinoExistente('lanches');
    _loadDestinoExistente('saidas');
    _loadDestinoExistente('turismo');
    _loadDestinoExistente('lojas');
    _buildDS('regiao');

    _loadMapaData();
    document.title = `${translate('labels.edit')} ${FIRESTORE_DESTINOS_DATA.titulo}`;

  } catch (error) {
    _displayError(error);
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

  const destinosArr = Object
    .entries(FIRESTORE_DESTINOS_DATA[categoria])
    .map(([id, value]) => ({
      id,
      ...value
    }))
    .sort((a, b) => {
      if (!a.criadoEm && !b.criadoEm) return 0;
      if (!a.criadoEm) return 1;
      if (!b.criadoEm) return -1;
      return new Date(a.criadoEm) - new Date(b.criadoEm);
    });

  for (let j = 1; j <= destinosArr.length; j++) {
    const destino = destinosArr[j - 1];
    _addDestino(categoria);
    _addDestinoHTML(categoria, j, destino);
    _setDescription(categoria, j, destino.descricao);
    _updateDescriptionButtonLabel(categoria, j);
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

  const criadoEm = destino.criadoEm;
  if (criadoEm) {
    getID(`${categoria}-criadoEm-${j}`).value = criadoEm;
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

  _updateValueDS('regiao', destino.regiao, `${categoria}-regiao-select-${j}`);
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