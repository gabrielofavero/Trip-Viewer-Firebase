// Loaders
function _loadEventListeners() {
    // Inputs
    getID('inicio').addEventListener('input', () => _inicioListenerAction());
    getID('fim').addEventListener('change', () => _loadProgramacao());
    getID('logo-tamanho').addEventListener('input', (event) => _formatAltura(event.target.value));

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
    getID('destinos-adicionar').addEventListener('click', () => _addDestinos());
    getID('lineup-adicionar').addEventListener('click', () => _lineupAdicionarListenerAction());
    getID('galeria-adicionar').addEventListener('click', () => _galeriaAdicionarListenerAction());

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
}

function _loadTransporteListeners(i) {
    // Selects Dinâmicos
    getID(`empresa-select-${i}`).addEventListener('change', () => _loadTransporteVisibility(i));
    getID(`transporte-tipo-${i}`).addEventListener('change', () => _loadTransporteVisibility(i));

    // Título Dinâmico
    getID(`ponto-partida-${i}`).addEventListener('change', () => _updateTransporteTitle(i));
    getID(`ponto-chegada-${i}`).addEventListener('change', () => _updateTransporteTitle(i));
    getID(`ida-${i}`).addEventListener('change', () => _updateTransporteTitle(i));
    getID(`durante-${i}`).addEventListener('change', () => _updateTransporteTitle(i));
    getID(`volta-${i}`).addEventListener('change', () => _updateTransporteTitle(i));

    // Cálculo Automático da Duração do Trajeto
    getID(`partida-${i}`).addEventListener('change', () => _loadAutoDuration(i));
    getID(`partida-horario-${i}`).addEventListener('change', () => _loadAutoDuration(i));
    getID(`chegada-${i}`).addEventListener('change', () => _loadAutoDuration(i));
    getID(`chegada-horario-${i}`).addEventListener('change', () => _loadAutoDuration(i));

    // Validação de Link
    getID(`transporte-link-${i}`).addEventListener('change', () => _validateLink(`transporte-link-${i}`));
}

function _loadHospedagemListeners(i) {
    // Validação de Link
    getID(`reserva-hospedagens-link-${i}`).addEventListener('change', () => _validateLink(`reserva-hospedagens-link-${i}`));
    getID(`link-hospedagens-${i}`).addEventListener('change', () => _validateImageLink(`link-hospedagens-${i}`));
}

function _loadLineupListeners(i) {
    // Dynamic Select: Gênero
    getID(`lineup-genero-select-${i}`).addEventListener('change', () => _lineupGeneroSelectAction());
    getID(`lineup-genero-${i}`).addEventListener('change', () => _lineupGeneroSelectAction());

    // Dynamic Select: Palco
    getID(`lineup-palco-select-${i}`).addEventListener('change', () => _lineupPalcoSelectAction());
    getID(`lineup-palco-${i}`).addEventListener('change', () => _lineupPalcoSelectAction());

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

    // Validação de Link
    getID(`lineup-midia-${i}`).addEventListener('change', () => _validatePlaylistLink(`lineup-midia-${i}`));
}

function _loadGaleriaListeners(i) {
    // Dynamic Select: Categoria
    getID(`galeria-categoria-select-${i}`).addEventListener('change', () => _galeriaSelectAction());
    getID(`galeria-categoria-${i}`).addEventListener('change', () => _galeriaSelectAction());

    // Dynamic Title
    getID(`galeria-titulo-${i}`).addEventListener('change', () => getID(`galeria-title-${i}`).innerText = getID(`galeria-titulo-${i}`).value);

    // Load Listener Actions
    _galeriaSelectAction(true);

    // Validação de Link
    getID(`link-galeria-${i}`).addEventListener('change', () => _validateImageLink(`link-galeria-${i}`));
}

// Actions
function _inicioListenerAction() {
    _loadProgramacao();
    const nextDay = _getNextDay(getID('inicio').value);
    if (nextDay) {
        getID('fim').value = nextDay;
        if (!DOCUMENT_ID || (DOCUMENT_ID && !changedOnce)) {
            changedOnce = true;
            getID('fim').value = nextDay;
        }
    }
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

function _galeriaAdicionarListenerAction() {
    _closeAccordions('galeria');
    _addGaleria();
    _loadNewGaleriaSelect();
    _openLastAccordion('galeria');
}

function _lineupAdicionarListenerAction() {
    _closeAccordions('lineup');
    _addLineup();
    _loadNewLineupSelects();
    _openLastAccordion('lineup');
}

function _hospedagensAdicionarListenerAction() {
    _closeAccordions('hospedagens');
    _addHospedagens();
    _openLastAccordion('hospedagens');
}

function _transporteAdicionarListenerAction() {
    _closeAccordions('transporte');
    _addTransporte();
    _openLastAccordion('transporte');
}