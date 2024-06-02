var THEME_COLOR;
var CLARO = "#5859a7";
var ESCURO = "#7f75b6";
var CUSTOM_COLORS = false;

// Loaders
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

// Getters
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

function _getLighterColor(hex, percentage=75) {
    let [r, g, b] = _hexToRgb(hex);

    r = Math.round(r + (255 - r) * (percentage / 100));
    g = Math.round(g + (255 - g) * (percentage / 100));
    b = Math.round(b + (255 - b) * (percentage / 100));

    return _rgbToHex(r, g, b);
}

function _getDarkerColor(hex, percentage=75) {
    let [r, g, b] = _hexToRgb(hex);

    r = Math.round(r * (1 - percentage / 100));
    g = Math.round(g * (1 - percentage / 100));
    b = Math.round(b * (1 - percentage / 100));

    return _rgbToHex(r, g, b);
}





// Setters
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

function _saveLocalColors() {
    var localColors = {
         claro: CLARO,
         escuro: ESCURO
    };
    localStorage.setItem("localColors", JSON.stringify(localColors));
}

// Converters
function _hexToRgb(hex) {
    hex = hex.replace(/^#/, '');

    let bigint = parseInt(hex, 16);
    let r = (bigint >> 16) & 255;
    let g = (bigint >> 8) & 255;
    let b = bigint & 255;

    return [r, g, b];
}

function _rgbToHex(r, g, b) {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
}


// Checkers
function _isCustomColorsActive() {
    const html = _getHTMLpage();
    if (html === 'destinos') {
         return localStorage.getItem("customColors") === "true";
    } else {
         return CUSTOM_COLORS
    }
}