// ======= Visibility JS =======

const INDEX = "index";
const PASSEIO = "places";
var DARK_MODE;
var THEME_COLOR;

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
     _loadLogoColors();
     //document.getElementById("trip-viewer-text").style.color = THEME_COLOR;
}
function _loadThemeColor(){
     if (_isOnDarkMode()){
          THEME_COLOR = FIRESTORE_DATA.cores.escuro;
     } else {
          THEME_COLOR = FIRESTORE_DATA.cores.claro;
     }
}

function _loadLogoColors(){
     const lightColor1 = document.getElementById("light-color-1");
     const lightColor2 = document.getElementById("light-color-2");
     const darkColor1 = document.getElementById("dark-color-1");
     const darkColor2 = document.getElementById("dark-color-2");

     lightColor1.style.fill = FIRESTORE_DATA.cores.claro;
     lightColor2.style.fill = FIRESTORE_DATA.cores.claro;
     darkColor1.style.fill = FIRESTORE_DATA.cores.escuro;
     darkColor2.style.fill = FIRESTORE_DATA.cores.escuro;
}

function _loadVisibilityPasseio() {
     if (localStorage.getItem("darkModePasseio") === "true") {
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
     let icon = _getNightModeIcon();
     var iClass = icon + " custom-nav-toggle";
     let id = document.getElementById("night-mode");
     id.innerHTML = `<i id="night-mode" class="${iClass}></i>`;
}

function _loadDarkMode() {
     var link = document.createElement("link");
     link.href = `assets/css/${_getCSSname()}-dark.css`;
     link.type = "text/css";
     link.rel = "stylesheet";
     document.getElementsByTagName("head")[0].appendChild(link);
     localStorage.setItem("darkModePasseio", true);
     _loadNightModeToggleHTML();
     _changeThemeColor("#303030");
     if (_isIndexHTML()) {
          DARK_MODE = true;
          _loadTripViewerLogo();
     }
}

function _loadLightMode() {
     var link = document.createElement("link");
     link.href = `assets/css/${_getCSSname()}.css`;
     link.type = "text/css";
     link.rel = "stylesheet";
     document.getElementsByTagName("head")[0].appendChild(link);
     DARK_MODE = false;
     localStorage.setItem("darkModePasseio", false);
     _loadNightModeToggleHTML();
     _changeThemeColor("#fff");
     if (_isIndexHTML()) {
          DARK_MODE = false;
          _loadTripViewerLogo();
     }
}

// ======= GETTERS =======
function _isOnDarkMode() {
     switch (_getHTMLpage()) {
          case INDEX:
               return DARK_MODE;
          case PASSEIO:
               return localStorage.getItem("darkModePasseio") === "true";
     }
}

function _getCSSname() {
     switch (_getHTMLpage()) {
          case INDEX:
               return "style";
          case PASSEIO:
               return "places";
     }
}

function _getNightModeIcon() {
     let checker;
     switch (_getHTMLpage()) {
          case INDEX:
               checker = DARK_MODE;
          case PASSEIO:
               checker = localStorage.getItem("darkModePasseio") === "true";
     }
     return checker ? "bx bx-sun" : "bx bx-moon";
}

// ======= SETTERS =======
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
     if (_isIndexHTML()) {
          DARK_MODE = false;
     };
     _loadNightModeToggleHTML();
     localStorage.setItem("darkModePasseio", false);
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
          //const text = document.getElementById("trip-viewer-text");
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
          //text.style.color = THEME_COLOR;
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
          case INDEX:
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
     }
}

function _disableScroll() {
     document.body.style.overflow = "hidden";
}

function _enableScroll() {
     document.body.style.overflow = "auto";
}
