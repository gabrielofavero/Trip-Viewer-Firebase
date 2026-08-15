// ======= View Embed Components (Workstream D) =======
// Replaces the iframe-based embedding of the expenses section, the full
// itinerary and the destination detail on view.html with in-document
// component injection.
//
//   - openExpensesEmbed()       → mountExpenses        into #expenses-embed
//   - openItineraryLightbox()   → mountFullItinerary   into the lightbox
//   - openDestinationLightbox() → mountDestination     into the lightbox
//   - syncExpensesPin(pin)      → re-mount expenses with a resolved PIN
//
// No postMessage, no localStorage, no iframes. The three mount functions are
// dynamically imported (esbuild code-splitting) so the initial view bundle
// stays lean. The lightbox keeps the old overlay open/close + scroll-save
// behavior but injects components instead of setting an iframe.src.

import { startLoadingScreen, stopLoadingScreen } from '../../../utils/loading.js';
import {
	getState,
	setDocumentId,
	setFirestoreDestinationsData,
	setState,
	DOCUMENT_ID,
	FIRESTORE_DESTINATIONS_DATA,
} from '../../../data/state.js';
import { getID, getURLParam } from '../../../utils/dom.js';
import { disableScroll, enableScroll } from '../../../theme/visibility.js';
import { updateProtectedDataFromExternalPin } from './sensitive-reservation.js';

// ======= Expenses (inline section) =======

var expensesMounted = false;

/** Shared opts for the inline expenses mount (view.html). */
function getExpensesOpts(pin?: string) {
	return {
		tripId: getURLParam('t'),
		pin: pin || getState().pin || 'no-pin',
		embedMode: true,
		onPinResolved: (resolved: string) => {
			if (resolved && /^\d{4}$/.test(resolved)) {
				updateProtectedDataFromExternalPin(resolved);
			}
		},
	};
}

export async function openExpensesEmbed(): Promise<void> {
	const container = getID('expenses-embed');
	if (!container) return;

	const { mountExpenses } = await import('../../expenses/mount.js');
	await mountExpenses(container, getExpensesOpts());
	expensesMounted = true;
}

/** View → expenses PIN sync: re-render expenses once the host resolves a PIN. */
export async function syncExpensesPin(pin: string): Promise<void> {
	if (!expensesMounted || !/^\d{4}$/.test(pin)) return;
	const container = getID('expenses-embed');
	if (!container) return;

	const { mountExpenses } = await import('../../expenses/mount.js');
	await mountExpenses(container, getExpensesOpts(pin));
}

// ======= Lightbox (full itinerary + destination detail) =======

var SAVED_SCROLL_POSITION = 0;
var LIGHTBOX_ACTIVE = false;

// Host document state captured before a lightbox mount and restored on close.
// mountDestination rewrites these globals (DOCUMENT_ID, state, destination
// data) — the trip page must keep its own copy when the lightbox closes.
var SAVED_DOCUMENT_ID = '';
var SAVED_STATE: Record<string, any> = {};
var SAVED_DESTINATION_DATA: any = null;

/** Wire the lightbox close affordances (button + Escape). Called once from view.ts. */
export function initViewEmbed(): void {
	const closeBtn = getID('lightbox-close');
	if (closeBtn) {
		closeBtn.addEventListener('click', closeViewLightbox);
	}
	document.addEventListener('keydown', (e) => {
		if (e.key === 'Escape' && LIGHTBOX_ACTIVE) {
			closeViewLightbox();
		}
	});
}

function openLightbox(): void {
	SAVED_SCROLL_POSITION = window.pageYOffset || document.documentElement.scrollTop;
	SAVED_DOCUMENT_ID = DOCUMENT_ID;
	SAVED_STATE = getState();
	SAVED_DESTINATION_DATA = FIRESTORE_DESTINATIONS_DATA;

	startLoadingScreen();
	window.scrollTo(0, 0);

	getID('lightbox').style.display = 'block';
	setElementDisplay('night-mode', 'none');
	setElementDisplay('menu', 'none');
	setElementDisplay('navbar', 'none');
	disableScroll();
	LIGHTBOX_ACTIVE = true;
}

function setElementDisplay(id: string, display: string): void {
	const el = getID(id);
	if (el) el.style.display = display;
}

export function closeViewLightbox(): void {
	if (!LIGHTBOX_ACTIVE) return;

	getID('lightbox').style.display = 'none';
	setElementDisplay('night-mode', '');
	setElementDisplay('menu', '');
	setElementDisplay('navbar', '');
	enableScroll();
	window.scrollTo({ top: SAVED_SCROLL_POSITION, behavior: 'instant' });

	// Close any destination sort/filter drawer left open inside the lightbox.
	const overlay = getID('overlay');
	if (overlay) overlay.style.display = 'none';
	const drawer = getID('drawer');
	if (drawer) drawer.classList.remove('open');

	// Restore the host document state clobbered by mountDestination.
	setDocumentId(SAVED_DOCUMENT_ID);
	setState(SAVED_STATE);
	setFirestoreDestinationsData(SAVED_DESTINATION_DATA);

	LIGHTBOX_ACTIVE = false;
}

export async function openItineraryLightbox(): Promise<void> {
	const container = getID('content');
	if (!container) return;

	openLightbox();
	// Itinerary is a plain scrollable document — hide the destination chrome.
	setElementDisplay('filter-sort-container', 'none');
	container.classList.add('content');

	try {
		const { mountFullItinerary } = await import('../../itinerary/mount.js');
		await mountFullItinerary(container, {
			tripId: DOCUMENT_ID,
			data: getState(),
		});
	} finally {
		stopLoadingScreen();
	}
}

export async function openDestinationLightbox(destinationId: string, type?: string): Promise<void> {
	const container = getID('content');
	if (!container || !destinationId) return;

	openLightbox();
	setElementDisplay('filter-sort-container', '');
	container.classList.remove('content');

	// Register the destination page's data-action handlers (filter/sort drawer,
	// accordion, links) — the lightbox reuses the destination component.
	try {
		const { loadDestinationListeners } = await import(
			'../../destination/support/event-listeners.js'
		);
		loadDestinationListeners();
	} catch (error) {
		console.warn('[view-embed] failed to register destination listeners:', error);
	}

	try {
		const { mountDestination } = await import('../../destination/mount.js');
		const dispose = await mountDestination(container, {
			destinationId,
			tripId: DOCUMENT_ID,
			type,
			data: getState(),
		});
		if (!dispose) {
			closeViewLightbox();
			return;
		}
		const title = getID('title');
		if (title) title.innerText = FIRESTORE_DESTINATIONS_DATA?.title || '';
	} catch (error) {
		console.error('[view-embed] destination mount failed:', error);
		closeViewLightbox();
		return;
	} finally {
		stopLoadingScreen();
	}
}

// ======= Media Lightbox (kept — gallery / accommodations / inner itinerary) =======
// Re-exported from the shared ui/lightbox.ts wrapper so the view galleries and
// the destination card media (P3) share a single GLightbox registration helper.

export { loadImageLightbox } from '../../../ui/lightbox.js';
