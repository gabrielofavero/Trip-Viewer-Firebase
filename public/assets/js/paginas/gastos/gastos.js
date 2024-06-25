var GASTOS;
var GASTOS_QUANTIDADE = 0;
var GASTOS_TOTAIS = {
    resumo: {},
    gastosPrevios: {},
    gastosDurante: {}
};
var GASTO_ATIVO = 'resumo';

document.addEventListener('DOMContentLoaded', async function () {
    await _main();
    _loadVisibilityExternal();

    const closeButton = getID("closeButton");
    if (window.parent._closeLightbox) {
        closeButton.onclick = function () {
            window.parent._closeLightbox();
        };
    } else {
        closeButton.style.display = "none";
    }

    getID("logo-link").onclick = function () {
        if (window.parent._closeLightbox) {
            window.parent._closeLightbox(true);
        } else {
            window.location.href = "index.html";
        }
    };

    const gastosExport = localStorage.getItem('gastos') ? JSON.parse(localStorage.getItem('gastos')) : '';
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
        _requestPinGastos();
    }
});

function _requestPinGastos() {
    const cancelAction = `_exitGastos()`;
    const confirmAction = '_loadGastos()';
    const precontent = 'Para acessar os gastos, digite o PIN cadastrado para essa viagem';
    _requestPin({ confirmAction, cancelAction, precontent });
}

function _exitGastos() {
    if (window.parent._closeLightbox) {
        window.parent._closeLightbox();
    } else if (_getURLParam('g')) {
        window.location.href = `viagem.html?v=${_getURLParam('g')}`;
    } else {
        window.location.href = 'index.html';
    }
}

async function _loadGastos() {
    const documentID = _getURLParam('g');
    const pin = getID('pin-code')?.innerText || '';
    _closeMessage();
    _removePinListener();
    _startLoadingScreen();
    try {
        GASTOS = await _cloudFunction('getGastos', { documentID, pin });
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