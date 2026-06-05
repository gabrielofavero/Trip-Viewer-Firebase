import { _getURLParam, _setURLParam, _firstCharToUpperCase, _removeEmptyChild } from "../pages/data.js";
import { _getCurrentHour } from "../pages/dates.js";

// ======= Visibility JS =======
export let CHANGED_SVGS = [];
export let LOGO_CLARO = "";
export let LOGO_ESCURO = "";

export function _loadVisibility(colors = FIRESTORE_DATA?.cores) {
	if (colors?.claro && colors?.escuro) {
		CLARO = colors.claro;
		ESCURO = colors.escuro;
	}

	_saveLocalColors();
	_loadUserVisibility();

	const button = getID("night-mode");
	button.style.display = "block";
	button.onclick = function () {
		_switchVisibility();
	};
}

export function _loadDarkMode() {
	_applyMode({
		isDark: true,
		loadCss: true,
		barColor: "#303030",
		hoverFn: _getDarkerColor,
		secondaryKey: "escuro",
	});
}

export function _loadLightMode() {
	_applyMode({
		isDark: false,
		loadCss: true,
		barColor: "#fff",
		hoverFn: _getLighterColor,
		secondaryKey: "claro",
	});
}

export function _loadLightModeLite() {
	_applyMode({
		isDark: false,
		loadCss: false,
		barColor: "#fff",
		hoverFn: _getLighterColor,
		secondaryKey: "claro",
	});
}

// ======= DATA-THEME TOGGLE =======
export function _applyThemeAttribute(isDark) {
	document.documentElement.setAttribute(
		"data-theme",
		isDark ? "dark" : "light",
	);
}

// ======= SETTERS =======
export function _loadUserVisibility() {
	const param = _getURLParam("visibility");

	if (param === "dark") {
		return _loadDarkMode();
	}

	if (param === "light") {
		return _loadLightMode();
	}

	const stored = sessionStorage.getItem("darkMode");

	if (stored === "true") {
		return _loadDarkMode();
	}

	if (stored === "false") {
		return _loadLightMode();
	}

	_autoVisibility();
}

export function _applyMode({
	isDark,
	loadCss = true,
	barColor,
	hoverFn,
	secondaryKey,
}) {
	sessionStorage.setItem("darkMode", String(isDark));
	_setURLParam("visibility", _getVisibility(isDark));

	const base = isDark ? ESCURO : CLARO;

	THEME_COLOR = base;
	THEME_COLOR_HOVER = hoverFn(base, 10);

	const secondary = _getSecondaryColor(secondaryKey);
	THEME_COLOR_SECONDARY = secondary.main;
	THEME_COLOR_SECONDARY_HOVER = secondary.hover;

	_applyThemeAttribute(isDark);

	_loadToggle(isDark);
	_changeBarColorIOS(barColor);

	_loadTripViewerLogo();
	_loadLogoColors();
	_loadThemeColors();

	_applyCustomVisibilityRules();

	// Helpers
	function _loadTripViewerLogo() {
		const isDark = _isOnDarkMode();
		getID("logo-light").style.display = isDark ? "none" : "block";
		getID("logo-dark").style.display = isDark ? "block" : "none";

		const header2 = getID("header2");
		if (header2) {
			header2.src = isDark
				? LOGO_ESCURO || header2.src
				: LOGO_CLARO || header2.src;
		}
	}

	function _loadToggle(isDark = _isOnDarkMode()) {
		const el = getID("night-mode");
		el.classList.toggle("bx-moon", !isDark);
		el.classList.toggle("bx-sun", isDark);
	}

	function _applyCustomVisibilityRules() {
		switch (_getHTMLpage()) {
			case "view":
				_loadTransporteImagens();
				_loadViagemCustomVisibilityRules();
				break;
			case "destination":
				_applyAccordionArrowCustomColor();
				break;
			case "expenses":
				_changeChartsLabelsVisibility();
				_loadMoedasTab();
		}
	}
}

export function _switchVisibility() {
	if (_isOnDarkMode()) {
		_loadLightMode();
	} else {
		_loadDarkMode();
	}
}

export function _autoVisibility() {
	let now = _getCurrentHour();
	if (now >= 18 || now < 6) {
		_loadDarkMode();
	} else {
		_loadLightModeLite();
	}
}

export function _disableScroll() {
	document.body.style.overflow = "hidden";
}

export function _enableScroll() {
	document.body.style.overflow = "auto";
}

// ======= CHECKERS =======
export function _hasCSSRule(selector, property) {
	let styleElement = document.getElementById("custom-styles");

	if (!styleElement) {
		return false;
	}

	const styleSheet = styleElement.sheet;

	for (let i = 0; i < styleSheet.cssRules.length; i++) {
		const cssRule = styleSheet.cssRules[i];
		if (cssRule.selectorText === selector) {
			if (cssRule.style.getPropertyValue(property)) {
				return true;
			}
		}
	}
	return false;
}

export function _isOnDarkMode() {
	const visibility = _getURLParam("visibility");
	if (visibility) {
		return visibility === "dark";
	}
	return sessionStorage.getItem("darkMode") === "true";
}

// ======= Modal Functions =======
export function _openModal(modalID = "modal") {
	_fadeIn([modalID]);
}

export function _closeModal(modalID = "modal") {
	_fadeOut([modalID], "down");
}

export function _isModalOpen(modalID = "modal") {
	return getID(modalID).style.display === "block";
}

// ======= Páginas de Editar =======
export function _loadEditModule(categoria) {
	const habilitado = getID(`habilitado-${categoria}`);
	if (habilitado.checked) {
		_showContent(categoria);
		if (!getID(`habilitado-${categoria}-content`).innerText) {
			_visibilityAdd(_firstCharToUpperCase(categoria).trim());
		}
	} else {
		_hideContent(categoria);
	}
	_loadListener(categoria);
}

export function _loadListener(categoria) {
	const habilitado = getID(`habilitado-${categoria}`);
	habilitado.addEventListener("change", function () {
		if (habilitado.checked) {
			_showContent(categoria);
			const box = getID(`${categoria}-box`);
			const habilitadoContent = getID(`habilitado-${categoria}-content`);

			if (
				(box && !box.innerText) ||
				(habilitadoContent && !habilitadoContent.innerText)
			) {
				_visibilityAdd(_firstCharToUpperCase(categoria).trim());
			}
		} else {
			_removeEmptyChild(categoria);
			_hideContent(categoria);
		}
	});
}

export function _showContent(type) {
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

export function _hideContent(type) {
	const habilitadoContent = getID(`habilitado-${type}-content`);
	habilitadoContent.style.display = "none";

	const adicionarBox = getID(`${type}-adicionar-box`);
	if (adicionarBox) {
		adicionarBox.style.display = "none";
	}
}

export function _addRemoveChildListener(categoria, j, customFunction = null) {
	getID(`remove-${categoria}-${j}`).addEventListener("click", function () {
		_removeChildWithValidation(categoria, j);
		if (customFunction) {
			eval(customFunction);
		}
	});
}

export function _toggleFadingVisibility(id = "copy-msg") {
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

export function _searchDestinosListenerAction() {
	const search = getID("destinos-search").value.toLowerCase();

	for (const j of _getJs("destinos-checkboxes")) {
		const label = getID(`check-destinos-label-${j}`).innerText.toLowerCase();
		getID(`checkbox-${j}`).style.display = label.includes(search) ? "" : "none";
	}
}

export function _visibilityAdd(type) {
	const dynamicFunctionName = `_add${type}`;
	if (typeof window[dynamicFunctionName] === "function") {
		window[dynamicFunctionName]();
	} else {
		console.error(`${dynamicFunctionName} is not defined.`);
	}
}

export function _getVisibility(isDark = _isOnDarkMode()) {
	return isDark ? "dark" : "light";
}

export function _loadExternalVisibility(external, internal) {
	internal = internal || _getVisibility();

	if (!internal || !external || internal === external) {
		return;
	}

	if (external == "dark") {
		_loadDarkMode();
		return;
	}

	if (external === "light") {
		_loadLightMode();
		return;
	}
}

// BACKWARD COMPAT: attach to window during migration
window._loadVisibility = _loadVisibility;
window._loadDarkMode = _loadDarkMode;
window._loadLightMode = _loadLightMode;
window._loadLightModeLite = _loadLightModeLite;
window._applyThemeAttribute = _applyThemeAttribute;
window._loadUserVisibility = _loadUserVisibility;
window._applyMode = _applyMode;
window._switchVisibility = _switchVisibility;
window._autoVisibility = _autoVisibility;
window._disableScroll = _disableScroll;
window._enableScroll = _enableScroll;
window._hasCSSRule = _hasCSSRule;
window._isOnDarkMode = _isOnDarkMode;
window._openModal = _openModal;
window._closeModal = _closeModal;
window._isModalOpen = _isModalOpen;
window._loadEditModule = _loadEditModule;
window._loadListener = _loadListener;
window._showContent = _showContent;
window._hideContent = _hideContent;
window._addRemoveChildListener = _addRemoveChildListener;
window._toggleFadingVisibility = _toggleFadingVisibility;
window._searchDestinosListenerAction = _searchDestinosListenerAction;
window._visibilityAdd = _visibilityAdd;
window._getVisibility = _getVisibility;
window._loadExternalVisibility = _loadExternalVisibility;
window.CHANGED_SVGS = CHANGED_SVGS;
window.LOGO_CLARO = LOGO_CLARO;
window.LOGO_ESCURO = LOGO_ESCURO;
