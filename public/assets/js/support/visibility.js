// ======= Visibility JS =======
const INDEX = "index";
const VIAGEM = "viagem"
const PASSEIOS = "passeios";
var THEME_COLOR;
var CLARO = "#5859a7";
var ESCURO = "#7f75b6";
var CUSTOM_COLORS = false;

// ======= LOADERS =======
function _loadVisibility() {
     try {
          if (FIRESTORE_DATA && FIRESTORE_DATA.cores && FIRESTORE_DATA.cores.ativo) {
               CUSTOM_COLORS = true;
               localStorage.setItem("customColors", true);
               CLARO = FIRESTORE_DATA.cores.claro;
               ESCURO = FIRESTORE_DATA.cores.escuro;
          } else {
               CUSTOM_COLORS = false;
               localStorage.setItem("customColors", false);
          }
     } catch (e) {
          CUSTOM_COLORS = false;
          localStorage.setItem("customColors", false);
     }

     _saveLocalColors();
     _applyUserVisibility();

     document.getElementById("night-mode").onclick = function () {
          _switchVisibility();
     };
}

function _loadLogoColors() {
     const lightColor1 = document.getElementById("light-color-1");
     const lightColor2 = document.getElementById("light-color-2");
     const darkColor1 = document.getElementById("dark-color-1");
     const darkColor2 = document.getElementById("dark-color-2");

     lightColor1.style.fill = CLARO;
     lightColor2.style.fill = CLARO;
     darkColor1.style.fill = ESCURO;
     darkColor2.style.fill = ESCURO;
}

function _loadVisibilityPasseio() {
     const localColors = _getLocalColors();
     if (localColors) {
          CLARO = localColors.claro;
          ESCURO = localColors.escuro;
     }

     if (_isOnDarkMode()) {
          _loadDarkMode();
     } else {
          _loadLightMode();
     }

     document.getElementById("night-mode").style.display = "block";
     document.getElementById("night-mode").onclick = function () {
          _switchVisibility();
     };
}

function _loadToggle() {
     var element = document.getElementById("night-mode");
     var darkMode = _isOnDarkMode();
     if (darkMode && element.classList.contains("bx-moon")) {
          element.classList.remove("bx-moon");
          element.classList.add("bx-sun");
     } else if (!darkMode && element.classList.contains("bx-sun")) {
          element.classList.remove("bx-sun");
          element.classList.add("bx-moon");
     }
}

function _loadDarkMode() {
     localStorage.setItem("darkMode", true);
     THEME_COLOR = ESCURO;

     const name = _getHTMLpage();
     var link = document.createElement("link");
     link.href = `assets/css/${name}/${name}-dark.css`;
     link.type = "text/css";
     link.rel = "stylesheet";
     document.getElementsByTagName("head")[0].appendChild(link);

     _loadToggle();
     _ChangeBarColorIOS("#303030");

     _loadTripViewerLogo();

     if (_isCustomColorsActive()) {
          _applyCustomColors();
     }
}

function _loadLightMode() {
     localStorage.setItem("darkMode", false);
     THEME_COLOR = CLARO;

     const name = _getHTMLpage();
     var link = document.createElement("link");
     link.href = `assets/css/${name}/${name}.css`;
     link.type = "text/css";
     link.rel = "stylesheet";
     document.getElementsByTagName("head")[0].appendChild(link);

     _loadToggle();
     _ChangeBarColorIOS("#fff");

     _loadTripViewerLogo();

     if (_isCustomColorsActive()) {
          _applyCustomColors();
     }
}

function _loadLightModeLite() {
     localStorage.setItem("darkMode", false);
     THEME_COLOR = CLARO;

     _loadToggle();

     _loadTripViewerLogo();

     if (_isCustomColorsActive()) {
          _applyCustomColors();
     }
}

function _loadTripViewerLogo() {
     try {
          const header2 = document.getElementById("header2");
          const logoLight = document.getElementById("logo-light");
          const logoDark = document.getElementById("logo-dark");
          if (_isOnDarkMode()) {
               logoLight.style.display = "none";
               logoDark.style.display = "block";
               if (HEADER_IMG_ACTIVE) {
                    header2.src = FIRESTORE_DATA.imagem.escuro;
               }
          } else {
               logoLight.style.display = "block";
               logoDark.style.display = "none";
               if (HEADER_IMG_ACTIVE) {
                    header2.src = FIRESTORE_DATA.imagem.claro;
               }
          }
     } catch (e) { }
}

// ======= GETTERS =======
function _getLocalColors() {
     try {
          return JSON.parse(localStorage.getItem("localColors"));
     } catch (e) {
          return null;
     }
}

function _getEquivalentColorAndPosition(claro) {
     const claroObj = CONFIG.cores.claro;
     const escuroObj = CONFIG.cores.escuro;

     for (let i = 0; i < claroObj.length; i++) {
          if (claroObj[i] === claro) {
               return { position: i, equivalent: escuroObj[i] };
          }
     }

     return {};
}

// ======= SETTERS =======
function _applyUserVisibility() {
     switch (localStorage.getItem("visibilidade")) {
          case "escuro":
               _loadDarkMode();
               break;
          case "claro":
               _loadLightMode();
               break;
          default:
               _autoVisibility();
     }
}

function _setLightModeVariable() {
     localStorage.setItem("darkMode", false);
}

function _switchVisibility() {
     if (_isOnDarkMode()) {
          _loadLightMode();
     } else {
          _loadDarkMode();
     }
}

function _autoVisibility() {
     let now = _getCurrentHour();
     if (now >= 18 || now < 6) {
          _loadDarkMode();
     } else {
          _loadLightModeLite();
     }
}

function _applyCustomColors() {
     const html = _getHTMLpage()
     _clearCustomColors();
     switch (html) {
          case VIAGEM:
               _loadLogoColors();
               _applyCustomColorsViagem();
               break;
          case PASSEIOS:
               _loadLogoColors();
               _applyCustomColorsPasseios();
               break;
          default:
               break;
     }
}

function _addCSSRule(selector, property, value) {
     const rule = `${property}: ${value};`;
     var styleElement = document.getElementById('custom-styles');

     if (!styleElement) {
          styleElement = document.createElement('style');
          styleElement.id = 'custom-styles';
          document.head.appendChild(styleElement);
     }

     var styleSheet = styleElement.sheet;

     if (styleSheet.insertRule) {
          styleSheet.insertRule(selector + '{ ' + rule + ' }', 0);
     } else if (styleSheet.addRule) {
          styleSheet.addRule(selector, rule, 0);
     }
}

function _clearCustomColors() {
     var styleElement = document.getElementById('custom-styles');
     if (styleElement) {
          styleElement.parentNode.removeChild(styleElement);
     }
}

function _ChangeBarColorIOS(color) {     
     let metaThemeColor = document.querySelector("meta[name=theme-color]");
     metaThemeColor.setAttribute("content", color);
}

function _disableScroll() {
     document.body.style.overflow = "hidden";
}

function _enableScroll() {
     document.body.style.overflow = "auto";
}

function _saveLocalColors() {
     var localColors = {
          claro: CLARO,
          escuro: ESCURO
     };
     localStorage.setItem("localColors", JSON.stringify(localColors));
}

// ======= CHECKERS =======
function _isOnDarkMode() {
     return localStorage.getItem("darkMode") === "true";
}

function _isCustomColorsActive() {
     const html = _getHTMLpage();
     if (html === PASSEIOS) {
          return localStorage.getItem("customColors") === "true";
     } else {
          return CUSTOM_COLORS
     }
}

// ======= Modal Functions =======
function _openModal(modalID = 'modal') {
     document.getElementById(modalID).style.display = 'block';
}

function _closeModal(modalID = 'modal') {
     document.getElementById(modalID).style.display = 'none';
}

function _isModalOpen(modalID = 'modal') {
     return document.getElementById(modalID).style.display === 'block';
}