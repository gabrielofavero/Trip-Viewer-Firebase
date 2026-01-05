function _adjustButtonsPositionDestinos() {
    const first = "10px";
    const second = "50px";

    const nightMode = getID("night-mode");
    const closeButton = getID("closeButton");

    closeButton.style.right = first;
    nightMode.style.right = second;
}

function _applyDestinosMediaHeight() {
    const keys = Object.keys(MEDIA_HYPERLINKS);
    const firstDiv = getID('destinos-1');
    if (keys.length > 0 && firstDiv) {
        const width = firstDiv.offsetWidth - 40; // 20px padding em cada lado

        const heightPortrait = (width * 16) / 9;
        const heightLandscape = (width * 9) / 16;

        _setCSSRule('.youtube-embed', 'height', `${heightLandscape}px`);

        if (getID('content').offsetWidth <= 550) {
            _setCSSRule('.tiktok-embed-v3', 'height', `${heightPortrait}px`);
        } else {
            _setCSSRule('.tiktok-embed-v3', 'height', `533px`);
        }
    }
}

function _applyAccordionArrowCustomColor() {
    const color = THEME_COLOR.replace("#", "%23");
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='${color}'><path fill-rule='evenodd' d='M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708z'/></svg>`;
    _setCSSRule('.accordion-button::after', 'background-image', `url("data:image/svg+xml,${svg}") !important`);
}


function _getDestinosTituloVisibility(item) {
    if (item.nota || item.mapa || item.website || item.instagram) return "flex";
    else return "none";
}

function _getLinksContainerVisibility(item) {
    if ((item.mapa || item.website || item.instagram)) return "flex";
    else return "none";
}

function _getPalcoRegiaoVisibility(item) {
    return item.regiao ? "block" : "none";
}

function _getValorVisibility(item) {
    return item.valor ? "block" : "none";
}

function _getDescricaoVisibility(item) {
    return _getDescricaoValue(item) ? "block" : "none";
}

function _getSystemWidth() {
    return window.innerWidth || document.documentElement.clientWidth;
}

function _openDestinosAccordion(id) {
    const num = String(id).match(/\d+$/)?.[0];
    if (!num) return false;

    const target = document.getElementById(`collapse-destinos-${num}`);
    if (!target) return false;

    for (const el of getID('content').children) {
        const id = el.id;
        if (_isDestinosAccordionOpen(id)) {
            _closeDestinosAccordion(id);
        }
    }

    const acc = bootstrap.Collapse.getOrCreateInstance(target, { toggle: false });
    acc.show();

    return true;
}

function _closeDestinosAccordion(id) {
    const num = String(id).match(/\d+$/)?.[0];
    if (!num) return false;

    const target = document.getElementById(`collapse-destinos-${num}`);
    if (!target) return false;

    const acc = bootstrap.Collapse.getOrCreateInstance(target, { toggle: false });
    acc.hide();

    return true;
}

function _isDestinosAccordionOpen(id) {
    const num = String(id).match(/\d+$/)?.[0];
    if (!num) return false;

    const target = document.getElementById(`collapse-destinos-${num}`);
    if (!target) return false;

    return target.classList.contains("show");
}