var GASTOS;
var GASTOS_QUANTIDADE = 0;
var GASTOS_TOTAIS = {
    resumo: {},
    gastosPrevios: {},
    gastosDurante: {}
};
var GASTO_ATIVO = 'resumo';

document.addEventListener('DOMContentLoaded', async function () {
    _loadVisibilityExternal();

    getID("closeButton").onclick = function () {
        _unloadMedias();
        window.parent._closeLightbox();
    };

    const gastosExport = localStorage.getItem('gastos') ? JSON.parse(localStorage.getItem('gastos')) : '';
    await _loadConfig();
    let documentID = _getURLParam('g');

    if (!gastosExport || !documentID) {
        const url = documentID ? `viagem.html?v=${documentID}` : 'index.html';
        _displayForbidden('Nenhum documento de gastos foi encontrado. Certifique-se de que você está acessando a página por meio do botão "Gastos" na página de Viagem', url);
        return;
    }

    if (!gastosExport?.ativo) {
        _displayForbidden('O módulo de gastos não está ativo para essa viagem', `viagem.html?v=${documentID}`);
        return;
    }

    if (!gastosExport?.pin) {
        _loadGastos();
    } else {
        _stopLoadingScreen();
        _requestPin();
    }
});

async function _loadGastos() {
    const documentID = _getURLParam('g');
    const pin = getID('pin-code')?.innerText || '';
    _closeMessage();
    _removePinListener();
    _startLoadingScreen();
    try {
        GASTOS = await _postCloudFunction('getGastos', { documentID, pin });
        if (GASTOS) {
            await _loadMoedas();
            _loadGastosConvertidos();
            _applyGastos();
            getID('conversao').innerText = _getConversaoText();
            _setTabListeners();
            _stopLoadingScreen();
        }
    } catch (error) {
        _stopLoadingScreen();
        const msg = error?.responseJSON?.error || error?.responseJSON?.message || error?.message || '';
        if (msg) {
            _displayError(msg, true);
            throw new Error(msg);
        } else {
            _displayError(new Error ('Ocorreu um erro desconhecido ao tentar carregar os gastos. Tente novamente mais tarde'), true);
            throw error;
        }
    }
}

function _applyGastos() {
    if (GASTOS.gastosPrevios.length > 0 || GASTOS.gastosDurante.length > 0) {
        getID('tab-gastos').style.display = '';
        getID('radio-resumo').style.display = '';
        _loadResumo();

        if (GASTOS.gastosPrevios.length > 0) {
            getID('radio-gastosPrevios').style.display = '';
            _loadGastosPrevios();
        }

        if (GASTOS.gastosDurante.length > 0) {
            getID('radio-gastosDurante').style.display = '';
            _loadGastosDurante();
        }
    }
}

function _setTabListeners() {
    const radios = ['radio-resumo', 'radio-gastosPrevios', 'radio-gastosDurante'];
    radios.forEach(radio => {
        getID(radio).addEventListener('click', function () {
            const gasto = radio.replace('radio-', '');
            if (GASTO_ATIVO === gasto) return;

            const gastoAnterior = GASTO_ATIVO;
            GASTO_ATIVO = gasto;

            const antigo = radios.indexOf(`radio-${gastoAnterior}`);
            const novo = radios.indexOf(radio);

            if (novo > antigo) {
                _fade([gastoAnterior], [GASTO_ATIVO], 150);
            } else {
                _fade([gastoAnterior], [GASTO_ATIVO], 150);
            }
        });
    });
}