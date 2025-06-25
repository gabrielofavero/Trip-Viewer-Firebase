var MESSAGE_MODAL_OPEN = false;
const MENSAGEM_PROPRIEDADES = {
  titulo: '',
  conteudo: '',
  critico: false,
  blur: true,
  erro: {},
  icones: [],
  botoes: [{
    tipo: 'ok',
    acao: ''
  }],
  containers: {
    principal: 'message-container',
    botoes: 'button-box'
  }
}


// Mensagem Genérica
function _displayMessage(titulo, conteudo) {
  const properties = _cloneObject(MENSAGEM_PROPRIEDADES);
  if (titulo) properties.titulo = titulo;
  if (conteudo) properties.conteudo = conteudo;
  _displayFullMessage(properties);
}

function _displayFullMessage(propriedades = _cloneObject(MENSAGEM_PROPRIEDADES)) {
  const preloader = getID('preloader');
  const isErrorMessage = Object.keys(propriedades.erro).length > 0;

  if (typeof _stopLoadingTimer === 'function') {
    _stopLoadingTimer();
  }

  if (!preloader) {
    console.warn('Canot show message. Preloader not found');
    return;
  }

  MESSAGE_MODAL_OPEN = true;
  _disableScroll();

  // Container
  const container = document.createElement('div');
  container.className = propriedades.containers.principal;

  // Container de Texto
  const textDiv = document.createElement('div');
  textDiv.className = 'message-text-container';

  // Criticidade
  if (!propriedades.critico) {
    const buttonsBox = _getIconsBox(propriedades.icones);
    textDiv.appendChild(buttonsBox);
  }

  // Título
  const titleDiv = document.createElement('div');
  titleDiv.className = 'message-title';
  titleDiv.id = 'message-title';
  titleDiv.innerHTML = propriedades.titulo;
  textDiv.appendChild(titleDiv);

  // Descrição
  const descriptionDiv = document.createElement('div');
  descriptionDiv.className = 'message-description';
  descriptionDiv.innerHTML = propriedades.conteudo;
  textDiv.appendChild(descriptionDiv);

  // Mensagem de Erro
  if (isErrorMessage) {
    const errorElement = _getErrorElement(propriedades.erro, textDiv);
    textDiv.appendChild(errorElement);
  }

  // Botões
  if (propriedades.botoes && propriedades.botoes.length > 0) {
    const buttonBox = document.createElement('div');
    buttonBox.className = propriedades.containers?.botoes || 'button-box';

    buttonBox.style.marginTop = '25px';

    for (const buttonType of propriedades.botoes) {
      const button = _getButton(buttonType);
      buttonBox.appendChild(button);
    }

    textDiv.appendChild(buttonBox);
  }

  // Adiciona ao Container
  container.appendChild(textDiv);
  preloader.innerHTML = '';
  preloader.style.background = 'rgba(0, 0, 0, 0.6)';

  // Blur
  if (propriedades.blur) {
    preloader.style.backdropFilter = 'blur(10px)';
    preloader.style.webkitBackdropFilter = 'blur(10px)';
  }

  // Adiciona ao Preloader
  preloader.appendChild(container);

  // Exibe o Preloader
  if (preloader.style.display != 'block') {
    preloader.style.display = 'block';
  }
}


// Mensagem de Erro
function _displayError(erro, tentarNovamente = false) {
  const propriedades = _cloneObject(MENSAGEM_PROPRIEDADES);

  propriedades.titulo = translate('messages.errors.load_title');
  propriedades.critico = true;
  propriedades.conteudo = _getErrorMessage(erro);
  propriedades.localizacao = false; // Desabilitado. Não faz sentido mostrar ao usuário.

  const botoes = tentarNovamente ? [{ tipo: 'tente-novamente' }] : [];
  if (!window.location.href.includes('index.html')) {
    botoes.push({ tipo: 'home' });
  }
  propriedades.botoes = botoes;
  _displayFullMessage(propriedades);
}

function _getErrorMessage(erro) {
  const isError = (erro && erro instanceof Error);
  const contact = `<a href=\"mailto:gabriel.o.favero@live.com\">${translate('messages.errors.contact_admin')}</a> ${translate('messages.errors.to_report')}`;

  if (!erro || isError && !erro.message) {
    return `${translate('messages.errors.unknown')}. ${contact}`;
  } else if (isError) {
    let msg = erro.message;
    if (msg[msg.length - 1] === '.') {
      msg = msg.substring(0, msg.length - 1);
    }
    return `${msg}. ${contact}`;
  } else {
    return erro;
  }
}

// Mensagem de Não Autorizado
function _displayForbidden(conteudo, redirectTo = 'view.html') {
  const propriedades = _cloneObject(MENSAGEM_PROPRIEDADES);
  propriedades.titulo = translate('messages.access_denied.title');
  propriedades.conteudo = conteudo || translate('messages.access_denied.message');
  propriedades.critico = true;
  propriedades.botoes = [{
    tipo: 'voltar',
    acao: redirectTo
  }];
  _displayFullMessage(propriedades);
}


// Fechar Mensagem
function _closeMessage() {
  if (MESSAGE_MODAL_OPEN) {
    const preloader = getID('preloader');
    if (preloader) {
      preloader.innerHTML = '';
      preloader.style.background = '';
    }
    MESSAGE_MODAL_OPEN = false;
    if (typeof _stopLoadingScreen === 'function') _stopLoadingScreen();

  } else {
    console.warn('Cannot close an unopened message modal.');
  }
}


// Funções de Suporte
function _getContainersInput() {
  return {
    principal: 'input-container',
    botoes: 'button-box-right'
  }
}

function _getIconsBox(icones) {
  const iconContainer = document.createElement('div');
  iconContainer.className = 'icon-container';
  iconContainer.style.textAlign = 'right';

  if (icones && icones[0] && icones[0].tipo === 'voltar') {
    const backIcon = document.createElement('i');
    backIcon.id = 'back-icon';
    backIcon.className = 'bx bx-arrow-back';
    backIcon.setAttribute('onclick', icones[0].acao);
    backIcon.style.visibility = 'hidden';
    backIcon.style.cursor = 'pointer';

    iconContainer.appendChild(backIcon);
  }

  const cancelIcon = document.createElement('i');
  cancelIcon.id = 'cancel-icon';
  cancelIcon.className = 'iconify';
  cancelIcon.setAttribute('data-icon', 'material-symbols-light:close');
  cancelIcon.setAttribute('onclick', '_closeMessage()');
  cancelIcon.style.cursor = 'pointer';

  iconContainer.appendChild(cancelIcon);

  return iconContainer;
}

function _getErrorElement(erro) {
  let location = "";
  if (erro?.showLocation) {
    const stackTrace = erro.error ? erro.error.stack : (new Error()).stack;
    const stackSplit = stackTrace.split('\n');
    location = stackSplit[2] ? stackSplit[2] : stackSplit[stackSplit.length - 1];
    location = location.split("/")[location.split("/").length - 1]
    location = location.trim().replace("at ", "");
  }

  let errorMessage = "";

  if (location && erro.error && erro.error instanceof Error) {
    errorMessage = `Erro "${erro.error.message}" localizado em ${location}`;
  } else if (erro.error && erro.error instanceof Error) {
    errorMessage = `Erro "${erro.error.message}"`;
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
function _getButton(botao) {
  switch (botao.tipo) {
    case 'tente-novamente':
      return _getTryAgainButton();
    case 'home':
      return _getHomeButton();
    case 'voltar':
      return _getBackButton(botao.acao);
    case 'fechar':
      return _getCloseButton();
    case 'cancelar':
      return _getCloseButton(translate('labels.cancel'), botao.acao);
    case 'confirmar':
      return _getConfirmButton(botao.acao);
    case 'apagar':
      return _getDeleteButton(botao.acao);
    case 'apagar-basico':
      return _getDeleteButtonBasic(botao.acao);
    default:
      return _getCloseButton(translate('labels.understood'));
  }
}

function _getHomeButton() {
  const homeButton = ['editar-viagem', 'editar-destino', 'editar-listagem'].includes(_getHTMLpage()) ? '../index.html' : 'index.html'
  const button = document.createElement('button');
  button.className = 'btn btn-theme btn-format';
  button.type = 'submit';
  button.setAttribute('onclick', `window.location.href = "${homeButton}";`)

  const icon = document.createElement('i');
  icon.id = 'transporte-nav';
  icon.className = 'iconify';
  icon.setAttribute('data-icon', 'bx:home');

  button.appendChild(icon);
  button.innerHTML += ` ${translate('labels.home')}`;

  return button;
}

function _getBackButton(redirectTo = 'index.html') {
  const button = document.createElement('button');
  button.className = 'btn btn-secondary btn-format';
  button.type = 'submit';
  button.setAttribute('onclick', `window.location.href = "${redirectTo}";`);
  button.id = 'message-back';

  const icon = document.createElement('i');
  icon.className = 'iconify';
  icon.setAttribute('data-icon', 'bx:home');

  button.appendChild(icon);
  button.innerHTML += ` ${translate('labels.home')}`;

  return button;
}

function _getTryAgainButton() {
  const button = document.createElement('button');
  button.className = 'btn btn-secondary btn-format';
  button.type = 'submit';
  button.setAttribute('onclick', 'window.location.reload(true);');
  button.id = 'message-try-again';

  const icon = document.createElement('i');
  icon.className = 'iconify';
  icon.setAttribute('data-icon', 'pajamas:retry');

  button.appendChild(icon);
  button.innerHTML += ` ${translate('labels.try_again')}`;

  return button;
}

function _getCloseButton(name, onclick) {
  name = name ? name : translate('labels.close');
  const button = document.createElement('button');
  button.className = 'btn btn-secondary btn-format';
  button.type = 'submit';
  button.setAttribute('onclick', onclick ? onclick : '_closeMessage();');
  button.id = 'message-close';

  button.innerHTML = name;
  return button;
}

function _getConfirmButton(onclick = '_closeMessage();') {
  const button = document.createElement('button');
  button.className = 'btn btn-theme btn-format';
  button.type = 'submit';
  button.setAttribute('onclick', onclick)
  button.id = 'message-confirm';

  button.innerHTML = translate('labels.confirm');
  return button;
}

function _getDeleteButton(onclick, buttonClass = 'btn-secondary') {
  const button = document.createElement('button');
  button.className = `btn ${buttonClass} btn-format`;
  button.type = 'submit';
  button.setAttribute('onclick', onclick);
  button.id = 'message-delete';

  const icon = document.createElement('i');
  icon.className = 'iconify';
  icon.setAttribute('data-icon', 'mingcute:delete-2-fill');

  button.appendChild(icon);
  button.innerHTML += ` ${translate('labels.delete')}`;

  return button;
}

function _getDeleteButtonBasic(onclick) {
  return _getDeleteButton(onclick, 'btn-basic');
}

function _openToast(text) {
  getID('toast-text').innerHTML = text;
  _fadeIn(['toast']);
  setTimeout(() => {
    _closeToast();
  }, 3000);
}

function _closeToast() {
  if (getID('toast').style.display != 'none') {
    _fadeOut(['toast']);
  }
}