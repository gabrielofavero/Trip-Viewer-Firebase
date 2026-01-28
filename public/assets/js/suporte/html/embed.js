function _loadEmbedListeners(action) {
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

function _openEmbed({
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

function _onEmbedMessage(event, action) {
	const allowedOrigin = window.location.origin;
	if (event.origin !== allowedOrigin) return;

	const data = event.data;

	if (!data || typeof data !== "object" || !data.type) return;

	action(data);
}

function _sendToParent(type, value) {
	const page = _getOrigin();
	window.parent.postMessage({ page, type, value }, window.location.origin);
}

function _sendToEmbed(frameID, type, value) {
	const frame = getID(frameID);
	if (!frame || !frame.contentWindow) return;
	const page = _getOrigin();

	frame.contentWindow.postMessage(
		{ page, type, value },
		window.location.origin,
	);
}

function _getOrigin() {
	return window.location.pathname.replace("/", "");
}

function _loadEmbedVisibility(closeButtonAction) {
	const closeButton = getID("closeButton");
	const logoLink = getID("logo-link");

	if (_isEmbed()) {
		closeButton.onclick = () => {
			closeButtonAction?.();
			window.parent._closeViewEmbed(false, _getVisibility());
		};

		logoLink.onclick = () => {
			window.parent._closeViewEmbed(true, _getVisibility());
		};
	} else {
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

function _isEmbed() {
	return window.parent != window;
}
