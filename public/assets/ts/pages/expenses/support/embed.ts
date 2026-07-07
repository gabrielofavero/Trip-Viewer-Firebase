import { loadEmbedListeners, sendToParent } from '../../../ui/embed.js';
import { getID } from '../../../utils/dom.js';
import { getVisibility, loadExternalVisibility } from '../../../theme/visibility.js';
import { setManualPin } from '../../../utils/pin.js';

export const EXPENSES_EMBED = {
	enabled: false,
	applied: false,
	visibility: '',
};

export function loadEmbedMode(visibility) {
	(document.querySelector('.top-bar') as HTMLElement).style.display = 'none';
	(document.querySelector('.section-title') as HTMLElement).style.display = 'none';
	(document.querySelector('.footer') as HTMLElement).style.display = 'none';
	loadViewVisibility(visibility);
	loadEmbedListeners(onViewMessage);
	EXPENSES_EMBED.applied = true;
}

function onViewMessage(data) {
	switch (data.type) {
		case 'visibility':
			loadViewVisibility(data.value);
			return;
		case 'pin':
			loadExternalPin(data.value);
			return;
	}
}

export function sendHeightMessageToParent() {
	setTimeout(() => {
		sendToParent('height', getID('expenses-content').scrollHeight);
	}, 500);
}

export function embedAfterLoadAction(pin) {
	for (const card of document.querySelectorAll('.expenses-card')) {
		card.classList.add('container-mode');
	}
	sendHeightMessageToParent();
	sendToParent('pin', pin);
}

function loadExternalPin(pin) {
	const pinCode = getID('pin-code');
	if (!pinCode || !pin || pin.length != 4) return;
	pinCode.innerText = pin;
	setManualPin(pin);
}

function loadViewVisibility(externalVisibility) {
	if (EXPENSES_EMBED.visibility === undefined) {
		EXPENSES_EMBED.visibility = getVisibility();
	}
	loadExternalVisibility(externalVisibility, EXPENSES_EMBED.visibility);
	EXPENSES_EMBED.visibility = externalVisibility;
}
