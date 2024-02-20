var userData = {};

_startLoadingScreen();

document.addEventListener('DOMContentLoaded', function () {
  try {
    _main();

    _loadVisibilityIndex();
    _loadListenersIndex();
    _loadUserIndex();

    $('body').css('overflow', 'auto');

  } catch (error) {
    _displayErrorMessage(error);
    throw error;
  }
});

function _loadListenersIndex() {
  document.getElementById('google-login-button').addEventListener('click', function () {
    _signInGoogle();
  });

  document.getElementById('myTrips').addEventListener('click', function () {
    _openIndexPage('viagens', 0, 1);
  });

  document.getElementById('myDestinations').addEventListener('click', function () {
    _openIndexPage('destinos', 0, 1);
  });

  document.getElementById('profile-icon').addEventListener('click', function () {
    back.classList.remove('bx-arrow-back');
    back.classList.add('bx-up-arrow-alt');
    _openIndexPage('settings', 0, 1);
  });

  document.getElementById('new-viagem').addEventListener('click', function () {
    _viagensNovo();
  });

  document.getElementById('new-destino').addEventListener('click', function () {
    _destinosNovo();
  });

  document.getElementById('new-listagem').addEventListener('click', function () {
    _listagensNovo();
  });

  document.getElementById('back').addEventListener('click', function () {
    const back = select('#back');
    if (back.style.display !== 'none') {
      _openIndexPage('logged', 1, 0, false);
      setTimeout(() => {
        back.classList.remove('bx-up-arrow-alt');
        back.classList.add('bx-arrow-back');
      }, 300);
    } else {
      _openIndexPage('logged', 1, 0);
    }
  });

  document.getElementById('myDestinationsLists').addEventListener('click', function () {
    _openIndexPage('listagens', 0, 1);
  });

  document.getElementById('apagar').addEventListener('click', async function () {
    _startLoadingScreen();
    await _deleteAccount();
    _closeModal();
    _signOut();
    _stopLoadingScreen();
  });

  document.getElementById('trip-view-continue').addEventListener('click', async function () {
    document.getElementById('trip-view-invalid').style.display = 'none';
    document.getElementById('trip-view-private').style.display = 'none';
    document.getElementById('trip-view-reminder').style.display = 'none';
    document.getElementById('trip-view-error').style.display = 'none';

    let viagem = document.getElementById('trip-view-input').value;
    if (viagem) {
      const viagemValue = viagem.trim();
      const status = await _getStatus(`viagens/${viagemValue}`);

      switch (status) {
        case 'Found':
          window.location.href = `viagem.html?v=${viagemValue}`;
          break;
        case 'Forbidden':
          document.getElementById('trip-view-private').style.display = 'block';
          break;
        case 'Not Found':
          document.getElementById('trip-view-invalid').style.display = 'block';
          break;
        default:
          document.getElementById('trip-view-error').style.display = 'block';
          break;
      }
    } else {
      document.getElementById('trip-view-reminder').style.display = 'block';
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

        document.getElementById('title-name').innerHTML = displayName.split(' ')[0];

        document.getElementById('settings-account-name').innerHTML = displayName;
        document.getElementById('settings-account-picture').style.backgroundImage = photoURL;
        document.getElementById('settings-account-picture').style.backgroundSize = 'cover';
        document.getElementById('profile-icon').style.backgroundImage = photoURL;
        document.getElementById('profile-icon').style.backgroundSize = 'cover';

        _loadUserDataList('viagens');
        _loadUserDataList('destinos');
        _loadUserDataList('listagens');

      } else {
        _openIndexPage('unlogged');
      }
    });
  } catch (error) {
    _stopLoadingScreen();
    _displayErrorMessage(error);
    throw error;
  }
  _stopLoadingScreen();
}

async function _loadUserDataList(type) {
  userData[type] = await _getUserList(type);
  localStorage.setItem(`${type}User`, JSON.stringify(userData[type]));

  if (userData[type] && userData[type].length > 0) {
    document.getElementById(`sem-${type}`).style.display = 'none';
    _loadUserDataHTML(userData[type], type);
  }
}

function _loadUserDataHTML(data, type) {
  const div = document.getElementById(`dados-${type}`);

  let text = '';
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
        secondaryDiv = `<div class="user-data-item-date">${data[i].ultimaAtualizacao}</div>`;
        break;
      case 'listagens':
        secondaryDiv = `<div class="user-data-item-date">${data[i].subtitulo || data[i].ultimaAtualizacao}</div>`;
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
  localStorage.setItem('viagensUser', JSON.stringify(userData['viagens']));
  localStorage.setItem('destinosUser', JSON.stringify(userData['destinos']));
  window.location.href = `editar-viagem.html`;
}

function _destinosNovo() {
  localStorage.setItem('destinosUser', JSON.stringify(userData['destinos']));
  window.location.href = `editar-destino.html`;
}

function _destinosEditar(code) {
  localStorage.setItem('destinosUser', JSON.stringify(userData['destinos']));
  window.location.href = `editar-destino.html?d=${code}`;
}

function _listagensEditar(code) {
  window.location.href = `editar-listagem.html?l=${code}`;
}

function _listagensVisualizar(code) {
  window.location.href = `viagem.html?l=${code}`;
}

function _listagensNovo() {
  localStorage.setItem('listagensUser', JSON.stringify(userData['listagens']));
  localStorage.setItem('destinosUser', JSON.stringify(userData['destinos']));
  window.location.href = `editar-listagem.html`;
}