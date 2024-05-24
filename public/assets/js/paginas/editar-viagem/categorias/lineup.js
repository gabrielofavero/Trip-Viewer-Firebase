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