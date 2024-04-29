// Destino Existente
function _loadDestinationsData(FIRESTORE_PLACES_DATA) {
  try {
    _loadDadosBasicosDestinosData(FIRESTORE_PLACES_DATA);
    _loadRestaurantesData(FIRESTORE_PLACES_DATA);
    _loadLanchesData(FIRESTORE_PLACES_DATA);
    _loadSaidasData(FIRESTORE_PLACES_DATA);
    _loadTurismoData(FIRESTORE_PLACES_DATA);
    _loadLojasData(FIRESTORE_PLACES_DATA);
    _loadMapaData(FIRESTORE_PLACES_DATA);

  } catch (e) {
    _displayErrorMessage(e);
    throw e;
  }
}

// Módulos: Passeio Existente
function _loadDadosBasicosDestinosData(FIRESTORE_PLACES_DATA) {
  getID('titulo').value = FIRESTORE_PLACES_DATA.titulo;

  const moedaValue = FIRESTORE_PLACES_DATA.moeda;
  const moedaDiv = getID('moeda');

  if (moedaDiv.querySelector(`option[value="${moedaValue}"]`)) {
    moedaDiv.value = moedaValue;
  } else {
    getID('outra-moeda').style.display = 'block';
    getID('outra-moeda').value = moedaValue;
    moedaDiv.value = 'outra';
  }
}

function _loadRestaurantesData(FIRESTORE_PLACES_DATA) {
  if (FIRESTORE_PLACES_DATA.modulos.restaurantes === true) {
    getID('habilitado-restaurantes').checked = true;
    getID('habilitado-restaurantes-content').style.display = 'block';
    getID('restaurantes-adicionar-box').style.display = 'block';

    const restaurantesSize = FIRESTORE_PLACES_DATA.restaurantes.nome.length;
    if (restaurantesSize > 0) {
      for (let i = 1; i <= restaurantesSize; i++) {
        const j = i - 1;
        _addRestaurantes();

        const novo = FIRESTORE_PLACES_DATA.restaurantes.novo;
        if (novo && novo[j] && novo[j] === '✔') {
          getID(`restaurantes-novo-${i}`).checked = true;
        }

        const nome = FIRESTORE_PLACES_DATA.restaurantes.nome;
        if (nome && nome[j]) {
          getID(`restaurantes-nome-${i}`).value = nome[j];
          getID(`restaurantes-title-${i}`).innerText = nome[j];
        }

        const emoji = FIRESTORE_PLACES_DATA.restaurantes.emoji;
        if (emoji && emoji[j]) {
          getID(`restaurantes-emoji-${i}`).value = emoji[j];
          getID(`restaurantes-title-${i}`).innerText += ` ${emoji[j]}`;
        }

        const descricao = FIRESTORE_PLACES_DATA.restaurantes.descricao;
        if (descricao && descricao[j]) {
          getID(`restaurantes-descricao-${i}`).value = descricao[j];
        }

        const link = FIRESTORE_PLACES_DATA.restaurantes.hyperlink.name;
        if (link && link[j]) {
          getID(`restaurantes-link-${i}`).value = link[j];
        }

        const regiao = FIRESTORE_PLACES_DATA.restaurantes.regiao;
        if (regiao && regiao[j]) {
          getID(`restaurantes-regiao-${i}`).value = regiao[j];
        }

        const valor = FIRESTORE_PLACES_DATA.restaurantes.valor;
        if (valor && valor[j]) {
          getID(`restaurantes-valor-${i}`).value = valor[j];
        }

        const midia = FIRESTORE_PLACES_DATA.restaurantes.hyperlink.video;
        if (midia && midia[j]) {
          getID(`restaurantes-midia-${i}`).value = midia[j];
        }

        const nota = FIRESTORE_PLACES_DATA.restaurantes.nota;
        if (nota && nota[j]) {
          getID(`restaurantes-nota-${i}`).value = nota[j];
        }
      }
    }
  }
}

function _loadLanchesData(FIRESTORE_PLACES_DATA) {
  if (FIRESTORE_PLACES_DATA.modulos.lanches === true) {
    getID('habilitado-lanches').checked = true;
    getID('habilitado-lanches-content').style.display = 'block';
    getID('lanches-adicionar-box').style.display = 'block';

    const lanchesSize = FIRESTORE_PLACES_DATA.lanches.nome.length;
    if (lanchesSize > 0) {
      for (let i = 1; i <= lanchesSize; i++) {
        const j = i - 1;
        _addLanches();

        const novo = FIRESTORE_PLACES_DATA.lanches.novo;
        if (novo && novo[j] && novo[j] === '✔') {
          getID(`lanches-novo-${i}`).checked = true;
        }

        const nome = FIRESTORE_PLACES_DATA.lanches.nome;
        if (nome && nome[j]) {
          getID(`lanches-nome-${i}`).value = nome[j];
          getID(`lanches-title-${i}`).innerText = nome[j];
        }

        const emoji = FIRESTORE_PLACES_DATA.lanches.emoji;
        if (emoji && emoji[j]) {
          getID(`lanches-emoji-${i}`).value = emoji[j];
          getID(`lanches-title-${i}`).innerText += ` ${emoji[j]}`;
        }

        const descricao = FIRESTORE_PLACES_DATA.lanches.descricao;
        if (descricao && descricao[j]) {
          getID(`lanches-descricao-${i}`).value = descricao[j];
        }

        const link = FIRESTORE_PLACES_DATA.lanches.hyperlink.name;
        if (link && link[j]) {
          getID(`lanches-link-${i}`).value = link[j];
        }

        const regiao = FIRESTORE_PLACES_DATA.lanches.regiao;
        if (regiao && regiao[j]) {
          getID(`lanches-regiao-${i}`).value = regiao[j];
        }

        const valor = FIRESTORE_PLACES_DATA.lanches.valor;
        if (valor && valor[j]) {
          getID(`lanches-valor-${i}`).value = valor[j];
        }

        const midia = FIRESTORE_PLACES_DATA.lanches.hyperlink.video;
        if (midia && midia[j]) {
          getID(`lanches-midia-${i}`).value = midia[j];
        }

        const nota = FIRESTORE_PLACES_DATA.lanches.nota;
        if (nota && nota[j]) {
          getID(`lanches-nota-${i}`).value = nota[j];
        }
      }
    }
  }
}

function _loadSaidasData(FIRESTORE_PLACES_DATA) {
  if (FIRESTORE_PLACES_DATA.modulos.saidas === true) {
    getID('habilitado-saidas').checked = true;
    getID('habilitado-saidas-content').style.display = 'block';
    getID('saidas-adicionar-box').style.display = 'block';

    const saidasSize = FIRESTORE_PLACES_DATA.saidas.nome.length;
    if (saidasSize > 0) {
      for (let i = 1; i <= saidasSize; i++) {
        const j = i - 1;
        _addSaidas();

        const novo = FIRESTORE_PLACES_DATA.saidas.novo;
        if (novo && novo[j] && novo[j] === '✔') {
          getID(`saidas-novo-${i}`).checked = true;
        }

        const nome = FIRESTORE_PLACES_DATA.saidas.nome;
        if (nome && nome[j]) {
          getID(`saidas-nome-${i}`).value = nome[j];
          getID(`saidas-title-${i}`).innerText = nome[j];
        }

        const emoji = FIRESTORE_PLACES_DATA.saidas.emoji;
        if (emoji && emoji[j]) {
          getID(`saidas-emoji-${i}`).value = emoji[j];
          getID(`saidas-title-${i}`).innerText += ` ${emoji[j]}`;
        }

        const descricao = FIRESTORE_PLACES_DATA.saidas.descricao;
        if (descricao && descricao[j]) {
          getID(`saidas-descricao-${i}`).value = descricao[j];
        }

        const link = FIRESTORE_PLACES_DATA.saidas.hyperlink.name;
        if (link && link[j]) {
          getID(`saidas-link-${i}`).value = link[j];
        }

        const regiao = FIRESTORE_PLACES_DATA.saidas.regiao;
        if (regiao && regiao[j]) {
          getID(`saidas-regiao-${i}`).value = regiao[j];
        }

        const valor = FIRESTORE_PLACES_DATA.saidas.valor;
        if (valor && valor[j]) {
          getID(`saidas-valor-${i}`).value = valor[j];
        }

        const midia = FIRESTORE_PLACES_DATA.saidas.hyperlink.video;
        if (midia && midia[j]) {
          getID(`saidas-midia-${i}`).value = midia[j];
        }

        const nota = FIRESTORE_PLACES_DATA.saidas.nota;
        if (nota && nota[j]) {
          getID(`saidas-nota-${i}`).value = nota[j];
        }
      }
    }
  }
}

function _loadTurismoData(FIRESTORE_PLACES_DATA) {
  if (FIRESTORE_PLACES_DATA.modulos.turismo === true) {
    getID('habilitado-turismo').checked = true;
    getID('habilitado-turismo-content').style.display = 'block';
    getID('turismo-adicionar-box').style.display = 'block';

    const turismoSize = FIRESTORE_PLACES_DATA.turismo.nome.length;
    if (turismoSize > 0) {
      for (let i = 1; i <= turismoSize; i++) {
        const j = i - 1;
        _addTurismo();

        const novo = FIRESTORE_PLACES_DATA.turismo.novo;
        if (novo && novo[j] && novo[j] === '✔') {
          getID(`turismo-novo-${i}`).checked = true;
        }

        const nome = FIRESTORE_PLACES_DATA.turismo.nome;
        if (nome && nome[j]) {
          getID(`turismo-nome-${i}`).value = nome[j];
          getID(`turismo-title-${i}`).innerText = nome[j];
        }

        const emoji = FIRESTORE_PLACES_DATA.turismo.emoji;
        if (emoji && emoji[j]) {
          getID(`turismo-emoji-${i}`).value = emoji[j];
          getID(`turismo-title-${i}`).innerText += ` ${emoji[j]}`;
        }

        const descricao = FIRESTORE_PLACES_DATA.turismo.descricao;
        if (descricao && descricao[j]) {
          getID(`turismo-descricao-${i}`).value = descricao[j];
        }

        const link = FIRESTORE_PLACES_DATA.turismo.hyperlink.name;
        if (link && link[j]) {
          getID(`turismo-link-${i}`).value = link[j];
        }

        const regiao = FIRESTORE_PLACES_DATA.turismo.regiao;
        if (regiao && regiao[j]) {
          getID(`turismo-regiao-${i}`).value = regiao[j];
        }

        const valor = FIRESTORE_PLACES_DATA.turismo.valor;
        if (valor && valor[j]) {
          getID(`turismo-valor-${i}`).value = valor[j];
        }

        const midia = FIRESTORE_PLACES_DATA.turismo.hyperlink.video;
        if (midia && midia[j]) {
          getID(`turismo-midia-${i}`).value = midia[j];
        }

        const nota = FIRESTORE_PLACES_DATA.turismo.nota;
        if (nota && nota[j]) {
          getID(`turismo-nota-${i}`).value = nota[j];
        }
      }
    }
  }
}

function _loadLojasData(FIRESTORE_PLACES_DATA) {
  if (FIRESTORE_PLACES_DATA.modulos.lojas === true) {
    getID('habilitado-lojas').checked = true;
    getID('habilitado-lojas-content').style.display = 'block';
    getID('lojas-adicionar-box').style.display = 'block';

    const lojasSize = FIRESTORE_PLACES_DATA.lojas.nome.length;
    if (lojasSize > 0) {
      for (let i = 1; i <= lojasSize; i++) {
        const j = i - 1;
        _addLojas();

        const novo = FIRESTORE_PLACES_DATA.lojas.novo;
        if (novo && novo[j] && novo[j] === '✔') {
          getID(`lojas-novo-${i}`).checked = true;
        }

        const nome = FIRESTORE_PLACES_DATA.lojas.nome;
        if (nome && nome[j]) {
          getID(`lojas-nome-${i}`).value = nome[j];
          getID(`lojas-title-${i}`).innerText = nome[j];
        }

        const emoji = FIRESTORE_PLACES_DATA.lojas.emoji;
        if (emoji && emoji[j]) {
          getID(`lojas-emoji-${i}`).value = emoji[j];
          getID(`lojas-title-${i}`).innerText += ` ${emoji[j]}`;
        }

        const descricao = FIRESTORE_PLACES_DATA.lojas.descricao;
        if (descricao && descricao[j]) {
          getID(`lojas-descricao-${i}`).value = descricao[j];
        }

        const link = FIRESTORE_PLACES_DATA.lojas.hyperlink.name;
        if (link && link[j]) {
          getID(`lojas-link-${i}`).value = link[j];
        }

        const regiao = FIRESTORE_PLACES_DATA.lojas.regiao;
        if (regiao && regiao[j]) {
          getID(`lojas-regiao-${i}`).value = regiao[j];
        }

        const valor = FIRESTORE_PLACES_DATA.lojas.valor;
        if (valor && valor[j]) {
          getID(`lojas-valor-${i}`).value = valor[j];
        }

        const midia = FIRESTORE_PLACES_DATA.lojas.hyperlink.video;
        if (midia && midia[j]) {
          getID(`lojas-midia-${i}`).value = midia[j];
        }

        const nota = FIRESTORE_PLACES_DATA.lojas.nota;
        if (nota && nota[j]) {
          getID(`lojas-nota-${i}`).value = nota[j];
        }
      }
    }
  }
}

function _loadMapaData(FIRESTORE_PLACES_DATA) {
  const mapaLink = getID('mapa-link');

  if (FIRESTORE_PLACES_DATA.modulos.mapa === true) {
    getID('habilitado-mapa').checked = true;
    getID('habilitado-mapa-content').style.display = 'block';
    mapaLink.setAttribute('required', "");

    const mapa = FIRESTORE_PLACES_DATA.myMaps;
    if (mapa) {
      mapaLink.value = mapa;
    }
  } else {
    mapaLink.removeAttribute('required');
  }
}