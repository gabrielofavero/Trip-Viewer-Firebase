function _adjustButtonsPositionPasseios() {
    const first = "10px";
    const second = "50px";

    const nightMode = document.getElementById("night-mode");
    const closeButton = document.getElementById("closeButton");

    closeButton.style.right = first;
    nightMode.style.right = second;
}

function _applyCustomColorsPasseios() {
    const text = document.getElementById("trip-viewer-text");
    text.style.color = THEME_COLOR;
    _addCSSRule('.section-title h2::after', 'background', THEME_COLOR);
}