var PIN;

function _getCurrentPreferencePIN() {
    if (getID('pin-sensitive-only').checked) {
        return 'sensitive-only';
    } else if (getID('pin-all-data').checked) {
        return 'all-data';
    } else {
        return 'no-pin';
    }
}

async function _setProtectedDataAndExpenses() {
    const responses = getID('pin-disabled').checked ? 
        await _setProtectedDataWithoutPIN() : 
        await _setProtectedDataWithPIN();

    if (responses.length > 0) {
        const combinedResponse = _combineDatabaseResponses(responses);
        _addSetResponse(translate('trip.expenses.title'), combinedResponse.success);
    }
}

async function _setProtectedDataWithoutPIN() {
    const responses = [];
    if (PIN.current) {
        // 1. Existing Document (With PIN) -> Without PIN
        responses.push(await _delete(`gastos/protected/${PIN.current}/${DOCUMENT_ID}`));
        responses.push(await _override(`gastos/${DOCUMENT_ID}`, FIRESTORE_GASTOS_NEW_DATA));
        responses.push(await _delete(`viagens/protected/${PIN.current}/${DOCUMENT_ID}`));
    } else if (FIRESTORE_GASTOS_DATA) {
        // 2. Existing Document (Without PIN) -> Without PIN
        await _withoutToWithoutPIN('gastos', FIRESTORE_GASTOS_NEW_DATA);
    } else {
        // 3. New Document (Without PIN)
        await _newDocumentWithoutPIN('gastos', FIRESTORE_GASTOS_NEW_DATA);
    }
}

async function _setProtectedDataWithPIN() {
    const responses = [];
    if (!PIN.current) {
        // 4. Existing Document (Without PIN) -> With PIN
        responses.push(await _delete(`gastos/${DOCUMENT_ID}`));
        responses.push(await _create('gastos', FIRESTORE_GASTOS_NEW_DATA, DOCUMENT_ID));
        responses.push(await _deepCreate(`gastos/protected/${PIN.new}`, FIRESTORE_GASTOS_PROTECTED_NEW_DATA, DOCUMENT_ID));
    } else if (PIN.current != PIN.new && PIN.new) {
        // 5. Existing Document (With PIN) -> With PIN (Different)
        responses.push(await _delete(`gastos/protected/${PIN.current}/${DOCUMENT_ID}`));
        responses.push(await _deepCreate(`gastos/protected/${PIN.new}`, FIRESTORE_GASTOS_PROTECTED_NEW_DATA, DOCUMENT_ID));
        responses.push(await _deepCreate(`viagens/protected/${PIN.new}`, FIRESTORE_PROTECTED_NEW_DATA, DOCUMENT_ID));
    } else if (FIRESTORE_GASTOS_DATA && PIN.current) {
        // 6. Existing Document (With PIN) -> With PIN (Same)
        responses.push(await _update(`gastos/protected/${PIN.current}/${DOCUMENT_ID}`, FIRESTORE_GASTOS_PROTECTED_NEW_DATA));
        responses.push(await _update(`viagens/protected/${PIN.current}/${DOCUMENT_ID}`, FIRESTORE_PROTECTED_NEW_DATA));
    } else if (PIN.current) {
        // 7. New Document (With PIN)
        responses.push(await _deepCreate(`gastos/protected/${PIN.current}`, FIRESTORE_GASTOS_PROTECTED_NEW_DATA, DOCUMENT_ID));
        responses.push(await _deepCreate(`viagens/protected/${PIN.current}`, FIRESTORE_PROTECTED_NEW_DATA, DOCUMENT_ID));
    }

    return responses;
}

// Pin
function _validateAndLoadProtectedData() {

}

function _switchPin() {
    if (getID('pin-disable').checked) {
        PIN_GASTOS.new = '';
        getID('pin-container').style.display = 'none';
    } else {
        PIN_GASTOS.new = PIN_GASTOS.current;
        getID('pin-container').style.display = 'block';
    }
}

function _requestPinEditarGastos(invalido = false) {
    const confirmAction = '_reconfirmPin()';
    const precontent = translate('trip.expenses.pin.insert');
    _requestPin({ confirmAction, precontent, invalido });
}

function _reconfirmPin() {
    const atual = getID('pin-code').innerText;
    if (!atual || atual.length < 4) {
        _requestPinEditarGastos(true)
    } else {
        const confirmAction = `_validatePin('${atual}')`;
        const precontent = translate('trip.expenses.pin.again');
        _requestPin({ confirmAction, precontent });
    }
}

function _validatePin(pin) {
    if (getID('pin-code').innerText === pin) {
        PIN_GASTOS.new = pin;
        _closeMessage();
    } else {
        _invalidPin();
    }
}

function _invalidPin() {
    const confirmAction = '_reconfirmPin()';
    const precontent = translate('trip.expenses.pin.invalid');
    const invalido = true;
    _requestPin({ confirmAction, precontent, invalido });
}

function _setPinButtonText(newPin = true) {
    getID('request-pin').innerText = newPin ? translate('trip.expenses.pin.new') : translate('trip.expenses.pin.change');
}

function _validateSavedPIN() {
    if (getID('pin-enable').checked && !PIN_GASTOS.new) {
        return [translate('trip.expenses.pin.title')];
    }
}