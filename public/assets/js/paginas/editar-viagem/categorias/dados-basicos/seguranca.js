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
        getID('pin-disabled').checked = true;
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

    const hasCurrentPin = !!PIN.current;
    const hasCurrentGastos = _objectExistsAndHasKeys(FIRESTORE_GASTOS_DATA);
    const hasCurrentViagens = _objectExistsAndHasKeys(FIRESTORE_PROTECTED_DATA);
    const hasNewGastos = _objectExistsAndHasKeys(FIRESTORE_GASTOS_NEW_DATA);
    const hasExistingGastos = _objectExistsAndHasKeys(FIRESTORE_GASTOS_DATA);

    const gastosPath = `gastos/${DOCUMENT_ID}`;
    const gastosProtectedPath = (pin) => `gastos/protected/${pin}/${DOCUMENT_ID}`;
    const viagensProtectedPath = (pin) => `viagens/protected/${pin}/${DOCUMENT_ID}`;

    // 1. Existing Document (WITH PIN) → WITHOUT PIN
    if (hasCurrentPin) {
        // Remove protected docs
        if (hasCurrentGastos) responses.push(await _delete(gastosProtectedPath(PIN.current)));
        if (hasCurrentViagens) responses.push(await _delete(viagensProtectedPath(PIN.current)));

        // Restore or remove public gastos
        if (hasNewGastos) {
            responses.push(await _override(gastosPath, FIRESTORE_GASTOS_NEW_DATA));
        } else {
            responses.push(await _delete(gastosPath), true);
        }

        return responses;
    }

    // 2. Existing Document (WITHOUT PIN) → WITHOUT PIN
    if (hasExistingGastos) {
        if (hasNewGastos) {
            responses.push(await _update(gastosPath, FIRESTORE_GASTOS_NEW_DATA));
        } else {
            responses.push(await _delete(gastosPath), true);
        }

        return responses;
    }

    // 3. New Document (WITHOUT PIN)
    if (hasNewGastos) {
        responses.push(await _create('gastos', FIRESTORE_GASTOS_NEW_DATA, DOCUMENT_ID));
    }

    return responses;
}


async function _setProtectedDataWithPIN() {
    const responses = [];

    const hasCurrentGastos = _objectExistsAndHasKeys(FIRESTORE_GASTOS_DATA);
    const hasNewGastos = _objectExistsAndHasKeys(FIRESTORE_GASTOS_NEW_DATA) &&
                         _objectExistsAndHasKeys(FIRESTORE_GASTOS_PROTECTED_NEW_DATA);

    const hasNewViagens = _objectExistsAndHasKeys(FIRESTORE_PROTECTED_NEW_DATA);

    const hasCurrentPin = !!PIN.current;
    const hasNewPin = !!PIN.new;
    const isPinChanging = hasCurrentPin && hasNewPin && PIN.current !== PIN.new;

    const gastosPath = (pin) => `gastos/protected/${pin}/${DOCUMENT_ID}`;
    const viagensPath = (pin) => `viagens/protected/${pin}/${DOCUMENT_ID}`;
    const createGastos = (pin) => _deepCreate(`gastos/protected/${pin}`, FIRESTORE_GASTOS_PROTECTED_NEW_DATA, DOCUMENT_ID);
    const createViagens = (pin) => _deepCreate(`viagens/protected/${pin}`, FIRESTORE_PROTECTED_NEW_DATA, DOCUMENT_ID);

    // 1) Existing document WITHOUT a PIN → Moving to PIN
    if (!hasCurrentPin && hasNewPin) {
        if (hasCurrentGastos) responses.push(await _delete(`gastos/${DOCUMENT_ID}`));

        if (hasNewGastos) {
            responses.push(await _create('gastos', FIRESTORE_GASTOS_NEW_DATA, DOCUMENT_ID));
            responses.push(await createGastos(PIN.new));
        }
        if (hasNewViagens) responses.push(await createViagens(PIN.new));

        return responses;
    }

    // 2) PIN CHANGED (old → new)
    if (isPinChanging) {
        if (hasCurrentGastos) responses.push(await _delete(`gastos/protected/${PIN.current}/${DOCUMENT_ID}`, true));
        if (hasNewGastos) responses.push(await createGastos(PIN.new));
        if (hasNewViagens) responses.push(await createViagens(PIN.new));
        return responses;
    }

    // 3) Existing doc WITH PIN → keeping SAME PIN
    if (hasCurrentPin && FIRESTORE_GASTOS_DATA) {
        if (hasNewGastos) {
            responses.push(await _update(gastosPath(PIN.current), FIRESTORE_GASTOS_PROTECTED_NEW_DATA));
        } else {
            responses.push(await _delete(gastosPath(PIN.current), true));
        }

        if (hasNewViagens) {
            responses.push(await _update(viagensPath(PIN.current), FIRESTORE_PROTECTED_NEW_DATA));
        } else {
            responses.push(await _delete(viagensPath(PIN.current), true));
        }

        return responses;
    }

    // 4) Creating NEW document WITH PIN (no previous data)
    if (hasCurrentPin) {
        if (hasNewGastos) responses.push(await createGastos(PIN.current));
        if (hasNewViagens) responses.push(await createViagens(PIN.current));
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
    if ((getID('pin-all-data').checked || getID('pin-sensitive-only').checked) && !PIN.new) {
        return [translate('trip.basic_information.pin.title')];
    }
}