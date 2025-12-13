const notificationBar = {
  changed: false,
  claro: '',
  escuro: ''
}

function _loadVisibilityIndex() {
  _loadUserVisibility();
  _loadLogoColors();

  getID("night-mode").onclick = function () {
    _switchVisibility();
    _setManualVisibility();

    if (notificationBar.changed) {
      _applyNotificationBarColor();
    }
  };
}

function _expandContentBox() {
  const contentBox = document.querySelector('.content-box');
  contentBox.style.height = '600px'
  contentBox.style.transition = 'height 0.5s ease';
}

function _openIndexPage(id, from = 0, to = 0, horizontal = true) {
  const contentBox = select('.content-box');
  let fadeIn = [];
  let fadeOut = [];

  let fadeInNoDirection = [];
  let fadeOutNoDirection = [];

  switch (id) {
    case 'logged':
      fadeIn = ['index-logged-title', 'logged-menu', 'tripViewer'];
      fadeOut = ['index-unlogged-title', 'login-box', 'proximasViagens-box', 'viagensAnteriores-box', 'destinos-box', 'settings-box', 'listagens-box'];

      if (from === 0 && to === 0) {
        fadeIn.push('profile-icon');
      }

      if (from > to) {
        fadeOutNoDirection = ['back'];
      }

      break;
    case 'unlogged':
      fadeIn = ['index-unlogged-title', 'login-box', 'tripViewer'];
      fadeOut = ['index-logged-title', 'logged-menu', 'profile-icon', 'proximasViagens-box', 'viagensAnteriores-box', 'destinos-box', 'settings-box', 'listagens-box', 'back'];
      break;
    case 'settings':
      fadeIn = ['settings-box'];
      fadeOut = ['index-unlogged-title', 'index-logged-title', 'login-box', 'tripViewer', 'proximasViagens-box', 'viagensAnteriores-box', 'destinos-box', 'listagens-box', 'logged-menu'];
      fadeInNoDirection = ['back'];
      break;
    case 'proximasViagens':
      fadeIn = ['proximasViagens-box'];
      fadeOut = ['index-unlogged-title', 'index-logged-title', 'login-box', 'logged-menu', 'tripViewer', 'destinos-box', 'settings-box', 'listagens-box', 'viagensAnteriores-box'];
      fadeInNoDirection = ['back'];
      break;
    case 'viagensAnteriores':
      fadeIn = ['viagensAnteriores-box'];
      fadeOut = ['index-unlogged-title', 'index-logged-title', 'login-box', 'logged-menu', 'tripViewer', 'destinos-box', 'settings-box', 'listagens-box', 'proximasViagens-box'];
      fadeInNoDirection = ['back'];
      break;
    case 'destinos':
      fadeIn = ['destinos-box'];
      fadeOut = ['index-unlogged-title', 'index-logged-title', 'login-box', 'logged-menu', 'tripViewer', 'proximasViagens-box', 'viagensAnteriores-box', 'settings-box', 'listagens-box'];
      fadeInNoDirection = ['back'];
      break;
    case 'listagens':
      fadeIn = ['listagens-box'];
      fadeOut = ['index-unlogged-title', 'index-logged-title', 'login-box', 'logged-menu', 'tripViewer', 'proximasViagens-box', 'viagensAnteriores-box', 'settings-box', 'destinos-box'];
      fadeInNoDirection = ['back'];
  }

  contentBox.style.overflowY = 'hidden';
  _animate(fadeIn, fadeOut, from, to, horizontal);
  _fadeIn(fadeInNoDirection);
  _fadeOut(fadeOutNoDirection);
  contentBox.style.overflowY = 'auto';
}

function _loadNotificationBar() {
  if (CURRENT_TRIPS.length > 0) {
    getID('notification-bar').style.display = 'flex';
    if (CURRENT_TRIPS.length == 1) {
      getID('notification-text').innerHTML = `${translate('trip.current_single')}:<br>${CURRENT_TRIPS[0].titulo}`;
      if (CURRENT_TRIPS[0].cores.ativo) {
        notificationBar.changed = true;
        notificationBar.claro = CURRENT_TRIPS[0].cores.claro;
        notificationBar.escuro = CURRENT_TRIPS[0].cores.escuro;
        _applyNotificationBarColor();
      }
    } else {
      getID('notification-text').innerHTML = `${translate('trip.current_multi_1')}<br> ${translate('trip.current_multi_2')}"`;
      getID('notification-link').style.display = 'none';
    }
  }
}

function closeNotification() {
  document.querySelector('.notification-bar').style.display = 'none';
}

function _applyNotificationBarColor() {
  getID('notification-bar').style.backgroundColor = _isOnDarkMode() ? notificationBar.escuro : notificationBar.claro;
}