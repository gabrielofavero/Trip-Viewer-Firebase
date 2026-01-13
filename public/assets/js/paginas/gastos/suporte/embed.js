var IS_EMBED = false;

function _loadEmbedMode(visibility) {
    document.querySelector('.top-bar').style.display = 'none'
    document.querySelector('.section-title').style.display = 'none'
    document.querySelector('.footer').style.display = 'none';
    _loadExternalVisibility(visibility);
    _loadEmbedListeners(_onViewMessage);
}

function _onViewMessage(data) {
    switch (data.type) {
        case 'visibility':
            _loadExternalVisibility(data.value);
            return;
        case 'pin':
            _loadExternalPin(data.value);
    }
}

function _sendHeightMessageToParent() {
    setTimeout(() => {
        _sendToParent("height", getID('expenses-content').scrollHeight);
    }, 500);
}

function _embedAfterLoadAction(pin) {
    for (const card of document.querySelectorAll('.gastos-card')) {
        card.classList.add('container-mode');
    }
    _sendHeightMessageToParent();
    _sendToParent("pin", pin);
}

function _loadExternalPin(pin) {
    const pinCode = getID('pin-code');
    if (!pinCode || !pin || pin.length != 4) return;
    pinCode.innerText = pin;
    _setManualPin(pin);
}