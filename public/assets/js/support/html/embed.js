export function _loadEmbedListeners(action) {
	window.addEventListener("message", (e) => {
		const current = _getOrigin().toUpperCase();
		const eventType = e?.data?.type || "unknown";
		const origin = e?.data?.page || "unknown";
		console.log(
			`[${current}] Received "${eventType}" event from "${origin}" page`,
		);
		_onEmbedMessage(e, action);
	});
}

export function _openEmbed({
	frameID,
	url,
	beforeOpen,
	onLoad,
	afterOpen,
	newTab = false,
}) {
	const iframe = document.getElementById(frameID);
	if (!iframe) return;

	beforeOpen?.();

	if (newTab) {
		iframe.src = "about:blank";
	}

	iframe.onload = function () {
		onLoad?.();
	};

	iframe.src = url;
	afterOpen?.();
}

export function _onEmbedMessage(event, action) {
	const allowedOrigin = window.location.origin;
	if (event.origin !== allowedOrigin) return;

	const data = event.data;

	if (!data || typeof data !== "object" || !data.type) return;

	action(data);
}

export function _sendToParent(type, value) {
	const page = _getOrigin();
	window.parent.postMessage({ page, type, value }, window.location.origin);
}

export function _sendToEmbed(frameID, type, value) {
	const frame = getID(frameID);
	if (!frame || !frame.contentWindow) return;
	const page = _getOrigin();

	frame.contentWindow.postMessage(
		{ page, type, value },
		window.location.origin,
	);
}

export function _getOrigin() {
	return window.location.pathname.replace("/", "");
}

export function _loadEmbedVisibility({
	closeAction,
	embedAction,
	notEmbedAction,
} = {}) {
	const closeButton = getID("closeButton");
	const logoLink = getID("logo-link");

	if (_isEmbed()) {
		embedAction?.();
		closeButton.onclick = () => {
			closeAction?.();
			window.parent._closeViewEmbed(false, _getVisibility());
		};

		logoLink.onclick = () => {
			window.parent._closeViewEmbed(true, _getVisibility());
		};
	} else {
		notEmbedAction?.();
		closeButton.style.display = "none";
		const share = getID("share");
		if (share) {
			share.style.display = "";
		}

		logoLink.onclick = () => {
			window.location.href = "index.html";
		};
	}
}

export function _isEmbed() {
	return window.parent != window;
}

// BACKWARD COMPAT: attach to window during migration
window._loadEmbedListeners = _loadEmbedListeners;
window._openEmbed = _openEmbed;
window._onEmbedMessage = _onEmbedMessage;
window._sendToParent = _sendToParent;
window._sendToEmbed = _sendToEmbed;
window._getOrigin = _getOrigin;
window._loadEmbedVisibility = _loadEmbedVisibility;
window._isEmbed = _isEmbed;
