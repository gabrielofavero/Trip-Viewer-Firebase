// ======= Visibility JS =======
const INDEX = "index";
const VIAGEM = "viagem"
const PASSEIOS = "destinos";
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
     link.href = _getCssHref(name, true);
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
     link.href = _getCssHref(name, false);
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
               _applyCustomColorsDestinos();
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
     _fadeIn([modalID]);
}

function _closeModal(modalID = 'modal') {
     _fadeOut([modalID], 'down');
}

function _isModalOpen(modalID = 'modal') {
     return document.getElementById(modalID).style.display === 'block';
}

// ======= Páginas de Editar =======
function _loadEditModule(type, loadListener = true) {
     const habilitado = document.getElementById(`habilitado-${type}`);
     if (habilitado.checked) {
          _showContent(type);
          if (!document.getElementById(`habilitado-${type}-content`).innerText) {
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
     const habilitado = document.getElementById(`habilitado-${type}`);
     habilitado.addEventListener('change', function () {
          if (habilitado.checked) {
               _showContent(type);
               if (!document.getElementById(`habilitado-${type}-content`).innerText) {
                    _add(_firstCharToUpperCase(type).trim())
               }
          } else {
               _hideContent(type);
          }
     });
}

function _showContent(type) {
     const habilitadoContent = document.getElementById(`habilitado-${type}-content`);
     habilitadoContent.style.display = 'block';

     const adicionarBox = document.getElementById(`${type}-adicionar-box`);
     if (adicionarBox) {
          adicionarBox.style.display = 'block';
     }

     let i = 1;
     let text = `collapse-${type}-${i}`;

     while (document.getElementById(text)) {
          $(`#${text}`).collapse('hide');
          i++;
          text = `${type}-${i}`;
     }
}

function _hideContent(type) {
     const habilitadoContent = document.getElementById(`habilitado-${type}-content`);
     habilitadoContent.style.display = 'none';

     const adicionarBox = document.getElementById(`${type}-adicionar-box`);
     if (adicionarBox) {
          adicionarBox.style.display = 'none';
     }
}

function _loadImageSelector(type) {
     const checkboxLink = document.getElementById(`enable-link-${type}`);
     const checkboxUpload = document.getElementById(`enable-upload-${type}`);
     const checkboxGroup = document.getElementById(`upload-checkbox-${type}`);

     const link = document.getElementById(`link-${type}`);
     const upload = document.getElementById(`upload-${type}`);

     if (PERMISSOES && PERMISSOES['upload'] === true) {
          if (checkboxLink.checked) {
               link.style.display = 'block';
               upload.style.display = 'none';
          } else {
               link.style.display = 'none';
               upload.style.display = 'block';
          }

          checkboxLink.addEventListener('change', function () {
               if (checkboxLink.checked) {
                    link.style.display = 'block';
                    upload.style.display = 'none';
               } else {
                    link.style.display = 'none';
                    upload.style.display = 'block';
               }
          });
          checkboxUpload.addEventListener('change', function () {
               if (checkboxUpload.checked) {
                    link.style.display = 'none';
                    upload.style.display = 'block';
               } else {
                    link.style.display = 'block';
                    upload.style.display = 'none';
               }
          });
     } else {
          link.style.display = 'block';
          upload.style.display = 'none';
          checkboxGroup.style.display = 'none';
     }
}

function _removeImageSelectorListeners(type) {
     const checkboxLink = document.getElementById(`enable-link-${type}`);
     const checkboxUpload = document.getElementById(`enable-upload-${type}`);

     checkboxLink.removeEventListener('change', function () {
          if (checkboxLink.checked) {
               link.style.display = 'block';
               upload.style.display = 'none';
          } else {
               link.style.display = 'none';
               upload.style.display = 'block';
          }
     });
     checkboxUpload.removeEventListener('change', function () {
          if (checkboxUpload.checked) {
               link.style.display = 'none';
               upload.style.display = 'block';
          } else {
               link.style.display = 'block';
               upload.style.display = 'none';
          }
     });

}

function _loadLogoSelector() {
     const checkboxLink = document.getElementById(`enable-link-logo`);
     const checkboxUpload = document.getElementById(`enable-upload-logo`);

     const linkLight = document.getElementById(`link-logo-light`);
     const uploadLight = document.getElementById(`upload-logo-light`);

     const linkDark = document.getElementById(`link-logo-dark`);
     const uploadDark = document.getElementById(`upload-logo-dark`);

     if (checkboxLink.checked) {
          linkLight.style.display = 'block';
          linkDark.style.display = 'block';

          uploadLight.style.display = 'none';
          uploadDark.style.display = 'none';
     } else {
          linkLight.style.display = 'none';
          linkDark.style.display = 'none';

          uploadLight.style.display = 'block';
          uploadDark.style.display = 'block';
     }

     checkboxLink.addEventListener('change', function () {
          if (checkboxLink.checked) {
               linkLight.style.display = 'block';
               linkDark.style.display = 'block';

               uploadLight.style.display = 'none';
               uploadDark.style.display = 'none';
          } else {
               linkLight.style.display = 'none';
               linkDark.style.display = 'none';

               uploadLight.style.display = 'block';
               uploadDark.style.display = 'block';
          }
     });
     checkboxUpload.addEventListener('change', function () {
          if (checkboxUpload.checked) {
               linkLight.style.display = 'none';
               linkDark.style.display = 'none';

               uploadLight.style.display = 'block';
               uploadDark.style.display = 'block';
          } else {
               linkLight.style.display = 'block';
               linkDark.style.display = 'block';

               uploadLight.style.display = 'none';
               uploadDark.style.display = 'none';
          }
     });
}