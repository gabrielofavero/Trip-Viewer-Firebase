var IS_EMBED = false;

function _loadEmbedMode(visibility) {
    document.querySelector('.top-bar').style.display = 'none'
    document.querySelector('.section-title').style.display = 'none'
    document.querySelector('.footer').style.display = 'none';
    _loadExternalVisibility(visibility);
}

function _onViewMessage(data) {
    switch (data.type) {
        case 'visibility':
            _loadExternalVisibility(data.value);
    }
}

function _sendHeightMessageToParent() {
    setTimeout(() => {
        _sendToParent("height", getID('expenses-content').scrollHeight);
    }, 500);
}

function _embedAfterLoadAction() {
    for (const card of document.querySelectorAll('.gastos-card')) {
        card.classList.add('container-mode');
    }
    _sendHeightMessageToParent();
}