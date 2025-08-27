import { getID, getSecondaryIDs } from "../pages/selectors.js";
import { firstCharToUpperCase, removeChildWithValidation, removeEmptyChild, getPage } from "../pages/data/data.js";
import { getCurrentHour } from "../data/dates.js";
import { animateFadeIn, animateFadeOut } from "./animations.js";
import { DARK_COLOR, LIGHT_COLOR, THEME_COLOR, THEME_COLOR_HOVER, THEME_COLOR_SECONDARY, changeBarColorIOS, clearCustomColors, getDarkerColor, getLighterColor, getLocalColors, isCustomColorsActive, loadLogoColors, saveLocalColors, setCustomColors, setDarkColor, setLightColor, setThemeColor, setThemeColorHover, setThemeColorSecondary } from "./colors.js";
import { setCSSVariable } from "./stylesheets.js";

var CHANGED_SVGS = [];
var LOGO_CLARO = "";
var LOGO_ESCURO = "";

// 
function _loadVisibility() {
     try {
          if (FIRESTORE_DATA && FIRESTORE_DATA.cores && FIRESTORE_DATA.cores.ativo) {
               setCustomColors(true);
               localStorage.setItem("customColors", true);
               setLightColor(FIRESTORE_DATA.cores.claro);
               setDarkColor(FIRESTORE_DATA.cores.escuro);
          } else {
               setCustomColors(false);
               localStorage.setItem("customColors", false);
          }
     } catch (e) {
          setCustomColors(false);
          localStorage.setItem("customColors", false);
     }

     saveLocalColors();
     _loadUserVisibility();

     getID("night-mode").onclick = function () {
          _setManualVisibility();
          _switchVisibility();
     };
}

function _setManualVisibility() {
     sessionStorage.setItem("forceDarkMode", _isOnDarkMode())
}

function _loadVisibilityExternal() {
     const localColors = getLocalColors();
     if (localColors) {
          setLightColor(localColors.claro);
          setDarkColor(localColors.escuro);
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
     setThemeColor(DARK_COLOR);
     setThemeColorHover(getDarkerColor(DARK_COLOR, 10));
     setThemeColorSecondary(getDarkerColor(DARK_COLOR));

     const name = getPage().split('/')[0];

     var link = document.createElement("link");
     link.href = _getCssHref(name, true) + '?version=' + new Date().getTime(); // Adiciona um timestamp como parâmetro de consulta
     link.type = "text/css";
     link.rel = "stylesheet";
     document.getElementsByTagName("head")[0].appendChild(link)

     _loadToggle();
     changeBarColorIOS("#303030");

     _loadTripViewerLogo();

     if (isCustomColorsActive()) {
          _applyCustomVisibilityRules();
     }
}

function _loadLightMode() {
     localStorage.setItem("darkMode", false);
     setThemeColor(LIGHT_COLOR);
     setThemeColorHover(getLighterColor(LIGHT_COLOR, 10));
     setThemeColorSecondary(getLighterColor(LIGHT_COLOR));

     const name = getPage().split('/')[0];
     var link = document.createElement("link");
     link.href = _getCssHref(name, false);
     link.type = "text/css";
     link.rel = "stylesheet";
     document.getElementsByTagName("head")[0].appendChild(link);

     _loadToggle();
     changeBarColorIOS("#fff");

     _loadTripViewerLogo();

     if (isCustomColorsActive()) {
          _applyCustomVisibilityRules();
     }
}

function _loadLightModeLite() {
     localStorage.setItem("darkMode", false);
     setThemeColor(LIGHT_COLOR);
     setThemeColorHover(getLighterColor(LIGHT_COLOR, 10));
     setThemeColorSecondary(getLighterColor(LIGHT_COLOR));

     _loadToggle();

     _loadTripViewerLogo();

     if (isCustomColorsActive()) {
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
          return `../assets/css/editar/editar${darkMode}.css`
     } else {
          return `assets/css/${name}/${name}${darkMode}.css`
     }
}

// ======= SETTERS =======
function _loadUserVisibility() {
     switch (sessionStorage.getItem("forceDarkMode")) {
          case "true":
               _loadDarkMode();
               break;
          case "false":
               _loadLightMode();
               break;
          default:
               _autoVisibility();
     }
}

function _switchVisibility() {
     if (_isOnDarkMode()) {
          _loadLightMode();
     } else {
          _loadDarkMode();
     }
}

function _refreshVisibility() {
     if (_isOnDarkMode()) {
          _loadDarkMode();
     } else {
          _loadLightMode();
     }
}

function _autoVisibility() {
     let now = getCurrentHour();
     if (now >= 18 || now < 6) {
          _loadDarkMode();
     } else {
          _loadLightModeLite();
     }
}

function _applyCustomVisibilityRules() {
     const html = getPage()
     clearCustomColors();
     switch (html) {
          case 'view':
               loadLogoColors();
               _applyCustomColors();
               _loadTransporteImagens();
               break;
          case 'destination':
               loadLogoColors();
               _applyAccordionArrowCustomColor();
               _applyCustomColors();
               break;
          case 'expenses':
               loadLogoColors();
               _applyCustomColors();
               _changeChartsLabelsVisibility();
               _loadMoedasTab();
               break;
     }
}


function _applyCustomColors() {
     setCSSVariable('theme-color', THEME_COLOR);
     setCSSVariable('theme-color-hover', THEME_COLOR_HOVER);
     setCSSVariable('theme-color-secondary', THEME_COLOR_SECONDARY);
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
     animateFadeIn([modalID]);
}

function _closeModal(modalID = 'modal') {
     animateFadeOut([modalID], 'down');
}

export function isModalOpen(modalID = 'modal') {
     return getID(modalID).style.display === 'block';
}

// ======= Páginas de Editar =======
function _loadEditModule(categoria) {
     const habilitado = getID(`habilitado-${categoria}`);
     if (habilitado.checked) {
          _showContent(categoria);
          if (!getID(`habilitado-${categoria}-content`).innerText) {
               _add(firstCharToUpperCase(categoria).trim())
          }
     } else {
          _hideContent(categoria);
     }
     _loadListener(categoria);
}

function _loadListener(categoria) {
     const habilitado = getID(`habilitado-${categoria}`);
     habilitado.addEventListener('change', function () {
          if (habilitado.checked) {
               _showContent(categoria);
               const box = getID(`${categoria}-box`);
               const habilitadoContent = getID(`habilitado-${categoria}-content`);

               if ((box && !box.innerText) || (habilitadoContent && !habilitadoContent.innerText)) {
                    _add(firstCharToUpperCase(categoria).trim())
               }

          } else {
               removeEmptyChild(categoria);
               _hideContent(categoria);
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

function _addRemoveChildListener(categoria, j, customFunction = null) {
     getID(`remove-${categoria}-${j}`).addEventListener('click', function () {
          removeChildWithValidation(categoria, j);
          if (customFunction) {
               eval(customFunction);
          }
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
     const search = getID('destinos-search').value.toLowerCase();

     for (const j of getSecondaryIDs('destinos-checkboxes')) {
          const label = getID(`check-destinos-label-${j}`).innerText.toLowerCase();
          getID(`checkbox-${j}`).style.display = label.includes(search) ? '' : 'none';
     }
}