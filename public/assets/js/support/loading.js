var ERROR_MODE = false;
var LOADING_TIMER;
var LOADING_SECONDS = 0;

// Loading Screen

function _startLoadingScreen(useTimer = true) {
  if (useTimer) {
    _startLoadingTimer();
  }
  const preloader = getID('preloader');
  if (preloader) {
    preloader.style.display = 'block';
    _disableScroll();
  }
}

function _stopLoadingScreen() {
  _stopLoadingTimer();
  localStorage.setItem('firstLoad', 'true');
  if (!ERROR_MODE) {
    const preloader = getID('preloader');
    if (preloader) {
      preloader.style.display = 'none';
      _enableScroll();
    }
  } else {
    console.warn('Cannot stop loading in error mode');
  }
}

// Loading Timer
function _startLoadingTimer() {
  if (LOADING_TIMER == null && ERROR_MODE == false) {
    LOADING_SECONDS = 0;
    LOADING_TIMER = setInterval(() => {
      const firstLoad = localStorage.getItem('firstLoad');
      LOADING_SECONDS++;
      if (LOADING_SECONDS >= 10 && (firstLoad == 'true' || firstLoad == null)) {
        _stopLoadingTimer();
        localStorage.setItem('firstLoad', 'false');
        window.location.reload();
      } else if (LOADING_SECONDS >= 10 && firstLoad == 'false') {
        _stopLoadingTimer();
        localStorage.setItem('firstLoad', 'true');
        _displayErrorMessage("", "Não foi possível carregar a página. Verifique sua conexão com a internet e tente novamente.");
      }
    }, 1000);
  }
}

function _stopLoadingTimer() {
  if (LOADING_TIMER) {
    clearInterval(LOADING_TIMER);
    LOADING_TIMER = null;
  }
}


// Error Message 
function _displayErrorMessage(errorMessage = "", customMessage) {
  _stopLoadingTimer();
  const preloader = getID('preloader');

  if (preloader) {
    ERROR_MODE = true;
    _disableScroll();
    const errorContainer = document.createElement('div');
    errorContainer.className = 'error-container';
    const errorText = document.createElement('div');
    errorText.className = 'error-text-container';
    const errorTitle = document.createElement('div');
    errorTitle.className = 'error-title';
    errorTitle.innerText = "Erro ao carregar a página 🙁";
    errorText.appendChild(errorTitle);
    const errorDescription = document.createElement('div');
    errorDescription.className = 'error-description';
    errorDescription.innerHTML = customMessage || "Não foi possível carregar a página. <a href=\"mailto:gabriel.o.favero@live.com\">Contate o administrador</a> para solucionar o problema.";
    errorText.appendChild(errorDescription);


    let errorLocation = "";

    if (errorMessage) {
      const stackTrace = (new Error()).stack;
      errorLocation = stackTrace.split('\n')[2];
      errorLocation = errorLocation.split("/")[errorLocation.split("/").length - 1]
    }

    const errorMessageWithLocation = errorMessage + " " + errorLocation;
    const errorMessageElement = document.createElement('p');
    errorMessageElement.innerText = errorMessageWithLocation;
    errorMessageElement.className = 'error-message';
    errorText.appendChild(errorMessageElement);

    errorContainer.appendChild(errorText);
    preloader.innerHTML = '';
    preloader.style.background = 'rgba(0, 0, 0, 0.6)';
    preloader.appendChild(errorContainer);

    if (preloader.style.display != 'block') {
      preloader.style.display = 'block';
    }
  } else {
    console.warn('No preloader element found');
  }
}

function _overrideError() {
  if (ERROR_MODE) {
    const preloader = getID('preloader');
    if (preloader) {
      preloader.innerHTML = '';
      preloader.style.background = '';
    }
    ERROR_MODE = false;
    _stopLoadingScreen();
  } else {
    console.warn('No error to override');
  }
}

function _displayNoDataError(type) {
  const preloader = getID('preloader');

  if (preloader) {
    ERROR_MODE = true;
    _disableScroll();
    const errorContainer = document.createElement('div');
    errorContainer.className = 'error-container';
    const errorText = document.createElement('div');
    errorText.className = 'error-text';
    const errorTitle = document.createElement('h2');
    errorTitle.innerText = "Erro ao carregar a página 🙁";
    errorText.appendChild(errorTitle);
    const errorDescription = document.createElement('p');
    errorDescription.innerHTML = `<br>Não foi possível carregar a página. Não há um código de ${type} válido na URL.<br><br><br> Caso você acredite que esse seja um erro, <a href=\"mailto:gabriel.o.favero@live.com\">entre em contato com o administrador</a>`;
    errorText.appendChild(errorDescription);

    errorContainer.appendChild(errorText);
    preloader.innerHTML = '';
    preloader.style.background = 'rgba(0, 0, 0, 0.6)';
    preloader.appendChild(errorContainer);

    if (preloader.style.display != 'block') {
      preloader.style.display = 'block';
    }
  } else {
    console.warn('No preloader element found');
  }
}

// Editar sem permissão
async function _canEdit() {
  const uid = await _getUID();
  if (DOCUMENT_ID && (!uid || uid != DOCUMENT_ID)) {
    _displayErrorMessage("", "Você não tem permissão para editar essa viagem. Realize o login com a conta correta para acessar o conteúdo.");
    return false;
  } else return true;
}