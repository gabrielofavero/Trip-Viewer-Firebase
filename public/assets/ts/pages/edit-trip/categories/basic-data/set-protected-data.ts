import { getState, DOCUMENT_ID } from '../../../../data/state.js';
import { getNewPinObject, isDataUnprotected, PIN } from './protected-data.js';
import { FIRESTORE_GASTOS_DATA } from '../../edit-trip.js';
import { getID, objectExistsAndHasKeys } from '../../../../utils/dom.js';
import { FIRESTORE_NEW_DATA } from '../../../../data/state.js';
import { FIRESTORE_GASTOS_NEW_DATA, FIRESTORE_GASTOS_PROTECTED_NEW_DATA, FIRESTORE_PROTECTED_NEW_DATA } from '../../set-trip.js';

export function setCurrentPreferencePIN(preference) {
	if (preference === "sensitive-only") {
		getID("pin-sensitive-only").checked = true;
	} else if (preference === "all-data") {
		getID("pin-all-data").checked = true;
	} else {
		getID("pin-disabled").checked = true;
	}
}

export function setProtectedDataAndExpenses(ops) {
	const pinType = FIRESTORE_NEW_DATA.pin;
	if (pinType == "no-pin") {
		setProtectedDataWithoutPIN(ops);
	} else if (["all-data", "sensitive-only"].includes(pinType)) {
		setProtectedDataWithPIN(ops);
	} else throw new Error("Invalid expenses type");
}

function setProtectedDataWithoutPIN(ops) {
	const hasCurrentGastos = objectExistsAndHasKeys(FIRESTORE_GASTOS_DATA);
	const hasNewGastos = objectExistsAndHasKeys(FIRESTORE_GASTOS_NEW_DATA);
	const currentHasViagens = hasCurrentViagens();

	if (!getState()) {
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

		if (currentHasViagens) {
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

function setProtectedDataWithPIN(ops) {
	const hasCurrentGastos = objectExistsAndHasKeys(FIRESTORE_GASTOS_DATA);
	const hasNewProtectedGastos = objectExistsAndHasKeys(
		FIRESTORE_GASTOS_PROTECTED_NEW_DATA,
	);

	const currentHasViagens = hasCurrentViagens();
	const hasNewProtectedViagens = objectExistsAndHasKeys(
		FIRESTORE_PROTECTED_NEW_DATA,
	);

	if (!getState()) {
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
				FIRESTORE_GASTOS_PROTECTED_NEW_DATA,
			);
		}

		if (hasNewProtectedViagens) {
			ops.set(
				`viagens/protected/${PIN.new}/${DOCUMENT_ID}`,
				FIRESTORE_PROTECTED_NEW_DATA,
			);
		}

		ops.set(`protegido/${DOCUMENT_ID}`, getNewPinObject());
	}

	function addPinAndSet() {
		if (hasCurrentGastos) {
			ops.delete(`gastos/${DOCUMENT_ID}`);
		}

		if (hasNewProtectedGastos) {
			ops.set(
				`gastos/protected/${PIN.new}/${DOCUMENT_ID}`,
				FIRESTORE_GASTOS_PROTECTED_NEW_DATA,
			);
		}

		if (hasNewProtectedViagens) {
			ops.set(
				`viagens/protected/${PIN.new}/${DOCUMENT_ID}`,
				FIRESTORE_PROTECTED_NEW_DATA,
			);
		}

		ops.set(`protegido/${DOCUMENT_ID}`, getNewPinObject());
	}

	function setChangedPinDocument() {
		if (hasCurrentGastos && hasNewProtectedGastos) {
			ops.update(`gastos/${DOCUMENT_ID}`, FIRESTORE_GASTOS_NEW_DATA);
			ops.delete(`gastos/protected/${PIN.current}/${DOCUMENT_ID}`);
			ops.set(
				`gastos/protected/${PIN.new}/${DOCUMENT_ID}`,
				FIRESTORE_GASTOS_PROTECTED_NEW_DATA,
			);
		} else if (!hasCurrentGastos && hasNewProtectedGastos) {
			ops.set(`gastos/${DOCUMENT_ID}`, FIRESTORE_GASTOS_NEW_DATA);
			ops.set(
				`gastos/protected/${PIN.new}/${DOCUMENT_ID}`,
				FIRESTORE_GASTOS_PROTECTED_NEW_DATA,
			);
		}

		if (hasCurrentViagens && hasNewProtectedViagens) {
			ops.delete(`viagens/protected/${PIN.current}/${DOCUMENT_ID}`);
			ops.set(
				`viagens/protected/${PIN.new}/${DOCUMENT_ID}`,
				FIRESTORE_PROTECTED_NEW_DATA,
			);
		} else if (!hasCurrentViagens && hasNewProtectedViagens) {
			ops.set(
				`viagens/protected/${PIN.new}/${DOCUMENT_ID}`,
				FIRESTORE_PROTECTED_NEW_DATA,
			);
		}

		ops.update(`protegido/${DOCUMENT_ID}`, getNewPinObject());
	}

	function setSamePinDocument() {
		if (hasCurrentGastos && hasNewProtectedGastos) {
			ops.update(`gastos/${DOCUMENT_ID}`, FIRESTORE_GASTOS_NEW_DATA);
			ops.update(
				`gastos/protected/${PIN.current}/${DOCUMENT_ID}`,
				FIRESTORE_GASTOS_PROTECTED_NEW_DATA,
			);
		} else if (!hasCurrentGastos && hasNewProtectedGastos) {
			ops.set(`gastos/${DOCUMENT_ID}`, FIRESTORE_GASTOS_NEW_DATA);
			ops.set(
				`gastos/protected/${PIN.current}/${DOCUMENT_ID}`,
				FIRESTORE_GASTOS_PROTECTED_NEW_DATA,
			);
		}

		if (hasCurrentViagens && hasNewProtectedViagens) {
			ops.overwrite(
				`viagens/protected/${PIN.current}/${DOCUMENT_ID}`,
				FIRESTORE_PROTECTED_NEW_DATA,
			);
		} else if (!hasCurrentViagens && hasNewProtectedViagens) {
			ops.set(
				`viagens/protected/${PIN.current}/${DOCUMENT_ID}`,
				FIRESTORE_PROTECTED_NEW_DATA,
			);
		}

		ops.update(`protegido/${DOCUMENT_ID}`, getNewPinObject());
	}
}

function hasCurrentViagens() {
	return (
		!!getState() &&
		!isDataUnprotected() &&
		((getState().transportes?.dados ?? []).some(
			(t) => t.reserva || t.link,
		) ||
			(getState().hospedagens ?? []).some((h) => h.reserva || h.link))
	);
}
