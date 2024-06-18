var USER_DATA = {};

var TENTATIVAS = {
  viagens: 0,
  destinos: 0,
  listagens: 0
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

  getID('myTrips').addEventListener('click', function () {
    _openIndexPage('viagens', 0, 1);
  });

  getID('myDestinations').addEventListener('click', function () {
    _openIndexPage('destinos', 0, 1);
  });

  getID('profile-icon').addEventListener('click', function () {
    back.classList.remove('bx-arrow-back');
    back.classList.add('bx-up-arrow-alt');
    _openIndexPage('settings', 0, 1);
  });

  getID('new-viagem').addEventListener('click', function () {
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
    const settings = select('#settings-box');
    if (settings.style.display !== 'none') {
      _openIndexPage('logged', 1, 0, false);
      setTimeout(() => {
        back.classList.remove('bx-up-arrow-alt');
        back.classList.add('bx-arrow-back');
      }, 300);
    } else {
      _openIndexPage('logged', 1, 0);
    }
  });

  getID('myDestinationsLists').addEventListener('click', function () {
    _openIndexPage('listagens', 0, 1);
  });

  getID('apagar').addEventListener('click', async function () {
    _startLoadingScreen(false);
    await _deleteAccount();
    _closeModal();
    _signOut();
    _stopLoadingScreen();
  });

  getID('trip-view-continue').addEventListener('click', async function () {
    getID('trip-view-invalid').style.display = 'none';
    getID('trip-view-private').style.display = 'none';
    getID('trip-view-reminder').style.display = 'none';
    getID('trip-view-error').style.display = 'none';

    let viagem = getID('trip-view-input').value;
    if (viagem) {
      const viagemValue = viagem.trim();
      const status = await _getStatus(`viagens/${viagemValue}`);

      switch (status) {
        case 'Found':
          window.location.href = `viagem.html?v=${viagemValue}`;
          break;
        case 'Forbidden':
          getID('trip-view-private').style.display = 'block';
          break;
        case 'Not Found':
          getID('trip-view-invalid').style.display = 'block';
          break;
        default:
          getID('trip-view-error').style.display = 'block';
          break;
      }
    } else {
      getID('trip-view-reminder').style.display = 'block';
    }
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

  const preloader = getID(`preloader-${tipo}`);
  const demoraCarregamento = getID(`demora-carregamento-${tipo}`);
  const semDados = getID(`sem-${tipo}`);

  function onResponseReceived(response) {
      preloader.style.display = 'none';
      demoraCarregamento.style.display = 'none';
      if (response.length === 0) {
          semDados.style.display = 'block';
      } else {
          semDados.style.display = 'none';
          USER_DATA[tipo] = response;
          _loadUserDataHTML(USER_DATA[tipo], tipo);
      }
  }

  function onTimeout() {
      preloader.style.display = 'none';
      demoraCarregamento.style.display = 'block';
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

function _loadUserDataHTML(data, type) {
  const div = getID(`dados-${type}`);
  let text = '';

  if (type === 'viagens') {
    data.sort((a, b) => {
      return _convertFromFirestoreDate(b.inicio) - _convertFromFirestoreDate(a.inicio);
    });
  } else if (data[0].ultimaAtualizacao) {
    data.sort((a, b) => {
      return new Date(b.ultimaAtualizacao).getTime() - new Date(a.ultimaAtualizacao).getTime();
    });
  }

  for (let i = 0; i < data.length; i++) {
    let secondaryDiv = '';
    let visualizarDiv = '';

    switch (type) {
      case 'viagens':
        const inicioDate = _convertFromFirestoreDate(data[i].inicio);
        const fimDate = _convertFromFirestoreDate(data[i].fim);
        const inicio = _jsDateToDate(inicioDate);
        const fim = _jsDateToDate(fimDate);
        secondaryDiv = `<div class="user-data-item-date">${inicio} - ${fim}</div>`;
        break;
      case 'destinos':
      case 'listagens':
        secondaryDiv = `<div class="user-data-item-date">${data[i].ultimaAtualizacaoText}</div>`;
        break;
      default:
        break;
    }

    if (typeof window[`_${type}Visualizar`] === 'function') {
      visualizarDiv = `<i class="iconify user-data-icon" onclick="_${type}Visualizar('${data[i].code}')" data-icon="fluent:eye-16-regular"></i>`
    }

    text += `
    <div class="user-data-item">
      <div class="user-data-item-text">
        <div class="user-data-item-title">${data[i].titulo}</div>
        ${secondaryDiv}
      </div>
      <div class="trip-data-icons">
        <i class="iconify user-data-icon" onclick="_${type}Editar('${data[i].code}')" data-icon="tabler:edit"></i>
        ${visualizarDiv}
      </div>
    </div>`
  }

  div.innerHTML = text;
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

function _listagensEditar(code) {
  window.location.href = `editar-listagem.html?l=${code}`;
}

function _listagensVisualizar(code) {
  window.location.href = `viagem.html?l=${code}`;
}

function _listagensNovo() {
  window.location.href = `editar-listagem.html`;
}