import { loadEmbedListeners, sendToParent } from '../../../ui/embed.js';
import { getID } from '../../../utils/dom.js';
import { getVisibility, loadExternalVisibility } from '../../../theme/visibility.js';
import { setManualPin } from "../../../utils/pin.js";

export const GASTOS_EMBED = {
	enabled: false,
	applied: false,
	visibility: "",
};

export function loadEmbedMode(visibility) {
	(document.querySelector(".top-bar") as HTMLElement).style.display = "none";
	(document.querySelector(".section-title") as HTMLElement).style.display = "none";
	(document.querySelector(".footer") as HTMLElement).style.display = "none";
	loadViewVisibility(visibility);
	loadEmbedListeners(onViewMessage);
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
	}
}

function sendHeightMessageToParent() {
	setTimeout(() => {
		sendToParent("height", getID("expenses-content").scrollHeight);
	}, 500);
}

function embedAfterLoadAction(pin) {
	for (const card of document.querySelectorAll(".expenses-card")) {
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
