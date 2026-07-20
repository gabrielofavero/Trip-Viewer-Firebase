import { getID } from '../utils/dom.js';
import { getVisibility } from '../theme/visibility.js';

export function loadEmbedListeners(action) {
	window.addEventListener('message', (e) => {
		const current = getOrigin().toUpperCase();
		const eventType = e?.data?.type || 'unknown';
		const origin = e?.data?.page || 'unknown';
		console.log(`[${current}] Received "${eventType}" event from "${origin}" page`);
		onEmbedMessage(e, action);
	});
}

export function openEmbed({
	frameID,
	url,
	beforeOpen,
	onLoad,
	afterOpen,
	newTab = false,
}: {
	frameID: string;
	url: string;
	beforeOpen?: () => void;
	onLoad?: () => void;
	afterOpen?: () => void;
	newTab?: boolean;
}) {
	const iframe = document.getElementById(frameID) as HTMLIFrameElement;
	if (!iframe) return;

	beforeOpen?.();

	if (newTab) {
		iframe.src = 'about:blank';
	}

	iframe.onload = function () {
		onLoad?.();
	};

	iframe.src = url;
	afterOpen?.();
}

export function onEmbedMessage(event, action) {
	const allowedOrigin = window.location.origin;
	if (event.origin !== allowedOrigin) return;

	const data = event.data;

	if (!data || typeof data !== 'object' || !data.type) return;

	action(data);
}

export function sendToParent(type, value) {
	const page = getOrigin();
	window.parent.postMessage({ page, type, value }, window.location.origin);
}

export function sendToEmbed(frameID, type, value) {
	const frame = getID(frameID);
	if (!frame || !frame.contentWindow) return;
	const page = getOrigin();

	frame.contentWindow.postMessage({ page, type, value }, window.location.origin);
}

export function getOrigin() {
	return window.location.pathname.replace('/', '');
}

export function loadEmbedVisibility({
	closeAction,
	embedAction,
	notEmbedAction,
}: {
	closeAction?: () => void;
	embedAction?: () => void;
	notEmbedAction?: () => void;
} = {}) {
	const closeButton = getID('closeButton');
	const logoLink = getID('logo-link');

	if (isEmbed()) {
		embedAction?.();
		closeButton &&
			(closeButton.onclick = () => {
				closeAction?.();
				(window.parent as any).closeViewEmbed(false, getVisibility());
			});

		logoLink &&
			(logoLink.onclick = () => {
				(window.parent as any).closeViewEmbed(true, getVisibility());
			});
	} else {
		notEmbedAction?.();
		closeButton && (closeButton.style.display = 'none');
		const share = getID('share');
		if (share) {
			share.style.display = '';
		}

		logoLink &&
			(logoLink.onclick = () => {
				window.location.href = 'index.html';
			});
	}
}

export function isEmbed() {
	return window.parent != window;
}
