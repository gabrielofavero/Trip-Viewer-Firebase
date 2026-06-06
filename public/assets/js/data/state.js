// ======= Application State =======
// Centralized mutable state that was previously a global var.
// Modules should import { getState, setState } rather than
// reading/writing FIRESTORE_DATA directly.

let FIRESTORE_DATA = {};

export function getState() {
	return FIRESTORE_DATA;
}

export function setState(data) {
	FIRESTORE_DATA = data;
}

export function updateState(partial) {
	Object.assign(FIRESTORE_DATA, partial);
}
