const GASTOS_EMBED = {
	enabled: false,
	applied: false,
	visibility: "",
};

function _loadEmbedMode(visibility) {
	document.querySelector(".top-bar").style.display = "none";
	document.querySelector(".section-title").style.display = "none";
	document.querySelector(".footer").style.display = "none";
	_loadViewVisibility(visibility);
	_loadEmbedListeners(_onViewMessage);
	GASTOS_EMBED.applied = true;
}

function _onViewMessage(data) {
	switch (data.type) {
		case "visibility":
			_loadViewVisibility(data.value);
			return;
		case "pin":
			_loadExternalPin(data.value);
			return;
		case "visibility":
			_loadViewVisibility(data.value);
	}
}

function _sendHeightMessageToParent() {
	setTimeout(() => {
		_sendToParent("height", getID("expenses-content").scrollHeight);
	}, 500);
}

function _embedAfterLoadAction(pin) {
	for (const card of document.querySelectorAll(".gastos-card")) {
		card.classList.add("container-mode");
	}
	_sendHeightMessageToParent();
	_sendToParent("pin", pin);
}

function _loadExternalPin(pin) {
	const pinCode = getID("pin-code");
	if (!pinCode || !pin || pin.length != 4) return;
	pinCode.innerText = pin;
	_setManualPin(pin);
}

function _loadViewVisibility(externalVisibility) {
	if (GASTOS_EMBED.visibility === undefined) {
		GASTOS_EMBED.visibility = _getVisibility();
	}
	_loadExternalVisibility(externalVisibility, GASTOS_EMBED.visibility);
	GASTOS_EMBED.visibility = externalVisibility;
}
