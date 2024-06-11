// ======= Visibility JS =======
var CHANGED_SVGS = [];
var LOGO_CLARO = "";
var LOGO_ESCURO = "";

// 
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

function _loadVisibilityExternal() {
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
     THEME_COLOR_HOVER = _getDarkerColor(ESCURO, 10);
     THEME_COLOR_SECONDARY = _getDarkerColor(ESCURO);

     const name = _getHTMLpage();
     var link = document.createElement("link");
     link.href = _getCssHref(name, true) + '?version=' + new Date().getTime(); // Adiciona um timestamp como parâmetro de consulta
     link.type = "text/css";
     link.rel = "stylesheet";
     document.getElementsByTagName("head")[0].appendChild(link)

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
     THEME_COLOR_HOVER = _getLighterColor(CLARO, 10);
     THEME_COLOR_SECONDARY = _getLighterColor(CLARO);

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
     THEME_COLOR_HOVER = _getLighterColor(CLARO, 10);
     THEME_COLOR_SECONDARY = _getLighterColor(CLARO);

     _loadToggle();

     _loadTripViewerLogo();

     if (_isCustomColorsActive()) {
          _applyCustomVisibilityRules();
     }
}

function _loadTripViewerLogo() {
     const header2 = getID("header2");
     const logoLight = getID("logo-light");
     const logoDark = getID("logo-dark");
     if (_isOnDarkMode()) {
          logoLight.style.display = "none";
          logoDark.style.display = "block";
          if (header2 && LOGO_ESCURO) {
               header2.src = LOGO_ESCURO;
          }
     } else {
          logoLight.style.display = "block";
          logoDark.style.display = "none";
          if (header2 && LOGO_CLARO) {
               header2.src = LOGO_CLARO;
          }
     }
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
          case 'viagem':
               _loadLogoColors();
               _applyCustomColors();
               _loadTransporteImagens();
               break;
          case 'destinos':
               _loadLogoColors();
               _applyAccordionArrowCustomColor();
               _applyCustomColors();
               break;
          case 'gastos':
               _loadLogoColors();
               _applyCustomColors();
               _changeChartsLabelsVisibility();
               _loadMoedasTab();
               break;
     }
}


function _applyCustomColors() {
     _setCSSVariable('theme-color', THEME_COLOR);
     _setCSSVariable('theme-color-hover', THEME_COLOR_HOVER);
     _setCSSVariable('theme-color-secondary', THEME_COLOR_SECONDARY);
 }

function _disableScroll() {
     document.body.style.overflow = "hidden";
}

function _enableScroll() {
     document.body.style.overflow = "auto";
}

// ======= CHECKERS =======
function _hasCSSRule(selector, property) {
     let styleElement = document.getElementById('custom-styles');

     if (!styleElement) {
          return false; // Nenhum estilo customizado foi encontrado
     }

     const styleSheet = styleElement.sheet;

     for (let i = 0; i < styleSheet.cssRules.length; i++) {
          const cssRule = styleSheet.cssRules[i];
          if (cssRule.selectorText === selector) {
               if (cssRule.style.getPropertyValue(property)) {
                    return true;
               }
          }
     }
     return false;
}

function _isOnDarkMode() {
     return localStorage.getItem("darkMode") === "true";
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

function _addRemoveChildListener(type, i) {
     getID(`remove-${type}-${i}`).addEventListener('click', function () {
          _removeChildWithValidation(type, i);
     });
}

function _toggleFadingVisibility(id = 'copy-msg') {
     var div = getID(id);
     div.classList.toggle("visible");
     div.classList.toggle("hidden");

     if (div.classList.contains("visible")) {
          setTimeout(function () {
               div.classList.remove("visible");
               div.classList.add("hidden");
          }, 3000);
     }
}

function _searchDestinosListenerAction() {
     const childs = _getChildIDs('destinos-checkboxes');
     const search = getID('destinos-search').value.toLowerCase();

     for (const child of childs) {
          const j = _getJ(child);
          const label = getID(`check-label-${j}`).innerText.toLowerCase();
          getID(`checkbox-${j}`).style.display = label.includes(search) ? '' : 'none';
     }
}