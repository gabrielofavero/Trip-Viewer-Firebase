function _adjustButtonsPositionDestinos() {
    const first = "10px";
    const second = "50px";

    const nightMode = getID("night-mode");
    const closeButton = getID("closeButton");

    closeButton.style.right = first;
    nightMode.style.right = second;
}

function _applyCustomColorsDestinos() {
    const text = getID("trip-viewer-text");
    text.style.color = THEME_COLOR;
    _addCSSRule('.section-title h2::after', 'background', THEME_COLOR);
}