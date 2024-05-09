var MESSAGE_MODAL_OPEN = false;

// Mensagem Genérica
function _displayMessage(title, content, errorObj = {}) {
  const preloader = getID('preloader');
  const isErrorMessage = errorObj?.isError === true;

  _stopLoadingTimer();

  if (preloader) {
    MESSAGE_MODAL_OPEN = true;
    _disableScroll();

    const container = document.createElement('div');
    container.className = 'error-container';

    const textDiv = document.createElement('div');
    textDiv.className = 'error-text-container';

    if (!isErrorMessage) {
      const cancelIcon = _getCancelIcon();
      textDiv.appendChild(cancelIcon);
    } 

    const titleDiv = document.createElement('div');
    titleDiv.className = 'error-title';
    titleDiv.innerText = title;
    textDiv.appendChild(titleDiv);

    const descriptionDiv = document.createElement('div');
    descriptionDiv.className = 'error-description';
    descriptionDiv.innerHTML = content;
    textDiv.appendChild(descriptionDiv);

    if (isErrorMessage) {
      const errorElement = _getErrorElement(errorObj, textDiv);
      textDiv.appendChild(errorElement);
    }

    container.appendChild(textDiv);
    preloader.innerHTML = '';
    preloader.style.background = 'rgba(0, 0, 0, 0.6)';
    preloader.appendChild(container);

    if (preloader.style.display != 'block') {
      preloader.style.display = 'block';
    }
  } else {
    console.warn('Não foi possível exibir a mensagem pois o preloader não foi encontrado');
  }
}

// Mensagem de Erro
function _displayErrorMessage(error, customMessage="", showLocation = true) {
  const title = "Erro no Carregamento 🙁";
  let isErrorInstance = error instanceof Error;
  let content = 'Um erro inesperado impediu o carregamento da página. <a href=\"mailto:gabriel.o.favero@live.com\">Entre em contato com o administrador</a> para reportar o problema.';

  if (isErrorInstance && customMessage) {
    content = customMessage;
  } else if (!isErrorInstance && error && !customMessage) {
    content = `${error}. <a href=\"mailto:gabriel.o.favero@live.com\">Entre em contato com o administrador</a> para mais informações.` ;
  } else if (!isErrorInstance && error && customMessage) { 
    error = new Error(error);
    content = customMessage;
    showLocation = false;
    isErrorInstance = true;
  }

  const errorObj = {
    isError: true,
    error: isErrorInstance ? error : "",
    showLocation: isErrorInstance ? showLocation : false
  }

  _displayMessage(title, content, errorObj);
}

// Fechar Mensagem
function _closeDisplayMessage() {
  if (MESSAGE_MODAL_OPEN) {
    const preloader = getID('preloader');
    if (preloader) {
      preloader.innerHTML = '';
      preloader.style.background = '';
    }
    MESSAGE_MODAL_OPEN = false;
    _stopLoadingScreen();
  } else {
    console.warn('Não há um modal aberto para ser fechado.');
  }
}

// Funções de Suporte
function _getCancelIcon() {
  const iconContainer = document.createElement('div');
  iconContainer.className = 'icon-container';
  iconContainer.style.textAlign = 'right';
  
  const cancelIcon = document.createElement('i');
  cancelIcon.id = 'cancel-icon';
  cancelIcon.className = 'iconify';
  cancelIcon.setAttribute('data-icon', 'material-symbols-light:close');
  cancelIcon.setAttribute('onclick', '_closeDisplayMessage()');
  cancelIcon.style.cursor = 'pointer';
  cancelIcon.style.marginBottom = '5px';
  cancelIcon.style.fontSize = '25px';

  iconContainer.appendChild(cancelIcon);

  return iconContainer;
}

function _getErrorElement(errorObj) {

  // TO-DO block exit message, add button to home and add stack if configured

  let location = "";
  if (errorObj?.showLocation) {
    const stackTrace = errorObj.error ? errorObj.error.stack : (new Error()).stack;
    const stackSplit = stackTrace.split('\n');
    location = stackSplit[2] ? stackSplit[2] : stackSplit[stackSplit.length - 1];
    location = location.split("/")[location.split("/").length - 1]
    location = location.trim().replace("at ", "");
  }

  let errorMessage = "";

  if (location && errorObj.error && errorObj.error instanceof Error) {
    errorMessage = `Erro "${errorObj.error.message}" localizado em ${location}`;
  } else if (errorObj.error && errorObj.error instanceof Error) {
    errorMessage = `Erro "${errorObj.error.message}"`;
  }

  const errorElement = document.createElement('p');
  errorElement.innerText = errorMessage;
  errorElement.className = 'error-message';

  if (!errorMessage) {
    errorElement.style.display = 'none';
  }

  return errorElement;
}