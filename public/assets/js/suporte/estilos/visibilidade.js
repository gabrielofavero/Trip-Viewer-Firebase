// ======= Visibility JS =======
var CHANGED_SVGS = [];
var LOGO_CLARO = "";
var LOGO_ESCURO = "";

function _loadVisibility(colors = FIRESTORE_DATA?.cores) {
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

function _loadDarkMode() {
	_applyMode({
		isDark: true,
		loadCss: true,
		barColor: "#303030",
		hoverFn: _getDarkerColor,
		secondaryKey: "escuro",
	});
}

function _loadLightMode() {
	_applyMode({
		isDark: false,
		loadCss: true,
		barColor: "#fff",
		hoverFn: _getLighterColor,
		secondaryKey: "claro",
	});
}

function _loadLightModeLite() {
	_applyMode({
		isDark: false,
		loadCss: false,
		barColor: "#fff",
		hoverFn: _getLighterColor,
		secondaryKey: "claro",
	});
}

// ======= GETTERS =======
function _getCssHref(name, dark = false) {
	const darkMode = dark ? "-dark" : "";
	const editar = ["editar-viagem", "editar-destino", "editar-listagem"];

	if (editar.includes(name)) {
		return `../assets/css/editar/editar${darkMode}.css`;
	} else {
		return `assets/css/${name}/${name}${darkMode}.css`;
	}
}

// ======= SETTERS =======
function _loadUserVisibility() {
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

function _applyMode({
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

	if (loadCss) {
		_appendCss(_getHTMLpage(), isDark);
	}

	_loadToggle(isDark);
	_changeBarColorIOS(barColor);

	_loadTripViewerLogo();
	_loadLogoColors();
	_loadThemeColors();

	_applyCustomVisibilityRules();

	// Helpers
	function _appendCss(page, isDark) {
		let link = document.getElementById("theme-css");

		if (!link) {
			link = document.createElement("link");
			link.id = "theme-css";
			link.rel = "stylesheet";
			document.head.appendChild(link);
		}

		link.href = _getCssHref(page, isDark);
	}

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
			case "viagem":
				_loadTransporteImagens();
				_loadViagemCustomVisibilityRules();
				break;
			case "destinos":
				_applyAccordionArrowCustomColor();
				break;
			case "gastos":
				_changeChartsLabelsVisibility();
				_loadMoedasTab();
		}
	}
}

function _switchVisibility() {
	if (_isOnDarkMode()) {
		_loadLightMode();
	} else {
		_loadDarkMode();
	}
}

function _autoVisibility() {
	let now = _getCurrentHour();
	if (now >= 18 || now < 6) {
		_loadDarkMode();
	} else {
		_loadLightModeLite();
	}
}

function _disableScroll() {
	document.body.style.overflow = "hidden";
}

function _enableScroll() {
	document.body.style.overflow = "auto";
}

// ======= CHECKERS =======
function _hasCSSRule(selector, property) {
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

function _isOnDarkMode() {
	const visibility = _getURLParam("visibility");
	if (visibility) {
		return visibility === "dark";
	}
	return sessionStorage.getItem("darkMode") === "true";
}

// ======= Modal Functions =======
function _openModal(modalID = "modal") {
	_fadeIn([modalID]);
}

function _closeModal(modalID = "modal") {
	_fadeOut([modalID], "down");
}

function _isModalOpen(modalID = "modal") {
	return getID(modalID).style.display === "block";
}

// ======= Páginas de Editar =======
function _loadEditModule(categoria) {
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

function _loadListener(categoria) {
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

function _showContent(type) {
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

function _hideContent(type) {
	const habilitadoContent = getID(`habilitado-${type}-content`);
	habilitadoContent.style.display = "none";

	const adicionarBox = getID(`${type}-adicionar-box`);
	if (adicionarBox) {
		adicionarBox.style.display = "none";
	}
}

function _addRemoveChildListener(categoria, j, customFunction = null) {
	getID(`remove-${categoria}-${j}`).addEventListener("click", function () {
		_removeChildWithValidation(categoria, j);
		if (customFunction) {
			eval(customFunction);
		}
	});
}

function _toggleFadingVisibility(id = "copy-msg") {
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

function _searchDestinosListenerAction() {
	const search = getID("destinos-search").value.toLowerCase();

	for (const j of _getJs("destinos-checkboxes")) {
		const label = getID(`check-destinos-label-${j}`).innerText.toLowerCase();
		getID(`checkbox-${j}`).style.display = label.includes(search) ? "" : "none";
	}
}

function _visibilityAdd(type) {
	const dynamicFunctionName = `_add${type}`;
	if (typeof window[dynamicFunctionName] === "function") {
		window[dynamicFunctionName]();
	} else {
		console.error(`${dynamicFunctionName} is not defined.`);
	}
}

function _getVisibility(isDark = _isOnDarkMode()) {
	return isDark ? "dark" : "light";
}

function _loadExternalVisibility(external, internal) {
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
