function _switchPinVisibility() {
    if (getID('pin-disable').checked) {
        getID('pin-container').style.display = 'none';
    } else {
        getID('pin-container').style.display = 'block';
    }
}

function _requestPinEditarGastos(invalido=false){
    const confirmAction = '_reconfirmPin()';
    const precontent = 'Insira um PIN de acesso de 4 dígitos.';
    _requestPin({ confirmAction, precontent, invalido });
}

function _reconfirmPin() {
    const atual = getID('pin-code').innerText;
    if (!atual || atual.length < 4) {
        _requestPinEditarGastos(true)
    } else {
        const confirmAction = `_validatePin('${atual}')`;
        const precontent = 'Digite novamento o PIN de acesso.';
        _requestPin({ confirmAction, precontent });
    }
}

function _validatePin(pin) {
    if (getID('pin-code').innerText === pin) {
        alert('PIN correto!')
    } else {
        _invalidPin();
    }
}

function _invalidPin() {
    const confirmAction = '_reconfirmPin()';
    const precontent = 'PIN Incorreto. Tente novamente.';
    const invalido = true;
    _requestPin({ confirmAction, precontent, invalido });
}

function _setPinButtonText(newPin=true) {
    getID('request-pin').innerText = newPin ? 'Definir PIN de Acesso' : 'Alterar PIN de Acesso';
}