var GASTOS;
var GASTOS_QUANTIDADE = 0;
var GASTOS_TOTAIS = {
    resumo: {},
    gastosPrevios: {},
    gastosDurante: {}
};
var GASTO_ATIVO = 'resumo';

document.addEventListener('DOMContentLoaded', async function () {
    _startLoadingScreen();
    _main();
});

async function _loadGastosPage() {
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
        const url = documentID ? `view.html?v=${documentID}` : 'index.html';
        _displayForbidden(`${translate('messages.documents.get.error')}. ${translate(translate('messages.documents.get.no_code'))}`, url);
        return;
    }

    if (!gastosExport?.ativo) {
        _displayForbidden(translate('messages.errors.module_not_active', { module: translate('trip.expenses.title') }), `view.html?v=${documentID}`);
        return;
    }

    if (gastosExport?.pin == 'no-pin') {
        _loadGastos();
    } else {
        _stopLoadingScreen();
        _requestPinGastos();
    }
    _stopLoadingScreen();
}

function _requestPinGastos() {
    const cancelAction = `_exitGastos()`;
    const confirmAction = '_loadGastos()';
    const precontent = translate('trip.basic_information.pin.request');
    _requestPin({ confirmAction, cancelAction, precontent });
}

function _requestPinGastosInvalido() {
    const cancelAction = `_exitGastos()`;
    const confirmAction = '_loadGastos()';
    const precontent = translate('trip.basic_information.pin.invalid');
    const invalido = true;
    _requestPin({ confirmAction, cancelAction, precontent, invalido });
}

function _exitGastos() {
    if (window.parent._closeLightbox) {
        window.parent._closeLightbox();
    } else if (_getURLParam('g')) {
        window.location.href = `view.html?v=${_getURLParam('g')}`;
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
        if (pin) {
            GASTOS = await _get(`gastos/protected/${pin}/${documentID}`, false);
        } else {
            GASTOS = await _get(`gastos/${documentID}`, false);
        }

        if (GASTOS) {
            await _loadMoedas();
            _loadGastosConvertidos();
            _applyGastos();
            getID('conversao').innerText = _getConversaoText();
            _setTabListeners();
            _stopLoadingScreen();
        }
    } catch (error) {
        if (error?.message == 'Missing or insufficient permissions.') {
            console.warn(error.message);
            _requestPinGastosInvalido()
        } else {
            console.error(error);
            _displayError(translate('messages.errors.unknown'));
        }
        _stopLoadingScreen();
    }
}

function _applyGastos() {
    const hasGastosPrevios = GASTOS.gastosPrevios.length > 0;
    const hasGastosDurante = GASTOS.gastosDurante.length > 0;

    if (hasGastosPrevios && hasGastosDurante) {
        getID('tab-gastos').style.display = '';
        getID('radio-resumo').style.display = '';
        _loadResumo();
    }

    if (hasGastosPrevios) {
        getID('radio-gastosPrevios').style.display = '';
        _loadGastosPrevios();
    }

    if (hasGastosDurante > 0) {
        getID('radio-gastosDurante').style.display = '';
        _loadGastosDurante();
    }

    if (hasGastosPrevios && !hasGastosDurante) {
        getID('resumo').style.display = 'none';
        getID('gastosPrevios').style.display = '';
    }

    if (!hasGastosPrevios && hasGastosDurante) {
        getID('resumo').style.display = 'none';
        getID('gastosDurante').style.display = '';
    }

    if (!hasGastosPrevios && !hasGastosDurante) {
        _displayError(translate('messages.errors.no_data_on_module', { module: translate('trip.expenses.title') }));
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