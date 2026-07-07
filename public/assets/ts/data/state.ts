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

// ======= Shared Mutable State (English names) =======
// For backward compat, old Portuguese-named let exports are kept
// in sync via the setters below (both vars updated on every write).
export let DOCUMENT_ID = '';
export let SUCCESSFUL_SAVE = false;
export let activeDestinations: any[] = [];
export let TRAVELERS: any[] = [];
export let activeDestinationData: any = null;
export let pendingTripData: Record<string, any> = {};
export let pendingDestinationData: Record<string, any> = {};
export let ERROR_FROM_GET_REQUEST: any = {};

// ======= Deprecated Portuguese-named exports (kept in sync by setters) =======

/** @deprecated Use `activeDestinations` */
export let DESTINATIONS: any[] = [];

/** @deprecated Use `activeDestinationData` */
export let FIRESTORE_DESTINATIONS_DATA: any = null;

/** @deprecated Use `pendingTripData` */
export let FIRESTORE_NEW_DATA: Record<string, any> = {};

/** @deprecated Use `pendingDestinationData` */
export let FIRESTORE_DESTINATIONS_NEW_DATA: Record<string, any> = {};

// ======= Setters (update both old and new names for backward compat) =======
// (ES module imports are live bindings — only the exporting module can reassign them)

export function setErrorFromGetRequest(val: any) {
	ERROR_FROM_GET_REQUEST = val;
}
export function setDocumentId(val: string) {
	DOCUMENT_ID = val;
}

export function setSuccessfulSave(val: boolean) {
	SUCCESSFUL_SAVE = val;
}

export function setActiveDestinations(val: any[]) {
	activeDestinations = val;
	DESTINATIONS = val;
}

export function setTravelers(val: any[]) {
	TRAVELERS = val;
}

export function setActiveDestinationData(val: any) {
	activeDestinationData = val;
	FIRESTORE_DESTINATIONS_DATA = val;
}

export function setPendingTripData(val: Record<string, any>) {
	pendingTripData = val;
	FIRESTORE_NEW_DATA = val;
}

export function setPendingDestinationData(val: Record<string, any>) {
	pendingDestinationData = val;
	FIRESTORE_DESTINATIONS_NEW_DATA = val;
}

// ======= Deprecated setter aliases (Portuguese names) =======

/** @deprecated Use `setActiveDestinations` */
export function setDestinations(val: any[]) {
	setActiveDestinations(val);
}

/** @deprecated Use `setTravelers` */
export function setTravelersFn(val: any[]) {
	setTravelers(val);
}

/** @deprecated Use `setActiveDestinationData` */
export function setFirestoreDestinationsData(val: any) {
	setActiveDestinationData(val);
}

/** @deprecated Use `setPendingTripData` */
export function setFirestoreNewData(val: Record<string, any>) {
	setPendingTripData(val);
}

/** @deprecated Use `setPendingDestinationData` */
export function setFirestoreDestinationsNewData(val: Record<string, any>) {
	setPendingDestinationData(val);
}

/** @deprecated Use `setSuccessfulSave` */
export function setSuccessfulSaveFn(val: boolean) {
	setSuccessfulSave(val);
}
