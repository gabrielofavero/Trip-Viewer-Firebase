var FIRESTORE_PROTECTED_DATA;

window.addEventListener("load", async function () {
	try {
		_startLoadingScreen();
		_main();
		_stopLoadingScreen();
	} catch (error) {
		_displayError(error);
		console.error(error);
	}
});

async function _loadItineraryPage() {
	DOCUMENT_ID = _getURLParam("v");
	document.title = translate("trip.itinerary.title");

	if (!DOCUMENT_ID) {
		_displayError(
			`${translate("messages.documents.get.error")}. ${translate(translate("messages.documents.get.no_code"))}`,
		);
	}

	FIRESTORE_DATA = await _get(`viagens/${DOCUMENT_ID}`);
	if (!FIRESTORE_DATA) {
		_displayError(
			`${translate("messages.documents.get.error")}. ${translate(translate("messages.documents.get.not_found"))}`,
		);
	}

	_loadItineraryVisibility();
	getID("title").innerText = FIRESTORE_DATA.titulo;

	switch (FIRESTORE_DATA.pin) {
		case "all-data":
			_stopLoadingScreen();
			_requestPinItinerary(true);
			return;
		case "sensitive-only":
			_stopLoadingScreen();
			_displaySensitiveItineraryPrompt();
			return;
		default:
			await _loadItinerary();
	}
}

async function _loadItinerary() {
	if (
		document.querySelector(".input-container") ||
		document.querySelector(".message-container")
	) {
		_closeMessage();
	}

	getID("content").innerHTML = await _getItineraryContent("page");

  getID("print").addEventListener("click", () => print());
  getID("export").addEventListener("click", () => _export());
  
  _initializeMobileMenu();
}

// Mobile Menu
function _initializeMobileMenu() {
  // Mobile nav toggle
  on("click", ".mobile-nav-toggle", function (e) {
    select("body").classList.toggle("mobile-nav-active");
    this.classList.toggle("bi-list");
    this.classList.toggle("bi-x");
  });

  // Mobile menu item handlers
  getID("mobile-night-mode")?.addEventListener("click", (e) => {
    e.preventDefault();
    _switchVisibility();
    _closeMobileMenu();
	_loadNightModeButtonLabel();
  });

  getID("mobile-export")?.addEventListener("click", (e) => {
    e.preventDefault();
    _export();
    _closeMobileMenu();
  });

  getID("mobile-print")?.addEventListener("click", (e) => {
    e.preventDefault();
    print();
    _closeMobileMenu();
  });
}

function _closeMobileMenu() {
  let body = select("body");
  if (body.classList.contains("mobile-nav-active")) {
    body.classList.remove("mobile-nav-active");
    let navbarToggle = select(".mobile-nav-toggle");
    navbarToggle.classList.toggle("bi-list");
    navbarToggle.classList.toggle("bi-x");
  }
}

// Visibility
function _loadItineraryVisibility() {
	_loadVisibility();
	_loadEmbedVisibility();
	_loadNightModeButtonLabel();
}

function _loadNightModeButtonLabel() {
	const label = _isOnDarkMode() ? translate('labels.light_mode') : translate('labels.dark_mode');
	getID("mobile-night-mode-label").innerText = label;
}

// Messages
function _requestPinItinerary(mandatory = false) {
	if (document.querySelector(".message-container")) {
		_closeMessage();
	}

	const confirmAction = `_loadProtectedItinerary(${mandatory})`;
	const cancelAction = mandatory ? null : "_loadItinerary()";
	_requestPin({ confirmAction, cancelAction });
}

function _requestPinItineraryInvalido(mandatory = false) {
	const confirmAction = `_loadProtectedItinerary(${mandatory})`;
	const cancelAction = mandatory ? null : "_loadItinerary()";
	_requestInvalidPin({ confirmAction, cancelAction });
}

function _displaySensitiveItineraryPrompt() {
	const titulo = translate("trip.protected");
	const conteudo = translate("messages.protected.prompt");
	const yesAction = "_requestPinItinerary()";
	const noAction = "_loadItinerary()";
	const critico = true;
	_displayPrompt({ titulo, conteudo, yesAction, noAction, critico });
}

async function _loadProtectedItinerary(mandatory = false) {
	const pin = getID("pin-code")?.innerText || "";
	const pinType = FIRESTORE_DATA.pin;
	_closeMessage();
	_startLoadingScreen();

	try {
		const protectedData = await _get(`viagens/protected/${pin}/${DOCUMENT_ID}`);
		if (_haveErrorFromGetRequest() || !protectedData) {
			_stopLoadingScreen();
			_requestPinItineraryInvalido(mandatory);
			return;
		}

		if (pinType == "sensitive-only") {
			FIRESTORE_PROTECTED_DATA = protectedData;
		} else {
			FIRESTORE_DATA = protectedData;
		}

		_loadItinerary();
	} catch (error) {
		if (error?.message == "Missing or insufficient permissions.") {
			console.warn(error.message);
			_requestPinItineraryInvalido(mandatory);
		} else {
			console.error(error);
			_displayError(translate("messages.errors.unknown"));
		}
		_stopLoadingScreen();
	}

	_stopLoadingScreen();
}

async function _export() {
	const html = await _getItineraryContent("notes");
	const plainText = await _getItineraryContent("text");

	await navigator.clipboard.write([
		new ClipboardItem({
			"text/html": new Blob([html], { type: "text/html" }),
			"text/plain": new Blob([plainText], { type: "text/plain" }),
		}),
	]);

	_openToast(translate("messages.itinerary_copied"));
}
