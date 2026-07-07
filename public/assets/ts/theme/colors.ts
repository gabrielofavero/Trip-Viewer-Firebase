import { getColors } from '../app/config.js';
import { getID } from '../utils/dom.js';
import { setCSSVariable } from './stylesheets.js';
import { CHANGED_SVGS } from './theme.js';

export let THEME_COLOR;
export let THEME_COLOR_HOVER;
export let THEME_COLOR_SECONDARY;
export let THEME_COLOR_SECONDARY_HOVER;
export let LIGHT_COLOR = '#5859a7';
export let DARK_COLOR = '#7f75b6';
export let BOX_COLOR = {
	light: '#f1f1f1',
	dark: '#404040',
};

// Setters (for modules that need to write these live bindings)
export function setThemeColor(value) {
	THEME_COLOR = value;
}
export function setThemeColorHover(value) {
	THEME_COLOR_HOVER = value;
}
export function setThemeColorSecondary(value) {
	THEME_COLOR_SECONDARY = value;
}
export function setThemeColorSecondaryHover(value) {
	THEME_COLOR_SECONDARY_HOVER = value;
}
export function setLightColor(value) {
	LIGHT_COLOR = value;
}
export function setDarkColor(value) {
	DARK_COLOR = value;
}

// Loaders
export function loadLogoColors() {
	const lightColor1 = getID('light-color-1');
	const lightColor2 = getID('light-color-2');
	const darkColor1 = getID('dark-color-1');
	const darkColor2 = getID('dark-color-2');

	lightColor1.style.fill = LIGHT_COLOR;
	lightColor2.style.fill = LIGHT_COLOR;
	darkColor1.style.fill = DARK_COLOR;
	darkColor2.style.fill = DARK_COLOR;
}

export function loadThemeColors() {
	setCSSVariable('theme-color', THEME_COLOR);
	setCSSVariable('theme-color-hover', THEME_COLOR_HOVER);
	setCSSVariable('theme-color-secondary', THEME_COLOR_SECONDARY);
}

// Getters
export function getLocalColors() {
	try {
		return JSON.parse(sessionStorage.getItem('localColors')) || {};
	} catch {
		return {};
	}
}

export function getEquivalentColorAndPosition(lightColor) {
	const colors = getColors();
	const lightObj = colors.light;
	const darkObj = colors.dark;

	for (let i = 0; i < lightObj.length; i++) {
		if (lightObj[i] === lightColor) {
			return { position: i, equivalent: darkObj[i] };
		}
	}

	return {};
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

export function getColorIndexFromOptions(i) {
	const colors = getColors();
	if (i >= colors.options.length) {
		i = i % colors.options.length;
	}
	return i;
}

export function getMixedColor(mainColor, mixColor, mixColorPercentage = 85) {
	let [r1, g1, b1] = hexToRgb(mainColor);
	let [r2, g2, b2] = hexToRgb(mixColor);

	let r = Math.round((r1 * (100 - mixColorPercentage) + r2 * mixColorPercentage) / 100);
	let g = Math.round((g1 * (100 - mixColorPercentage) + g2 * mixColorPercentage) / 100);
	let b = Math.round((b1 * (100 - mixColorPercentage) + b2 * mixColorPercentage) / 100);

	return rgbToHex(r, g, b);
}

export function getSecondaryColor(type) {
	const mainColor = type == 'light' ? LIGHT_COLOR : DARK_COLOR;
	const mixColor = BOX_COLOR[type];
	return {
		main: getMixedColor(mainColor, mixColor),
		hover: getMixedColor(mainColor, mixColor, 95),
	};
}

export function getColorNameFromOptions(i) {
	return getColors().options[getColorIndexFromOptions(i)].color;
}

export function getColorHexFromOptions(i) {
	return getColors().options[getColorIndexFromOptions(i)].hex;
}

export function getThemeColorBoxShadow(cor = THEME_COLOR_SECONDARY) {
	const rgba = hexToRgbText(cor, 0.15);
	return `0 0 1px 0 ${rgba}, 0 6px 12px 0 ${rgba};`;
}

// Setters
export function changeFillColorSVGs(className, color) {
	const svgElements = document.querySelectorAll(`.${className}`);
	if (svgElements.length > 0) {
		CHANGED_SVGS.push(className);
		svgElements.forEach((svgElement) => {
			const pathElement = svgElement.querySelector('path');
			if (pathElement) {
				pathElement.setAttribute('fill', color);
			}
		});
	}
}

export function clearCustomColors() {
	var styleElement = getID('custom-styles');
	if (styleElement) {
		styleElement.parentNode.removeChild(styleElement);
	}
}

export function changeBarColorIOS(color) {
	let metaThemeColor = document.querySelector('meta[name=theme-color]');
	metaThemeColor.setAttribute('content', color);
}

export function saveLocalColors() {
	var localColors = {
		light: LIGHT_COLOR,
		dark: DARK_COLOR,
	};
	sessionStorage.setItem('localColors', JSON.stringify(localColors));
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

export function rgbToHex(r, g, b) {
	return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
}

export function rgbToText(r, g, b, a) {
	if (a) {
		return `rgba(${r}, ${g}, ${b}, ${a})`;
	} else {
		return `rgb(${r}, ${g}, ${b})`;
	}
}

export function hexToRgbText(hex, a) {
	let [r, g, b] = hexToRgb(hex);
	return rgbToText(r, g, b, a);
}
