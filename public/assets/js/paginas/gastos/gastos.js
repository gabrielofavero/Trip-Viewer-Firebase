var GASTOS_EXPORT;
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
    GASTOS_EXPORT = localStorage.getItem('gastos') ? JSON.parse(localStorage.getItem('gastos')) : null;
    await _loadConfig();

    if (!GASTOS_EXPORT || !GASTOS_EXPORT?.id) {
        const url = GASTOS_EXPORT.id ? `viagem.html?v=${GASTOS_EXPORT.id}` : 'index.html';
        _displayForbidden('Nenhum documento de gastos foi encontrado. Certifique-se de que você está acessando a página por meio do botão "Gastos" na página de Viagem', url);
        return;
    }

    if (!GASTOS_EXPORT.ativo) {
        _displayForbidden('O módulo de gastos não está ativo para essa viagem', `viagem.html?v=${GASTOS_EXPORT.id}`);
        return;
    }

    if (!GASTOS_EXPORT.pin) {
        _loadGastos();
    } else {
        _stopLoadingScreen();
        _requestPin();
    }
});

async function _loadGastos() {
    const documentID = GASTOS_EXPORT.id;
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
        const msg = error?.responseJSON?.error;
        if (msg) {
            _displayError(msg, true);
            throw new Error(msg);
        } else {
            _displayError(error);
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