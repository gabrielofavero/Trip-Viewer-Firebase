// Loaders
function _loadEventListeners() {
    // Inputs
    getID('inicio').addEventListener('input', () => _inicioListenerAction());
    getID('fim').addEventListener('change', () => _reloadProgramacao());
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

    // Barra de pesquisa em destinos
    getID('destinos-search').addEventListener('input', () => _searchDestinosListenerAction());
}

function _loadTransporteListeners(j) {
    // Selects Dinâmicos
    getID(`empresa-select-${j}`).addEventListener('change', () => _loadTransporteVisibility(j));
    getID(`transporte-tipo-${j}`).addEventListener('change', () => _loadTransporteVisibility(j));

    // Título Dinâmico
    getID(`ponto-partida-${j}`).addEventListener('change', () => _updateTransporteTitle(j));
    getID(`ponto-chegada-${j}`).addEventListener('change', () => _updateTransporteTitle(j));
    getID(`ida-${j}`).addEventListener('change', () => _updateTransporteTitle(j));
    getID(`durante-${j}`).addEventListener('change', () => _updateTransporteTitle(j));
    getID(`volta-${j}`).addEventListener('change', () => _updateTransporteTitle(j));

    // Cálculo Automático da Duração do Trajeto
    getID(`partida-${j}`).addEventListener('change', () => _loadAutoDuration(j));
    getID(`partida-horario-${j}`).addEventListener('change', () => _loadAutoDuration(j));
    getID(`chegada-${j}`).addEventListener('change', () => _loadAutoDuration(j));
    getID(`chegada-horario-${j}`).addEventListener('change', () => _loadAutoDuration(j));

    // Validação de Link
    getID(`transporte-link-${j}`).addEventListener('change', () => _validateLink(`transporte-link-${j}`));
}

function _loadHospedagemListeners(j) {
    // Validação de Link
    getID(`reserva-hospedagens-link-${j}`).addEventListener('change', () => _validateLink(`reserva-hospedagens-link-${j}`));
    getID(`link-hospedagens-${j}`).addEventListener('change', () => _validateImageLink(`link-hospedagens-${j}`));
}

function _loadLineupListeners(j) {
    // Dynamic Select: Gênero
    getID(`lineup-genero-select-${j}`).addEventListener('change', () => _lineupGeneroSelectAction());
    getID(`lineup-genero-${j}`).addEventListener('change', () => _lineupGeneroSelectAction());

    // Dynamic Select: Palco
    getID(`lineup-palco-select-${j}`).addEventListener('change', () => _lineupPalcoSelectAction());
    getID(`lineup-palco-${j}`).addEventListener('change', () => _lineupPalcoSelectAction());

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

    // Load Listener Actions
    _lineupGeneroSelectAction(true);
    _lineupPalcoSelectAction(true);

    // Validação de Link
    getID(`lineup-midia-${j}`).addEventListener('change', () => _validatePlaylistLink(`lineup-midia-${j}`));
}

function _loadGaleriaListeners(j) {
    // Dynamic Select: Categoria
    getID(`galeria-categoria-select-${j}`).addEventListener('change', () => _galeriaSelectAction());
    getID(`galeria-categoria-${j}`).addEventListener('change', () => _galeriaSelectAction());

    // Dynamic Title
    getID(`galeria-titulo-${j}`).addEventListener('change', () => getID(`galeria-title-${j}`).innerText = getID(`galeria-titulo-${j}`).value);

    // Load Listener Actions
    _galeriaSelectAction(true);

    // Validação de Link
    getID(`link-galeria-${j}`).addEventListener('change', () => _validateImageLink(`link-galeria-${j}`));
}

function _loadProgramacaoListeners(j) {
    // Checkbox Local
    const fieldsetID = `programacao-local-${j}`;
    for (const containerID of _getChildIDs(fieldsetID)) {
        const ids = `${containerID.split('-')[1]}-${containerID.split('-')[2]}`;
        getID(`check-programacao-${ids}`).addEventListener('change', () => _updateProgramacaoTitleSelect(j));
    }
}

// Actions
function _inicioListenerAction() {
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