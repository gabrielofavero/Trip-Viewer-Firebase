const GASTOS_EMBED = {
	enabled: false,
	applied: false,
	visibility: "",
};

function loadEmbedMode(visibility) {
	document.querySelector(".top-bar").style.display = "none";
	document.querySelector(".section-title").style.display = "none";
	document.querySelector(".footer").style.display = "none";
	loadViewVisibility(visibility);
	loadEmbedListeners(_onViewMessage);
	GASTOS_EMBED.applied = true;
}

function onViewMessage(data) {
	switch (data.type) {
		case "visibility":
			loadViewVisibility(data.value);
			return;
		case "pin":
			loadExternalPin(data.value);
			return;
		case "visibility":
			loadViewVisibility(data.value);
	}
}

function sendHeightMessageToParent() {
	setTimeout(() => {
		sendToParent("height", getID("expenses-content").scrollHeight);
	}, 500);
}

function embedAfterLoadAction(pin) {
	for (const card of document.querySelectorAll(".gastos-card")) {
		card.classList.add("container-mode");
	}
	sendHeightMessageToParent();
	sendToParent("pin", pin);
}

function loadExternalPin(pin) {
	const pinCode = getID("pin-code");
	if (!pinCode || !pin || pin.length != 4) return;
	pinCode.innerText = pin;
	setManualPin(pin);
}

function loadViewVisibility(externalVisibility) {
	if (GASTOS_EMBED.visibility === undefined) {
		GASTOS_EMBED.visibility = getVisibility();
	}
	loadExternalVisibility(externalVisibility, GASTOS_EMBED.visibility);
	GASTOS_EMBED.visibility = externalVisibility;
}
