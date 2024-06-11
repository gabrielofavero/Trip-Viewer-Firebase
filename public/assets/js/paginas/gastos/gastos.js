var GASTOS_EXPORT;
var GASTOS;
var GASTOS_QUANTIDADE = 0;
var GASTOS_TOTAIS = {
    resumo: {},
    gastosPrevios: {},
    gastosDurante: {}
};

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
        _initializeValidatePin();
    }
});

async function _loadGastos() {
    const documentID = GASTOS_EXPORT.id;
    const pin = getID('pin-code')?.innerText || '';
    _closeMessage();
    _startLoadingScreen();
    try {
        GASTOS = await _postCloudFunction('getGastos', { documentID, pin });
        if (GASTOS) {
            await _loadMoedas();
            _loadGastosConvertidos();
            _applyGastos();
            _stopLoadingScreen();
        }
    } catch (error) {
        _stopLoadingScreen();
        const msg = error?.responseJSON?.error;
        if (msg) {
            _displayError(msg, true);
            throw new Error(msg);
        } else {
            _displayError('Erro ao carregar os dados de gastos', true);
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
            _setGastosPrevios();
        }

        if (GASTOS.gastosDurante.length > 0) {
            getID('radio-gastosDurante').style.display = '';
            _setGastosDurante();
        }
    }
}

function _setGastosPrevios() {

}

function _setGastosDurante() {

}