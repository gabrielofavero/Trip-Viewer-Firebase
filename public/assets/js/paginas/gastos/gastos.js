var GASTOS;
var GASTOS_ID;
var GASTOS_QUANTIDADE = 0;
var GASTOS_TOTAIS = {
    resumo: {},
    gastosPrevios: {},
    gastosDurante: {}
};

document.addEventListener('DOMContentLoaded', async function () {
    const gastos = localStorage.getItem('gastos') ? JSON.parse(localStorage.getItem('gastos')) : null;
    GASTOS_ID = gastos?.id;
    await _loadConfig();

    if (!gastos || !GASTOS_ID) {
        const url = GASTOS_ID ? `viagem.html?v=${GASTOS_ID}` : 'index.html';
        _displayForbidden('Nenhum documento de gastos foi encontrado. Certifique-se de que você está acessando a página por meio do botão "Gastos" na página de Viagem', url);
        return;
    }

    if (!gastos.ativo) {
        _displayForbidden('O módulo de gastos não está ativo para essa viagem', `viagem.html?v=${GASTOS_ID}`);
        return;
    }

    if (!gastos.pin) {
        _loadGastos();
    } else {
        _stopLoadingScreen();
        _requestPin();
        _initializeValidatePin();
    }
});

async function _loadGastos() {
    _startLoadingScreen();
    const documentID = GASTOS_ID;
    const pin = getID('pin-code')?.innerText || '';
    try {
        GASTOS = await _postCloudFunction('getGastos', { documentID, pin });
        if (GASTOS) {
            await _loadMoedas();
            _loadGastosConvertidos();
            _applyGastos();
            _closeMessage();
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