function _loadVisibilityIndex() {
  const html = _getHTMLpage();

  if (html == 'index') {
    _loadUserVisibility();
  }

  _applyUserVisibility();
  _loadLogoColors();

  getID("night-mode").onclick = function () {
    _switchVisibility();
  };

  if (html == 'index') {
    getID("visibilidade-dinamico").addEventListener("click", function () {
      if (getID("visibilidade-dinamico").checked) {
        _autoVisibility();
        localStorage.setItem("visibilidade", "dinamico");
        _updateVisibility("dinamico");
      };
    });

    getID("visibilidade-claro").addEventListener("click", function () {
      if (getID("visibilidade-claro").checked) {
        _loadLightMode();
        localStorage.setItem("visibilidade", "claro");
        _updateVisibility("claro");
      }
    });

    getID("visibilidade-escuro").addEventListener("click", function () {
      if (getID("visibilidade-escuro").checked) {
        _loadDarkMode();
        localStorage.setItem("visibilidade", "escuro");
        _updateVisibility("escuro");
      }
    });
  }
}

async function _loadUserVisibility() {
  const visibility = await _getVisibility();
  let localVisibility = localStorage.getItem("visibilidade");
  if (visibility && visibility !== localVisibility && ['dinamico', 'claro', 'escuro'].includes(visibility)) {
    localStorage.setItem("visibilidade", visibility);
    _applyUserVisibility();
  }

  localVisibility = localStorage.getItem("visibilidade");
  switch (localVisibility) {
    case 'dinamico':
      getID("visibilidade-dinamico").checked = true;
      break;
    case 'claro':
      getID("visibilidade-claro").checked = true;
      break;
    case 'escuro':
      getID("visibilidade-escuro").checked = true;
      break;
    default:
      getID("visibilidade-dinamico").checked = true;
      break;
  }
}

function _expandContentBox() {
  const contentBox = document.querySelector('.content-box');
  contentBox.style.height = '600px'
  contentBox.style.transition = 'height 0.5s ease';
}

function _closeDeleteModal() {
  _closeModal('delete-modal');
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
      fadeOut = ['index-unlogged-title', 'login-box', 'viagens-box', 'destinos-box', 'settings-box', 'listagens-box'];

      if (from === 0 && to === 0) {
        fadeIn.push('profile-icon');
      }

      if (from > to) {
        fadeOutNoDirection = ['back'];
      }

      break;
    case 'unlogged':
      fadeIn = ['index-unlogged-title', 'login-box', 'tripViewer'];
      fadeOut = ['index-logged-title', 'logged-menu', 'profile-icon', 'viagens-box', 'destinos-box', 'settings-box', 'listagens-box', 'back'];
      break;
    case 'settings':
      fadeIn = ['settings-box'];
      fadeOut = ['index-unlogged-title', 'index-logged-title', 'login-box', 'tripViewer', 'viagens-box', 'destinos-box', 'listagens-box', 'logged-menu'];
      fadeInNoDirection = ['back'];
      horizontal = false;
      break;
    case 'viagens':
      fadeIn = ['viagens-box'];
      fadeOut = ['index-unlogged-title', 'index-logged-title', 'login-box', 'logged-menu', 'tripViewer', 'destinos-box', 'settings-box', 'listagens-box'];
      fadeInNoDirection = ['back'];
      break;
    case 'destinos':
      fadeIn = ['destinos-box'];
      fadeOut = ['index-unlogged-title', 'index-logged-title', 'login-box', 'logged-menu', 'tripViewer', 'viagens-box', 'settings-box', 'listagens-box'];
      fadeInNoDirection = ['back'];
      break;
    case 'listagens':
      fadeIn = ['listagens-box'];
      fadeOut = ['index-unlogged-title', 'index-logged-title', 'login-box', 'logged-menu', 'tripViewer', 'viagens-box', 'settings-box', 'destinos-box'];
      fadeInNoDirection = ['back'];
  }

  contentBox.style.overflowY = 'hidden';
  _animate(fadeIn, fadeOut, from, to, horizontal);
  _fadeIn(fadeInNoDirection);
  _fadeOut(fadeOutNoDirection);
  contentBox.style.overflowY = 'auto';
}