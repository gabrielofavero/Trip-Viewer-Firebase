// Geral
function _loadEventListeners() {
    getID('transporte-adicionar').addEventListener('click', () => {
        _addTransporte();
    });

    getID('hospedagens-adicionar').addEventListener('click', () => {
        _addHospedagem();
    });

    getID('destinos-adicionar').addEventListener('click', () => {
        _addDestinos();
    });

    getID('lineup-adicionar').addEventListener('click', () => {
        _addLineup();
    });

    getID('galeria-adicionar').addEventListener('click', () => {
        _addGaleria();
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
        getID('fim').value = _getNextDay(getID('inicio').value);
        if (!DOCUMENT_ID || (DOCUMENT_ID && !changedOnce)) {
            changedOnce = true;
            getID('fim').value = _getNextDay(getID('inicio').value);
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
        _reEdit('viagens', wasSaved);
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
    const select = getID(`empresa-select-${i}`);
    const codigo = getID(`transporte-codigo-${i}`);

    select.addEventListener('change', function () {
        _loadTransporteVisibility(i);
    });

    codigo.addEventListener('change', function () {
        _loadTransporteVisibility(i);
    });

    const partida = getID(`ponto-partida-${i}`);
    const chegada = getID(`ponto-chegada-${i}`);
    const ida = getID(`ida-${i}`);
    const durante = getID(`durante-${i}`);
    const volta = getID(`volta-${i}`);

    partida.addEventListener('change', () => _updateTransporteTitle(i));
    chegada.addEventListener('change', () => _updateTransporteTitle(i));
    ida.addEventListener('change', () => _updateTransporteTitle(i));
    durante.addEventListener('change', () => _updateTransporteTitle(i));
    volta.addEventListener('change', () => _updateTransporteTitle(i));
}

function _loadLineupListeners(i) {

    // Dynamic Select: Gênero
    getID(`lineup-genero-select-${i}`).addEventListener('change', function () {
        _lineupGeneroSelectAction('lineup', 'genero');
    });
    getID(`lineup-genero-${i}`).addEventListener('change', function () {
        _lineupGeneroSelectAction('lineup', 'genero');
    });

    // Dynamic Select: Palco
    getID(`lineup-palco-select-${i}`).addEventListener('change', function () {
        _lineupPalcoSelectAction('lineup', 'palco');
    });
    getID(`lineup-palco-${i}`).addEventListener('change', function () {
        _lineupPalcoSelectAction('lineup', 'palco');
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
    _lineupGeneroSelectAction('lineup', 'genero', true);
    _lineupPalcoSelectAction('lineup', 'palco', true);
}

function _loadGaleriaListeners(i) {
    // Dynamic Select: Categoria
    getID(`galeria-categoria-select-${i}`).addEventListener('change', function () {
        _galeriaSelectAction('galeria', 'categoria');
    });
    getID(`galeria-categoria-${i}`).addEventListener('change', function () {
        _galeriaSelectAction('galeria', 'categoria');
    });

    // Dynamic Title
    getID(`galeria-titulo-${i}`).addEventListener('change', function () {
        getID(`galeria-title-${i}`).innerText = getID(`galeria-titulo-${i}`).value;
    });

    // Load Listener Actions
    _galeriaSelectAction('galeria', 'categoria', true);
}