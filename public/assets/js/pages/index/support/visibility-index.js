function _loadVisibilityIndex() {
  const html = _getHTMLpage();

  if (html == 'index') {
    _loadUserVisibility();
  }

  _applyUserVisibility();
  _loadLogoColors();

  document.getElementById("night-mode").onclick = function () {
    _switchVisibility();
  };

  if (html == 'index') {
    document.getElementById("visibilidade-dinamico").addEventListener("click", function () {
      if (document.getElementById("visibilidade-dinamico").checked) {
        _autoVisibility();
        localStorage.setItem("visibilidade", "dinamico");
        _updateVisibility("dinamico");
      };
    });

    document.getElementById("visibilidade-claro").addEventListener("click", function () {
      if (document.getElementById("visibilidade-claro").checked) {
        _loadLightMode();
        localStorage.setItem("visibilidade", "claro");
        _updateVisibility("claro");
      }
    });

    document.getElementById("visibilidade-escuro").addEventListener("click", function () {
      if (document.getElementById("visibilidade-escuro").checked) {
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
      document.getElementById("visibilidade-dinamico").checked = true;
      break;
    case 'claro':
      document.getElementById("visibilidade-claro").checked = true;
      break;
    case 'escuro':
      document.getElementById("visibilidade-escuro").checked = true;
      break;
    default:
      document.getElementById("visibilidade-dinamico").checked = true;
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

function _openIndexPage(id, from=0, to=0) {
  let fadeIn = [];
  let fadeOut = [];

  switch (id) {
    case 'logged':
      fadeIn = ['index-logged-title', 'logged-menu', 'tripViewer', 'profile-icon'];
      fadeOut = ['index-unlogged-title', 'login-box', 'viagens-box', 'destinos-box', 'settings-box', 'listagens-box', 'back'];
      break;
    case 'unlogged':
      fadeIn = ['index-unlogged-title', 'login-box', 'tripViewer'];
      fadeOut = ['index-logged-title', 'logged-menu', 'profile-icon', 'viagens-box', 'destinos-box', 'settings-box', 'listagens-box', 'back'];
      break;
    case 'settings':
      fadeIn = ['settings-box', 'profile-icon', 'back'];
      fadeOut = ['index-unlogged-title', 'index-logged-title', 'login-box', 'logged-menu', 'tripViewer', 'viagens-box', 'destinos-box', 'listagens-box'];
      break;
    case 'viagens':
      fadeIn = ['viagens-box', 'profile-icon', 'back'];
      fadeOut = ['index-unlogged-title', 'index-logged-title', 'login-box', 'logged-menu', 'tripViewer', 'destinos-box', 'settings-box', 'listagens-box'];
      break;
    case 'destinos':
      fadeIn = ['destinos-box', 'profile-icon', 'back'];
      fadeOut = ['index-unlogged-title', 'index-logged-title', 'login-box', 'logged-menu', 'tripViewer', 'viagens-box', 'settings-box', 'listagens-box'];
      break;
    case 'listagens':
      fadeIn = ['listagens-box', 'profile-icon', 'back'];
      fadeOut = ['index-unlogged-title', 'index-logged-title', 'login-box', 'logged-menu', 'tripViewer', 'viagens-box', 'settings-box', 'destinos-box'];
  }

  _animate(fadeIn, fadeOut, from, to);
}