import { getURLParam, setURLParam, firstCharToUpperCase, removeEmptyChild } from "../pages/data.js";
import { getCurrentHour } from "../pages/dates.js";

// ======= Visibility JS =======
export let CHANGED_SVGS = [];
export let LOGO_LIGHT = "";
export let LOGO_DARK = "";

export function loadVisibility(colors = FIRESTORE_DATA?.cores) {
	if (colors?.claro && colors?.escuro) {
		LIGHT_COLOR = colors.claro;
		DARK_COLOR = colors.escuro;
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

	THEME_COLOR = base;
	THEME_COLOR_HOVER = hoverFn(base, 10);

	const secondary = getSecondaryColor(secondaryKey);
	THEME_COLOR_SECONDARY = secondary.main;
	THEME_COLOR_SECONDARY_HOVER = secondary.hover;

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

		const header2 = getID("header2");
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

	function applyCustomVisibilityRules() {
		switch (getHTMLpage()) {
			case "view":
				loadTransportationImages();
				loadViewCustomVisibilityRules();
				break;
			case "destination":
				applyAccordionArrowCustomColor();
				break;
			case "expenses":
				changeChartsLabelsVisibility();
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
	fadeOut([modalID], "down");
}

export function isModalOpen(modalID = "modal") {
	return getID(modalID).style.display === "block";
}

// ======= Páginas de Editar =======
export function loadEditModule(categoria) {
	const habilitado = getID(`habilitado-${categoria}`);
	if (habilitado.checked) {
		showContent(categoria);
		if (!getID(`habilitado-${categoria}-content`).innerText) {
			visibilityAdd(firstCharToUpperCase(categoria).trim());
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
		if (customFunction) {
			eval(customFunction);
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
	if (typeof window[dynamicFunctionName] === "function") {
		window[dynamicFunctionName]();
	} else {
		console.error(`${dynamicFunctionName} is not defined.`);
	}
}

export function getVisibility(isDark = isOnDarkMode()) {
	return isDark ? "dark" : "light";
}

export function loadExternalVisibility(external, internal) {
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

// BACKWARD COMPAT: attach to window during migration
window.loadVisibility = loadVisibility;
window.loadDarkMode = loadDarkMode;
window.loadLightMode = loadLightMode;
window.loadLightModeLite = loadLightModeLite;
window.applyThemeAttribute = applyThemeAttribute;
window.loadUserVisibility = loadUserVisibility;
window.applyMode = applyMode;
window.switchVisibility = switchVisibility;
window.autoVisibility = autoVisibility;
window.disableScroll = disableScroll;
window.enableScroll = enableScroll;
window.hasCSSRule = hasCSSRule;
window.isOnDarkMode = isOnDarkMode;
window.openModal = openModal;
window.closeModal = closeModal;
window.isModalOpen = isModalOpen;
window.loadEditModule = loadEditModule;
window.loadListener = loadListener;
window.showContent = showContent;
window.hideContent = hideContent;
window.addRemoveChildListener = addRemoveChildListener;
window.toggleFadingVisibility = toggleFadingVisibility;
window.searchDestinationsListenerAction = searchDestinationsListenerAction;
window.visibilityAdd = visibilityAdd;
window.getVisibility = getVisibility;
window.loadExternalVisibility = loadExternalVisibility;
window.CHANGED_SVGS = CHANGED_SVGS;
window.LOGO_LIGHT = LOGO_LIGHT;
window.LOGO_DARK = LOGO_DARK;
