// Loader
function _loadEventListeners() {
    // Inputs
    getID('inicio').addEventListener('change', () => _inicioListenerAction());
    getID('fim').addEventListener('change', () => _fimListenerAction());

    // Botões
    getID('editores-adicionar').addEventListener('click', () => _addEditores());
    getID('salvar').addEventListener('click', () => _setViagem());
    getID('re-editar').addEventListener('click', () => _reEdit('viagens', WAS_SAVED));
    getID('visualizar').addEventListener('click', () => _visualizarListenerAction());
    getID('home').addEventListener('click', () => window.location.href = `index.html`);
    getID('apagar').addEventListener('click', async () => _apagarListenerAction());
    getID('home').addEventListener('click', () => window.location.href = `index.html`);
    getID('cancelar').addEventListener('click', () => window.location.href = `index.html`);
    getID('transporte-adicionar').addEventListener('click', () => _transporteAdicionarListenerAction());
    getID('hospedagens-adicionar').addEventListener('click', () => _hospedagensAdicionarListenerAction());
    getID('lineup-adicionar').addEventListener('click', () => _lineupAdicionarListenerAction());
    getID('galeria-adicionar').addEventListener('click', () => _galeriaAdicionarListenerAction());
    getID('pin-enable').addEventListener('click', () => _switchPinVisibility());
    getID('pin-disable').addEventListener('click', () => _switchPinVisibility());

    // Visibilidade do Ida e Volta (Transporte)
    getID('condensar').addEventListener('change', () => _applyIdaVoltaVisibility());
    getID('separar').addEventListener('change', () => _applyIdaVoltaVisibility());

    // Validação de Imagens no módulo de Customização
    getID('link-background').addEventListener('change', () => _validateImageLink('link-background'));
    getID('link-logo-light').addEventListener('change', () => _validateImageLink('link-logo-light'));
    getID('link-logo-dark').addEventListener('change', () => _validateImageLink('link-logo-dark'));

    // Validação de Links no módulo de Customização
    getID('link-attachments').addEventListener('change', () => _validateLink('link-attachments'));
    getID('link-drive').addEventListener('change', () => _validateLink('link-drive'));
    getID('link-maps').addEventListener('change', () => _validateLink('link-maps'));
    getID('link-pdf').addEventListener('change', () => _validateLink('link-pdf'));
    getID('link-ppt').addEventListener('change', () => _validateLink('link-ppt'));
    getID('link-sheet').addEventListener('change', () => _validateLink('link-sheet'));
    getID('link-vacina').addEventListener('change', () => _validateLink('link-vacina'));

    // Barra de pesquisa em destinos
    getID('destinos-search').addEventListener('input', () => _searchDestinosListenerAction());
}

// Actions
function _inicioListenerAction() {
    const inicioDiv = getID('inicio');
    const fimDiv = getID('fim');

    const inicio = inicioDiv.value;
    const fim = fimDiv.value;

    if (NEW_TRIP || !fim || _inputDateToJsDate(fim).getTime() < _inputDateToJsDate(inicio).getTime()) {
        fimDiv.value = _getNextInputDay(inicio);
    }

    _reloadProgramacao();
}

function _fimListenerAction() {
    const inicioDiv = getID('inicio');
    const fimDiv = getID('fim');

    const inicio = inicioDiv.value;
    const fim = fimDiv.value;

    if (!inicio || _inputDateToJsDate(fim).getTime() < _inputDateToJsDate(inicio).getTime()) {
        inicioDiv.value = _getPreviousInputDay(fim);
    }

    _reloadProgramacao();
}

function _visualizarListenerAction() {
    if (DOCUMENT_ID) {
        window.location.href = `viagem.html?v=${DOCUMENT_ID}`;
    } else {
        window.location.href = `index.html`;
    }
}

async function _apagarListenerAction() {
    if (DOCUMENT_ID) {
        await _deleteUserObjectDB(DOCUMENT_ID, "viagens");
        await _deleteUserObjectStorage();
        window.location.href = `index.html`;
    }
}

function _addRemoveGaleriaListener(j) {
    const dynamicSelects = [{
        type: 'galeria-categoria',
        selectID: `galeria-categoria-select-${j}`,
    }]
    _addRemoveChildListenerDS('galeria', j, dynamicSelects);
}

function _addRemoveLineupListener(j) {
    const dynamicSelects = [{
        type: 'lineup-genero',
        selectID: `lineup-genero-select-${j}`,
    }, {
        type: 'lineup-palco',
        selectID: `lineup-palco-select-${j}`,
    }]
    _addRemoveChildListenerDS('lineup', j, dynamicSelects);
}