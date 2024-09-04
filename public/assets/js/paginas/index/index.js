var USER_DATA = {};

var TENTATIVAS = {
  viagens: 0,
  destinos: 0,
  listagens: 0
}

var VIAGENS = {
  coletado: false,
  proximasViagens: [],
  viagensAnteriores: []
}

_startLoadingScreen();

document.addEventListener('DOMContentLoaded', async function () {
  try {
    await _main();

    _loadVisibilityIndex();
    _loadListenersIndex();
    _loadUserIndex();

    $('body').css('overflow', 'auto');

  } catch (error) {
    _displayError(error);
    throw error;
  }
});

function _loadListenersIndex() {
  getID('google-login-button').addEventListener('click', function () {
    _signInGoogle();
  });

  getID('proximasViagens').addEventListener('click', function () {
    _openIndexPage('proximasViagens', 0, 1);
  });

  getID('viagensAnteriores').addEventListener('click', function () {
    _openIndexPage('viagensAnteriores', 0, 1);
  });

  getID('destinosCadastrados').addEventListener('click', function () {
    _openIndexPage('destinos', 0, 1);
  });

  getID('profile-icon').addEventListener('click', function () {
    if (getID('settings-box').style.display === 'none') {
      back.classList.remove('bx-arrow-back');
      back.classList.add('bx-up-arrow-alt');
      _openIndexPage('settings', 0, 1, false);
    }
  });

  getID('ajustesDaConta').addEventListener('click', function () {
    _openIndexPage('settings', 0, 1);
  });

  getID('nova-viagem-1').addEventListener('click', function () {
    _viagensNovo();
  });

  getID('nova-viagem-2').addEventListener('click', function () {
    _viagensNovo();
  });

  getID('new-destino').addEventListener('click', function () {
    _destinosNovo();
  });

  getID('new-listagem').addEventListener('click', function () {
    _listagensNovo();
  });

  getID('back').addEventListener('click', function () {
    const back = select('#back');
    if (back.classList.contains('bx-up-arrow-alt')) {
      _openIndexPage('logged', 1, 0, false);
      setTimeout(() => {
        back.classList.remove('bx-up-arrow-alt');
        back.classList.add('bx-arrow-back');
      }, 300);
    } else {
      _openIndexPage('logged', 1, 0);
    }
  });

  getID('listasDeDestinos').addEventListener('click', function () {
    _openIndexPage('listagens', 0, 1);
  });

  getID('apagar').addEventListener('click', async function () {
    _startLoadingScreen(false);
    await _deleteAccount();
    _closeModal();
    _signOut();
    _stopLoadingScreen();
  });
}

async function _loadUserIndex() {
  try {
    firebase.auth().onAuthStateChanged(async (user) => {
      if (user) {
        _registerIfUserNotPresent();
        _openIndexPage('logged');

        const displayName = user.displayName;
        const photoURL = 'url(' + user.photoURL + ')';

        getID('title-name').innerHTML = displayName.split(' ')[0];

        getID('settings-account-name').innerHTML = displayName;
        getID('settings-account-picture').style.backgroundImage = photoURL;
        getID('settings-account-picture').style.backgroundSize = 'cover';
        getID('profile-icon').style.backgroundImage = photoURL;
        getID('profile-icon').style.backgroundSize = 'cover';

        _loadUserDataList('viagens');
        _loadUserDataList('listagens');
        _loadUserDataList('destinos');

      } else {
        _openIndexPage('unlogged');
      }
    });
  } catch (error) {
    _stopLoadingScreen();
    _displayError(error);
    throw error;
  }
  _stopLoadingScreen();
}

async function _loadUserDataList(tipo) {
  const promise = _getUserList(tipo);
  let responseReceived = false;

  function onResponseReceived(response) {
    const tipos = _getTipos(tipo);
    for (const innerTipo of tipos) {
      innerTipo.preloader.style.display = 'none';
      if (response.length === 0) {
        innerTipo.semDados.style.display = 'block';
      } else {
        innerTipo.semDados.style.display = 'none';
        USER_DATA[tipo] = response;
        _loadUserDataHTML(USER_DATA[tipo], innerTipo.titulo);
      }
    }
  }

  function _getTipos(tipo) {
    const result = [];
    const tipos = tipo == 'viagens' ? ['proximasViagens', 'viagensAnteriores'] : [tipo];
    for (const innerTipo of tipos) {
      result.push({
        titulo: innerTipo,
        preloader: getID(`preloader-${innerTipo}`),
        demoraCarregamento: getID(`demora-carregamento-${innerTipo}`),
        semDados: getID(`sem-${innerTipo}`)
      });
    }
    return result;
  }

  function onTimeout() {
    for (const innerTipo of _getTipos(tipo)) {
      innerTipo.preloader.style.display = 'none';
      innerTipo.demoraCarregamento.style.display = 'block';
    }
  }

  async function checkResponse() {
    try {
      const response = await Promise.race([promise, new Promise((_, reject) => setTimeout(reject, 0))]);
      if (response !== undefined) {
        responseReceived = true;
        clearInterval(intervalId);
        onResponseReceived(response);
      }
    } catch (e) { }
  }

  const intervalId = setInterval(checkResponse, 1000);

  setTimeout(() => {
    if (!responseReceived) {
      onTimeout();
    }
  }, 8000); // 8 segundos

  while (!responseReceived) {
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  while (true) {
    try {
      const response = await promise;
      if (response !== undefined) {
        onResponseReceived(response);
        break;
      }
    } catch (e) { }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

function _manualListLoad(type) {
  TENTATIVAS[type]++;

  getID(`preloader-${type}`).style.display = 'block';
  getID(`demora-carregamento-${type}`).style.display = 'none';

  if (TENTATIVAS[type] < 2) {
    _loadUserDataList(type);
  } else {
    window.location.reload(true);
  }
}

function _loadUserDataHTML(dados, tipo) {
  const div = getID(`dados-${tipo}`);
  let conteudo = '';

  if ((tipo == 'proximasViagens' || tipo == 'viagensAnteriores')) {
    if (!VIAGENS.coletado) {
      _coletarViagens(dados);
    }
    dados = VIAGENS[tipo];
  } else if (dados[0].ultimaAtualizacao) {
    dados.sort((a, b) => {
      return new Date(b.ultimaAtualizacao).getTime() - new Date(a.ultimaAtualizacao).getTime();
    });
  }

  for (let i = 0; i < dados.length; i++) {
    let secondaryDiv = '';
    let visualizarDiv = '';
    let innertipo = tipo;

    switch (tipo) {
      case 'proximasViagens':
      case 'viagensAnteriores':
        innertipo = 'viagens';
        const inicioDate = _convertFromFirestoreDate(dados[i].inicio);
        const fimDate = _convertFromFirestoreDate(dados[i].fim);
        const inicio = _jsDateToDate(inicioDate);
        const fim = _jsDateToDate(fimDate);
        secondaryDiv = `<div class="user-data-item-date">${inicio} - ${fim}</div>`;
        break;
      case 'destinos':
      case 'listagens':
        secondaryDiv = `<div class="user-data-item-date">${dados[i].ultimaAtualizacaoText}</div>`;
        break;
      default:
        break;
    }

    if (typeof window[`_${innertipo}Visualizar`] === 'function') {
      visualizarDiv = `<i class="iconify user-data-icon" onclick="_${innertipo}Visualizar('${dados[i].code}')" data-icon="fluent:eye-16-regular"></i>`
    }

    conteudo += `
    <div class="user-data-item">
      <div class="user-data-item-text">
        <div class="user-data-item-title">${dados[i].titulo}</div>
        ${secondaryDiv}
      </div>
      <div class="trip-data-icons">
        <i class="iconify user-data-icon" onclick="_${innertipo}Editar('${dados[i].code}')" data-icon="tabler:edit"></i>
        ${visualizarDiv}
      </div>
    </div>`
  }

  div.innerHTML = conteudo;

  function _coletarViagens(dados) {
    const proximasViagens = [];
    const viagensAnteriores = [];
    const hoje = new Date();

    for (let i = 0; i < dados.length; i++) {
      const viagem = dados[i];
      const fim = _convertFromFirestoreDate(viagem.fim);

      if (hoje > fim) {
        viagensAnteriores.push(viagem);
      } else {
        proximasViagens.push(viagem);
      }
    }
    proximasViagens.sort((a, b) => _sortByToday(a, b));
    viagensAnteriores.sort((a, b) => _sortByToday(a, b));

    VIAGENS.coletado = true;
    VIAGENS.proximasViagens = proximasViagens;
    VIAGENS.viagensAnteriores = viagensAnteriores;

    function _sortByToday(a, b) {
      const fimA = _convertFromFirestoreDate(a.fim);
      const fimB = _convertFromFirestoreDate(b.fim);
      const diferencaA = Math.abs(hoje - fimA);
      const diferencaB = Math.abs(hoje - fimB);
      return diferencaA - diferencaB;
    }
  }
}

function _viagensEditar(code) {
  window.location.href = `editar-viagem.html?v=${code}`;
}

function _viagensVisualizar(code) {
  window.location.href = `viagem.html?v=${code}`;
}

function _viagensNovo() {
  window.location.href = `editar-viagem.html`;
}

function _destinosNovo() {
  window.location.href = `editar-destino.html`;
}

function _destinosEditar(code) {
  window.location.href = `editar-destino.html?d=${code}`;
}

function _destinosVisualizar(code) {
  window.location.href = `viagem.html?d=${code}`;
}

function _listagensEditar(code) {
  window.location.href = `editar-listagem.html?l=${code}`;
}

function _listagensVisualizar(code) {
  window.location.href = `viagem.html?l=${code}`;
}

function _listagensNovo() {
  window.location.href = `editar-listagem.html`;
}