const TITLE_REPLACEMENT = {
    current: '',
    replacement: '',
};

const TIME_REPLACEMENT = {
    current: {
        inicio: '',
        fim: '',
    },
    replacement: {
        inicio: '',
        fim: '',
    },
}

var TEXT_REPLACEMENT_APPLIED = false;

function _loadTextReplacementCheckboxes() {
    _loadTitleReplacementCheckbox();
    _loadTimeReplacementCheckbox();
}

function _loadTitleReplacementCheckbox() {
    const container = getID('title-replacement-container');
    TITLE_REPLACEMENT.current = getID('inner-programacao').value;
    TITLE_REPLACEMENT.replacement = _getTitleReplacement();

    if (TITLE_REPLACEMENT.replacement && TITLE_REPLACEMENT.replacement !== TITLE_REPLACEMENT.current) {
        container.style.display = 'block';
        if (TITLE_REPLACEMENT.current) {
            getID('title-replacement-label').innerText = `Substituir o título atual "${TITLE_REPLACEMENT.current}" por "${TITLE_REPLACEMENT.replacement}"`;
        } else {
            getID('title-replacement-label').innerText = `Definir o título da programação como "${TITLE_REPLACEMENT.replacement}"`;
            getID('title-replacement-checkbox').checked = true;
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

function _replaceTextIfEnabled() {
    const checkbox = getID('title-replacement-checkbox');
    if (checkbox.checked && TITLE_REPLACEMENT.replacement) {
        getID('inner-programacao').value = TITLE_REPLACEMENT.replacement;
    }
    TITLE_REPLACEMENT.current = '';
    TITLE_REPLACEMENT.replacement = '';
    getID('title-replacement-checkbox').checked = false;
    getID('title-replacement-container').style.display = 'none';
}

function _loadTimeReplacementCheckbox() {
    TIME_REPLACEMENT.current.inicio = getID('inner-programacao-inicio').value;
    TIME_REPLACEMENT.current.fim = getID('inner-programacao-fim').value;
    const value = getID('inner-programacao-select-transporte').value;

    if (getID('inner-programacao-item-transporte-radio').checked && value) {
        const j = _findJFromID(value, 'transporte');

        TIME_REPLACEMENT.replacement.inicio = getID(`partida-horario-${j}`).value;
        TIME_REPLACEMENT.replacement.fim = getID(`chegada-horario-${j}`).value;
        
        if (TIME_REPLACEMENT.current.inicio != TIME_REPLACEMENT.replacement.inicio || TIME_REPLACEMENT.current.fim != TIME_REPLACEMENT.replacement.fim) {
            getID('time-replacement-container').style.display = 'block';

            let action;

            if (TIME_REPLACEMENT.current.inicio != TIME_REPLACEMENT.replacement.inicio && TIME_REPLACEMENT.current.fim != TIME_REPLACEMENT.replacement.fim) {
                action = !TIME_REPLACEMENT.current.inicio && !TIME_REPLACEMENT.current.fim ? 'Definir' : 'Substituir';
                getID('time-replacement-label').innerText = `${action} horário de início e fim para "${TIME_REPLACEMENT.replacement.inicio}" e "${TIME_REPLACEMENT.replacement.fim}"`;
            } else if (TIME_REPLACEMENT.current.inicio != TIME_REPLACEMENT.replacement.inicio) {
                action = !TIME_REPLACEMENT.current.inicio ? 'Definir' : 'Substituir';
                getID('time-replacement-label').innerText = `${action} horário de início para "${TIME_REPLACEMENT.replacement.inicio}"`;
            } else {
                action = !TIME_REPLACEMENT.current.fim ? 'Definir' : 'Substituir';
                getID('time-replacement-label').innerText = `${action} horário de fim para "${TIME_REPLACEMENT.replacement.fim}"`;
            }

            if (action === 'Definir') {
                getID('time-replacement-checkbox').checked = true;
            }
        }
    } else {
        getID('time-replacement-container').style.display = 'none';
    }
}

function _replaceTimeIfEnabled() {
    if (getID('time-replacement-checkbox').checked) {
        getID('inner-programacao-inicio').value = TIME_REPLACEMENT.replacement.inicio;
        getID('inner-programacao-fim').value = TIME_REPLACEMENT.replacement.fim;
    }
    TIME_REPLACEMENT.current.inicio = '';
    TIME_REPLACEMENT.current.fim = '';
    TIME_REPLACEMENT.replacement.inicio = '';
    TIME_REPLACEMENT.replacement.fim = '';
    getID('time-replacement-checkbox').checked = false;
    getID('time-replacement-container').style.display = 'none';
}