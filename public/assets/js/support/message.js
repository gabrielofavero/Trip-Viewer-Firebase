var MESSAGE_MODAL_OPEN = false;
const DEFAULT_PROPERTIES = {
  errorData: {},
  buttons: [{
    type: 'ok',
    action: ''
  }],
  container: '',
  buttonBox: ''
}

// Mensagem Genérica
function _displayMessage(title, content, properties = DEFAULT_PROPERTIES) {
  const preloader = getID('preloader');
  const isErrorMessage = properties.errorData?.isError === true;

  _stopLoadingTimer();

  if (preloader) {
    MESSAGE_MODAL_OPEN = true;
    _disableScroll();

    const container = document.createElement('div');
    container.className = properties.container || 'message-container';

    const textDiv = document.createElement('div');
    textDiv.className = 'message-text-container';

    if (!isErrorMessage) {
      const cancelIcon = _getCloseIcon();
      textDiv.appendChild(cancelIcon);
    }

    const titleDiv = document.createElement('div');
    titleDiv.className = 'message-title';
    titleDiv.innerHTML = title;
    textDiv.appendChild(titleDiv);

    const descriptionDiv = document.createElement('div');
    descriptionDiv.className = 'message-description';
    descriptionDiv.innerHTML = content;
    textDiv.appendChild(descriptionDiv);

    if (isErrorMessage) {
      const errorElement = _getErrorElement(properties.errorData, textDiv);
      textDiv.appendChild(errorElement);
    }

    if (properties.buttons && properties.buttons.length > 0) {
      const buttonBox = document.createElement('div');
      buttonBox.className = properties.buttonBox || 'button-box';
      buttonBox.style.marginTop = '25px';

      for (const buttonType of properties.buttons) {
        const button = _getButton(buttonType);
        buttonBox.appendChild(button);
      }

      textDiv.appendChild(buttonBox);
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

// Mensagem de Input
function _displayInputModal(title, content, deleteAction, confirmAction='_closeDisplayMessage();') {
  let properties = {
    errorData: {},
    buttons: [{
      type: 'apagar',
      action: deleteAction
    }, {
      type: 'confirmar',
      action: confirmAction
    }],
    container: 'input-container',
    buttonBox: 'button-box-right'
  }
  _displayMessage(title, content, properties);
}
// Mensagem de Erro
function _displayErrorMessage(error, customMessage = "", showLocation = true) {
  const title = "Erro no Carregamento 🙁";
  let isErrorInstance = error instanceof Error;
  let content = 'Um erro inesperado impediu o carregamento da página. <a href=\"mailto:gabriel.o.favero@live.com\">Entre em contato com o administrador</a> para reportar o problema.';

  if (isErrorInstance && customMessage) {
    content = customMessage;
  } else if (!isErrorInstance && error && !customMessage) {
    content = `${error}. <a href=\"mailto:gabriel.o.favero@live.com\">Entre em contato com o administrador</a> para mais informações.`;
  } else if (!isErrorInstance && error && customMessage) {
    error = new Error(error);
    content = customMessage;
    showLocation = false;
    isErrorInstance = true;
  }

  let buttons = [{type: 'tryAgain'}];

  if (!window.location.href.includes('index.html')) {
    buttons.push({type: 'home'});
  }

  const properties = {
    errorData: {
      isError: true,
      error: isErrorInstance ? error : "",
      showLocation: isErrorInstance ? showLocation : false
    },
    buttons: buttons,
    container: 'message-container'
  }

  _displayMessage(title, content, properties);
}

function _openAtribuicoes() {
  const page = window.location.href.split('/').pop();
  const title = '';
  const buttons = [{type: 'ok'}];

  let content = '';
  let atribuicoes = [];

  const logotipo = `<strong>Logotipo: </strong> <a href="https://br.freepik.com/vetores-gratis/marketing-de-midia-social-conjunto-de-icones_5825519.htm#query=briefcase&position=9&from_view=search&track=sph" target="_blank">studiogstock</a> (Adaptado)`;
  const imagemDeFundo = `<strong>Imagem de Fundo: </strong> <a href="https://br.freepik.com/fotos-gratis/femininos-turistas-na-mao-tem-um-mapa-de-viagem-feliz_3953407.htm#query=viagem&position=14&from_view=search&track=sph" target="_blank">jcomp</a> (Freepik)`;
  const formularios = `<strong>Formulários: </strong> <a href="https://github.com/nielsVoogt/nice-forms.css" target="_blank">Niels Voogt</a> (Adaptado)`;
  const calendario = `<strong>Calendário: </strong> <a href="https://www.cssscript.com/minimal-calendar-ui-generator/" target="_blank">niinpatel</a> (Adaptado)`
  const accordion = `<strong>Accordion: </strong> <a href="https://github.com/nielsVoogt/nice-forms.css" target="_blank">Niels Voogt</a> (Adaptado)`
  
  atribuicoes.push(logotipo);

  if (page.includes('index')) {
    atribuicoes.push(imagemDeFundo);
  } else if (page.includes('editar-')) {
    atribuicoes.push(imagemDeFundo);
    atribuicoes.push(formularios);
  } else if (page.includes('viagem')) {
    atribuicoes.push(imagemDeFundo);
    atribuicoes.push(calendario);
  } else if (page.includes('destinos')) {
    atribuicoes.push(imagemDeFundo);
    atribuicoes.push(accordion);
  }

  content = atribuicoes.join('<br>');

  _displayMessage(title, content, {buttons: buttons});
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

function _overrideErrorMessage() {
  _closeDisplayMessage();
}

// Funções de Suporte
function _getCloseIcon() {
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

function _getErrorElement(errorData) {

  // TO-DO block exit message, add button to home and add stack if configured

  let location = "";
  if (errorData?.showLocation) {
    const stackTrace = errorData.error ? errorData.error.stack : (new Error()).stack;
    const stackSplit = stackTrace.split('\n');
    location = stackSplit[2] ? stackSplit[2] : stackSplit[stackSplit.length - 1];
    location = location.split("/")[location.split("/").length - 1]
    location = location.trim().replace("at ", "");
  }

  let errorMessage = "";

  if (location && errorData.error && errorData.error instanceof Error) {
    errorMessage = `Erro "${errorData.error.message}" localizado em ${location}`;
  } else if (errorData.error && errorData.error instanceof Error) {
    errorMessage = `Erro "${errorData.error.message}"`;
  }

  const errorElement = document.createElement('p');
  errorElement.innerText = errorMessage;
  errorElement.className = 'error-message';

  if (!errorMessage) {
    errorElement.style.display = 'none';
  }

  return errorElement;
}

// Botões
function _getButton(button) {
  switch (button.type) {
    case 'tryAgain':
      return _getTryAgainButton();
    case 'home':
      return _getHomeButton();
    case 'fechar':
      return _getCloseButton();
    case 'cancelar':
      return _getCancelButton();
    case 'confirmar':
      return _getConfirmButton(button.action);
    case 'apagar':
      return _getDeleteButton(button.action);
    default:
      return _getOkButton();
  }
}

function _getHomeButton() {
  const button = document.createElement('button');
  button.className = 'btn btn-purple btn-format';
  button.type = 'submit';
  button.setAttribute('onclick', 'window.location.href = "index.html";')

  const icon = document.createElement('i');
  icon.id = 'transporte-nav';
  icon.className = 'iconify';
  icon.setAttribute('data-icon', 'bx:home');

  button.appendChild(icon);
  button.innerHTML += ' Home';

  return button;
}

function _getTryAgainButton() {
  const button = document.createElement('button');
  button.className = 'btn btn-secondary btn-format';
  button.type = 'submit';
  button.setAttribute('onclick', 'window.location.reload(true);')

  const icon = document.createElement('i');
  icon.id = 'transporte-nav';
  icon.className = 'iconify';
  icon.setAttribute('data-icon', 'pajamas:retry');

  button.appendChild(icon);
  button.innerHTML += ' Tentar Novamente';

  return button;
}

function _getCloseButton(name='Fechar') {
  const button = document.createElement('button');
  button.className = 'btn btn-secondary btn-format';
  button.type = 'submit';
  button.setAttribute('onclick', '_closeDisplayMessage();')

  button.innerHTML = name;
  return button;
}

function _getOkButton() {
  return _getCloseButton('Entendi');
}

function _getCancelButton() {
  return _getCloseButton('Cancelar');
}

function _getConfirmButton(onclick='_closeDisplayMessage();') {
  const button = document.createElement('button');
  button.className = 'btn btn-purple btn-format';
  button.type = 'submit';
  button.setAttribute('onclick', onclick)

  button.innerHTML = 'Confirmar';

  return button;
}

function _getDeleteButton(onclick) {
  const button = document.createElement('button');
  button.className = 'btn btn-secondary btn-format';
  button.type = 'submit';
  button.setAttribute('onclick', onclick)

  const icon = document.createElement('i');
  icon.id = 'transporte-nav';
  icon.className = 'iconify';
  icon.setAttribute('data-icon', 'mingcute:delete-2-fill');

  button.appendChild(icon);
  button.innerHTML += ' Apagar';

  return button;
}