function _setCurrentPreferencePIN(preference) {
    if (preference === 'sensitive-only') {
        getID('pin-sensitive-only').checked = true;
    } else if (preference === 'all-data') {
        getID('pin-all-data').checked = true;
    } else {
        getID('pin-disabled').checked = true;
    }
}

function _setProtectedDataAndExpenses(ops) {
    _setProtectedDataWithoutPIN(ops);
    _setProtectedDataWithPIN(ops);
}

function _setProtectedDataWithoutPIN(ops) {
    const hasCurrentGastos = _objectExistsAndHasKeys(FIRESTORE_GASTOS_DATA);
    const hasNewGastos = _objectExistsAndHasKeys(FIRESTORE_GASTOS_NEW_DATA);
    const hasCurrentViagens = _hasCurrentViagens();

    if (!FIRESTORE_DATA) {
        setNewDocumentNoPin();
    } else if (PIN.current) {
        removePinAndSet();
    } else {
        setNoPinDocument();
    }

    function setNewDocumentNoPin() {
        if (hasNewGastos) {
            ops.set(`gastos/${DOCUMENT_ID}`, FIRESTORE_GASTOS_NEW_DATA);
        }
    }

    function removePinAndSet() {
        if (hasCurrentGastos) {
            ops.delete(`gastos/protected/${PIN.current}/${DOCUMENT_ID}`);
        }

        if (hasCurrentViagens) {
            ops.delete(`viagens/protected/${PIN.current}/${DOCUMENT_ID}`);
        }

        if (hasNewGastos && !hasCurrentGastos) {
            ops.set(`gastos/${DOCUMENT_ID}`, FIRESTORE_GASTOS_NEW_DATA);
        } else if (hasNewGastos && hasCurrentGastos) {
            ops.overwrite(`gastos/${DOCUMENT_ID}`, FIRESTORE_GASTOS_NEW_DATA);
        } else if (!hasNewGastos && hasCurrentGastos) {
            ops.delete(`gastos/${DOCUMENT_ID}`);
        }

        ops.delete(`protegido/${DOCUMENT_ID}`);
    }

    function setNoPinDocument() {
        if (hasNewGastos && hasCurrentGastos) {
            ops.update(`gastos/${DOCUMENT_ID}`, FIRESTORE_GASTOS_NEW_DATA);
        } else if (!hasCurrentGastos && hasNewGastos) {
            ops.set(`gastos/${DOCUMENT_ID}`, FIRESTORE_GASTOS_NEW_DATA);
        } else if (hasCurrentGastos && !hasNewGastos) {
            ops.delete(`gastos/${DOCUMENT_ID}`);
        }
    }
}

function _setProtectedDataWithPIN(ops) {
    const hasCurrentGastos = _objectExistsAndHasKeys(FIRESTORE_GASTOS_DATA);
    const hasNewProtectedGastos = _objectExistsAndHasKeys(FIRESTORE_GASTOS_PROTECTED_NEW_DATA);

    const hasCurrentViagens = _hasCurrentViagens();
    const hasNewProtectedViagens = _objectExistsAndHasKeys(FIRESTORE_PROTECTED_NEW_DATA);

    if (!FIRESTORE_DATA) {
        setNewDocumentWithPin();
    } else if (!PIN.current) {
        addPinAndSet();
    } else if (PIN.current !== PIN.new && PIN.new) {
        setChangedPinDocument();
    } else {
        setSamePinDocument();
    }

    function setNewDocumentWithPin() {
        if (hasNewProtectedGastos) {
            ops.set(
                `gastos/protected/${PIN.new}/${DOCUMENT_ID}`,
                FIRESTORE_GASTOS_PROTECTED_NEW_DATA
            );
        }

        if (hasNewProtectedViagens) {
            ops.set(
                `viagens/protected/${PIN.new}/${DOCUMENT_ID}`,
                FIRESTORE_PROTECTED_NEW_DATA
            );
        }

        ops.set(`protegido/${DOCUMENT_ID}`, _getNewPinObject());
    }

    function addPinAndSet() {
        if (hasCurrentGastos) {
            ops.delete(`gastos/${DOCUMENT_ID}`);
        }

        if (hasNewProtectedGastos) {
            ops.set(
                `gastos/protected/${PIN.new}/${DOCUMENT_ID}`,
                FIRESTORE_GASTOS_PROTECTED_NEW_DATA
            );
        }

        if (hasNewProtectedViagens) {
            ops.set(
                `viagens/protected/${PIN.new}/${DOCUMENT_ID}`,
                FIRESTORE_PROTECTED_NEW_DATA
            );
        }

        ops.set(`protegido/${DOCUMENT_ID}`, _getNewPinObject());
    }

    function setChangedPinDocument() {
        if (hasCurrentGastos && hasNewProtectedGastos) {
            ops.update(`gastos/${DOCUMENT_ID}`, FIRESTORE_GASTOS_NEW_DATA);
            ops.delete(`gastos/protected/${PIN.current}/${DOCUMENT_ID}`);
            ops.set(
                `gastos/protected/${PIN.new}/${DOCUMENT_ID}`,
                FIRESTORE_GASTOS_PROTECTED_NEW_DATA
            );
        } else if (!hasCurrentGastos && hasNewProtectedGastos) {
            ops.set(`gastos/${DOCUMENT_ID}`, FIRESTORE_GASTOS_NEW_DATA);
            ops.set(
                `gastos/protected/${PIN.new}/${DOCUMENT_ID}`,
                FIRESTORE_GASTOS_PROTECTED_NEW_DATA
            );
        }

        if (hasCurrentViagens && hasNewProtectedViagens) {
            ops.delete(`viagens/protected/${PIN.current}/${DOCUMENT_ID}`);
            ops.set(
                `viagens/protected/${PIN.new}/${DOCUMENT_ID}`,
                FIRESTORE_PROTECTED_NEW_DATA
            );
        } else if (!hasCurrentViagens && hasNewProtectedViagens) {
            ops.set(
                `viagens/protected/${PIN.new}/${DOCUMENT_ID}`,
                FIRESTORE_PROTECTED_NEW_DATA
            );
        }

        ops.update(`protegido/${DOCUMENT_ID}`, _getNewPinObject());
    }

    function setSamePinDocument() {
        if (hasCurrentGastos && hasNewProtectedGastos) {
            ops.update(`gastos/${DOCUMENT_ID}`, FIRESTORE_GASTOS_NEW_DATA);
            ops.update(
                `gastos/protected/${PIN.current}/${DOCUMENT_ID}`,
                FIRESTORE_GASTOS_PROTECTED_NEW_DATA
            );
        } else if (!hasCurrentGastos && hasNewProtectedGastos) {
            ops.set(`gastos/${DOCUMENT_ID}`, FIRESTORE_GASTOS_NEW_DATA);
            ops.set(
                `gastos/protected/${PIN.current}/${DOCUMENT_ID}`,
                FIRESTORE_GASTOS_PROTECTED_NEW_DATA
            );
        }

        if (hasCurrentViagens && hasNewProtectedViagens) {
            ops.overwrite(
                `viagens/protected/${PIN.current}/${DOCUMENT_ID}`,
                FIRESTORE_PROTECTED_NEW_DATA
            );
        } else if (!hasCurrentViagens && hasNewProtectedViagens) {
            ops.set(
                `viagens/protected/${PIN.current}/${DOCUMENT_ID}`,
                FIRESTORE_PROTECTED_NEW_DATA
            );
        }

        ops.update(`protegido/${DOCUMENT_ID}`, _getNewPinObject());
    }
}


function _hasCurrentViagens() {
    return !!FIRESTORE_DATA && !_isDataUnprotected() && (
        ((FIRESTORE_DATA.transportes?.dados ?? []).some(t => t.reserva || t.link)) ||
        ((FIRESTORE_DATA.hospedagens ?? []).some(h => h.reserva || h.link))
    );
}