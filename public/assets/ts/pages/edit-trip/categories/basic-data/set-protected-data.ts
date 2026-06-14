import { getState, DOCUMENT_ID } from '../../../../data/state.js';
import { getNewPinObject, isDataUnprotected, PIN } from './protected-data.js';
import { FIRESTORE_EXPENSES_DATA } from '../../edit-trip.js';
import { getID, objectExistsAndHasKeys } from '../../../../utils/dom.js';
import { FIRESTORE_NEW_DATA } from '../../../../data/state.js';
import { FIRESTORE_EXPENSES_NEW_DATA, FIRESTORE_EXPENSES_PROTECTED_NEW_DATA, FIRESTORE_PROTECTED_NEW_DATA } from '../../set-trip.js';

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
	const hasCurrentExpenses = objectExistsAndHasKeys(FIRESTORE_EXPENSES_DATA);
	const hasNewExpenses = objectExistsAndHasKeys(FIRESTORE_EXPENSES_NEW_DATA);
	const currentHasViagens = hasCurrentViagens();

	if (!getState()) {
		setNewDocumentNoPin();
	} else if (PIN.current) {
		removePinAndSet();
	} else {
		setNoPinDocument();
	}

	function setNewDocumentNoPin() {
		if (hasNewExpenses) {
			ops.set(`expenses/${DOCUMENT_ID}`, FIRESTORE_EXPENSES_NEW_DATA);
		}
	}

	function removePinAndSet() {
		if (hasCurrentExpenses) {
			ops.delete(`expenses/protected/${PIN.current}/${DOCUMENT_ID}`);
		}

		if (currentHasViagens) {
			ops.delete(`viagens/protected/${PIN.current}/${DOCUMENT_ID}`);
		}

		if (hasNewExpenses && !hasCurrentExpenses) {
			ops.set(`expenses/${DOCUMENT_ID}`, FIRESTORE_EXPENSES_NEW_DATA);
		} else if (hasNewExpenses && hasCurrentExpenses) {
			ops.overwrite(`expenses/${DOCUMENT_ID}`, FIRESTORE_EXPENSES_NEW_DATA);
		} else if (!hasNewExpenses && hasCurrentExpenses) {
			ops.delete(`expenses/${DOCUMENT_ID}`);
		}

		ops.delete(`protegido/${DOCUMENT_ID}`);
	}

	function setNoPinDocument() {
		if (hasNewExpenses && hasCurrentExpenses) {
			ops.update(`expenses/${DOCUMENT_ID}`, FIRESTORE_EXPENSES_NEW_DATA);
		} else if (!hasCurrentExpenses && hasNewExpenses) {
			ops.set(`expenses/${DOCUMENT_ID}`, FIRESTORE_EXPENSES_NEW_DATA);
		} else if (hasCurrentExpenses && !hasNewExpenses) {
			ops.delete(`expenses/${DOCUMENT_ID}`);
		}
	}
}

function setProtectedDataWithPIN(ops) {
	const hasCurrentExpenses_PIN = objectExistsAndHasKeys(FIRESTORE_EXPENSES_DATA);
	const hasNewProtectedExpenses = objectExistsAndHasKeys(
		FIRESTORE_EXPENSES_PROTECTED_NEW_DATA,
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
		if (hasNewProtectedExpenses) {
			ops.set(
				`expenses/protected/${PIN.new}/${DOCUMENT_ID}`,
				FIRESTORE_EXPENSES_PROTECTED_NEW_DATA,
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
		if (hasCurrentExpenses_PIN) {
			ops.delete(`expenses/${DOCUMENT_ID}`);
		}

		if (hasNewProtectedExpenses) {
			ops.set(
				`expenses/protected/${PIN.new}/${DOCUMENT_ID}`,
				FIRESTORE_EXPENSES_PROTECTED_NEW_DATA,
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
		if (hasCurrentExpenses_PIN && hasNewProtectedExpenses) {
			ops.update(`expenses/${DOCUMENT_ID}`, FIRESTORE_EXPENSES_NEW_DATA);
			ops.delete(`expenses/protected/${PIN.current}/${DOCUMENT_ID}`);
			ops.set(
				`expenses/protected/${PIN.new}/${DOCUMENT_ID}`,
				FIRESTORE_EXPENSES_PROTECTED_NEW_DATA,
			);
		} else if (!hasCurrentExpenses_PIN && hasNewProtectedExpenses) {
			ops.set(`expenses/${DOCUMENT_ID}`, FIRESTORE_EXPENSES_NEW_DATA);
			ops.set(
				`expenses/protected/${PIN.new}/${DOCUMENT_ID}`,
				FIRESTORE_EXPENSES_PROTECTED_NEW_DATA,
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
		if (hasCurrentExpenses_PIN && hasNewProtectedExpenses) {
			ops.update(`expenses/${DOCUMENT_ID}`, FIRESTORE_EXPENSES_NEW_DATA);
			ops.update(
				`expenses/protected/${PIN.current}/${DOCUMENT_ID}`,
				FIRESTORE_EXPENSES_PROTECTED_NEW_DATA,
			);
		} else if (!hasCurrentExpenses_PIN && hasNewProtectedExpenses) {
			ops.set(`expenses/${DOCUMENT_ID}`, FIRESTORE_EXPENSES_NEW_DATA);
			ops.set(
				`expenses/protected/${PIN.current}/${DOCUMENT_ID}`,
				FIRESTORE_EXPENSES_PROTECTED_NEW_DATA,
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
