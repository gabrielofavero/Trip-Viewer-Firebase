import { getID } from "../pages/selectors.js";
import { getJson, getPage } from "../data/data.js";

export const COLORS = await getJson("/assets/json/cores.json");

export var THEME_COLOR;
export var THEME_COLOR_HOVER;
export var THEME_COLOR_SECONDARY;
export var LIGHT_COLOR = "#5859a7";
export var DARK_COLOR = "#7f75b6";
var CUSTOM_COLORS = false;

// Loaders
export function loadLogoColors() {
    const lightColor1 = getID("light-color-1");
    const lightColor2 = getID("light-color-2");
    const darkColor1 = getID("dark-color-1");
    const darkColor2 = getID("dark-color-2");

    lightColor1.style.fill = LIGHT_COLOR;
    lightColor2.style.fill = LIGHT_COLOR;
    darkColor1.style.fill = DARK_COLOR;
    darkColor2.style.fill = DARK_COLOR;
}

// Getters
export function getLocalColors() {
    try {
        return JSON.parse(localStorage.getItem("localColors"));
    } catch (e) {
        return null;
    }
}

export function getLighterColor(hex, percentage = 75) {
    let [r, g, b] = hexToRgb(hex);

    r = Math.round(r + (255 - r) * (percentage / 100));
    g = Math.round(g + (255 - g) * (percentage / 100));
    b = Math.round(b + (255 - b) * (percentage / 100));

    return rgbToHex(r, g, b);
}

export function getDarkerColor(hex, percentage = 75) {
    let [r, g, b] = hexToRgb(hex);

    r = Math.round(r * (1 - percentage / 100));
    g = Math.round(g * (1 - percentage / 100));
    b = Math.round(b * (1 - percentage / 100));

    return rgbToHex(r, g, b);
}

function getColorIndexFromOptions(i) {
    if (i >= COLORS.opcoes.length) {
        i = i % COLORS.opcoes.length;
    }
    return i;
}

export function getColorNameFromOptions(i) {
    return COLORS.opcoes[getColorIndexFromOptions(i)].cor;
}


// Setters

export function setThemeColor(color) {
    THEME_COLOR = color;
}

export function setThemeColorHover(color) {
    THEME_COLOR_HOVER = color;
}

export function setThemeColorSecondary(color) {
    THEME_COLOR_SECONDARY = color;
}

export function setLightColor(color) {
    LIGHT_COLOR = color;
}

export function setDarkColor(color) {
    DARK_COLOR = color;
}

export function setCustomColors(bool) {
    CUSTOM_COLORS = bool;
}

export function clearCustomColors() {
    var styleElement = getID('custom-styles');
    if (styleElement) {
        styleElement.parentNode.removeChild(styleElement);
    }
}

export function changeBarColorIOS(color) {
    let metaThemeColor = document.querySelector("meta[name=theme-color]");
    metaThemeColor.setAttribute("content", color);
}

export function saveLocalColors() {
    var localColors = {
        claro: LIGHT_COLOR,
        escuro: DARK_COLOR
    };
    localStorage.setItem("localColors", JSON.stringify(localColors));
}

// Converters
export function hexToRgb(hex) {
    hex = hex.replace(/^#/, '');

    let bigint = parseInt(hex, 16);
    let r = (bigint >> 16) & 255;
    let g = (bigint >> 8) & 255;
    let b = bigint & 255;

    return [r, g, b];
}

function rgbToHex(r, g, b) {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
}

export function rgbToText(r, g, b, a) {
    if (a) {
        return `rgba(${r}, ${g}, ${b}, ${a})`;
    } else {
        return `rgb(${r}, ${g}, ${b})`;
    }
}


// Checkers
export function isCustomColorsActive() {
    const html = getPage();
    if (html === 'destination' || html === 'expenses') {
        return localStorage.getItem("customColors") === "true";
    } else {
        return CUSTOM_COLORS
    }
}