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