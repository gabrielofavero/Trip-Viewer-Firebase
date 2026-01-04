async function _adjustEditVisibility(j) {
    const display = _canEdit() ? '' : 'none';
    if (j) {
        getID(`edit-container-${j}`).style.display = display;
    }

    for (const container of document.querySelectorAll('.edit-container')) {
        container.style.display = '';
    }
}

async function _canEdit() {
    const uid = await _getUID();
    return FIRESTORE_DESTINOS_DATA.compartilhamento.dono == uid
}

function _edit(j) {
    if (!_canEdit()) {
        _abort('messages.errors.unauthorized_access');
        return;
    }

    const id = _getDestinoID(j);
    const item = FIRESTORE_DESTINOS_DATA[ACTIVE_CATEGORY]?.[id];
    const accordionBody = getID(`accordion-body-${j}`);

    if (!item || !accordionBody) {
        _abort('messages.errors.unknown');
        return;
    }

    accordionBody.innerHTML = _getEditHTML(j);

    _populateEditFields(j, item);
    _setEditListeners(j, item);

    function _abort(message) {
        _displayMessage(translate('messages.errors.load_title'), translate(message));
        _adjustEditVisibility()
    }
}

function _populateEditFields(j, item) {
    getID(`editar-nome-${j}`).value = item.nome || '';
    getID(`editar-emoji-${j}`).value = item.emoji || '';

    getID(`editar-mapa-${j}`).value = item.mapa || '';
    getID(`editar-instagram-${j}`).value = item.instagram || '';
    getID(`editar-website-${j}`).value = item.website || '';

    getID(`editar-midia-${j}`).value = item.midia || '';

    _populateScoresField(item.nota, j);
    _populateRegionField(item.regiao, j);
    _populateValueField(item.valor, j);
    _populateDescriptionFields(item.descricao || {}, j);

    function _populateScoresField(nota, j) {
        getID(`editar-nota-${j}`).value = nota || '';
        _editScoreLoadAction(nota, j);
    }

    function _populateRegionField(regiao, j) {
        const regionSelect = getID(`editar-regiao-select-${j}`);
        regionSelect.value = regiao || '';
    }

    function _populateValueField(valor, j) {
        const valores = CONFIG.moedas.valores;
        const valueSelect = getID(`editar-valor-select-${j}`);
        if (valores.includes(valor)) {
            valueSelect.value = valor;
        } else {
            valueSelect.value = 'custom';
            _editValueLoadAction('custom', j);
            getID(`editar-valor-input-${j}`).value = valor || '';
        }
    }

    function _populateDescriptionFields(descricao, j) {
        getID(`editar-descricao-en-${j}`).value = descricao.en || '';
        getID(`editar-descricao-pt-${j}`).value = descricao.pt || '';
        const lang = _getLanguagePackName();
        getID(`editar-descricao-lang-${j}`).value = lang;
        _editDescriptionLoadAction(lang, j);
    }
}

function _editScoreLoadAction(value, j) {
    const icon = getID(`editar-nota-icon-${j}`);
    icon.innerHTML = `<i class="iconify nota-sem-margem ${_getNotaClass(value)}" data-icon="${_getNotaIcon(value)}"></i>`;
}

function _editRegionLoadAction(value, j) {
    const select = getID(`editar-regiao-select-${j}`);
    const input = getID(`editar-regiao-input-${j}`);
    if (value == 'custom') {
        input.style.display = '';
        select.value = 'custom';
    }
    else {
        input.style.display = 'none';
    }
}

function _editValueLoadAction(value, j) {
    const select = getID(`editar-valor-select-${j}`);
    const input = getID(`editar-valor-input-${j}`);

    if (value == 'custom') {
        input.style.display = '';
        select.value = 'custom';
    } else {
        input.style.display = 'none';
    }
}

function _editDescriptionLoadAction(value, j) {
    for (const lang of LANGUAGES) {
        const display = lang == value ? '' : 'none';
        const id = `editar-descricao-${lang}-${j}`;
        getID(id).style.display = display;
    }
}

function _setEditListeners(j, item) {
    getID(`close-btn-${j}`).onclick = () => {
        _restoreAccordionBody(j, item);
        _processAccordion(j);
        _closeEdit(j, item);
    }

    getID(`editar-nota-${j}`).onchange = (e) => {
        _editScoreLoadAction(e.target.value, j);
    }

    getID(`editar-mapa-${j}`).onchange = (e) => {
        _validateMapLink(e.target.id);
    }

    getID(`editar-instagram-${j}`).onchange = (e) => {
        _validateInstagramLink(e.target.id);
    }

    getID(`editar-website-${j}`).onchange = (e) => {
        _validateLink(e.target.id);
    }

    getID(`editar-regiao-select-${j}`).onchange = (e) => {
        _editRegionLoadAction(e.target.value, j);
    }

    getID(`editar-valor-select-${j}`).onchange = (e) => {
        _editValueLoadAction(e.target.value, j);
    }

    getID(`editar-descricao-lang-${j}`).onchange = (e) => {
        _editDescriptionLoadAction(e.target.value, j);
    }

    getID(`editar-midia-${j}`).onchange = (e) => {
        _validateMediaLink(e.target.id);
    }
}

function _isEditing(j) {
    const accordionBody = getID(`accordion-body-${j}`);
    return accordionBody.querySelector('.edit-title-container') != undefined;
}

function _restoreAccordionBody(j, item) {
    getID(`accordion-body-${j}`).innerHTML = _getDestinosAccordionBodyHTML(j, item);
}

function _restoreIfEditing(j) {
    if (_isEditing(j)) {
        const item = _getItemFromJ(j);
        _restoreAccordionBody(j, item);
    }
}