var INPUT_DETECTED = false;

// Loader
function _loadEventListeners() {
    // Inputs
    getID('inicio').addEventListener('change', () => _inicioListenerAction());
    getID('fim').addEventListener('change', () => _fimListenerAction());

    // Botões
    getID('editores-adicionar').addEventListener('click', () => _addEditores());
    getID('salvar').addEventListener('click', () => _setViagem());
    getID('re-editar').addEventListener('click', () => _reEdit('viagens', SUCCESSFUL_SAVE));
    getID('visualizar').addEventListener('click', () => _visualizarListenerAction());
    getID('home').addEventListener('click', () => window.location.href = '../index.html');
    getID('home').addEventListener('click', () => window.location.href = '../index.html');
    getID('cancelar').addEventListener('click', () => window.location.href = '../index.html');
    getID('transporte-adicionar').addEventListener('click', () => _transporteAdicionarListenerAction());
    getID('hospedagens-adicionar').addEventListener('click', () => _hospedagensAdicionarListenerAction());
    getID('galeria-adicionar').addEventListener('click', () => _galeriaAdicionarListenerAction());
    getID('pin-enable').addEventListener('click', () => _switchPin());
    getID('pin-disable').addEventListener('click', () => _switchPin());

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

    // Radios
    getID('dark-and-light').addEventListener('change', () => _visibilityListenerAction());
    getID('light-exclusive').addEventListener('change', () => _visibilityListenerAction());
    getID('dark-exclusive').addEventListener('change', () => _visibilityListenerAction());

    document.addEventListener("input", (event) => {
        if (event.target.tagName === "INPUT" || event.target.tagName === "TEXTAREA") {
          INPUT_DETECTED = true;
        }
      });
    
      window.addEventListener("beforeunload", (event) => {
        if (INPUT_DETECTED && !SUCCESSFUL_SAVE) {
          event.preventDefault();
          event.returnValue = translate('messages.exit_confirmation');
        }
      });
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
        window.open(`../view.html?v=${DOCUMENT_ID}`, '_blank');
    } else {
        window.location.href = '../index.html';
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

function _visibilityListenerAction(visibilidade) {
    if (!visibilidade) {
        visibilidade = _buildVisibilidadeObject();
    }

    getID('tema-claro').style.display = visibilidade.claro ? 'block' : 'none';
    getID('tema-escuro').style.display = visibilidade.escuro ? 'block' : 'none';
}