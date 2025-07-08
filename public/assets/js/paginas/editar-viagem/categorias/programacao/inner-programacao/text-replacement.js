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

function _loadTextReplacementCheckboxes(j) {
    _loadTitleReplacementCheckbox(j);
    _loadTimeReplacementCheckbox();
}

function _loadTitleReplacementCheckbox(j) {
    const container = getID('title-replacement-container');
    TITLE_REPLACEMENT.current = getID('inner-programacao').value;
    TITLE_REPLACEMENT.replacement = _getTitleReplacement(j);

    if (TITLE_REPLACEMENT.replacement && TITLE_REPLACEMENT.replacement !== TITLE_REPLACEMENT.current) {
        container.style.display = 'block';
        if (TITLE_REPLACEMENT.current) {
            const replacements = {
                old: TITLE_REPLACEMENT.current,
                new: TITLE_REPLACEMENT.replacement
            }
            getID('title-replacement-label').innerText = translate('trip.itinerary.replace_title', replacements);
        } else {
            getID('title-replacement-label').innerText = translate('trip.itinerary.set_title', { title: TITLE_REPLACEMENT.replacement });
            getID('title-replacement-checkbox').checked = true;
        }

    } else {
        container.style.display = 'none';
    }
}

function _getTitleReplacement(j) {
    const radio = document.getElementsByName('inner-programacao-item-radio');
    const selected = Array.from(radio).find(r => r.checked);

    if (!selected || !selected.id) {
        return '';
    }

    const index = {
        'inner-programacao-item-transporte-radio': 'inner-programacao-select-transporte',
        'inner-programacao-item-hospedagens-radio': 'inner-programacao-select-hospedagens',
        'inner-programacao-item-destinos-radio': 'inner-programacao-select-passeio'
    }

    const select = getID(index[selected.id]);

    if (!select || !select.value) {
        return '';
    }
    const labelValue = _getSelectCurrentLabel(select);

    if (!labelValue) {
        return '';
    }

    if (selected.id.includes('hospedagens')) {
        return _processAccomodationReplacement(labelValue, j);
    }

    return labelValue;
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
                action = !TIME_REPLACEMENT.current.inicio && !TIME_REPLACEMENT.current.fim ? translate('labels.set') : translate('labels.replace');
                getID('time-replacement-label').innerText = `${action} horário de início e fim para "${TIME_REPLACEMENT.replacement.inicio}" e "${TIME_REPLACEMENT.replacement.fim}"`;
            } else if (TIME_REPLACEMENT.current.inicio != TIME_REPLACEMENT.replacement.inicio) {
                action = !TIME_REPLACEMENT.current.inicio ? translate('labels.set') : translate('labels.replace');
                getID('time-replacement-label').innerText = `${action} horário de início para "${TIME_REPLACEMENT.replacement.inicio}"`;
            } else {
                action = !TIME_REPLACEMENT.current.fim ? translate('labels.set') : translate('labels.replace');
                getID('time-replacement-label').innerText = `${action} horário de fim para "${TIME_REPLACEMENT.replacement.fim}"`;
            }

            if (action === translate('labels.set')) {
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

        if (TIME_REPLACEMENT.replacement.inicio) {
            const inicioHora = parseInt(TIME_REPLACEMENT.replacement.inicio.split(':')[0]);
            getID('inner-programacao-select-turno').value = _getTurno(inicioHora);
        }
    }
    TIME_REPLACEMENT.current.inicio = '';
    TIME_REPLACEMENT.current.fim = '';
    TIME_REPLACEMENT.replacement.inicio = '';
    TIME_REPLACEMENT.replacement.fim = '';
    getID('time-replacement-checkbox').checked = false;
    getID('time-replacement-container').style.display = 'none';
}

function _processAccomodationReplacement(labelValue, itineraryJ) {
    const date = DATAS[itineraryJ - 1];
    const inputDate = _jsDateToInputDate(date);
    const value = getID('inner-programacao-select-hospedagens').value;
    if (!inputDate || !value) return labelValue;

    const j = _findJFromID(value, 'hospedagens');
    const checkInValue = getID(`check-in-${j}`).value;
    const checkOutValue = getID(`check-out-${j}`).value;

    const isCheckIn = inputDate === checkInValue;
    const isCheckOut = inputDate === checkOutValue;

    if (!isCheckIn && !isCheckOut) return labelValue;

    const labelKey = isCheckIn 
        ? 'trip.accommodation.checkin' 
        : 'trip.accommodation.checkout';
    const treatedLabel = `${translate(labelKey)}: ${labelValue}`;

    const itineraries = INNER_PROGRAMACAO[_inputDateToKey(inputDate)];
    const allEntries = Object.values(itineraries).flat();
    const hasTreatedLabel = allEntries.some(entry => entry.programacao === treatedLabel);
    const alreadyIncluded = allEntries.some(entry => entry.programacao.includes(labelValue));
    const labelKeyMentioned = allEntries.some(entry => entry.programacao.includes(labelKey));

    return (hasTreatedLabel || alreadyIncluded || labelKeyMentioned) ? labelValue : treatedLabel;
}
