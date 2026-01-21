function _loadEmbedVisibility() {
	const closeButton = getID("closeButton");
	const share = getID("share");
	const logoLink = getID("logo-link");

	if (_isEmbed()) {
		closeButton.onclick = () => {
			_unloadMedias();
			window.parent._closeViewEmbed(false, _getVisibility());
		};

		logoLink.onclick = () => {
			window.parent._closeViewEmbed(true, _getVisibility());
		};
	} else {
		closeButton.style.display = "none";
		share.style.display = "";

		logoLink.onclick = () => {
			window.location.href = "index.html";
		};
	}
}

function _isEmbed() {
	return window.parent != window;
}
