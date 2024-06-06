var ADJUST_HEIGHT_CARDS = [];

function _loadAdjustCardsHeightsListener() {
    window.addEventListener('resize', _adjustCardsHeights);
}

function _adjustCardsHeights() {
    if (ADJUST_HEIGHT_CARDS.length > 0) {
        for (const card of ADJUST_HEIGHT_CARDS) {
            _adjustSingleCardsHeights(card);
        }
    }
}

function _adjustSingleCardsHeights(tipo, second = false) {
    let innerID = (tipo === 'hospedagens' && !second) ? 'nome' : 'box';

    const sliders = _getChildIDs(`${tipo}-wrapper`);
    let maxHeight = 0;

    for (const slider of sliders) {
        const j = _getJ(slider);
        const box = getID(`${tipo}-${innerID}-${j}`);

        if (box) {
            box.style.height = 'auto';
            const height = box.offsetHeight;
            if (height > maxHeight) {
                maxHeight = height;
            }
        }
    }

    for (const slider of sliders) {
        const j = _getJ(slider);
        const div = getID(`${tipo}-${innerID}-${j}`);
        if (div) {
            div.style.height = `${maxHeight}px`;
        }
    }

    if (tipo === 'hospedagens' && !second) {
        _adjustSingleCardsHeights('hospedagens', true);
    }
}