// Geral
function _loadEventListeners() {
    getID('transporte-adicionar').addEventListener('click', () => {
        _closeAccordions('transporte');
        _addTransporte();
        _openLastAccordion('transporte');
    });

    getID('hospedagens-adicionar').addEventListener('click', () => {
        _closeAccordions('hospedagens');
        _addHospedagens();
        _openLastAccordion('hospedagens');
    });

    getID('destinos-adicionar').addEventListener('click', () => {
        _addDestinos();
    });

    getID('lineup-adicionar').addEventListener('click', () => {
        _closeAccordions('lineup');
        _addLineup();
        _loadNewLineupSelects();
        _openLastAccordion('lineup');
    });

    getID('galeria-adicionar').addEventListener('click', () => {
        _closeAccordions('galeria');
        _addGaleria();
        _loadNewGaleriaSelect();
        _openLastAccordion('galeria');
    });

    getID('cancelar').addEventListener('click', () => {
        window.location.href = `index.html`;
    });

    getID('home').addEventListener('click', () => {
        window.location.href = `index.html`;
    });

    getID('visualizar').addEventListener('click', () => {
        if (DOCUMENT_ID) {
            window.location.href = `viagem.html?v=${DOCUMENT_ID}`;
        } else {
            window.location.href = `index.html`;
        }
    });

    getID('inicio').addEventListener('input', () => {
        _loadProgramacao();
        const nextDay = _getNextDay(getID('inicio').value);
        if (nexDay) {
            getID('fim').value = nextDay;
            if (!DOCUMENT_ID || (DOCUMENT_ID && !changedOnce)) {
                changedOnce = true;
                getID('fim').value = nextDay;
            }
        }
    });

    getID('fim').addEventListener('change', () => {
        _loadProgramacao();
    });

    getID('editores-adicionar').addEventListener('click', () => {
        _addEditores();
    });

    getID('logo-tamanho').addEventListener('input', (event) => {
        _formatAltura(event.target.value);
    });

    getID('salvar').addEventListener('click', () => {
        _setViagem();
    });

    getID('re-editar').addEventListener('click', () => {
        _reEdit('viagens', WAS_SAVED);
    });

    getID('cancelar').addEventListener('click', () => {
        _closeModal();
    });

    getID('apagar').addEventListener('click', async () => {
        if (DOCUMENT_ID) {
            await _deleteUserObjectDB(DOCUMENT_ID, "viagens");
            await _deleteUserObjectStorage();
            window.location.href = `index.html`;
        }
    });

    getID('home').addEventListener('click', () => {
        window.location.href = `index.html`;
    });

    getID('condensar').addEventListener('change', () => {
        _applyIdaVoltaVisibility();
    });

    getID('separar').addEventListener('change', () => {
        _applyIdaVoltaVisibility();
    });
}

function _addTransporteListeners(i) {
    getID(`empresa-select-${i}`).addEventListener('change', () => _loadTransporteVisibility(i));
    getID(`transporte-codigo-${i}`).addEventListener('change', () => _loadTransporteVisibility(i));

    getID(`ponto-partida-${i}`).addEventListener('change', () => _updateTransporteTitle(i));
    getID(`ponto-chegada-${i}`).addEventListener('change', () => _updateTransporteTitle(i));
    getID(`ida-${i}`).addEventListener('change', () => _updateTransporteTitle(i));
    getID(`durante-${i}`).addEventListener('change', () => _updateTransporteTitle(i));
    getID(`volta-${i}`).addEventListener('change', () => _updateTransporteTitle(i));

    getID(`partida-${i}`).addEventListener('change', () => _loadAutoDuration(i));
    getID(`partida-horario-${i}`).addEventListener('change', () => _loadAutoDuration(i));
    getID(`chegada-${i}`).addEventListener('change', () => _loadAutoDuration(i));
    getID(`chegada-horario-${i}`).addEventListener('change', () => _loadAutoDuration(i));
}

function _loadLineupListeners(i) {

    // Dynamic Select: Gênero
    getID(`lineup-genero-select-${i}`).addEventListener('change', function () {
        _lineupGeneroSelectAction();
    });
    getID(`lineup-genero-${i}`).addEventListener('change', function () {
        _lineupGeneroSelectAction();
    });

    // Dynamic Select: Palco
    getID(`lineup-palco-select-${i}`).addEventListener('change', function () {
        _lineupPalcoSelectAction();
    });
    getID(`lineup-palco-${i}`).addEventListener('change', function () {
        _lineupPalcoSelectAction();
    });

    // Dynamic Title
    const nome = getID(`lineup-nome-${i}`);
    const title = getID(`lineup-title-${i}`);
    const headliner = getID(`lineup-headliner-${i}`);
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

    // Load Listener Actions
    _lineupGeneroSelectAction(true);
    _lineupPalcoSelectAction(true);
}

function _loadGaleriaListeners(i) {
    // Dynamic Select: Categoria
    getID(`galeria-categoria-select-${i}`).addEventListener('change', function () {
        _galeriaSelectAction();
    });
    getID(`galeria-categoria-${i}`).addEventListener('change', function () {
        _galeriaSelectAction();
    });

    // Dynamic Title
    getID(`galeria-titulo-${i}`).addEventListener('change', function () {
        getID(`galeria-title-${i}`).innerText = getID(`galeria-titulo-${i}`).value;
    });

    // Load Listener Actions
    _galeriaSelectAction(true);
}