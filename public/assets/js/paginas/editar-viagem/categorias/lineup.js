// Listeners
function _loadLineupListeners(j) {
    // Dynamic Title
    const nome = getID(`lineup-nome-${j}`);
    const title = getID(`lineup-title-${j}`);
    const headliner = getID(`lineup-headliner-${j}`);
    nome.addEventListener('change', function () {
        title.innerText = nome.value;
        if (headliner.checked) {
            title.innerText += ' ⭐';
        }
    });
    headliner.addEventListener('change', function () {
        title.innerText = nome.value;
        if (headliner.checked) {
            title.innerText += ' ⭐';
        }
    });

    // Validação de Link
    getID(`lineup-midia-${j}`).addEventListener('change', () => _validatePlaylistLink(`lineup-midia-${j}`));
}

function _lineupAdicionarListenerAction() {
    _closeAccordions('lineup');
    _addLineup();
    _openLastAccordion('lineup');
}