// Destino Existente
function _loadDestinationsData(FIRESTORE_DESTINOS_DATA) {
  try {
    _loadDadosBasicosDestinosData(FIRESTORE_DESTINOS_DATA);
    _loadRestaurantesData(FIRESTORE_DESTINOS_DATA);
    _loadLanchesData(FIRESTORE_DESTINOS_DATA);
    _loadSaidasData(FIRESTORE_DESTINOS_DATA);
    _loadTurismoData(FIRESTORE_DESTINOS_DATA);
    _loadLojasData(FIRESTORE_DESTINOS_DATA);
    _loadMapaData(FIRESTORE_DESTINOS_DATA);

  } catch (error) {
    _displayErrorMessage(error);
    throw error;
  }
}

// Módulos: Passeio Existente
function _loadDadosBasicosDestinosData(FIRESTORE_DESTINOS_DATA) {
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

function _loadRestaurantesData(FIRESTORE_DESTINOS_DATA) {
  if (FIRESTORE_DESTINOS_DATA.modulos.restaurantes === true) {
    getID('habilitado-restaurantes').checked = true;
    getID('habilitado-restaurantes-content').style.display = 'block';
    getID('restaurantes-adicionar-box').style.display = 'block';

    const restaurantesSize = FIRESTORE_DESTINOS_DATA.restaurantes.nome.length;
    if (restaurantesSize > 0) {
      for (let i = 1; i <= restaurantesSize; i++) {
        const j = i - 1;
        _addRestaurantes();

        const novo = FIRESTORE_DESTINOS_DATA.restaurantes.novo;
        if (novo && novo[j] && (novo[j] === '✔' || novo[j] === true)) {
          getID(`restaurantes-novo-${i}`).checked = true;
          getID(`restaurantes-title-icon-${i}`).style.display = 'block';
        }

        const nome = FIRESTORE_DESTINOS_DATA.restaurantes.nome;
        if (nome && nome[j]) {
          getID(`restaurantes-nome-${i}`).value = nome[j];
          getID(`restaurantes-title-text-${i}`).innerText = nome[j];
        }

        const emoji = FIRESTORE_DESTINOS_DATA.restaurantes.emoji;
        if (emoji && emoji[j]) {
          getID(`restaurantes-emoji-${i}`).value = emoji[j];
          getID(`restaurantes-title-text-${i}`).innerText += ` ${emoji[j]}`;
        }

        const descricao = FIRESTORE_DESTINOS_DATA.restaurantes.descricao;
        if (descricao && descricao[j]) {
          getID(`restaurantes-descricao-${i}`).value = descricao[j];
        }

        const website = FIRESTORE_DESTINOS_DATA.restaurantes.website;
        if (website && website[j]) {
          getID(`restaurantes-website-${i}`).value = website[j];
        }

        const mapa = FIRESTORE_DESTINOS_DATA.restaurantes.mapa;
        if (mapa && mapa[j]) {
          getID(`restaurantes-mapa-${i}`).value = mapa[j];
        }

        const instagram = FIRESTORE_DESTINOS_DATA.restaurantes.instagram;
        if (instagram && instagram[j]) {
          getID(`restaurantes-instagram-${i}`).value = instagram[j];
        }

        const regiao = FIRESTORE_DESTINOS_DATA.restaurantes.regiao;
        if (regiao && regiao[j]) {
          getID(`restaurantes-regiao-${i}`).value = regiao[j];
        }

        const valor = FIRESTORE_DESTINOS_DATA.restaurantes.valor;
        if (valor && valor[j]) {
          _loadMoedaValorAndVisibility(valor[j], 'restaurantes', i);
        }

        const midia = FIRESTORE_DESTINOS_DATA.restaurantes.midia;
        if (midia && midia[j]) {
          getID(`restaurantes-midia-${i}`).value = midia[j];
        }

        const nota = FIRESTORE_DESTINOS_DATA.restaurantes.nota;
        if (nota && nota[j]) {
          getID(`restaurantes-nota-${i}`).value = nota[j];
        }
      }
      _regiaoSelectAction('restaurantes');
    }
  }
}

function _loadLanchesData(FIRESTORE_DESTINOS_DATA) {
  if (FIRESTORE_DESTINOS_DATA.modulos.lanches === true) {
    getID('habilitado-lanches').checked = true;
    getID('habilitado-lanches-content').style.display = 'block';
    getID('lanches-adicionar-box').style.display = 'block';

    const lanchesSize = FIRESTORE_DESTINOS_DATA.lanches.nome.length;
    if (lanchesSize > 0) {
      for (let i = 1; i <= lanchesSize; i++) {
        const j = i - 1;
        _addLanches();

        const novo = FIRESTORE_DESTINOS_DATA.lanches.novo;
        if (novo && novo[j] && (novo[j] === '✔' || novo[j] === true)) {
          getID(`lanches-novo-${i}`).checked = true;
          getID(`lanches-title-icon-${i}`).style.display = 'block';
        }

        const nome = FIRESTORE_DESTINOS_DATA.lanches.nome;
        if (nome && nome[j]) {
          getID(`lanches-nome-${i}`).value = nome[j];
          getID(`lanches-title-text-${i}`).innerText = nome[j];
        }

        const emoji = FIRESTORE_DESTINOS_DATA.lanches.emoji;
        if (emoji && emoji[j]) {
          getID(`lanches-emoji-${i}`).value = emoji[j];
          getID(`lanches-title-text-${i}`).innerText += ` ${emoji[j]}`;
        }

        const descricao = FIRESTORE_DESTINOS_DATA.lanches.descricao;
        if (descricao && descricao[j]) {
          getID(`lanches-descricao-${i}`).value = descricao[j];
        }

        const website = FIRESTORE_DESTINOS_DATA.lanches.website;
        if (website && website[j]) {
          getID(`lanches-website-${i}`).value = website[j];
        }

        const mapa = FIRESTORE_DESTINOS_DATA.lanches.mapa;
        if (mapa && mapa[j]) {
          getID(`lanches-mapa-${i}`).value = mapa[j];
        }

        const instagram = FIRESTORE_DESTINOS_DATA.lanches.instagram;
        if (instagram && instagram[j]) {
          getID(`lanches-instagram-${i}`).value = instagram[j];
        }

        const regiao = FIRESTORE_DESTINOS_DATA.lanches.regiao;
        if (regiao && regiao[j]) {
          getID(`lanches-regiao-${i}`).value = regiao[j];
        }

        const valor = FIRESTORE_DESTINOS_DATA.lanches.valor;
        if (valor && valor[j]) {
          _loadMoedaValorAndVisibility(valor[j], 'lanches', i);
        }

        const midia = FIRESTORE_DESTINOS_DATA.lanches.midia;
        if (midia && midia[j]) {
          getID(`lanches-midia-${i}`).value = midia[j];
        }

        const nota = FIRESTORE_DESTINOS_DATA.lanches.nota;
        if (nota && nota[j]) {
          getID(`lanches-nota-${i}`).value = nota[j];
        }
      }
      _regiaoSelectAction('lanches');
    }
  }
}

function _loadSaidasData(FIRESTORE_DESTINOS_DATA) {
  if (FIRESTORE_DESTINOS_DATA.modulos.saidas === true) {
    getID('habilitado-saidas').checked = true;
    getID('habilitado-saidas-content').style.display = 'block';
    getID('saidas-adicionar-box').style.display = 'block';

    const saidasSize = FIRESTORE_DESTINOS_DATA.saidas.nome.length;
    if (saidasSize > 0) {
      for (let i = 1; i <= saidasSize; i++) {
        const j = i - 1;
        _addSaidas();

        const novo = FIRESTORE_DESTINOS_DATA.saidas.novo;
        if (novo && novo[j] && (novo[j] === '✔' || novo[j] === true)) {
          getID(`saidas-novo-${i}`).checked = true;
          getID(`saidas-title-icon-${i}`).style.display = 'block';
        }

        const nome = FIRESTORE_DESTINOS_DATA.saidas.nome;
        if (nome && nome[j]) {
          getID(`saidas-nome-${i}`).value = nome[j];
          getID(`saidas-title-text-${i}`).innerText = nome[j];
        }

        const emoji = FIRESTORE_DESTINOS_DATA.saidas.emoji;
        if (emoji && emoji[j]) {
          getID(`saidas-emoji-${i}`).value = emoji[j];
          getID(`saidas-title-text-${i}`).innerText += ` ${emoji[j]}`;
        }

        const descricao = FIRESTORE_DESTINOS_DATA.saidas.descricao;
        if (descricao && descricao[j]) {
          getID(`saidas-descricao-${i}`).value = descricao[j];
        }

        const website = FIRESTORE_DESTINOS_DATA.saidas.website;
        if (website && website[j]) {
          getID(`saidas-website-${i}`).value = website[j];
        }

        const mapa = FIRESTORE_DESTINOS_DATA.saidas.mapa;
        if (mapa && mapa[j]) {
          getID(`saidas-mapa-${i}`).value = mapa[j];
        }

        const instagram = FIRESTORE_DESTINOS_DATA.saidas.instagram;
        if (instagram && instagram[j]) {
          getID(`saidas-instagram-${i}`).value = instagram[j];
        }

        const regiao = FIRESTORE_DESTINOS_DATA.saidas.regiao;
        if (regiao && regiao[j]) {
          getID(`saidas-regiao-${i}`).value = regiao[j];
        }

        const valor = FIRESTORE_DESTINOS_DATA.saidas.valor;
        if (valor && valor[j]) {
          _loadMoedaValorAndVisibility(valor[j], 'saidas', i);
        }

        const midia = FIRESTORE_DESTINOS_DATA.saidas.midia;
        if (midia && midia[j]) {
          getID(`saidas-midia-${i}`).value = midia[j];
        }

        const nota = FIRESTORE_DESTINOS_DATA.saidas.nota;
        if (nota && nota[j]) {
          getID(`saidas-nota-${i}`).value = nota[j];
        }
      }
      _regiaoSelectAction('saidas');
    }
  }
}

function _loadTurismoData(FIRESTORE_DESTINOS_DATA) {
  if (FIRESTORE_DESTINOS_DATA.modulos.turismo === true) {
    getID('habilitado-turismo').checked = true;
    getID('habilitado-turismo-content').style.display = 'block';
    getID('turismo-adicionar-box').style.display = 'block';

    const turismoSize = FIRESTORE_DESTINOS_DATA.turismo.nome.length;
    if (turismoSize > 0) {
      for (let i = 1; i <= turismoSize; i++) {
        const j = i - 1;
        _addTurismo();

        const novo = FIRESTORE_DESTINOS_DATA.turismo.novo;
        if (novo && novo[j] && (novo[j] === '✔' || novo[j] === true)) {
          getID(`turismo-novo-${i}`).checked = true;
          getID(`turismo-title-icon-${i}`).style.display = 'block';
        }

        const nome = FIRESTORE_DESTINOS_DATA.turismo.nome;
        if (nome && nome[j]) {
          getID(`turismo-nome-${i}`).value = nome[j];
          getID(`turismo-title-text-${i}`).innerText = nome[j];
        }

        const emoji = FIRESTORE_DESTINOS_DATA.turismo.emoji;
        if (emoji && emoji[j]) {
          getID(`turismo-emoji-${i}`).value = emoji[j];
          getID(`turismo-title-text-${i}`).innerText += ` ${emoji[j]}`;
        }

        const descricao = FIRESTORE_DESTINOS_DATA.turismo.descricao;
        if (descricao && descricao[j]) {
          getID(`turismo-descricao-${i}`).value = descricao[j];
        }

        const website = FIRESTORE_DESTINOS_DATA.turismo.website;
        if (website && website[j]) {
          getID(`turismo-website-${i}`).value = website[j];
        }

        const mapa = FIRESTORE_DESTINOS_DATA.turismo.mapa;
        if (mapa && mapa[j]) {
          getID(`turismo-mapa-${i}`).value = mapa[j];
        }

        const instagram = FIRESTORE_DESTINOS_DATA.turismo.instagram;
        if (instagram && instagram[j]) {
          getID(`turismo-instagram-${i}`).value = instagram[j];
        }

        const regiao = FIRESTORE_DESTINOS_DATA.turismo.regiao;
        if (regiao && regiao[j]) {
          getID(`turismo-regiao-${i}`).value = regiao[j];
        }

        const valor = FIRESTORE_DESTINOS_DATA.turismo.valor;
        if (valor && valor[j]) {
          _loadMoedaValorAndVisibility(valor[j], 'turismo', i);
        }

        const midia = FIRESTORE_DESTINOS_DATA.turismo.midia;
        if (midia && midia[j]) {
          getID(`turismo-midia-${i}`).value = midia[j];
        }

        const nota = FIRESTORE_DESTINOS_DATA.turismo.nota;
        if (nota && nota[j]) {
          getID(`turismo-nota-${i}`).value = nota[j];
        }
      }
    }
    _regiaoSelectAction('turismo');
  }
}

function _loadLojasData(FIRESTORE_DESTINOS_DATA) {
  if (FIRESTORE_DESTINOS_DATA.modulos.lojas === true) {
    getID('habilitado-lojas').checked = true;
    getID('habilitado-lojas-content').style.display = 'block';
    getID('lojas-adicionar-box').style.display = 'block';

    const lojasSize = FIRESTORE_DESTINOS_DATA.lojas.nome.length;
    if (lojasSize > 0) {
      for (let i = 1; i <= lojasSize; i++) {
        const j = i - 1;
        _addLojas();

        const novo = FIRESTORE_DESTINOS_DATA.lojas.novo;
        if (novo && novo[j] && (novo[j] === '✔' || novo[j] === true)) {
          getID(`lojas-novo-${i}`).checked = true;
          getID(`lojas-title-icon-${i}`).style.display = 'block';
        }

        const nome = FIRESTORE_DESTINOS_DATA.lojas.nome;
        if (nome && nome[j]) {
          getID(`lojas-nome-${i}`).value = nome[j];
          getID(`lojas-title-text-${i}`).innerText = nome[j];
        }

        const emoji = FIRESTORE_DESTINOS_DATA.lojas.emoji;
        if (emoji && emoji[j]) {
          getID(`lojas-emoji-${i}`).value = emoji[j];
          getID(`lojas-title-text-${i}`).innerText += ` ${emoji[j]}`;
        }

        const descricao = FIRESTORE_DESTINOS_DATA.lojas.descricao;
        if (descricao && descricao[j]) {
          getID(`lojas-descricao-${i}`).value = descricao[j];
        }

        const website = FIRESTORE_DESTINOS_DATA.lojas.website;
        if (website && website[j]) {
          getID(`lojas-website-${i}`).value = website[j];
        }

        const mapa = FIRESTORE_DESTINOS_DATA.lojas.mapa;
        if (mapa && mapa[j]) {
          getID(`lojas-mapa-${i}`).value = mapa[j];
        }

        const instagram = FIRESTORE_DESTINOS_DATA.lojas.instagram;
        if (instagram && instagram[j]) {
          getID(`lojas-instagram-${i}`).value = instagram[j];
        }

        const regiao = FIRESTORE_DESTINOS_DATA.lojas.regiao;
        if (regiao && regiao[j]) {
          getID(`lojas-regiao-${i}`).value = regiao[j];
        }

        const valor = FIRESTORE_DESTINOS_DATA.lojas.valor;
        if (valor && valor[j]) {
          _loadMoedaValorAndVisibility(valor[j], 'lojas', i);
        }

        const midia = FIRESTORE_DESTINOS_DATA.lojas.midia;
        if (midia && midia[j]) {
          getID(`lojas-midia-${i}`).value = midia[j];
        }

        const nota = FIRESTORE_DESTINOS_DATA.lojas.nota;
        if (nota && nota[j]) {
          getID(`lojas-nota-${i}`).value = nota[j];
        }
      }
      _regiaoSelectAction('lojas');
    }
  }
}

function _loadMapaData(FIRESTORE_DESTINOS_DATA) {
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