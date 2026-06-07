import { firstCharToUpperCase, getID, getJs, getURLParam, removeChildWithValidation, removeEmptyChild, setURLParam } from '../utils/dom.js';
import { getCurrentHour } from "../utils/dates.js";
import { getState } from '../data/state.js';
import { changeBarColorIOS, DARK_COLOR, getDarkerColor, getLighterColor, getSecondaryColor, LIGHT_COLOR, loadLogoColors, loadThemeColors, saveLocalColors, setDarkColor, setLightColor, setThemeColor, setThemeColorHover, setThemeColorSecondary, setThemeColorSecondaryHover } from './colors.js';
import { getHTMLpage } from '../app/main.js';
import { fadeIn, fadeOut } from './animations.js';
import { loadCurrenciesTab } from "../pages/expenses/support/currency.js";

// ======= Visibility JS =======
var _exports: Record<string, any> = {};

export function registerVisibilityExport(name: string, fn: any) {
	if (!_exports) _exports = {};
	_exports[name] = fn;
}
export let CHANGED_SVGS = [];
export let LOGO_LIGHT = "";
export let LOGO_DARK = "";

export function setLogoLight(value: string) { LOGO_LIGHT = value; }
export function setLogoDark(value: string) { LOGO_DARK = value; }

export function loadVisibility(colors = getState()?.cores) {
	if (colors?.claro && colors?.escuro) {
		setLightColor(colors.claro);
		setDarkColor(colors.escuro);
	}

	saveLocalColors();
	loadUserVisibility();

	const button = getID("night-mode");
	button.style.display = "block";
	button.onclick = function () {
		switchVisibility();
	};
}

export function loadDarkMode() {
	applyMode({
		isDark: true,
		loadCss: true,
		barColor: "#303030",
		hoverFn: getDarkerColor,
		secondaryKey: "escuro",
	});
}

export function loadLightMode() {
	applyMode({
		isDark: false,
		loadCss: true,
		barColor: "#fff",
		hoverFn: getLighterColor,
		secondaryKey: "claro",
	});
}

export function loadLightModeLite() {
	applyMode({
		isDark: false,
		loadCss: false,
		barColor: "#fff",
		hoverFn: getLighterColor,
		secondaryKey: "claro",
	});
}

// ======= DATA-THEME TOGGLE =======
export function applyThemeAttribute(isDark) {
	document.documentElement.setAttribute(
		"data-theme",
		isDark ? "dark" : "light",
	);
}

// ======= SETTERS =======
export function loadUserVisibility() {
	const param = getURLParam("visibility");

	if (param === "dark") {
		return loadDarkMode();
	}

	if (param === "light") {
		return loadLightMode();
	}

	const stored = sessionStorage.getItem("darkMode");

	if (stored === "true") {
		return loadDarkMode();
	}

	if (stored === "false") {
		return loadLightMode();
	}

	autoVisibility();
}

export function applyMode({
	isDark,
	loadCss = true,
	barColor,
	hoverFn,
	secondaryKey,
}) {
	sessionStorage.setItem("darkMode", String(isDark));
	setURLParam("visibility", getVisibility(isDark));

	const base = isDark ? DARK_COLOR : LIGHT_COLOR;

	setThemeColor(base);
	setThemeColorHover(hoverFn(base, 10));

	const secondary = getSecondaryColor(secondaryKey);
	setThemeColorSecondary(secondary.main);
	setThemeColorSecondaryHover(secondary.hover);

	applyThemeAttribute(isDark);

	loadToggle(isDark);
	changeBarColorIOS(barColor);

	loadTripViewerLogo();
	loadLogoColors();
	loadThemeColors();

	applyCustomVisibilityRules();

	// Helpers
	function loadTripViewerLogo() {
		const isDark = isOnDarkMode();
		getID("logo-light").style.display = isDark ? "none" : "block";
		getID("logo-dark").style.display = isDark ? "block" : "none";

		const header2 = getID("header2") as HTMLImageElement | null;
		if (header2) {
			header2.src = isDark
				? LOGO_DARK || header2.src
				: LOGO_LIGHT || header2.src;
		}
	}

	function loadToggle(isDark = isOnDarkMode()) {
		const el = getID("night-mode");
		el.classList.toggle("bx-moon", !isDark);
		el.classList.toggle("bx-sun", isDark);
	}

	async function applyCustomVisibilityRules() {
		switch (getHTMLpage()) {
			case "view":
				(await import("../pages/trip-detail/categories/transportation-module.js")).loadTransportationImages();
				(await import("../pages/trip-detail/support/visibility.js")).loadViewCustomVisibilityRules();
				break;
			case "destination":
				(await import("../pages/destination/support/visibility.js")).applyAccordionArrowCustomColor();
				break;
			case "expenses":
				(await import("../pages/expenses/support/data.js")).changeChartsLabelsVisibility();
				loadCurrenciesTab();
		}
	}
}

export function switchVisibility() {
	if (isOnDarkMode()) {
		loadLightMode();
	} else {
		loadDarkMode();
	}
}

export function autoVisibility() {
	let now = getCurrentHour();
	if (now >= 18 || now < 6) {
		loadDarkMode();
	} else {
		loadLightModeLite();
	}
}

export function disableScroll() {
	document.body.style.overflow = "hidden";
}

export function enableScroll() {
	document.body.style.overflow = "auto";
}

// ======= CHECKERS =======
export function hasCSSRule(selector, property) {
	let styleElement = document.getElementById("custom-styles");

	if (!styleElement) {
		return false;
	}

	const styleSheet = (styleElement as HTMLStyleElement).sheet;

	for (let i = 0; i < styleSheet.cssRules.length; i++) {
		const cssRule = styleSheet.cssRules[i] as CSSStyleRule;
		if (cssRule.selectorText === selector) {
			if (cssRule.style.getPropertyValue(property)) {
				return true;
			}
		}
	}
	return false;
}

export function isOnDarkMode() {
	const visibility = getURLParam("visibility");
	if (visibility) {
		return visibility === "dark";
	}
	return sessionStorage.getItem("darkMode") === "true";
}

// ======= Modal Functions =======
export function openModal(modalID = "modal") {
	fadeIn([modalID]);
}

export function closeModal(modalID = "modal") {
	fadeOut([modalID]);
}

export function isModalOpen(modalID = "modal") {
	return getID(modalID).style.display === "block";
}

// ======= Edit Pages =======
export function loadEditModule(categoria) {
	const habilitado = getID(`habilitado-${categoria}`);
	if (habilitado.checked) {
		showContent(categoria);
		if (!getID(`habilitado-${categoria}-content`).innerText) {
			// Defer to next tick so all registerVisibilityExport calls have executed
			setTimeout(() => visibilityAdd(firstCharToUpperCase(categoria).trim()), 0);
		}
	} else {
		hideContent(categoria);
	}
	loadListener(categoria);
}

export function loadListener(categoria) {
	const habilitado = getID(`habilitado-${categoria}`);
	habilitado.addEventListener("change", function () {
		if (habilitado.checked) {
			showContent(categoria);
			const box = getID(`${categoria}-box`);
			const habilitadoContent = getID(`habilitado-${categoria}-content`);

			if (
				(box && !box.innerText) ||
				(habilitadoContent && !habilitadoContent.innerText)
			) {
				visibilityAdd(firstCharToUpperCase(categoria).trim());
			}
		} else {
			removeEmptyChild(categoria);
			hideContent(categoria);
		}
	});
}

export function showContent(type) {
	const habilitadoContent = getID(`habilitado-${type}-content`);
	habilitadoContent.style.display = "block";

	const adicionarBox = getID(`${type}-adicionar-box`);
	if (adicionarBox) {
		adicionarBox.style.display = "block";
	}

	let i = 1;
	let text = `collapse-${type}-${i}`;

	while (getID(text)) {
		$(`#${text}`).collapse("hide");
		i++;
		text = `${type}-${i}`;
	}
}

export function hideContent(type) {
	const habilitadoContent = getID(`habilitado-${type}-content`);
	habilitadoContent.style.display = "none";

	const adicionarBox = getID(`${type}-adicionar-box`);
	if (adicionarBox) {
		adicionarBox.style.display = "none";
	}
}

export function addRemoveChildListener(categoria, j, customFunction = null) {
	getID(`remove-${categoria}-${j}`).addEventListener("click", function () {
		removeChildWithValidation(categoria, j);
		if (typeof customFunction === "function") {
			customFunction();
		}
	});
}

export function toggleFadingVisibility(id = "copy-msg") {
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

export function searchDestinationsListenerAction() {
	const search = getID("destinos-search").value.toLowerCase();

	for (const j of getJs("destinos-checkboxes")) {
		const label = getID(`check-destinos-label-${j}`).innerText.toLowerCase();
		getID(`checkbox-${j}`).style.display = label.includes(search) ? "" : "none";
	}
}

export function visibilityAdd(type) {
	const dynamicFunctionName = `_add${type}`;
	if (typeof _exports[dynamicFunctionName] === "function") {
		_exports[dynamicFunctionName]();
	} else {
		console.error(`${dynamicFunctionName} is not defined.`);
	}
}

export function getVisibility(isDark = isOnDarkMode()) {
	return isDark ? "dark" : "light";
}

export function loadExternalVisibility(external, internal?) {
	internal = internal || getVisibility();

	if (!internal || !external || internal === external) {
		return;
	}

	if (external == "dark") {
		loadDarkMode();
		return;
	}

	if (external === "light") {
		loadLightMode();
		return;
	}
}

// Module-level exports lookup (replaces window.* backward compat)
_exports.loadVisibility = loadVisibility;
_exports.loadDarkMode = loadDarkMode;
_exports.loadLightMode = loadLightMode;
_exports.loadLightModeLite = loadLightModeLite;
_exports.applyThemeAttribute = applyThemeAttribute;
_exports.loadUserVisibility = loadUserVisibility;
_exports.applyMode = applyMode;
_exports.switchVisibility = switchVisibility;
_exports.autoVisibility = autoVisibility;
_exports.disableScroll = disableScroll;
_exports.enableScroll = enableScroll;
_exports.hasCSSRule = hasCSSRule;
_exports.isOnDarkMode = isOnDarkMode;
_exports.openModal = openModal;
_exports.closeModal = closeModal;
_exports.isModalOpen = isModalOpen;
_exports.loadEditModule = loadEditModule;
_exports.loadListener = loadListener;
_exports.showContent = showContent;
_exports.hideContent = hideContent;
_exports.addRemoveChildListener = addRemoveChildListener;
_exports.toggleFadingVisibility = toggleFadingVisibility;
_exports.searchDestinationsListenerAction = searchDestinationsListenerAction;
_exports.visibilityAdd = visibilityAdd;
_exports.getVisibility = getVisibility;
_exports.loadExternalVisibility = loadExternalVisibility;
_exports.CHANGED_SVGS = CHANGED_SVGS;
_exports.LOGO_LIGHT = LOGO_LIGHT;
_exports.LOGO_DARK = LOGO_DARK;
