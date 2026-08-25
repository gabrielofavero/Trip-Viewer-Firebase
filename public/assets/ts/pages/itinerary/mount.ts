// ======= Full Itinerary Mount Component =======
// Render-only component shared by:
//   - itinerary.html (standalone)  → mounts into #content
//   - view.html (later workstream) → mounts into the lightbox container
//
// Contract: no URL param reads, no window.parent, no postMessage, no
// localStorage, no iframes. Clears the container on every mount (idempotent),
// so re-mounting (e.g. re-opening a lightbox) always re-renders fresh.

import { startLoadingScreen, stopLoadingScreen } from '../../utils/loading.js';
import { getState, setState, setDocumentId, DOCUMENT_ID } from '../../data/state.js';
import { getID } from '../../utils/dom.js';
import { translate } from '../../i18n/translation.js';
import {
	closeMessage,
	displayError,
	displayPrompt,
	openToast,
	registerActions,
} from '../../utils/messages.js';
import { getItineraryContent } from '../../models/itinerary.model.js';
import {
	get,
	getTripComplete,
	haveErrorFromGetRequest,
	COLLECTION,
} from '../../data/firebase/database.js';
import { requestPin, requestInvalidPin } from '../../utils/pin.js';

export interface FullItineraryOptions {
	tripId: string;
	/**
	 * Theme visibility passed by the host when embedding. The standalone page
	 * reads it from the URL itself (via loadVisibility) — informational here.
	 */
	visibility?: string;
	/**
	 * Already-loaded trip data. When provided the component does NOT re-fetch
	 * trips/{id} (view passes its in-memory trip to avoid a duplicate read).
	 */
	data?: Record<string, any>;
}

export async function mountFullItinerary(
	container: HTMLElement,
	opts: FullItineraryOptions,
): Promise<() => void> {
	// Clear on every mount (idempotent re-mount).
	container.innerHTML = '';

	if (!opts.tripId) {
		displayError(
			`${translate('messages.documents.get.error')}. ${translate(
				translate('messages.documents.get.no_code'),
			)}`,
		);
		return () => {};
	}

	setDocumentId(opts.tripId);

	if (opts.data) {
		setState(opts.data);
	} else {
		// Hydrate the trip with its subcollections (itinerary, transportation,
		// accommodations) — the itinerary model reads those from state.
		const tripData = await getTripComplete(opts.tripId, false);
		normalizeTransportation(tripData);
		setState(tripData);
	}

	if (!getState()) {
		displayError(
			`${translate('messages.documents.get.error')}. ${translate(
				translate('messages.documents.get.not_found'),
			)}`,
		);
		return () => {};
	}

	// Resolve the string-based message actions used by the PIN prompts
	// (e.g. "loadProtectedItinerary(true)") to this component's closures.
	// Re-registered on every mount so re-opened lightboxes use the current
	// container/opts.
	registerActions({
		loadItinerary: () => loadItinerary(container),
		requestPinItinerary,
		loadProtectedItinerary: (mandatory = false) => loadProtectedItinerary(container, mandatory),
	});

	const title = getID('title');
	if (title) {
		title.innerText = getState().title;
	}

	switch (getState().pin) {
		case 'all-data':
			stopLoadingScreen();
			requestPinItinerary(true);
			break;
		case 'sensitive-only':
			stopLoadingScreen();
			displaySensitiveItineraryPrompt();
			break;
		default:
			await loadItinerary(container);
	}

	// Dispose: clears the container so a subsequent mount starts blank.
	return () => {
		container.innerHTML = '';
	};
}

async function loadItinerary(container: HTMLElement) {
	if (document.querySelector('.input-container') || document.querySelector('.message-container')) {
		closeMessage();
	}

	container.innerHTML = await getItineraryContent('page');

	// Print/export buttons live in the page top-bar; wire them when present.
	getID('print')?.addEventListener('click', () => print());
	getID('export')?.addEventListener('click', () => exportItinerary());
}

/**
 * Normalize transportation from the subcollection format ({ legs, settings })
 * to the module-expected format ({ viewMode, data }), mirroring view.ts.
 */
function normalizeTransportation(tripData: any): void {
	if (!tripData?.transportation) return;
	const rawViewMode: string =
		tripData.transportation.settings?.viewMode ||
		tripData.transportation.viewMode ||
		'simple';
	const rawData: any[] = tripData.transportation.legs || tripData.transportation.data || [];
	tripData.transportation = {
		viewMode: normalizeTransportViewMode(rawViewMode),
		data: rawData,
	};
}

/** Normalize Firestore viewMode values to the hyphenated module format. */
function normalizeTransportViewMode(raw: string): string {
	switch (raw) {
		case 'simple':
			return 'simple-view';
		case 'leg':
			return 'leg-view';
		case 'people':
			return 'people-view';
		default:
			return raw || 'simple-view';
	}
}

// ======= PIN gate =======
function requestPinItinerary(mandatory = false) {
	if (document.querySelector('.message-container')) {
		closeMessage();
	}

	const confirmAction = `loadProtectedItinerary(${mandatory})`;
	const cancelAction = mandatory ? null : 'loadItinerary()';
	requestPin({ confirmAction, cancelAction, precontent: undefined });
}

function requestPinItineraryInvalido(mandatory = false) {
	const confirmAction = `loadProtectedItinerary(${mandatory})`;
	const cancelAction = mandatory ? null : 'loadItinerary()';
	requestInvalidPin({ confirmAction, cancelAction, precontent: undefined });
}

function displaySensitiveItineraryPrompt() {
	const title = translate('trip.protected');
	const content = translate('messages.protected.prompt');
	const yesAction = 'requestPinItinerary()';
	const noAction = 'loadItinerary()';
	const critico = true;
	displayPrompt({
		title: title,
		content: content,
		yesAction,
		noAction,
		critical: critico,
	});
}

async function loadProtectedItinerary(container: HTMLElement, mandatory = false) {
	const pin = getID('pin-code')?.innerText || '';
	const pinType = getState().pin;
	closeMessage();
	startLoadingScreen();

	try {
		const protectedData = await get(
			`${COLLECTION.TRIPS}/${COLLECTION.PROTECTED}/${pin}/${DOCUMENT_ID}`,
		);
		if (haveErrorFromGetRequest() || !protectedData) {
			stopLoadingScreen();
			requestPinItineraryInvalido(mandatory);
			return;
		}

		if (pinType == 'sensitive-only') {
			// Sensitive-only: keep the public (base) trip state; the itinerary
			// model resolves reservations from the protected doc internally.
		} else {
			setState(protectedData);
		}

		await loadItinerary(container);
	} catch (error) {
		if (error?.message == 'Missing or insufficient permissions.') {
			console.warn(error.message);
			requestPinItineraryInvalido(mandatory);
		} else {
			console.error(error);
			displayError(translate('messages.errors.unknown'), false, false);
		}
		stopLoadingScreen();
	}

	stopLoadingScreen();
}

// ======= Export =======
export async function exportItinerary() {
	const html = await getItineraryContent('notes');
	const plainText = await getItineraryContent('text');

	await navigator.clipboard.write([
		new ClipboardItem({
			'text/html': new Blob([html], { type: 'text/html' }),
			'text/plain': new Blob([plainText], { type: 'text/plain' }),
		}),
	]);

	openToast(translate('messages.itinerary_copied'));
}
