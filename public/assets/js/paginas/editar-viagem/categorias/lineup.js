function _lineupGeneroSelectAction(init = false, updateLast = false) {
    let copy = LINEUP_GENEROS;
    LINEUP_GENEROS = _getUpdatedDynamicSelectArray('lineup', 'genero');
    _loadDynamicSelect('lineup', 'genero', copy, LINEUP_GENEROS, init, updateLast);
}

function _lineupPalcoSelectAction(init = false, updateLast = false) {
    let copy = LINEUP_PALCOS;
    LINEUP_PALCOS = _getUpdatedDynamicSelectArray('lineup', 'palco');
    _loadDynamicSelect('lineup', 'palco', copy, LINEUP_PALCOS, init, updateLast);
}

function _loadNewLineupSelects() {
    _lineupGeneroSelectAction(false, true);
    _lineupPalcoSelectAction(false, true);
}

// Listeners
function _loadLineupListeners(j) {
    // Dynamic Select: Gênero
    getID(`lineup-genero-select-${j}`).addEventListener('change', () => _lineupGeneroSelectAction());
    getID(`lineup-genero-${j}`).addEventListener('change', () => _lineupGeneroSelectAction());

    // Dynamic Select: Palco
    getID(`lineup-palco-select-${j}`).addEventListener('change', () => _lineupPalcoSelectAction());
    getID(`lineup-palco-${j}`).addEventListener('change', () => _lineupPalcoSelectAction());

    // Dynamic Title
    const nome = getID(`lineup-nome-${j}`);
    const title = getID(`lineup-title-${j}`);
    const headliner = getID(`lineup-headliner-${j}`);
    nome.addEventListener('change', function () {
        title.innerText = nome.value;
        if (headliner.checked) {
            title.innerText += ' ⭐';
        }
    });
    headliner.addEventListener('change', function () {
        title.innerText = nome.value;
        if (headliner.checked) {
            title.innerText += ' ⭐';
        }
    });

    // Load Listener Actions
    _lineupGeneroSelectAction(true);
    _lineupPalcoSelectAction(true);

    // Validação de Link
    getID(`lineup-midia-${j}`).addEventListener('change', () => _validatePlaylistLink(`lineup-midia-${j}`));
}

function _lineupAdicionarListenerAction() {
    _closeAccordions('lineup');
    _addLineup();
    _loadNewLineupSelects();
    _openLastAccordion('lineup');
}