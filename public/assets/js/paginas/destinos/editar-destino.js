let ADDED_J;

// Main Functions
function _edit(j) {
    if (!_canEdit()) {
        _abortEdit('messages.errors.unauthorized_access');
        return;
    }

    const id = _getDestinoID(j);
    const item = FIRESTORE_DESTINOS_DATA[ACTIVE_CATEGORY]?.[id];
    const accordionBody = getID(`accordion-body-${j}`);

    if (!item || !accordionBody) {
        _abortEdit('messages.errors.unknown');
        return;
    }

    accordionBody.innerHTML = _getEditHTML(j);

    _populateEditFields(j, item);
    _setEditListeners(j, item);

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
}

function _add() {
    document.querySelector('.add-container').style.display = 'none';
    if (!_canEdit()) {
        _abortEdit('messages.errors.unauthorized_access');
        return;
    }

    const accordionItems = Array.from(document.querySelectorAll('.accordion-item'));
    const pool = accordionItems.map(el => el.getAttribute('data-id')).filter(id => id !== null);

    const id = _getRandomID({ pool });
    const j = _getLastUnorderedJ('content') + 1;
    const item = {
        nome: translate('destination.new'),
        nota: 'default',
        novo: true
    }
    const closeAction = '_closeAddedDestino';
    getID('content').innerHTML += _getDestinosHTML({ j, id, item, closeAction });

    const accordionBody = getID(`accordion-body-${j}`);
    if (!accordionBody) {
        _abortEdit('messages.errors.unknown');
        return;
    }

    ADDED_J = j;
    accordionBody.innerHTML = _getEditHTML(ADDED_J);
    getID(`editar-delete-${ADDED_J}`).style.visibility = 'hidden';

    _openDestinosAccordion(ADDED_J);

    _setAddListeners();
}

async function _adjustEditVisibility(j) {
    const isMaps = ACTIVE_CATEGORY === 'myMaps';
    const display = _canEdit() && !isMaps ? '' : 'none';
    document.querySelector('.add-container').style.display = display;
    if (j) {
        getID(`edit-container-${j}`).style.display = display;
        return;
    }

    for (const container of document.querySelectorAll('.edit-container')) {
        container.style.display = '';
    }
}


// Listeners
function _setFieldListeners(j){
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


function _setEditListeners(j, item) {
    getID(`close-btn-${j}`).onclick = () => {
        _restoreAccordionBody(j, item);
        _processAccordion(j);
    }

    getID(`editar-delete-${j}`).onclick = () => {
        _promptDeleteEdit(j);
    }

    getID(`editar-save-${j}`).onclick = () => {
        _saveEdit(j);
    }

    _setFieldListeners(j);
}

function _setAddListeners() {
    getID(`close-btn-${ADDED_J}`).onclick = () => {
        _closeAddedDestino();
    }

    getID(`editar-save-${ADDED_J}`).onclick = () => {
        _saveEdit(ADDED_J, true);
    }

    _setFieldListeners(ADDED_J);
}


// Load Actions
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


// Save Action
async function _saveEdit(j, isNew = false) {
    _startLoadingScreen();
    const id = _getDestinoID(j);
    const originalItem = isNew ? {} : _getItem(id);
    const item = {
        criadoEm: originalItem?.criadoEm || new Date().toISOString(),
        descricao: {
            en: getID(`editar-descricao-en-${j}`).value,
            pt: getID(`editar-descricao-pt-${j}`).value
        },
        emoji: getID(`editar-emoji-${j}`).value,
        instagram: getID(`editar-instagram-${j}`).value,
        mapa: getID(`editar-mapa-${j}`).value,
        midia: getID(`editar-midia-${j}`).value,
        nome: getID(`editar-nome-${j}`).value,
        nota: getID(`editar-nota-${j}`).value,
        novo: isNew ? true : originalItem.novo,
        regiao: _getValue('regiao', j),
        valor: _getValue('valor', j),
        website: getID(`editar-website-${j}`).value
    }

    if (!item.nome) {
        _stopLoadingScreen();
        _displayMessage(translate('destination.edit'), translate('destination.errors.missing_title'));
        return;
    }

    if (item.midia && item.midia.includes('tiktok')) {
        item.midia = await _normalizeTikTokLink(item.midia);
    }

    const docPath = `destinos/${DOCUMENT_ID}`;
    await _update(docPath, { [`${ACTIVE_CATEGORY}.${id}`]: item });

    await _refreshDestino();
    _stopLoadingScreen();

    function _getValue(type, j) {
        const selectValue = getID(`editar-${type}-select-${j}`).value;
        return selectValue != 'custom' ? selectValue : getID(`editar-${type}-input-${j}`).value;
    }
}


// Delete Actions
function _promptDeleteEdit(j) {
    const id = _getDestinoID(j);
    const name = _getItem(id).nome;

    const titulo = translate('destination.delete.title');
    const conteudo = translate('destination.delete.message', { name });
    const yesAction = `_deleteEdit('${id}')`;

    _displayPrompt({ titulo, conteudo, yesAction })
}

async function _deleteEdit(id) {
    _closeMessage();
    _startLoadingScreen();

    await _update(`destinos/${DOCUMENT_ID}`, {
        [`${ACTIVE_CATEGORY}.${id}`]: firebase.firestore.FieldValue.delete()
    });

    await _refreshDestino();
    _stopLoadingScreen();
}


// Cancel Actions
function _abortEdit(message) {
    _displayMessage(translate('messages.errors.load_title'), translate(message));
    _adjustEditVisibility()
}

function _closeAddedDestino() {
    if (!ADDED_J) {
        return;
    }
    _removeEl(`destinos-box-${ADDED_J}`);
    _adjustEditVisibility();
    ADDED_J = null;
}

function _restoreAccordionBody(j, item) {
    const id = _getDestinoID(j);
    const planejado = _getPlanejado(id)
    getID(`accordion-body-${j}`).innerHTML = _getDestinosAccordionBodyHTML({ j, item, planejado } );
}

function _restoreIfEditing(j) {
    if (_isEditing(j)) {
        const item = _getItemFromJ(j);
        if (!item) return;
        _restoreAccordionBody(j, item);
    }
}


// Checkers
function _isEditing(j) {
    const accordionBody = getID(`accordion-body-${j}`);
    return accordionBody.querySelector('.edit-title-container') != undefined;
}

async function _canEdit() {
    const uid = await _getUID();
    return FIRESTORE_DESTINOS_DATA.compartilhamento.dono == uid
}