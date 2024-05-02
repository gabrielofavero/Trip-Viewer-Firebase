// ======= Visibility JS =======
const INDEX = "index";
const VIAGEM = "viagem"
const PASSEIOS = "destinos";
var THEME_COLOR;
var CLARO = "#5859a7";
var ESCURO = "#7f75b6";
var CUSTOM_COLORS = false;
var CHANGED_SVGS = [];

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

     getID("night-mode").onclick = function () {
          _switchVisibility();
     };
}

function _loadLogoColors() {
     const lightColor1 = getID("light-color-1");
     const lightColor2 = getID("light-color-2");
     const darkColor1 = getID("dark-color-1");
     const darkColor2 = getID("dark-color-2");

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

     getID("night-mode").style.display = "block";
     getID("night-mode").onclick = function () {
          _switchVisibility();
     };
}

function _loadToggle() {
     var element = getID("night-mode");
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
     link.href = _getCssHref(name, true);
     link.type = "text/css";
     link.rel = "stylesheet";
     document.getElementsByTagName("head")[0].appendChild(link);

     _loadToggle();
     _ChangeBarColorIOS("#303030");

     _loadTripViewerLogo();

     if (_isCustomColorsActive()) {
          _applyCustomVisibilityRules();
     }
}

function _loadLightMode() {
     localStorage.setItem("darkMode", false);
     THEME_COLOR = CLARO;

     const name = _getHTMLpage();
     var link = document.createElement("link");
     link.href = _getCssHref(name, false);
     link.type = "text/css";
     link.rel = "stylesheet";
     document.getElementsByTagName("head")[0].appendChild(link);

     _loadToggle();
     _ChangeBarColorIOS("#fff");

     _loadTripViewerLogo();

     if (_isCustomColorsActive()) {
          _applyCustomVisibilityRules();
     }
}

function _loadLightModeLite() {
     localStorage.setItem("darkMode", false);
     THEME_COLOR = CLARO;

     _loadToggle();

     _loadTripViewerLogo();

     if (_isCustomColorsActive()) {
          _applyCustomVisibilityRules();
     }
}

function _loadTripViewerLogo() {
     try {
          const header2 = getID("header2");
          const logoLight = getID("logo-light");
          const logoDark = getID("logo-dark");
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
function _getCssHref(name, dark = false) {
     const darkMode = dark ? "-dark" : "";
     const editar = ["editar-viagem", "editar-destino", "editar-listagem"];

     if (editar.includes(name)) {
          return `assets/css/editar/editar${darkMode}.css`
     } else {
          return `assets/css/${name}/${name}${darkMode}.css`
     }
}

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

function _applyCustomVisibilityRules() {
     const html = _getHTMLpage()
     _clearCustomColors();
     switch (html) {
          case VIAGEM:
               _loadLogoColors();
               _applyCustomColorsViagem();
               _loadTransporteImagens();
               break;
          case PASSEIOS:
               _loadLogoColors();
               _applyCustomColorsDestinos();
               break;
          default:
               break;
     }
}

function _addCSSRule(selector, property, value) {
     const rule = `${property}: ${value};`;
     var styleElement = getID('custom-styles');

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

function _changeFillColorSVGs(className, color) {
     const svgElements = document.querySelectorAll(`.${className}`);
     if (svgElements.length > 0) {
          CHANGED_SVGS.push(className);
          svgElements.forEach(svgElement => {
               const pathElement = svgElement.querySelector('path');
               if (pathElement) {
                    pathElement.setAttribute('fill', color);
               }
          });
     }
}


function _clearCustomColors() {
     var styleElement = getID('custom-styles');
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
     _fadeIn([modalID]);
}

function _closeModal(modalID = 'modal') {
     _fadeOut([modalID], 'down');
}

function _isModalOpen(modalID = 'modal') {
     return getID(modalID).style.display === 'block';
}

// ======= Páginas de Editar =======
function _loadEditModule(type, loadListener = true) {
     const habilitado = getID(`habilitado-${type}`);
     if (habilitado.checked) {
          _showContent(type);
          if (!getID(`habilitado-${type}-content`).innerText) {
               _add(_firstCharToUpperCase(type).trim())
          }
     } else {
          _hideContent(type);
     }
     if (loadListener) {
          _loadListener(type);
     }
}

function _loadListener(type) {
     const habilitado = getID(`habilitado-${type}`);
     habilitado.addEventListener('change', function () {
          if (habilitado.checked) {
               _showContent(type);
               const box = getID(`${type}-box`);
               const habilitadoContent = getID(`habilitado-${type}-content`);

               if ((box && !box.innerText) || (habilitadoContent && !habilitadoContent.innerText)) {
                    _add(_firstCharToUpperCase(type).trim())
               }

          } else {
               _hideContent(type);
          }
     });
}

function _showContent(type) {
     const habilitadoContent = getID(`habilitado-${type}-content`);
     habilitadoContent.style.display = 'block';

     const adicionarBox = getID(`${type}-adicionar-box`);
     if (adicionarBox) {
          adicionarBox.style.display = 'block';
     }

     let i = 1;
     let text = `collapse-${type}-${i}`;

     while (getID(text)) {
          $(`#${text}`).collapse('hide');
          i++;
          text = `${type}-${i}`;
     }
}

function _hideContent(type) {
     const habilitadoContent = getID(`habilitado-${type}-content`);
     habilitadoContent.style.display = 'none';

     const adicionarBox = getID(`${type}-adicionar-box`);
     if (adicionarBox) {
          adicionarBox.style.display = 'none';
     }
}