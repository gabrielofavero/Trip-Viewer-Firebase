function _loadVisibilityIndex() {
	_loadUserVisibility();
	_loadLogoColors();

	getID("night-mode").onclick = function () {
		_switchVisibility();
	};
}
