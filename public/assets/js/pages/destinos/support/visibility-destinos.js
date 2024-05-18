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
    _addCSSRule('.new', 'fill', THEME_COLOR);
    _addCSSRule('.color-icon', 'color', THEME_COLOR);
    _applyAccordionArrowCustomColor();
}

function _applyDestinosMediaHeight() {
    const keys = Object.keys(MEDIA_HYPERLINKS);
    if (keys.length > 0) {
        const firstDiv = getID('destinos-1');
        const width = firstDiv.offsetWidth - 40; // 20px padding em cada lado
        
        const heightPortrait = (width * 16) / 9;
        const heightLandscape = (width * 9) / 16;
        
        _addCSSRule('.tiktok-embed-v3', 'height', `${heightPortrait}px`);
        _addCSSRule('.youtube-embed', 'height', `${heightLandscape}px`);
    }
}

function _applyAccordionArrowCustomColor() {
    const color = THEME_COLOR.replace("#", "%23");
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='${color}'><path fill-rule='evenodd' d='M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708z'/></svg>`;
    _addCSSRule('.accordion-button::after', 'background-image', `url("data:image/svg+xml,${svg}") !important`);
}


function _getDestinosTituloVisibility(item) {
    if (item.nota || item.mapa || item.site || item.instagram) return "flex";
    else return "none";
}

function _getLinksContainerVisibility(item, isLineup) {
    if (!isLineup && (item.mapa || item.site || item.instagram)) return "flex";
    else return "none";
}

function _getHeadlinerVisibility(item, isLineup) {
    if (isLineup && item.headliner) return "block";
    else return "none";
}

function _getGeneroVisibility(item, isLineup) {
    if (isLineup) return "block";
    else return item.genero ? "block" : "none";
}

function _getPalcoRegiaoVisibility(item, isLineup) {
    if (isLineup) return item.palco ? "block" : "none";
    else return item.regiao ? "block" : "none";
}

function _getValorVisibility(item, isLineup) {
    if (isLineup) return "none";
    else return item.valor ? "block" : "none";
}

function _getDescricaoVisibility(item, isLineup) {
    if (isLineup) return "none";
    else return item.descricao ? "block" : "none";
}