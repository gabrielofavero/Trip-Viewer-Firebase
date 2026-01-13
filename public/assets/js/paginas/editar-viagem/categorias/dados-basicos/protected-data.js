var PIN = {
	current: "",
	new: "",
};

async function _loadPinData() {
	// This data can only be fetch by the owner of the document
	const pinObject = await _get(`protegido/${DOCUMENT_ID}`, true, true);

	if (!pinObject || !pinObject.pin) {
		return;
	}

	PIN.current = pinObject.pin;
}

function _getNewPinObject() {
	return PIN.new
		? { pin: PIN.new, compartilhamento: FIRESTORE_NEW_DATA.compartilhamento }
		: {};
}

function _isDataUnprotected() {
	return _getCurrentPreferencePIN() === "no-pin";
}

function _hasCurrentProtectedViagens() {
	return (
		(FIRESTORE_DATA.transportes?.dados ?? []).some(
			(t) => t.reserva || t.link,
		) || (FIRESTORE_DATA.hospedagens ?? []).some((h) => h.reserva || h.link)
	);
}

function _getCurrentPreferencePIN() {
	if (getID("pin-sensitive-only").checked) {
		return "sensitive-only";
	} else if (getID("pin-all-data").checked) {
		return "all-data";
	} else {
		return "no-pin";
	}
}

// Pin
function _switchPin() {
	PIN.new = getID("pin-disabled").checked ? "" : PIN.current || PIN.new;
	_switchPinVisibility();
	_switchPinLabel();
}

function _switchPinVisibility() {
	getID("pin-container").style.display = getID("pin-disabled").checked
		? "none"
		: "block";
}

function _switchPinLabel() {
	getID("request-pin").innerText =
		PIN.current || PIN.new
			? translate("trip.basic_information.pin.change")
			: translate("trip.basic_information.pin.new");
}

function _requestPinEditarGastos(invalido = false) {
	const confirmAction = "_reconfirmPin()";
	const cancelAction = `_closeMessage()`;
	const precontent = translate("trip.basic_information.pin.insert");
	_requestPin({ confirmAction, cancelAction, precontent, invalido });
}

function _reconfirmPin() {
	const atual = getID("pin-code").innerText;
	if (!atual || atual.length < 4) {
		_requestPinEditarGastos(true);
	} else {
		const confirmAction = `_validatePin('${atual}')`;
		const cancelAction = `_closeMessage()`;
		const precontent = translate("trip.basic_information.pin.again");
		_requestPin({ confirmAction, cancelAction, precontent });
	}
}

function _validatePin(pin) {
	if (getID("pin-code").innerText === pin) {
		PIN.new = pin;
		_closeMessage();
		getID("request-pin").innerText = translate(
			"trip.basic_information.pin.change",
		);
	} else {
		_invalidPin();
	}
}

function _invalidPin() {
	const confirmAction = "_reconfirmPin()";
	const cancelAction = `_closeMessage()`;
	const precontent = translate("trip.basic_information.pin.invalid");
	const invalido = true;
	_requestPin({ confirmAction, cancelAction, precontent, invalido });
}

function _validatePinField() {
	if (
		(getID("pin-all-data").checked || getID("pin-sensitive-only").checked) &&
		!PIN.current &&
		!PIN.new
	) {
		getID("modal-inner-text").innerHTML = translate(
			"trip.basic_information.pin.no_pin",
		);
		SUCCESSFUL_SAVE = false;
		_stopLoadingScreen();
		_openModal();
	}
}
