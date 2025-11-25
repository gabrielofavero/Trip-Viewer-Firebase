var PIN = {
    current: '',
    new: ''
}

async function _loadPinData() {
    // This data can only be fetch by the owner of the document
    const pinObject = await _get(`protegido/${DOCUMENT_ID}`);
    
    if (!pinObject || !pinObject.pin) {
        return;
    }

    PIN.current = pinObject.pin;
}

function _isDataUnprotected() {
    return _getCurrentPreferencePIN() === 'no-pin';
}

function _getCurrentPreferencePIN() {
    if (getID('pin-sensitive-only').checked) {
        return 'sensitive-only';
    } else if (getID('pin-all-data').checked) {
        return 'all-data';
    } else {
        return 'no-pin';
    }
}

function _setCurrentPreferencePIN(preference) {
    if (preference === 'sensitive-only') {
        getID('pin-sensitive-only').checked = true;
    } else if (preference === 'all-data') {
        getID('pin-all-data').checked = true;
    } else {
        getID('pin-no-data').checked = true;
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
        responses.push(await _delete(`viagens/protected/${PIN.current}/${DOCUMENT_ID}`)); // No need to override. Already done.
    } else if (FIRESTORE_GASTOS_DATA) {
        // 2. Existing Document (Without PIN) -> Without PIN
        responses.push(await _update(`gastos/${DOCUMENT_ID}`, FIRESTORE_GASTOS_NEW_DATA));
    } else {
        // 3. New Document (Without PIN)
        await _newDocumentWithoutPIN('gastos', FIRESTORE_GASTOS_NEW_DATA);
        await _newDocumentWithoutPIN('viagens', FIRESTORE_PROTECTED_NEW_DATA);
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
function _switchPin() {
    if (getID('pin-disabled').checked) {
        PIN.new = '';
        getID('pin-container').style.display = 'none';
    } else {
        PIN.new = PIN.current;
        getID('pin-container').style.display = 'block';
    }
}

function _requestPinEditarGastos(invalido = false) {
    const confirmAction = '_reconfirmPin()';
    const precontent = translate('trip.basic_information.pin.insert');
    _requestPin({ confirmAction, precontent, invalido });
}

function _reconfirmPin() {
    const atual = getID('pin-code').innerText;
    if (!atual || atual.length < 4) {
        _requestPinEditarGastos(true)
    } else {
        const confirmAction = `_validatePin('${atual}')`;
        const precontent = translate('trip.basic_information.pin.again');
        _requestPin({ confirmAction, precontent });
    }
}

function _validatePin(pin) {
    if (getID('pin-code').innerText === pin) {
        PIN.new = pin;
        _closeMessage();
    } else {
        _invalidPin();
    }
}

function _invalidPin() {
    const confirmAction = '_reconfirmPin()';
    const precontent = translate('trip.basic_information.pin.invalid');
    const invalido = true;
    _requestPin({ confirmAction, precontent, invalido });
}

function _setPinButtonText(newPin = true) {
    getID('request-pin').innerText = newPin ? translate('trip.basic_information.pin.new') : translate('trip.basic_information.pin.change');
}

function _validateSavedPIN() {
    if (getID('pin-enable').checked && !PIN.new) {
        return [translate('trip.basic_information.pin.title')];
    }
}