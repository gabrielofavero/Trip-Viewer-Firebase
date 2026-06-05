export function loadEmbedListeners(action) {
	window.addEventListener("message", (e) => {
		const current = getOrigin().toUpperCase();
		const eventType = e?.data?.type || "unknown";
		const origin = e?.data?.page || "unknown";
		console.log(
			`[${current}] Received "${eventType}" event from "${origin}" page`,
		);
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

export function onEmbedMessage(event, action) {
	const allowedOrigin = window.location.origin;
	if (event.origin !== allowedOrigin) return;

	const data = event.data;

	if (!data || typeof data !== "object" || !data.type) return;

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

	frame.contentWindow.postMessage(
		{ page, type, value },
		window.location.origin,
	);
}

export function getOrigin() {
	return window.location.pathname.replace("/", "");
}

export function loadEmbedVisibility({
	closeAction,
	embedAction,
	notEmbedAction,
} = {}) {
	const closeButton = getID("closeButton");
	const logoLink = getID("logo-link");

	if (isEmbed()) {
		embedAction?.();
		closeButton.onclick = () => {
			closeAction?.();
			window.parent.closeViewEmbed(false, getVisibility());
		};

		logoLink.onclick = () => {
			window.parent.closeViewEmbed(true, getVisibility());
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

export function isEmbed() {
	return window.parent != window;
}

// BACKWARD COMPAT: attach to window during migration
window.loadEmbedListeners = loadEmbedListeners;
window.openEmbed = openEmbed;
window.onEmbedMessage = onEmbedMessage;
window.sendToParent = sendToParent;
window.sendToEmbed = sendToEmbed;
window.getOrigin = getOrigin;
window.loadEmbedVisibility = loadEmbedVisibility;
window.isEmbed = isEmbed;
