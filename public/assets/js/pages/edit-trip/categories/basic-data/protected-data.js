import { getState } from '../../../../data/state.js';
import { getID } from '../../../../utils/dom.js';
import { translate } from '../../../../i18n/translation.js';
import { closeMessage } from '../../../../utils/messages.js';
import { stopLoadingScreen } from '../../../../utils/loading.js';
import { openModal } from '../../../../theme/visibility.js';
import { requestPin } from '../../../../utils/pin.js';

var PIN = {
	current: "",
	new: "",
};

async function loadPinData() {
	// This data can only be fetch by the owner of the document
	const pinObject = await get(`protegido/${DOCUMENT_ID}`, true, true);

	if (!pinObject || !pinObject.pin) {
		return;
	}

	PIN.current = pinObject.pin;
}

function getNewPinObject() {
	return PIN.new
		? { pin: PIN.new, compartilhamento: FIRESTORE_NEW_DATA.compartilhamento }
		: {};
}

function isDataUnprotected() {
	return getCurrentPreferencePIN() === "no-pin";
}

function hasCurrentProtectedViagens() {
	return (
		(getState().transportes?.dados ?? []).some(
			(t) => t.reserva || t.link,
		) || (getState().hospedagens ?? []).some((h) => h.reserva || h.link)
	);
}

function getCurrentPreferencePIN() {
	if (getID("pin-sensitive-only").checked) {
		return "sensitive-only";
	} else if (getID("pin-all-data").checked) {
		return "all-data";
	} else {
		return "no-pin";
	}
}

// Pin
function switchPin() {
	PIN.new = getID("pin-disabled").checked ? "" : PIN.current || PIN.new;
	switchPinVisibility();
	switchPinLabel();
}

function switchPinVisibility() {
	getID("pin-container").style.display = getID("pin-disabled").checked
		? "none"
		: "block";
}

function switchPinLabel() {
	getID("request-pin").innerText =
		PIN.current || PIN.new
			? translate("trip.basic_information.pin.change")
			: translate("trip.basic_information.pin.new");
}

export function requestPinEditarGastos(invalido = false) {
	const confirmAction = "reconfirmPin()";
	const cancelAction = `closeMessage()`;
	const precontent = translate("trip.basic_information.pin.insert");
	requestPin({ confirmAction, cancelAction, precontent, invalido });
}

function reconfirmPin() {
	const atual = getID("pin-code").innerText;
	if (!atual || atual.length < 4) {
		requestPinEditarGastos(true);
	} else {
		const confirmAction = `validatePin('${atual}')`;
		const cancelAction = `closeMessage()`;
		const precontent = translate("trip.basic_information.pin.again");
		requestPin({ confirmAction, cancelAction, precontent });
	}
}

function validatePin(pin) {
	if (getID("pin-code").innerText === pin) {
		PIN.new = pin;
		closeMessage();
		getID("request-pin").innerText = translate(
			"trip.basic_information.pin.change",
		);
	} else {
		invalidPin();
	}
}

function invalidPin() {
	const confirmAction = "reconfirmPin()";
	const cancelAction = `closeMessage()`;
	const precontent = translate("trip.basic_information.pin.invalid");
	const invalido = true;
	requestPin({ confirmAction, cancelAction, precontent, invalido });
}

function validatePinField() {
	if (
		(getID("pin-all-data").checked || getID("pin-sensitive-only").checked) &&
		!PIN.current &&
		!PIN.new
	) {
		getID("modal-inner-text").innerHTML = translate(
			"trip.basic_information.pin.no_pin",
		);
		SUCCESSFUL_SAVE = false;
		stopLoadingScreen();
		openModal();
	}
}
