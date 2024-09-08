var LINEUP_DATA_SELECT_OPTIONS = ''; 

// Listeners
function _loadLineupListeners(j) {
    // Dynamic Title
    const nome = getID(`lineup-nome-${j}`);
    const title = getID(`lineup-title-${j}`);
    const headliner = getID(`lineup-headliner-${j}`);
    const midia = getID(`lineup-midia-${j}`);
    
    nome.addEventListener('click', () => _setTitulo(j, nome, title, headliner));
    headliner.addEventListener('click', () => _setTitulo(j, nome, title, headliner));
    midia.addEventListener('change', () => _validatePlaylistLink(`lineup-midia-${j}`));

    function _setTitulo(j, nome, title, headliner) {
        if (nome.value) {
            title.innerText = `${nome.value}${headliner.checked ? ' ⭐' : ''}`;
        } else {
            title.innerText = `Banda / Artista ${j}`;
        }
    }
}

function _lineupAdicionarListenerAction() {
    _closeAccordions('lineup');
    _addLineup();
    _openLastAccordion('lineup');
    _buildDS('lineup-genero');
    _buildDS('lineup-palco');
}

function _loadLineupDataSelectOptions() {
    LINEUP_DATA_SELECT_OPTIONS = _getDataSelectOptions();
}

function _reloadLineupDataSelectOptions() {
    LINEUP_DATA_SELECT_OPTIONS = _getDataSelectOptions();

    for (const j of _getJs('lineup-box')) {
        const select = getID(`lineup-data-${j}`);
        const value = select.value;
        
        select.innerHTML = LINEUP_DATA_SELECT_OPTIONS;
        _setLineupDataSelectOption(value, j);
    }
}

function _setLineupDataSelectOption(value, j) {
    const inputDatas = DATAS.map(data => _jsDateToKey(data));
    if (value && inputDatas.includes(value)) {
        getID(`lineup-data-${j}`).value = value;
    }
}