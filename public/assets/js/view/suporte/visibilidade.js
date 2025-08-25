var ADJUST_HEIGHT_CARDS = [];

function _adjustCardsHeightsListener() {
    window.addEventListener('resize', function () {
        _adjustCardsHeights();
        
        if (FIRESTORE_DATA.transportes.visualizacao != 'simple-view') {
            _adjustTransporteBoxContainerHeight();
        }
    });
}

function _adjustCardsHeights(type) {
    const cards = type ? ADJUST_HEIGHT_CARDS.filter(card => card.includes(type)) : ADJUST_HEIGHT_CARDS;
    if (cards.length > 0) {
        for (const card of cards) {
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

function _loadViagemVisibility() {
    if (FIRESTORE_DATA.visibilidade) {
        const nightMode = getID('night-mode');

        if (!FIRESTORE_DATA.visibilidade.claro) {
            nightMode.style.display = 'none';
            _loadDarkMode();

        } else if (!FIRESTORE_DATA.visibilidade.escuro) {
            nightMode.style.display = 'none';
            _loadLightMode();
        }
    }
}