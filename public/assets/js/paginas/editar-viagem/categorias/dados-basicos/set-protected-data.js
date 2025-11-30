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
    
    const hasCurrentGastos = _objectExistsAndHasKeys(FIRESTORE_GASTOS_DATA);
    const hasNewGastos = _objectExistsAndHasKeys(FIRESTORE_GASTOS_NEW_DATA);
    const hasCurrentViagens = _hasCurrentViagens();

    if (!FIRESTORE_DATA) {
        await _setNewDocumentNoPin();
    } else if (PIN.current) {
        await _removePinAndSet();
    } else {
        await _setNoPinDocument();
    }

    return responses;

    async function _setNewDocumentNoPin() {
        if (hasNewGastos) responses.push(await _create('gastos', FIRESTORE_GASTOS_NEW_DATA, DOCUMENT_ID));
    }

    async function _removePinAndSet() {
        if (hasCurrentGastos) {
            responses.push(await _delete(`gastos/protected/${PIN.current}/${DOCUMENT_ID}`));
        }

        if (hasCurrentViagens) {
            responses.push(await _delete(`viagens/protected/${PIN.current}/${DOCUMENT_ID}`));
        } 
        
        if (hasNewGastos && !hasCurrentGastos) {
            responses.push(await _create('gastos', FIRESTORE_GASTOS_NEW_DATA, DOCUMENT_ID));
        } else if (hasNewGastos && hasCurrentGastos) {
            responses.push(await _override(`gastos/${DOCUMENT_ID}`, FIRESTORE_GASTOS_NEW_DATA));
        } else if (!hasNewGastos && hasCurrentGastos) {
            responses.push(await _delete(`gastos/${DOCUMENT_ID}`));
        }
        
        responses.push(await _delete(`protegido/${DOCUMENT_ID}`), true);
    }

    async function _setNoPinDocument() {
        responses.push(hasNewGastos ? await _update(`gastos/${DOCUMENT_ID}`, FIRESTORE_GASTOS_NEW_DATA) : responses.push(await _delete(`gastos/${DOCUMENT_ID}`), true));
    }
}


async function _setProtectedDataWithPIN() {
    const responses = [];
    
    const hasCurrentGastos = _objectExistsAndHasKeys(FIRESTORE_GASTOS_DATA);
    const hasNewGastos = _objectExistsAndHasKeys(FIRESTORE_GASTOS_NEW_DATA);
    const hasNewProtectedGastos = _objectExistsAndHasKeys(FIRESTORE_GASTOS_PROTECTED_NEW_DATA);
    
    const hasCurrentViagens = _hasCurrentViagens();
    const hasNewProtectedViagens = _objectExistsAndHasKeys(FIRESTORE_PROTECTED_NEW_DATA);

    if (!FIRESTORE_DATA) {
        await _setNewDocumentWithPin();
    } else if (!PIN.current) {
        await _addPinAndSet();
    } else if (PIN.current !== PIN.new && PIN.new) {
        await _setChangedPinDocument();
    } else {
        await _setSamePinDocument();
    }

    return responses;

    async function _setNewDocumentWithPin() {
        if (hasNewGastos) {
            responses.push(await _create('gastos', FIRESTORE_GASTOS_NEW_DATA, DOCUMENT_ID));
        }

        if (hasNewProtectedGastos) {
            responses.push(await _deepCreate(`gastos/protected/${PIN.new}`, FIRESTORE_GASTOS_PROTECTED_NEW_DATA, DOCUMENT_ID));
        }

        if (hasNewProtectedViagens) {
            responses.push(await _deepCreate(`viagens/protected/${PIN.new}`, FIRESTORE_PROTECTED_NEW_DATA, DOCUMENT_ID));
        }

        responses.push(await _create('protegido', _getNewPinObject(), DOCUMENT_ID));
    }

    async function _addPinAndSet() {
        if (hasNewGastos && hasCurrentGastos) {
            responses.push(await _override(`gastos/${DOCUMENT_ID}`, FIRESTORE_GASTOS_NEW_DATA));
        } else if (hasNewGastos && !hasCurrentGastos) {
            responses.push(await _create('gastos', FIRESTORE_GASTOS_NEW_DATA, DOCUMENT_ID));
        }

        if (hasNewProtectedGastos) {
            responses.push(await _deepCreate(`gastos/protected/${PIN.new}`, FIRESTORE_GASTOS_PROTECTED_NEW_DATA, DOCUMENT_ID));
        }

        if (hasNewProtectedViagens) {
            responses.push(await _deepCreate(`viagens/protected/${PIN.new}`, FIRESTORE_PROTECTED_NEW_DATA, DOCUMENT_ID));
        }

        responses.push(await _create('protegido', _getNewPinObject(), DOCUMENT_ID));
    }

    async function _setChangedPinDocument() {
        if (hasCurrentGastos && hasNewGastos) {
            responses.push(await _update(`gastos/${DOCUMENT_ID}`, FIRESTORE_GASTOS_NEW_DATA));
            responses.push(await _delete(`gastos/protected/${PIN.current}/${DOCUMENT_ID}`));
            responses.push(await _deepCreate(`gastos/protected/${PIN.new}`, FIRESTORE_GASTOS_PROTECTED_NEW_DATA, DOCUMENT_ID));
        } else if (!hasCurrentGastos && hasNewGastos) {
            responses.push(await _create('gastos', FIRESTORE_GASTOS_NEW_DATA, DOCUMENT_ID));
            responses.push(await _deepCreate(`gastos/protected/${PIN.new}`, FIRESTORE_GASTOS_PROTECTED_NEW_DATA, DOCUMENT_ID));
        }

        if (hasCurrentViagens && hasNewProtectedViagens) {
            responses.push(await _delete(`viagens/protected/${PIN.current}/${DOCUMENT_ID}`));
            responses.push(await _deepCreate(`viagens/protected/${PIN.new}`, FIRESTORE_PROTECTED_NEW_DATA, DOCUMENT_ID));
        } else if (!hasCurrentViagens && hasNewProtectedViagens) {
            responses.push(await _deepCreate(`viagens/protected/${PIN.new}`, FIRESTORE_PROTECTED_NEW_DATA, DOCUMENT_ID));
        }

        responses.push(await _update(`protegido/${DOCUMENT_ID}`, _getNewPinObject()));
    }

    async function _setSamePinDocument() {
        if (hasCurrentGastos && hasNewGastos) {
            responses.push(await _update(`gastos/${DOCUMENT_ID}`, FIRESTORE_GASTOS_NEW_DATA));
            responses.push(await _update(`gastos/protected/${PIN.current}/${DOCUMENT_ID}`, FIRESTORE_GASTOS_PROTECTED_NEW_DATA));
        } else if (!hasCurrentGastos && hasNewGastos) {
            responses.push(await _create('gastos', FIRESTORE_GASTOS_NEW_DATA, DOCUMENT_ID));
            responses.push(await _deepCreate(`gastos/protected/${PIN.current}`, FIRESTORE_GASTOS_PROTECTED_NEW_DATA, DOCUMENT_ID));
        }

        if (hasCurrentViagens && hasNewProtectedViagens) {
            responses.push(await _override(`viagens/protected/${PIN.current}/${DOCUMENT_ID}`, FIRESTORE_PROTECTED_NEW_DATA));
        } else if (!hasCurrentViagens && hasNewProtectedViagens) {
            responses.push(await _deepCreate(`viagens/protected/${PIN.current}`, FIRESTORE_PROTECTED_NEW_DATA, DOCUMENT_ID));
        }

        responses.push(await _update(`protegido/${DOCUMENT_ID}`, _getNewPinObject()));
    }

}

function _hasCurrentViagens() {
    return !!FIRESTORE_DATA && !_isDataUnprotected() && (
        ((FIRESTORE_DATA.transportes?.dados ?? []).some(t => t.reserva || t.link)) ||
        ((FIRESTORE_DATA.hospedagens ?? []).some(h => h.reserva || h.link))
    );
}