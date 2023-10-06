// ======= Visibility JS =======

const INDEX = "index";
const PASSEIO = "places";
var DARK_MODE;

const THEME_COLOR_DARK = "#8a7171";
const THEME_COLOR_LIGHT = "#AF8F8E";

// ======= LOADERS =======
function _loadVisibility() {
     _autoVisibility();
     document.getElementById("night-mode").onclick = function () {
          _switchVisibility();
     };
     window.addEventListener("resize", function () {
          _adjustButtonsPosition();
     });
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
     document.getElementById("logo").src = "assets/img/logo-full-dark.png";
     _loadNightModeToggleHTML();
     _changeThemeColor("#303030");
     if (_isIndexHTML()) {
          DARK_MODE = true;
          _changeHeaderImg();
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
     document.getElementById("logo").src = "assets/img/logo-full.png";
     _loadNightModeToggleHTML();
     _changeThemeColor("#fff");
     if (_isIndexHTML()) {
          DARK_MODE = false;
          _changeHeaderImg();
     }
}

// ======= GETTERS =======
function _getDarkModeInfo() {
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
     if (_getDarkModeInfo()) {
          _loadLightMode();
     } else {
          _loadDarkMode();
     }
     _adjustButtonsPosition();
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

function _changeHeaderImg() {
     try {
          if (HEADER_IMG_ACTIVE) {
               document.getElementById("header2").src = DARK_MODE ? FIRESTORE_DATA.imagem.escuro : FIRESTORE_DATA.imagem.claro;
          }
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
