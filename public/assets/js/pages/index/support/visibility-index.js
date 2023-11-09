function _loadVisibilityIndex() {
    _autoVisibility();
    _loadLogoColors();
    document.getElementById("night-mode").onclick = function () {
      _switchVisibility();
    };
    window.addEventListener("resize", function () {
      _adjustButtonsPosition();
    });
  }