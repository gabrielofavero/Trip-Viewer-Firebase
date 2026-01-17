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
	DOCUMENT_ID = _getURLParams().v;
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

	_loadVisibility();
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
		_removePinListener();
	}

	getID("content").innerHTML = await _getItineraryContent("page");

	getID("print").addEventListener("click", () => print());
	getID("export").addEventListener("click", () => _export());
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
	_removePinListener();
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
