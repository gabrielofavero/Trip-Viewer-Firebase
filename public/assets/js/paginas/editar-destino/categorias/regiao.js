var SELECT_REGIOES = {
    'restaurantes': [],
    'lanches': [],
    'saidas': [],
    'turismo': [],
    'lojas': []
}

function _regiaoSelectAction(categoria, init = false, updateLast = false) {
    let copy = SELECT_REGIOES[categoria];
    SELECT_REGIOES[categoria] = _getUpdatedDynamicSelectArray(categoria, 'regiao');
    _loadDynamicSelect(categoria, 'regiao', copy, SELECT_REGIOES[categoria], init, updateLast);
}

function _loadNewRegiaoSelect(categoria) {
    _regiaoSelectAction(categoria, false, true);
}

function _loadRegiaoListeners(i, categoria) {
    const select = getID(`${categoria}-regiao-select-${i}`);
    const input = getID(`${categoria}-regiao-${i}`);

    select.addEventListener('change', function () {
        _regiaoSelectAction(categoria);
        if (select.value === 'outra') {
            input.style.display = 'block';
        }
    });

    input.addEventListener('change', function () {
        _regiaoSelectAction(categoria);
    });
}