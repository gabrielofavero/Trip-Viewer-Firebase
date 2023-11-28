function _loadVisibilityIndex() {
  _autoVisibility();
  _loadLogoColors();
  document.getElementById("night-mode").onclick = function () {
    _switchVisibility();
  };
  window.addEventListener("resize", function () {
    _adjustButtonsPosition();
  });
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
  document.getElementById('icons-box').style.display = 'block';
  document.getElementById('logged-menu').style.display = 'block';
  document.getElementById('tripViewer').style.display = 'block';
  document.getElementById('myTrips-box').style.display = 'none';
  document.getElementById('myPlaces-box').style.display = 'none';
  document.getElementById('settings-box').style.display = 'none';
}

function _unloadUserIndexVisibility() {
  document.getElementById('index-unlogged-title').style.display = 'block';
  document.getElementById('index-logged-title').style.display = 'none';
  document.getElementById('icons-box').style.display = 'none';
  document.getElementById('login-box').style.display = 'block';
  document.getElementById('logged-menu').style.display = 'none';
  document.getElementById('tripViewer').style.display = 'block';
  document.getElementById('myTrips-box').style.display = 'none';
  document.getElementById('myPlaces-box').style.display = 'none';
  document.getElementById('settings-box').style.display = 'none';
}

function _loadSettingsVisibility() {
  document.getElementById('index-unlogged-title').style.display = 'none';
  document.getElementById('index-logged-title').style.display = 'none';
  document.getElementById('icons-box').style.display = 'block';
  document.getElementById('login-box').style.display = 'none';
  document.getElementById('logged-menu').style.display = 'none';
  document.getElementById('tripViewer').style.display = 'none';
  document.getElementById('myTrips-box').style.display = 'none';
  document.getElementById('myPlaces-box').style.display = 'none';
  document.getElementById('settings-box').style.display = 'block';
}

function _loadMyTripsVisibility() {
  document.getElementById('index-unlogged-title').style.display = 'none';
  document.getElementById('index-logged-title').style.display = 'none';
  document.getElementById('icons-box').style.display = 'block';
  document.getElementById('login-box').style.display = 'none';
  document.getElementById('logged-menu').style.display = 'none';
  document.getElementById('tripViewer').style.display = 'none';
  document.getElementById('myTrips-box').style.display = 'block';
  document.getElementById('myPlaces-box').style.display = 'none';
  document.getElementById('settings-box').style.display = 'none';
}

function _loadMyPlacesVisibility() {
  document.getElementById('index-unlogged-title').style.display = 'none';
  document.getElementById('index-logged-title').style.display = 'none';
  document.getElementById('icons-box').style.display = 'block';
  document.getElementById('login-box').style.display = 'none';
  document.getElementById('logged-menu').style.display = 'none';
  document.getElementById('tripViewer').style.display = 'none';
  document.getElementById('myTrips-box').style.display = 'none';
  document.getElementById('myPlaces-box').style.display = 'block';
  document.getElementById('settings-box').style.display = 'none';
}

function _confirmDelete() {
  var modal = document.getElementById('deleteAccountModal');
  modal.style.display = 'block';
}

function _indexCloseModal() {
  var modal = document.getElementById('deleteAccountModal');
  modal.style.display = 'none';
}

function _deleteAccount() {
  alert('Função desabilitada por hora!');
  // _deleteAccount();
  _indexCloseModal;
}