// ======= Visibility JS =======

const INDEX = "index";
const VIAGEM = "viagem"
const PASSEIO = "places";
var THEME_COLOR;
var CLARO = "#5859a7";
var ESCURO = "#7f75b6";

// ======= LOADERS =======
function _loadVisibility() {
     _autoVisibility();
     document.getElementById("night-mode").onclick = function () {
          _switchVisibility();
     };
     window.addEventListener("resize", function () {
          _adjustButtonsPosition();
     });
     _loadThemeColor();
     if (_isViagemHTML()) {
          _loadLogoColors();
     }
     document.getElementById("trip-viewer-text").style.color = THEME_COLOR;
}

function _loadThemeColor(){
     try {
          if (FIRESTORE_DATA && FIRESTORE_DATA.cores){
               CLARO = FIRESTORE_DATA.cores.claro;
               ESCURO = FIRESTORE_DATA.cores.escuro;
          }
     } catch (e) { }

     if (_isOnDarkMode()){
          THEME_COLOR = CLARO;
     } else {
          THEME_COLOR = ESCURO;
     }
}

function _loadLogoColors(){
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
     if (localStorage.getItem("darkMode") === "true") {
          _loadDarkMode();
     } else {
          _loadLightMode();
     }
     _adjustButtonsPosition();
     document.getElementById("night-mode").style.display = "block";
     document.getElementById("night-mode").onclick = function () {
          _switchVisibility();
     };
}

function _loadNightModeToggleHTML() {
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
     var link = document.createElement("link");
     link.href = `assets/css/${_getCSSname()}-dark.css`;
     link.type = "text/css";
     link.rel = "stylesheet";
     document.getElementsByTagName("head")[0].appendChild(link);
     _setDarkModeVariable();
     _loadNightModeToggleHTML();
     _changeThemeColor("#303030");
     localStorage.setItem("darkMode", true);
     if (_isViagemHTML()) {
          _loadTripViewerLogo();
     }
}

function _loadLightMode() {
     var link = document.createElement("link");
     link.href = `assets/css/${_getCSSname()}.css`;
     link.type = "text/css";
     link.rel = "stylesheet";
     document.getElementsByTagName("head")[0].appendChild(link);
     _setLightModeVariable();
     _loadNightModeToggleHTML();
     _changeThemeColor("#fff");
     localStorage.setItem("darkMode", false);
     if (_isViagemHTML()) {
          _loadTripViewerLogo();
     }
}

// ======= GETTERS =======
function _isOnDarkMode() {
     return localStorage.getItem("darkMode") === "true";
}

function _getCSSname() {
     switch (_getHTMLpage()) {
          case INDEX:
               return "index";
          case PASSEIO:
               return "places";
          case VIAGEM:
               return "viagem";
     }
}

// ======= SETTERS =======

function _setDarkModeVariable(){
     localStorage.setItem("darkMode", true);
}

function _setLightModeVariable(){
     localStorage.setItem("darkMode", false);
}

function _switchVisibility() {
     if (_isOnDarkMode()) {
          _loadLightMode();
     } else {
          _loadDarkMode();
     }
     _adjustButtonsPosition();
     _loadThemeColor();
}

function _autoVisibility() {
     let now = _getCurrentHour();
     if (now >= 18 || now < 6) {
          _loadDarkMode();
     } else {
          _lightModeLite();
     }
}

function _lightModeLite() {
     _setLightModeVariable();
     _loadNightModeToggleHTML();
}

function _changeThemeColor(color) {
     // Useful for iOS devices     
     let metaThemeColor = document.querySelector("meta[name=theme-color]");
     metaThemeColor.setAttribute("content", color);
}

function _loadTripViewerLogo() {
     try {
          const header2 = document.getElementById("header2");
          const logoLight = document.getElementById("logo-light");
          const logoDark = document.getElementById("logo-dark");
          const text = document.getElementById("trip-viewer-text");
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
          text.style.color = THEME_COLOR;
     } catch (e) { }
}

function _adjustButtonsPosition() {
     const nightMode = document.getElementById("night-mode");
     const first = "10px";
     const second = "60px";
     const third = "100px";
     const fourth = "140px";

     // Padrão: Desktop

     switch (_getHTMLpage()) {
          case VIAGEM:
               const account = document.getElementById("account");
               const share = document.getElementById("share");
               if (_isOnMobileMode()) {
                    account.style.right = second;
                    share.style.right = third;
                    nightMode.style.right = fourth;
               } else {
                    account.style.right = first;
                    share.style.right = second;
                    nightMode.style.right = third;
               }
               break;
          case PASSEIO:
               nightMode.style.right = second;
               break;
          case INDEX:
               nightMode.style.right = first;
     }
}

function _disableScroll() {
     document.body.style.overflow = "hidden";
}

function _enableScroll() {
     document.body.style.overflow = "auto";
}
