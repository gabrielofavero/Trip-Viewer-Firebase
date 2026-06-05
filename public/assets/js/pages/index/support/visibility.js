function loadVisibilityIndex() {
	loadUserVisibility();
	loadLogoColors();

	getID("night-mode").onclick = function () {
		switchVisibility();
	};
}
