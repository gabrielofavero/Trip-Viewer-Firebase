import { getID, getSecondaryIDs } from "../pages/selectors.js";
import { firstCharToUpperCase, removeEmptyChild, getPage } from "../pages/data/data.js";
import { getCurrentHour } from "../data/dates.js";
import { animateFadeIn, animateFadeOut } from "./animations.js";
import { DARK_COLOR, LIGHT_COLOR, THEME_COLOR, THEME_COLOR_HOVER, THEME_COLOR_SECONDARY, changeBarColorIOS, clearCustomColors, getDarkerColor, getLighterColor, getLocalColors, isCustomColorsActive, loadLogoColors, saveLocalColors, setCustomColors, setDarkColor, setLightColor, setThemeColor, setThemeColorHover, setThemeColorSecondary } from "./colors.js";
import { setCSSVariable } from "./stylesheets.js";
import { FIRESTORE_DATA } from "../firebase/database.js";

export var LOGO_LIGHT = "";
export var LOGO_DARK = "";

// Loaders
export function loadVisibility() {
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
     loadUserVisibility();

     getID("night-mode").onclick = function () {
          setManualVisibility();
          switchVisibility();
     };
}

export function loadExternalVisibility() {
     const localColors = getLocalColors();
     if (localColors) {
          setLightColor(localColors.claro);
          setDarkColor(localColors.escuro);
     }

     if (isOnDarkMode()) {
          loadDarkMode();
     } else {
          loadLightMode();
     }

     getID("night-mode").style.display = "block";
     getID("night-mode").onclick = function () {
          switchVisibility();
     };
}

export function loadVisibilityToggle() {
     var element = getID("night-mode");
     var darkMode = isOnDarkMode();
     if (darkMode && element.classList.contains("bx-moon")) {
          element.classList.remove("bx-moon");
          element.classList.add("bx-sun");
     } else if (!darkMode && element.classList.contains("bx-sun")) {
          element.classList.remove("bx-sun");
          element.classList.add("bx-moon");
     }
}

export function loadDarkMode() {
     localStorage.setItem("darkMode", true);
     setThemeColor(DARK_COLOR);
     setThemeColorHover(getDarkerColor(DARK_COLOR, 10));
     setThemeColorSecondary(getDarkerColor(DARK_COLOR));

     const name = getPage().split('/')[0];

     var link = document.createElement("link");
     link.href = getCssHref(name, true) + '?version=' + new Date().getTime(); // Adiciona um timestamp como parâmetro de consulta
     link.type = "text/css";
     link.rel = "stylesheet";
     document.getElementsByTagName("head")[0].appendChild(link)

     loadVisibilityToggle();
     changeBarColorIOS("#303030");

     loadTripViewerLogo();

     if (isCustomColorsActive()) {
          applyCustomVisibilityRules();
     }
}

export function loadLightMode() {
     localStorage.setItem("darkMode", false);
     setThemeColor(LIGHT_COLOR);
     setThemeColorHover(getLighterColor(LIGHT_COLOR, 10));
     setThemeColorSecondary(getLighterColor(LIGHT_COLOR));

     const name = getPage().split('/')[0];
     var link = document.createElement("link");
     link.href = getCssHref(name, false);
     link.type = "text/css";
     link.rel = "stylesheet";
     document.getElementsByTagName("head")[0].appendChild(link);

     loadVisibilityToggle();
     changeBarColorIOS("#fff");

     loadTripViewerLogo();

     if (isCustomColorsActive()) {
          applyCustomVisibilityRules();
     }
}

function loadLightModeLite() {
     localStorage.setItem("darkMode", false);
     setThemeColor(LIGHT_COLOR);
     setThemeColorHover(getLighterColor(LIGHT_COLOR, 10));
     setThemeColorSecondary(getLighterColor(LIGHT_COLOR));

     loadVisibilityToggle();

     loadTripViewerLogo();

     if (isCustomColorsActive()) {
          applyCustomVisibilityRules();
     }
}

function loadTripViewerLogo() {
     const header2 = getID("header2");
     const logoLight = getID("logo-light");
     const logoDark = getID("logo-dark");
     if (isOnDarkMode()) {
          logoLight.style.display = "none";
          logoDark.style.display = "block";
          if (header2 && LOGO_DARK) {
               header2.src = LOGO_DARK;
          }
     } else {
          logoLight.style.display = "block";
          logoDark.style.display = "none";
          if (header2 && LOGO_LIGHT) {
               header2.src = LOGO_LIGHT;
          }
     }
}

export function loadUserVisibility() {
     switch (sessionStorage.getItem("forceDarkMode")) {
          case "true":
               loadDarkMode();
               break;
          case "false":
               loadLightMode();
               break;
          default:
               autoVisibility();
     }
}

// Getters
function getCssHref(name, dark = false) {
     const darkMode = dark ? "-dark" : "";
     const editar = ["editar-viagem", "editar-destino", "editar-listagem"];

     if (editar.includes(name)) {
          return `../assets/css/editar/editar${darkMode}.css`
     } else {
          return `assets/css/${name}/${name}${darkMode}.css`
     }
}

// Setters
export function setLogoLight(logo) {
     LOGO_LIGHT = logo;
}

export function setLogoDark(logo) {
     LOGO_DARK = logo;
}

export function setManualVisibility() {
     sessionStorage.setItem("forceDarkMode", isOnDarkMode())
}

export function switchVisibility() {
     if (isOnDarkMode()) {
          loadLightMode();
     } else {
          loadDarkMode();
     }
}

export function refreshVisibility() {
     if (isOnDarkMode()) {
          loadDarkMode();
     } else {
          loadLightMode();
     }
}

function autoVisibility() {
     let now = getCurrentHour();
     if (now >= 18 || now < 6) {
          loadDarkMode();
     } else {
          loadLightModeLite();
     }
}

function applyCustomVisibilityRules() {
     const html = getPage()
     clearCustomColors();
     switch (html) {
          case 'view':
               loadLogoColors();
               applyCustomColors();
               _loadTransporteImagens();
               break;
          case 'destination':
               loadLogoColors();
               _applyAccordionArrowCustomColor();
               applyCustomColors();
               break;
          case 'expenses':
               loadLogoColors();
               applyCustomColors();
               _changeChartsLabelsVisibility();
               _loadMoedasTab();
               break;
     }
}

function applyCustomColors() {
     setCSSVariable('theme-color', THEME_COLOR);
     setCSSVariable('theme-color-hover', THEME_COLOR_HOVER);
     setCSSVariable('theme-color-secondary', THEME_COLOR_SECONDARY);
}

export function disableScroll() {
     document.body.style.overflow = "hidden";
}

export function enableScroll() {
     document.body.style.overflow = "auto";
}

// Validators
export function isOnDarkMode() {
     return localStorage.getItem("darkMode") === "true";
}