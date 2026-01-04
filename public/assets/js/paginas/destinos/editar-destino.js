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

    const accordionItem = getID(`destinos-${j}`);
    const id = accordionItem.getAttribute('data-id');
    const item = FIRESTORE_DESTINOS_DATA[ACTIVE_CATEGORY]?.[id];
    const accordionBody = getID(`accordion-body-${j}`);

    if (!item || !accordionBody) {
        _abort('messages.errors.unknown');
        return;
    }

    accordionBody.innerHTML = _getEditHTML(j, item);

    function _abort(message) {
        _displayMessage(translate('messages.errors.load_title'), translate(message));
        _adjustEditVisibility()
    }
}