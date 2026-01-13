var IS_EMBED = false;

function _loadEmbedMode(visibility) {
    document.querySelector('.top-bar').style.display = 'none'
    document.querySelector('.section-title').style.display = 'none'
    document.querySelector('.footer').style.display = 'none';
    _loadEmbedVisibility(visibility);
}

function _onViewMessage(data) {
    switch (data.type) {
        case 'visibility':
            _loadExternalVisibility(data.value);
    }
}

function _loadEmbedVisibility(visibility) {
    visibility = visibility || _getVisibility();
    _loadExternalVisibility(visibility);
    const preloader = getID('preloader');
    if (preloader.style.display == 'block' && preloader.querySelector('.input-container')) {
        preloader.style.background = _isOnDarkMode() ? 'rgba(64, 64, 64, 0.6)' : 'rgba(241 241 241, 0.6)'
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