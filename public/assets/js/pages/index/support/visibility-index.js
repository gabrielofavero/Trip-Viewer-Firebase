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

  function _expandContentBox() {
    const contentBox = document.querySelector('.content-box');
    contentBox.style.height = '600px'
    contentBox.style.transition = 'height 0.5s ease';
  }
  