// ======= Device JS =======

// ======= CHECKERS =======
export function isIOSDevice() {
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

export function isViewHTML() {
	return getHTMLpage() === "view";
}
