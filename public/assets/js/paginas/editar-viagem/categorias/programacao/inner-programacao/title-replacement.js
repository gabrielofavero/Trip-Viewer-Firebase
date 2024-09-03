const TITLE_REPLACEMENT = {
    current: '',
    replacement: '',
};

function _loadTitleReplacementCheckbox() {
    const container = getID('title-replacement-container');
    TITLE_REPLACEMENT.current = getID('inner-programacao').value;
    TITLE_REPLACEMENT.replacement = _getTitleReplacement();

    if (TITLE_REPLACEMENT.replacement && TITLE_REPLACEMENT.replacement !== TITLE_REPLACEMENT.current) {
        container.style.display = 'block';
        if (TITLE_REPLACEMENT.current) {
            getID('title-replacement-label').innerText = `Substituir o título atual "${TITLE_REPLACEMENT.current}" por "${TITLE_REPLACEMENT.replacement}"`;
        } else {
            getID('title-replacement-label').innerText = `Substituir o título da programação para "${TITLE_REPLACEMENT.replacement}"`;
        }
        
    } else {
        container.style.display = 'none';
    }
}

function _getTitleReplacement() {
    const radio = document.getElementsByName('inner-programacao-item-radio');
    const selected = Array.from(radio).find(r => r.checked);
    let select;

    switch (selected?.id) {
        case 'inner-programacao-item-transporte-radio':
            select = getID('inner-programacao-select-transporte');
            break;
        case 'inner-programacao-item-hospedagens-radio':
            select = getID('inner-programacao-select-hospedagens');
            break
        case 'inner-programacao-item-destinos-radio':
            select = getID('inner-programacao-select-passeio');
    }

    if (select && select.value) {
        return _getSelectCurrentLabel(select);
    } else return '';
}

function _replaceTitleIfEnabled() {
    const checkbox = getID('title-replacement-checkbox');
    if (checkbox.checked && TITLE_REPLACEMENT.replacement) {
        getID('inner-programacao').value = TITLE_REPLACEMENT.replacement;
    }
    _resetTitleReplacement();
}

function _resetTitleReplacement() {
    TITLE_REPLACEMENT.current = '';
    TITLE_REPLACEMENT.replacement = '';
    getID('title-replacement-checkbox').checked = false;
    getID('title-replacement-container').style.display = 'none';
}