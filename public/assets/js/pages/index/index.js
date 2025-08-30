import { initApp } from "../main/app.js";
import { translate } from "../main/translate.js";
import { convertFromDateObject, getDateString } from "../support/data/dates.js";
import { DATABASE_TRIP_DOCUMENTS, deleteAccount, get, getUserList } from "../support/firebase/database.js";
import { registerIfUserNotPresent, signInWithEmailAndPassword, signOut } from "../support/firebase/user.js";
import { startLoadingScreen, stopLoadingScreen } from "../support/pages/loading.js";
import { displayError } from "../support/pages/messages.js";
import { getID, onClick, select } from "../support/pages/selectors.js";
import { closeModal } from "../support/styles/modal.js";
import { NOTIFICATION_BAR, applyNotificationBarColor } from "./support/visibilidade.js";
import { loadVisibilityIndex, openIndexPage, setNotificationBar } from "./support/index-visibility.js";

export var USER_DATA = {};

var LOAD_ATTEMPTS = {
  viagens: 0,
  destinos: 0,
  listagens: 0
}

var TRIPS = {
  collected: false,
  during: [],
  next: [],
  previous: []
}

// Loaders
document.addEventListener('DOMContentLoaded', async function () {
  startLoadingScreen();
  try {
    initApp();

    loadVisibilityIndex();
    loadListenersIndex();
    loadUserIndex();

    $('body').css('overflow', 'auto');

  } catch (error) {
    displayError(error);
    throw error;
  }
});

function loadListenersIndex() {
  getID('login-button').addEventListener('click', function () {
    signInWithEmailAndPassword();
  });

  getID('proximasViagens').addEventListener('click', function () {
    openIndexPage('proximasViagens', 0, 1);
  });

  getID('viagensAnteriores').addEventListener('click', function () {
    openIndexPage('viagensAnteriores', 0, 1);
  });

  getID('destinosCadastrados').addEventListener('click', function () {
    openIndexPage('destinos', 0, 1);
  });

  getID('profile-icon').addEventListener('click', function () {
    if (getID('settings-box').style.display === 'none') {
      back.classList.remove('bx-arrow-back');
      back.classList.add('bx-up-arrow-alt');
      openIndexPage('settings', 0, 1, false);
    }
  });

  getID('ajustesDaConta').addEventListener('click', function () {
    openIndexPage('settings', 0, 1);
  });

  getID('nova-viagem-1').addEventListener('click', function () {
    goToNewTrip();
  });

  getID('nova-viagem-2').addEventListener('click', function () {
    goToNewTrip();
  });

  getID('new-destino').addEventListener('click', function () {
    goToNewDestination();
  });

  getID('new-listagem').addEventListener('click', function () {
    goToNewListing();
  });

  getID('back').addEventListener('click', function () {
    const back = select('#back');
    if (back.classList.contains('bx-up-arrow-alt')) {
      openIndexPage('logged', 1, 0, false);
      setTimeout(() => {
        back.classList.remove('bx-up-arrow-alt');
        back.classList.add('bx-arrow-back');
      }, 300);
    } else {
      openIndexPage('logged', 1, 0);
    }
  });

  getID('listasDeDestinos').addEventListener('click', function () {
    openIndexPage('listagens', 0, 1);
  });

  getID('apagar').addEventListener('click', async function () {
    startLoadingScreen(false);
    await deleteAccount();
    closeModal();
    signOut();
    stopLoadingScreen();
  });
}

async function loadUserIndex() {
  try {
    firebase.auth().onAuthStateChanged(async (user) => {
      if (user) {
        registerIfUserNotPresent();
        openIndexPage('logged');

        const userData = await get(`usuarios/${user.uid}`);

        const displayName = userData.nome;
        const photoURL = 'url(' + userData.foto + ')';

        getID('title-name').innerHTML = displayName.split(' ')[0];

        getID('settings-account-name').innerHTML = displayName;
        getID('settings-account-picture').style.backgroundImage = photoURL;
        getID('settings-account-picture').style.backgroundSize = 'cover';
        getID('profile-icon').style.backgroundImage = photoURL;
        getID('profile-icon').style.backgroundSize = 'cover';

        loadUserDataList('viagens', userData);
        loadUserDataList('listagens', userData);
        loadUserDataList('destinos', userData);

      } else {
        openIndexPage('unlogged');
      }
    });
  } catch (error) {
    stopLoadingScreen();
    displayError(error);
    throw error;
  }
  stopLoadingScreen();
}

async function loadUserDataList(type, userData) {
  const promise = getUserList(type, true, userData);
  let responseReceived = false;

  function onResponseReceived(response) {
    const tipos = getTypes(type);
    for (const innerType of tipos) {
      innerType.preloader.style.display = 'none';
      innerType.longLoad.style.display = 'none';
      if (response.length === 0) {
        innerType.noData.style.display = 'block';
      } else {
        innerType.noData.style.display = 'none';
        USER_DATA[type] = response;
        loadUserDataHTML(USER_DATA[type], innerType.title);
      }
    }
  }

  function getTypes(type) {
    const result = [];
    const types = type == 'viagens' ? ['proximasViagens', 'viagensAnteriores'] : [type];
    for (const innerTipo of types) {
      result.push({
        title: innerTipo,
        preloader: getID(`preloader-${innerTipo}`),
        longLoad: getID(`demora-carregamento-${innerTipo}`),
        noData: getID(`sem-${innerTipo}`)
      });
    }
    return result;
  }

  function onTimeout() {
    for (const innerType of getTypes(type)) {
      innerType.preloader.style.display = 'none';
      innerType.longLoad.style.display = 'block';
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
  }, 8000);

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

function manualListLoad(type) {
  LOAD_ATTEMPTS[type]++;

  getID(`preloader-${type}`).style.display = 'block';
  getID(`demora-carregamento-${type}`).style.display = 'none';

  if (LOAD_ATTEMPTS[type] < 2) {
    loadUserDataList(type);
  } else {
    window.location.reload(true);
  }
}

function loadUserDataHTML(data, type) {
  const div = getID(`dados-${type}`);
  let content = '';

  if ((type == 'proximasViagens' || type == 'viagensAnteriores')) {
    if (!TRIPS.collected) {
      collectTrips(data);
      loadNotificationBar();
    }
    data = TRIPS[type];
  } else if (data[0].ultimaAtualizacao) {
    data.sort((a, b) => {
      return new Date(b.ultimaAtualizacao).getTime() - new Date(a.ultimaAtualizacao).getTime();
    });
  }

  for (let i = 0; i < data.length; i++) {
    let secondaryDiv = '';
    let viewDiv = '';
    let innerType = type;

    const viewItems = [];
    const editItems = [];

    switch (type) {
      case 'proximasViagens':
      case 'viagensAnteriores':
        innerType = 'viagens';
        const inicioDate = convertFromDateObject(data[i].inicio);
        const fimDate = convertFromDateObject(data[i].fim);
        const inicio = getDateString(inicioDate);
        const fim = getDateString(fimDate);
        secondaryDiv = `<div class="user-data-item-date">${inicio} - ${fim}</div>`;
        break;
      case 'destinos':
      case 'listagens':
        secondaryDiv = `<div class="user-data-item-date">${data[i].ultimaAtualizacaoText}</div>`;
        break;
      default:
        break;
    }

    if (DATABASE_TRIP_DOCUMENTS.includes(innerType)) {
      viewDiv = `<i id="visualizar-${type}-${i + 1}" class="iconify user-data-icon" data-icon="fluent:eye-16-regular"></i>`
      viewItems.push({ id: `#visualizar-${type}-${i + 1}`, code: data[i].code, innerType: innerType })
    }

    content += `
    <div class="user-data-item">
      <div class="user-data-item-text">
        <div class="user-data-item-title">${data[i].title}</div>
        ${secondaryDiv}
      </div>
      <div class="trip-data-icons">
        <i id="editar-${type}-${i + 1}" class="iconify user-data-icon" data-icon="tabler:edit"></i>
        ${viewDiv}
      </div>
    </div>`;
    editItems.push({ id: `#editar-${type}-${i + 1}`, code: data[i].code, innerType: innerType })
  }

  div.innerHTML = content;

  loadViewItemsListeners(viewItems);
  loadEditItemsListeners(editItems);

  function collectTrips(data) {
    const next = [];
    const previous = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < data.length; i++) {
      const trip = data[i];
      const end = convertFromDateObject(trip.fim);

      if (today > end) {
        previous.push(trip);
      } else {
        next.push(trip);
        if (today >= convertFromDateObject(trip.inicio)) {
          TRIPS.during.push(trip);
        }
      }
    }
    next.sort((a, b) => _sortByToday(a, b));
    previous.sort((a, b) => _sortByToday(a, b));

    TRIPS.collected = true;
    TRIPS.next = next;
    TRIPS.previous = previous;

    function _sortByToday(a, b) {
      const fimA = convertFromDateObject(a.fim);
      const fimB = convertFromDateObject(b.fim);
      const diferencaA = Math.abs(today - fimA);
      const diferencaB = Math.abs(today - fimB);
      return diferencaA - diferencaB;
    }
  }
}

function loadViewItemsListeners(viewItems) {
  for (const item of viewItems) {
    onClick(item.id, () => {
      switch (item.innerType) {
        case 'viagens':
          goToViewTrip(item.code);
          break;
        case 'destinos':
          goToViewDestination(item.code);
          break;
        case 'listagens':
          goToViewListing(item.code);
      }
    })
  }
}

function loadEditItemsListeners(editItems) {
  for (const item of editItems) {
    onClick(item.id, () => {
      switch (item.innerType) {
        case 'viagens':
          goToEditTrip(item.code);
          break;
        case 'destinos':
          goToEditDestination(item.code);
          break;
        case 'listagens':
          goToEditListing(item.code);
      }
    })
  }
}

function loadNotificationBar() {
  if (TRIPS.collected && TRIPS.during.length > 0) {
    getID('notification-bar').style.display = 'flex';
    if (TRIPS.during.length == 1) {
      getID('notification-text').innerHTML = `${translate('trip.current_single')}:<br>${TRIPS.during[0].title}`;
      if (TRIPS.during[0].cores.ativo) {
        setNotificationBar({changed: true, light: TRIPS.during[0].cores.claro, dark: TRIPS.during[0].cores.escuro})
        applyNotificationBarColor();
      }
    } else {
      getID('notification-text').innerHTML = `${translate('trip.current_multi_1')}<br> ${translate('trip.current_multi_2')}"`;
      getID('notification-link').style.display = 'none';
    }
  }
}

export function manualTripLoad() {
  manualListLoad('viagens');
}

export function manualDestinationLoad() {
  manualListLoad('destinos');
}

export function manualListingLoad() {
  manualListLoad('listagens');
}

// Page Navigation
function goToEditTrip(code) {
  window.open(`edit/trip.html?v=${code}`, '_blank');
}

function goToViewTrip(code) {
  window.open(`view.html?v=${code}`, '_blank');
}

function goToNewTrip() {
  window.open(`edit/trip.html`, '_blank');
}

function goToNewDestination() {
  window.open(`edit/destination.html`, '_blank');
}

function goToEditDestination(code) {
  window.open(`edit/destination.html?d=${code}`, '_blank');
}

function goToViewDestination(code) {
  window.open(`view.html?d=${code}`, '_blank');
}

function goToEditListing(code) {
  window.open(`edit/listing.html?l=${code}`, '_blank');
}

function goToViewListing(code) {
  window.open(`view.html?l=${code}`, '_blank');
}

function goToNewListing() {
  window.open(`edit/listing.html`, '_blank');
}

export function closeNotification() {
  document.querySelector('.notification-bar').style.display = 'none';
}

export function goToCurrentTrip() {
  if (TRIPS.during.length == 1) {
    goToViewTrip(TRIPS.during[0].code);
  }
}
