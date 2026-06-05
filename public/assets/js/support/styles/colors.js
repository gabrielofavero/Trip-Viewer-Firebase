import { getCores } from '../../core/config.js';

export let THEME_COLOR;
export let THEME_COLOR_HOVER;
export let THEME_COLOR_SECONDARY;
export let THEME_COLOR_SECONDARY_HOVER;
export let CLARO = "#5859a7";
export let ESCURO = "#7f75b6";
export let BOX_COLOR = {
	claro: "#f1f1f1",
	escuro: "#404040",
};

// Loaders
export function _loadLogoColors() {
	const lightColor1 = getID("light-color-1");
	const lightColor2 = getID("light-color-2");
	const darkColor1 = getID("dark-color-1");
	const darkColor2 = getID("dark-color-2");

	lightColor1.style.fill = CLARO;
	lightColor2.style.fill = CLARO;
	darkColor1.style.fill = ESCURO;
	darkColor2.style.fill = ESCURO;
}

export function _loadThemeColors() {
	_setCSSVariable("theme-color", THEME_COLOR);
	_setCSSVariable("theme-color-hover", THEME_COLOR_HOVER);
	_setCSSVariable("theme-color-secondary", THEME_COLOR_SECONDARY);
}

// Getters
export function _getLocalColors() {
	try {
		return JSON.parse(sessionStorage.getItem("localColors")) || {};
	} catch {
		return {};
	}
}

export function _getEquivalentColorAndPosition(claro) {
	const cores = getCores();
	const claroObj = cores.claro;
	const escuroObj = cores.escuro;

	for (let i = 0; i < claroObj.length; i++) {
		if (claroObj[i] === claro) {
			return { position: i, equivalent: escuroObj[i] };
		}
	}

	return {};
}

export function _getLighterColor(hex, percentage = 75) {
	let [r, g, b] = _hexToRgb(hex);

	r = Math.round(r + (255 - r) * (percentage / 100));
	g = Math.round(g + (255 - g) * (percentage / 100));
	b = Math.round(b + (255 - b) * (percentage / 100));

	return _rgbToHex(r, g, b);
}

export function _getDarkerColor(hex, percentage = 75) {
	let [r, g, b] = _hexToRgb(hex);

	r = Math.round(r * (1 - percentage / 100));
	g = Math.round(g * (1 - percentage / 100));
	b = Math.round(b * (1 - percentage / 100));

	return _rgbToHex(r, g, b);
}

export function _getColorIndexFromOptions(i) {
	const cores = getCores();
	if (i >= cores.opcoes.length) {
		i = i % cores.opcoes.length;
	}
	return i;
}

export function _getMixedColor(mainColor, mixColor, mixColorPercentage = 85) {
	let [r1, g1, b1] = _hexToRgb(mainColor);
	let [r2, g2, b2] = _hexToRgb(mixColor);

	let r = Math.round(
		(r1 * (100 - mixColorPercentage) + r2 * mixColorPercentage) / 100,
	);
	let g = Math.round(
		(g1 * (100 - mixColorPercentage) + g2 * mixColorPercentage) / 100,
	);
	let b = Math.round(
		(b1 * (100 - mixColorPercentage) + b2 * mixColorPercentage) / 100,
	);

	return _rgbToHex(r, g, b);
}

export function _getSecondaryColor(type) {
	const mainColor = type == "claro" ? CLARO : ESCURO;
	const mixColor = BOX_COLOR[type];
	return {
		main: _getMixedColor(mainColor, mixColor),
		hover: _getMixedColor(mainColor, mixColor, 95),
	};
}

export function _getColorNameFromOptions(i) {
	return getCores().opcoes[_getColorIndexFromOptions(i)].cor;
}

export function _getColorHexFromOptions(i) {
	return getCores().opcoes[_getColorIndexFromOptions(i)].hex;
}

export function _getThemeColorBoxShadow(cor = THEME_COLOR_SECONDARY) {
	const rgba = _hexToRgbText(cor, 0.15);
	return `0 0 1px 0 ${rgba}, 0 6px 12px 0 ${rgba};`;
}

// Setters
export function _changeFillColorSVGs(className, color) {
	const svgElements = document.querySelectorAll(`.${className}`);
	if (svgElements.length > 0) {
		CHANGED_SVGS.push(className);
		svgElements.forEach((svgElement) => {
			const pathElement = svgElement.querySelector("path");
			if (pathElement) {
				pathElement.setAttribute("fill", color);
			}
		});
	}
}

export function _clearCustomColors() {
	var styleElement = getID("custom-styles");
	if (styleElement) {
		styleElement.parentNode.removeChild(styleElement);
	}
}

export function _changeBarColorIOS(color) {
	let metaThemeColor = document.querySelector("meta[name=theme-color]");
	metaThemeColor.setAttribute("content", color);
}

export function _saveLocalColors() {
	var localColors = {
		claro: CLARO,
		escuro: ESCURO,
	};
	sessionStorage.setItem("localColors", JSON.stringify(localColors));
}

// Converters
export function _hexToRgb(hex) {
	hex = hex.replace(/^#/, "");

	let bigint = parseInt(hex, 16);
	let r = (bigint >> 16) & 255;
	let g = (bigint >> 8) & 255;
	let b = bigint & 255;

	return [r, g, b];
}

export function _rgbToHex(r, g, b) {
	return (
		"#" +
		((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase()
	);
}

export function _rgbToText(r, g, b, a) {
	if (a) {
		return `rgba(${r}, ${g}, ${b}, ${a})`;
	} else {
		return `rgb(${r}, ${g}, ${b})`;
	}
}

export function _hexToRgbText(hex, a) {
	let [r, g, b] = _hexToRgb(hex);
	return _rgbToText(r, g, b, a);
}

// BACKWARD COMPAT: attach to window during migration
window.THEME_COLOR = THEME_COLOR;
window.THEME_COLOR_HOVER = THEME_COLOR_HOVER;
window.THEME_COLOR_SECONDARY = THEME_COLOR_SECONDARY;
window.THEME_COLOR_SECONDARY_HOVER = THEME_COLOR_SECONDARY_HOVER;
window.CLARO = CLARO;
window.ESCURO = ESCURO;
window.BOX_COLOR = BOX_COLOR;
window._loadLogoColors = _loadLogoColors;
window._loadThemeColors = _loadThemeColors;
window._getLocalColors = _getLocalColors;
window._getEquivalentColorAndPosition = _getEquivalentColorAndPosition;
window._getLighterColor = _getLighterColor;
window._getDarkerColor = _getDarkerColor;
window._getColorIndexFromOptions = _getColorIndexFromOptions;
window._getMixedColor = _getMixedColor;
window._getSecondaryColor = _getSecondaryColor;
window._getColorNameFromOptions = _getColorNameFromOptions;
window._getColorHexFromOptions = _getColorHexFromOptions;
window._getThemeColorBoxShadow = _getThemeColorBoxShadow;
window._changeFillColorSVGs = _changeFillColorSVGs;
window._clearCustomColors = _clearCustomColors;
window._changeBarColorIOS = _changeBarColorIOS;
window._saveLocalColors = _saveLocalColors;
window._hexToRgb = _hexToRgb;
window._rgbToHex = _rgbToHex;
window._rgbToText = _rgbToText;
window._hexToRgbText = _hexToRgbText;
