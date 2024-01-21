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

function _loadUserIndexVisibility() {
  document.getElementById('index-unlogged-title').style.display = 'none';
  document.getElementById('index-logged-title').style.display = 'block';
  document.getElementById('login-box').style.display = 'none';
  document.getElementById('tripViewer').style.display = 'block';
  document.getElementById('profile-icon').style.display = 'block';
}

function _unloadUserIndexVisibility() {
  document.getElementById('index-unlogged-title').style.display = 'block';
  document.getElementById('index-logged-title').style.display = 'none';
  document.getElementById('login-box').style.display = 'block';
  document.getElementById('tripViewer').style.display = 'block';
  document.getElementById('profile-icon').style.display = 'none';
}

function _loadSettingsVisibility() {
  document.getElementById('index-unlogged-title').style.display = 'none';
  document.getElementById('index-logged-title').style.display = 'none';
  document.getElementById('login-box').style.display = 'none';
  document.getElementById('tripViewer').style.display = 'none';
  document.getElementById('profile-icon').style.display = 'block';
}

function _loadMyTripsVisibility() {
  document.getElementById('index-unlogged-title').style.display = 'none';
  document.getElementById('index-logged-title').style.display = 'none';
  document.getElementById('login-box').style.display = 'none';
  document.getElementById('tripViewer').style.display = 'none';
  document.getElementById('profile-icon').style.display = 'block';
}

function _loadMyPlacesVisibility() {
  document.getElementById('index-unlogged-title').style.display = 'none';
  document.getElementById('index-logged-title').style.display = 'none';
  document.getElementById('login-box').style.display = 'none';
  document.getElementById('logged-menu').style.display = 'none';
  document.getElementById('tripViewer').style.display = 'none';
  document.getElementById('profile-icon').style.display = 'block';
}

function _openDeleteModal(type, param) {
  switch (type) {
    case 'conta':
      document.getElementById('modal-text-title').innerText = "Apagar Conta";
      document.getElementById('apagar').onclick = function () {
        _deleteAccount();
      };
      _openModal();
      break;
    case 'viagem':
      document.getElementById('modal-text-title').innerText = "Apagar Viagem";
      document.getElementById('apagar').onclick = function () {
        _deleteTrip(param);
      };
      _openModal('delete-modal');
      break;
    case 'passeio':
      document.getElementById('modal-text-title').innerText = "Apagar Passeio";
      document.getElementById('apagar').onclick = function () {
        _deletePlace(param);
      };
      _openModal('delete-modal');
      break;
  }

}

function _closeDeleteModal() {
  _closeModal('delete-modal');
}