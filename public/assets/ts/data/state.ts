// ======= Application State =======
// Centralized mutable state that was previously a global var.
// Modules should import { getState, setState } rather than
// reading/writing FIRESTORE_DATA directly.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TripState = Record<string, any>;

let FIRESTORE_DATA: TripState = {};

export function getState(): TripState {
	return FIRESTORE_DATA;
}

export function setState(data: TripState): void {
	FIRESTORE_DATA = data;
}

export function updateState(partial: TripState): void {
	Object.assign(FIRESTORE_DATA, partial);
}

// Shared mutable state (previously ambient globals — now centralized here)
export let DOCUMENT_ID = "";
export let SUCCESSFUL_SAVE = false;
export let DESTINOS: any[] = [];
export let TRAVELERS: any[] = [];
export let FIRESTORE_DESTINOS_DATA: any = null;
export let FIRESTORE_NEW_DATA: Record<string, any> = {};
export let FIRESTORE_DESTINOS_NEW_DATA: Record<string, any> = {};
export let ERROR_FROM_GET_REQUEST: any = null;

// Setters for variables that need to be mutated from other modules
// (ES module imports are live bindings — only the exporting module can reassign them)
export function setErrorFromGetRequest(val) { ERROR_FROM_GET_REQUEST = val; }
export function setDocumentId(val) { DOCUMENT_ID = val; }
export function setSuccessfulSaveFn(val) { SUCCESSFUL_SAVE = val; }
export function setDestinos(val) { DESTINOS = val; }
export function setTravelersFn(val) { TRAVELERS = val; }
export function setFirestoreDestinosData(val) { FIRESTORE_DESTINOS_DATA = val; }
export function setFirestoreNewData(val) { FIRESTORE_NEW_DATA = val; }
export function setFirestoreDestinosNewData(val) { FIRESTORE_DESTINOS_NEW_DATA = val; }
