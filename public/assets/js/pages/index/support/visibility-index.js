function _loadVisibilityIndex() {
    _autoVisibility();
    document.getElementById("night-mode").onclick = function () {
      _switchVisibility();
    };
    window.addEventListener("resize", function () {
      _adjustButtonsPosition();
    });
  }