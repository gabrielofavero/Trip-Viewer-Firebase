var THEME_COLOR;
var THEME_COLOR_HOVER;
var THEME_COLOR_SECONDARY;
var CLARO = "#5859a7";
var ESCURO = "#7f75b6";
var CUSTOM_COLORS = false;
var BOX_COLOR = {
    claro: "#f1f1f1",
    escuro: "#404040"
}

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

function _getLighterColor(hex, percentage = 75) {
    let [r, g, b] = _hexToRgb(hex);

    r = Math.round(r + (255 - r) * (percentage / 100));
    g = Math.round(g + (255 - g) * (percentage / 100));
    b = Math.round(b + (255 - b) * (percentage / 100));

    return _rgbToHex(r, g, b);
}

function _getDarkerColor(hex, percentage = 75) {
    let [r, g, b] = _hexToRgb(hex);

    r = Math.round(r * (1 - percentage / 100));
    g = Math.round(g * (1 - percentage / 100));
    b = Math.round(b * (1 - percentage / 100));

    return _rgbToHex(r, g, b);
}

function _getColorIndexFromOptions(i) {
    if (i >= CONFIG.cores.opcoes.length) {
        i = i % CONFIG.cores.opcoes.length;
    }
    return i;
}

function _getMixedColor(mainColor, mixColor, mixColorPercentage = 85) {
    let [r1, g1, b1] = _hexToRgb(mainColor);
    let [r2, g2, b2] = _hexToRgb(mixColor);

    let r = Math.round((r1 * (100 - mixColorPercentage) + r2 * mixColorPercentage) / 100);
    let g = Math.round((g1 * (100 - mixColorPercentage) + g2 * mixColorPercentage) / 100);
    let b = Math.round((b1 * (100 - mixColorPercentage) + b2 * mixColorPercentage) / 100);

    return _rgbToHex(r, g, b);
}

function _getSecondaryColor(type) {
    const mainColor = type == 'claro' ? CLARO : ESCURO;
    const mixColor = BOX_COLOR[type];
    return _getMixedColor(mainColor, mixColor);
}

function _getColorNameFromOptions(i) {
    return CONFIG.cores.opcoes[_getColorIndexFromOptions(i)].cor;
}

function _getColorHexFromOptions(i) {
    return CONFIG.cores.opcoes[_getColorIndexFromOptions(i)].hex;
}

function _getThemeColorBoxShadow(cor=THEME_COLOR_SECONDARY) {
    const rgba = _hexToRgbText(cor, 0.15);
    return `0 0 1px 0 ${rgba}, 0 6px 12px 0 ${rgba};`
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

function _rgbToText(r, g, b, a) {
    if (a) {
        return `rgba(${r}, ${g}, ${b}, ${a})`;
    } else {
        return `rgb(${r}, ${g}, ${b})`;
    }
}

function _hexToRgbText(hex, a) {
    let [r, g, b] = _hexToRgb(hex);
    return _rgbToText(r, g, b, a);
}


// Checkers
function _isCustomColorsActive() {
    const html = _getHTMLpage();
    if (html === 'destinos' || html === 'gastos') {
        return localStorage.getItem("customColors") === "true";
    } else {
        return CUSTOM_COLORS
    }
}