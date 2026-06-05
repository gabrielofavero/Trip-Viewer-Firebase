// ======= Device JS =======

// ======= CHECKERS =======
export function _isIOSDevice() {
	return (
		[
			"iPad Simulator",
			"iPhone Simulator",
			"iPod Simulator",
			"iPad",
			"iPhone",
			"iPod",
		].includes(navigator.platform) ||
		(navigator.userAgent.includes("Mac") && "ontouchend" in document)
	);
}

export function _isViagemHTML() {
	return _getHTMLpage() === "viagem";
}

// BACKWARD COMPAT: attach to window during migration
window._isIOSDevice = _isIOSDevice;
window._isViagemHTML = _isViagemHTML;
