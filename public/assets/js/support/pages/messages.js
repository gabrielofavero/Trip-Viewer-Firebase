import { translate } from "../../main/translate.js";
import { getPage } from "../data/data.js";
import { animateFadeIn, animateFadeOut } from "../styles/animations.js";
import { disableScroll } from "../styles/visibility.js";
import { IS_LOADING, LOADING_TIMER, stopLoadingScreen, stopLoadingTimer } from "./loading.js";
import { getID, onClick } from "./selectors.js";

export var MESSAGE_MODAL_OPEN = false;
const MESSAGE_LISTENERS = [];


// Default Message Styling
export function getDefaultProperties() {
  return {
    title: '',
    content: '',
    critical: false,
    blur: true,
    error: {},
    icons: [],
    buttons: [{
      type: 'ok',
      action: ''
    }],
    containers: {
      main: 'message-container',
      buttons: 'button-box'
    }
  };
}


// Messages
export function displayMessage(title, content) {
  const properties = getDefaultProperties();
  if (title) properties.title = title;
  if (content) properties.content = content;
  displayFullMessage(properties);
}

export function displayFullMessage(properties = getDefaultProperties()) {
  const preloader = getID('preloader');
  const isErrorMessage = Object.keys(properties.error).length > 0;

  if (LOADING_TIMER) {
    stopLoadingTimer();
  }

  if (!preloader) {
    console.warn('Canot show message. Preloader not found');
    return;
  }

  MESSAGE_MODAL_OPEN = true;
  disableScroll();

  const container = document.createElement('div');
  container.className = properties.containers.main;

  const textDiv = document.createElement('div');
  textDiv.className = 'message-text-container';

  if (!properties.critical) {
    const buttonsBox = getIconsBox(properties.icons);
    textDiv.appendChild(buttonsBox);
  }

  const titleDiv = document.createElement('div');
  titleDiv.className = 'message-title';
  titleDiv.id = 'message-title';
  titleDiv.innerHTML = properties.title;
  textDiv.appendChild(titleDiv);

  const descriptionDiv = document.createElement('div');
  descriptionDiv.className = 'message-description';
  descriptionDiv.id = 'message-description';
  descriptionDiv.innerHTML = properties.content;
  textDiv.appendChild(descriptionDiv);

  if (isErrorMessage) {
    const errorElement = getErrorElement(properties.error, textDiv);
    textDiv.appendChild(errorElement);
  }

  if (properties.buttons && properties.buttons.length > 0) {
    const buttonBox = document.createElement('div');
    buttonBox.className = properties.containers?.buttons || 'button-box';

    buttonBox.style.marginTop = '25px';

    for (const buttonType of properties.buttons) {
      const button = getButton(buttonType);
      buttonBox.appendChild(button);
    }

    textDiv.appendChild(buttonBox);
  }

  container.appendChild(textDiv);
  preloader.innerHTML = '';
  preloader.style.background = 'rgba(0, 0, 0, 0.6)';

  if (properties.blur) {
    preloader.style.backdropFilter = 'blur(10px)';
    preloader.style.webkitBackdropFilter = 'blur(10px)';
  }

  preloader.appendChild(container);

  if (preloader.style.display != 'block') {
    preloader.style.display = 'block';
  }

  loadMessageEventListeners();
}

export function displayError(error, tryAgain = false) {
  const properties = getDefaultProperties();

  properties.title = translate('messages.errors.load_title');
  properties.critical = true;
  properties.content = getErrorMessage(error);

  const buttons = tryAgain ? [{ type: 'try-again' }] : [];
  if (!window.location.href.includes('index.html')) {
    buttons.push({ type: 'home' });
  }
  properties.buttons = buttons;
  displayFullMessage(properties);
}

export function displayForbidden(content, redirectTo = 'view.html') {
  const properties = getDefaultProperties();
  properties.title = translate('messages.access_denied.title');
  properties.content = content || translate('messages.access_denied.message');
  properties.critical = true;
  properties.buttons = [{
    type: 'back',
    action: redirectTo
  }];
  displayFullMessage(properties);
}

// Buttons
function getButton(button) {
  switch (button.type) {
    case 'try-again':
      return getTryAgainButton();
    case 'home':
      return getHomeButton();
    case 'back':
      return getBackButton(button.action);
    case 'close':
      return getCloseButton();
    case 'cancel':
      return getCloseButton(translate('labels.cancel'), button.action);
    case 'confirm':
      return getConfirmButton(button.action);
    case 'delete':
      return getDeleteButton(button.action);
    case 'basic-delete':
      return getDeleteButtonBasic(button.action);
    default:
      return getCloseButton(translate('labels.understood'));
  }
}

function getHomeButton() {
  const homeButton = ['edit/trip', 'edit/destination', 'edit/listing'].includes(getPage()) ? '../index.html' : 'index.html'
  const button = document.createElement('button');
  button.className = 'btn btn-theme btn-format';
  button.id = 'home-button'
  button.type = 'submit';
  MESSAGE_LISTENERS.push({ id: '#home-button', action: () => window.location.href = homeButton });

  const icon = document.createElement('i');
  icon.id = 'transporte-nav';
  icon.className = 'iconify';
  icon.setAttribute('data-icon', 'bx:home');

  button.appendChild(icon);
  button.innerHTML += ` ${translate('labels.home')}`;

  return button;
}

function getBackButton(redirectTo = 'index.html') {
  const button = document.createElement('button');
  button.className = 'btn btn-secondary btn-format';
  button.type = 'submit';
  button.id = 'message-back';
  MESSAGE_LISTENERS.push({ id: '#message-back', action: () => window.location.href = redirectTo });

  const icon = document.createElement('i');
  icon.className = 'iconify';
  icon.setAttribute('data-icon', 'bx:home');

  button.appendChild(icon);
  button.innerHTML += ` ${translate('labels.home')}`;

  return button;
}

function getTryAgainButton() {
  const button = document.createElement('button');
  button.className = 'btn btn-secondary btn-format';
  button.type = 'submit';
  button.id = 'message-try-again';
  MESSAGE_LISTENERS.push({ id: '#message-try-again', action: () => window.location.reload(true) });

  const icon = document.createElement('i');
  icon.className = 'iconify';
  icon.setAttribute('data-icon', 'pajamas:retry');

  button.appendChild(icon);
  button.innerHTML += ` ${translate('labels.try_again')}`;

  return button;
}

function getCloseButton(name = translate('labels.close'), action = closeMessage) {
  const button = document.createElement('button');
  button.className = 'btn btn-secondary btn-format';
  button.type = 'submit';
  button.id = 'message-close';
  MESSAGE_LISTENERS.push({ id: '#message-close', action });

  button.innerHTML = name;
  return button;
}

function getConfirmButton(action = closeMessage) {
  const button = document.createElement('button');
  button.className = 'btn btn-theme btn-format';
  button.type = 'submit';
  button.id = 'message-confirm';
  MESSAGE_LISTENERS.push({ id: '#message-confirm', action });

  button.innerHTML = translate('labels.confirm');
  return button;
}

function getDeleteButton(action, buttonClass = 'btn-secondary') {
  const button = document.createElement('button');
  button.className = `btn ${buttonClass} btn-format`;
  button.type = 'submit';
  button.id = 'message-delete';
  MESSAGE_LISTENERS.push({ id: '#message-delete', action });

  const icon = document.createElement('i');
  icon.className = 'iconify';
  icon.setAttribute('data-icon', 'mingcute:delete-2-fill');

  button.appendChild(icon);
  button.innerHTML += ` ${translate('labels.delete')}`;

  return button;
}

function getDeleteButtonBasic(action) {
  return getDeleteButton(action, 'btn-basic');
}


// Toast
export function openToast(text) {
  getID('toast-text').innerHTML = text;
  animateFadeIn(['toast']);
  setTimeout(() => {
    closeToast();
  }, 3000);
}

export function closeToast() {
  if (getID('toast').style.display != 'none') {
    animateFadeOut(['toast']);
  }
}

// Helpers
export function closeMessage() {
  if (MESSAGE_MODAL_OPEN) {
    const preloader = getID('preloader');
    if (preloader) {
      preloader.innerHTML = '';
      preloader.style.background = '';
    }
    MESSAGE_MODAL_OPEN = false;
    if (IS_LOADING) {
      stopLoadingScreen();
    }

  } else {
    console.warn('Cannot close an unopened message modal.');
  }
}

export function getContainersInput() {
  return {
    main: 'input-container',
    buttons: 'button-box-right'
  }
}

function getIconsBox(icons) {
  const iconContainer = document.createElement('div');
  iconContainer.className = 'icon-container';
  iconContainer.style.textAlign = 'right';

  if (icons && icons[0] && icons[0].tipo === 'voltar') {
    const backIcon = document.createElement('i');
    backIcon.id = 'back-icon';
    backIcon.className = 'bx bx-arrow-back';
    backIcon.style.visibility = 'hidden';
    backIcon.style.cursor = 'pointer';
    MESSAGE_LISTENERS.push({ id: '#back-icon', action: icons[0].acao });

    iconContainer.appendChild(backIcon);
  }

  const cancelIcon = document.createElement('i');
  cancelIcon.id = 'cancel-icon';
  cancelIcon.className = 'iconify';
  cancelIcon.setAttribute('data-icon', 'material-symbols-light:close');
  cancelIcon.style.cursor = 'pointer';
  MESSAGE_LISTENERS.push({ id: '#cancel-icon', action: closeMessage });

  iconContainer.appendChild(cancelIcon);

  return iconContainer;
}

function getErrorElement(error) {
  let location = "";
  if (error?.showLocation) {
    const stackTrace = error.error ? error.error.stack : (new Error()).stack;
    const stackSplit = stackTrace.split('\n');
    location = stackSplit[2] ? stackSplit[2] : stackSplit[stackSplit.length - 1];
    location = location.split("/")[location.split("/").length - 1]
    location = location.trim().replace("at ", "");
  }

  let errorMessage = "";

  if (location && error.error && error.error instanceof Error) {
    errorMessage = translate('messages.errors.error_location', { error: error.error.message, location });
  } else if (error.error && error.error instanceof Error) {
    errorMessage = `${translate('messages.errors.error')} ${error.error.message}`;
  }

  const errorElement = document.createElement('p');
  errorElement.innerText = errorMessage;
  errorElement.className = 'error-message';

  if (!errorMessage) {
    errorElement.style.display = 'none';
  }

  return errorElement;
}

function getErrorMessage(error) {
  const isError = (error && error instanceof Error);
  const contact = `<a href=\"mailto:gabriel.o.favero@live.com\">${translate('messages.errors.contact_admin')}</a> ${translate('messages.errors.to_report')}`;

  if (!error || isError && !error.message) {
    return `${translate('messages.errors.unknown')}. ${contact}`;
  } else if (isError) {
    let msg = error.message;
    if (msg[msg.length - 1] === '.') {
      msg = msg.substring(0, msg.length - 1);
    }
    return `${msg}. ${contact}`;
  } else {
    return error;
  }
}

function loadMessageEventListeners() {
  for (const listener of MESSAGE_LISTENERS) {
    onClick(listener.id, listener.action)
  }
}

function getMessageProperty(type, action) {
  return { type, action };
}

export function getCancelMessageProperty(action) {
  return getMessageProperty('cancel', action);
}

export function getConfirmMessageProperty(action) {
  return getMessageProperty('confirm', action);
}

export function getBackMessageProperty(action) {
  return getMessageProperty('back', action);
}