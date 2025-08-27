import { get, deleteAccount, getUserList } from "../support/firebase/database.js";
import { signInWithEmailAndPassword, signOut, registerIfUserNotPresent } from "../support/firebase/user.js";
import { initApp } from "../main/app.js";
import { select, getID } from "../support/pages/selectors.js";
import { translate } from "../main/translate.js";
import { startLoadingScreen, stopLoadingScreen } from "../support/pages/loading.js";
import { convertFromDateObject } from "../support/data/dates.js";
import { getDateString } from "../support/data/dates.js";
import { displayError } from "../support/pages/messages.js";
import { closeModal } from "../support/styles/modal.js";
import { isOnDarkMode } from "../support/styles/visibility.js";

var USER_DATA = {};

var TENTATIVAS = {
  viagens: 0,
  destinos: 0,
  listagens: 0
}

var VIAGENS = {
  coletado: false,
  viagensEmAndamento: [],
  proximasViagens: [],
  viagensAnteriores: []
}

startLoadingScreen();

document.addEventListener('DOMContentLoaded', async function () {
  try {
    initApp();

    _loadVisibilityIndex();
    _loadListenersIndex();
    _loadUserIndex();

    $('body').css('overflow', 'auto');

  } catch (error) {
    displayError(error);
    throw error;
  }
});

function _loadListenersIndex() {
  getID('login-button').addEventListener('click', function () {
    signInWithEmailAndPassword();
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
    startLoadingScreen(false);
    await deleteAccount();
    closeModal();
    signOut();
    stopLoadingScreen();
  });
}

async function _loadUserIndex() {
  try {
    firebase.auth().onAuthStateChanged(async (user) => {
      if (user) {
        registerIfUserNotPresent();
        _openIndexPage('logged');

        const userData = await get(`usuarios/${user.uid}`);

        const displayName = userData.nome;
        const photoURL = 'url(' + userData.foto + ')';

        getID('title-name').innerHTML = displayName.split(' ')[0];

        getID('settings-account-name').innerHTML = displayName;
        getID('settings-account-picture').style.backgroundImage = photoURL;
        getID('settings-account-picture').style.backgroundSize = 'cover';
        getID('profile-icon').style.backgroundImage = photoURL;
        getID('profile-icon').style.backgroundSize = 'cover';

        _loadUserDataList('viagens', userData);
        _loadUserDataList('listagens', userData);
        _loadUserDataList('destinos', userData);

      } else {
        _openIndexPage('unlogged');
      }
    });
  } catch (error) {
    stopLoadingScreen();
    displayError(error);
    throw error;
  }
  stopLoadingScreen();
}

async function _loadUserDataList(tipo, userData) {
  const promise = getUserList(tipo, true, userData);
  let responseReceived = false;

  function onResponseReceived(response) {
    const tipos = _getTipos(tipo);
    for (const innerTipo of tipos) {
      innerTipo.preloader.style.display = 'none';
      innerTipo.demoraCarregamento.style.display = 'none';
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
      _loadNotificationBar();
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
        const inicioDate = convertFromDateObject(dados[i].inicio);
        const fimDate = convertFromDateObject(dados[i].fim);
        const inicio = getDateString(inicioDate);
        const fim = getDateString(fimDate);
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
    hoje.setHours(0, 0, 0, 0);

    for (let i = 0; i < dados.length; i++) {
      const viagem = dados[i];
      const fim = convertFromDateObject(viagem.fim);

      if (hoje > fim) {
        viagensAnteriores.push(viagem);
      } else {
        proximasViagens.push(viagem);
        if (hoje >= convertFromDateObject(viagem.inicio)) {
          VIAGENS.viagensEmAndamento.push(viagem);
        }
      }
    }
    proximasViagens.sort((a, b) => _sortByToday(a, b));
    viagensAnteriores.sort((a, b) => _sortByToday(a, b));

    VIAGENS.coletado = true;
    VIAGENS.proximasViagens = proximasViagens;
    VIAGENS.viagensAnteriores = viagensAnteriores;

    function _sortByToday(a, b) {
      const fimA = convertFromDateObject(a.fim);
      const fimB = convertFromDateObject(b.fim);
      const diferencaA = Math.abs(hoje - fimA);
      const diferencaB = Math.abs(hoje - fimB);
      return diferencaA - diferencaB;
    }
  }
}

function _viagensEditar(code) {
  window.open(`edit/trip.html?v=${code}`, '_blank');
}

function _viagensVisualizar(code) {
  window.open(`view.html?v=${code}`, '_blank'); 
}

function _viagensNovo() {
  window.open(`edit/trip.html`, '_blank');
}

function _destinosNovo() {
  window.open(`edit/destination.html`, '_blank');
}

function _destinosEditar(code) {
  window.open(`edit/destination.html?d=${code}`, '_blank');
}

function _destinosVisualizar(code) {
  window.open(`view.html?d=${code}`, '_blank');
}

function _listagensEditar(code) {
  window.open(`edit/listing.html?l=${code}`, '_blank');
}

function _listagensVisualizar(code) {
  window.open(`view.html?l=${code}`, '_blank');
}

function _listagensNovo() {
  window.open(`edit/listing.html`, '_blank');
}

function _loadNotificationBar() {
  if (VIAGENS.coletado && VIAGENS.viagensEmAndamento.length > 0) {
    getID('notification-bar').style.display = 'flex';
    if (VIAGENS.viagensEmAndamento.length == 1) {
      getID('notification-text').innerHTML = `${translate('trip.current_single')}:<br>${VIAGENS.viagensEmAndamento[0].titulo}`;
      if (VIAGENS.viagensEmAndamento[0].cores.ativo) {
        notificationBar.changed = true;
        notificationBar.claro = VIAGENS.viagensEmAndamento[0].cores.claro;
        notificationBar.escuro = VIAGENS.viagensEmAndamento[0].cores.escuro;
        _applyNotificationBarColor();
      }
    } else {
      getID('notification-text').innerHTML = `${translate('trip.current_multi_1')}<br> ${translate('trip.current_multi_2')}"`;
      getID('notification-link').style.display = 'none';	
    }
  }
}

export function closeNotification() {
  document.querySelector('.notification-bar').style.display = 'none';
}

export function goToCurrentTrip() {
  if (VIAGENS.viagensEmAndamento.length == 1) {
    _viagensVisualizar(VIAGENS.viagensEmAndamento[0].code);
  }
}

function _applyNotificationBarColor() {
  getID('notification-bar').style.backgroundColor = isOnDarkMode() ? notificationBar.escuro : notificationBar.claro;
}

export function manualTripLoad() {
  _manualListLoad('viagens');
}

export function manualDestinationLoad() {
  _manualListLoad('destinos');
}

export function manualListingLoad() {
  _manualListLoad('listagens');
}
