// Destino Existente
function _loadDestinationsData() {
  try {
    _loadDadosBasicosDestinosData();
    _loadDestinoExistente('restaurantes');
    _loadDestinoExistente('lanches');
    _loadDestinoExistente('saidas');
    _loadDestinoExistente('turismo');
    _loadDestinoExistente('lojas');
    _loadMapaData();

  } catch (error) {
    _exibirErro(error);
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

function _loadDestinoExistente(tipo) {
  const habilitado = (FIRESTORE_DESTINOS_DATA.modulos[tipo] === true);
  getID(`habilitado-${tipo}`).checked = habilitado;
  getID(`habilitado-${tipo}-content`).style.display = habilitado ? 'block' : 'none';
  getID(`${tipo}-adicionar-box`).style.display = habilitado ? 'block' : 'none';

  const size = FIRESTORE_DESTINOS_DATA[tipo].length;
  if (size > 0) {
    for (let j = 1; j <= size; j++) {
      const i = j - 1;
      
      _addDestino(tipo);

      const id = FIRESTORE_DESTINOS_DATA[tipo][i].id;
      if (id) {
        getID(`${tipo}-id-${j}`).value = id;
      }

      const novo = FIRESTORE_DESTINOS_DATA[tipo][i].novo || false;
      getID(`${tipo}-novo-${j}`).checked = novo;
      getID(`${tipo}-title-icon-${j}`).style.display = novo ? 'block' : 'none';

      const nome = FIRESTORE_DESTINOS_DATA[tipo][i].nome || '';
      getID(`${tipo}-nome-${j}`).value = nome;
      getID(`${tipo}-title-text-${j}`).innerText = nome;

      const emoji = FIRESTORE_DESTINOS_DATA[tipo][i].emoji;
      getID(`${tipo}-emoji-${j}`).value = emoji;
      getID(`${tipo}-title-text-${j}`).innerText += ` ${emoji}`;

      getID(`${tipo}-descricao-${j}`).value = FIRESTORE_DESTINOS_DATA[tipo][i].descricao || '';
      getID(`${tipo}-website-${j}`).value = FIRESTORE_DESTINOS_DATA[tipo][i].website || '';
      getID(`${tipo}-mapa-${j}`).value = FIRESTORE_DESTINOS_DATA[tipo][i].mapa || '';
      getID(`${tipo}-instagram-${j}`).value = FIRESTORE_DESTINOS_DATA[tipo][i].instagram || '';
      getID(`${tipo}-regiao-${j}`).value = FIRESTORE_DESTINOS_DATA[tipo][i].regiao || '';
      _loadMoedaValorAndVisibility(FIRESTORE_DESTINOS_DATA[tipo][i].valor || '', tipo, j);
      getID(`${tipo}-midia-${j}`).value = FIRESTORE_DESTINOS_DATA[tipo][i].midia || '';
      getID(`${tipo}-nota-${j}`).value = FIRESTORE_DESTINOS_DATA[tipo][i].nota || '';
    }
    _regiaoSelectAction(tipo);
  }
}

function _addDestino(tipo) {
  switch (tipo) {
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