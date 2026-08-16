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
import { translate } from '../../../i18n/translation.js';
import { disableScroll, enableScroll, isOnDarkMode, switchVisibility } from '../../../theme/visibility.js';
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

	// Lightbox toolbar actions — only shown for the full itinerary.
	getID('lightbox-print-btn')?.addEventListener('click', () => print());
	getID('lightbox-export-btn')?.addEventListener('click', async () => {
		const { exportItinerary } = await import('../../itinerary/mount.js');
		exportItinerary();
	});
	getID('lightbox-nightmode-btn')?.addEventListener('click', () => {
		switchVisibility();
		updateLightboxNightModeIcon();
	});

	document.addEventListener('keydown', (e) => {
		if (e.key === 'Escape' && LIGHTBOX_ACTIVE) {
			closeViewLightbox();
		}
	});
}

function setItineraryToolbarActions(show: boolean): void {
	const display = show ? '' : 'none';
	const printBtn = getID('lightbox-print-btn');
	if (printBtn) printBtn.style.display = display;
	const exportBtn = getID('lightbox-export-btn');
	if (exportBtn) exportBtn.style.display = display;
	const nightBtn = getID('lightbox-nightmode-btn');
	if (nightBtn) nightBtn.style.display = display;
}

function updateLightboxNightModeIcon(): void {
	const btn = getID('lightbox-nightmode-btn');
	const icon = btn?.querySelector('i');
	if (!btn || !icon) return;

	const dark = isOnDarkMode();
	icon.classList.toggle('bx-moon', !dark);
	icon.classList.toggle('bx-sun', dark);

	const label = dark ? translate('labels.light_mode') : translate('labels.dark_mode');
	btn.title = label;
	btn.setAttribute('aria-label', label);
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
	document.body.classList.add('lightbox-open');
	LIGHTBOX_ACTIVE = true;
}

function setElementDisplay(id: string, display: string): void {
	const el = getID(id);
	if (el) el.style.display = display;
}

/**
 * Swap the lightbox body to one of the inert <template> regions in view.html.
 * Keeps the toolbar (X close) alive while fully replacing the shared content
 * so itinerary and destination never have colliding IDs in the live DOM.
 */
function renderLightboxBody(templateId: string): void {
	const body = getID('lightbox-body');
	const template = getID(templateId) as HTMLTemplateElement | null;
	if (!body || !template) return;

	body.innerHTML = '';
	body.appendChild(template.content.cloneNode(true));

	// The template content is inert, so translatePage() never saw it at boot.
	// Translate the freshly-cloned body now (destination chrome labels + search
	// placeholder live here; the itinerary body has no data-translate markup).
	body.querySelectorAll<HTMLElement>('[data-translate]').forEach((element) => {
		const key = element.getAttribute('data-translate');
		if (!key) return;
		const text = translate(key);
		if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
			(element as HTMLInputElement).placeholder = text;
		} else {
			element.textContent = text;
		}
	});

	// The destination body is a full-bleed page hero (no side padding around
	// it); the itinerary body keeps the padded, plain-document look.
	const content = getID('lightbox-content');
	if (content) {
		content.classList.toggle('destination-mode', templateId === 'destination-content-template');
	}
}

export function closeViewLightbox(): void {
	if (!LIGHTBOX_ACTIVE) return;

	document.body.classList.remove('lightbox-open');
	setItineraryToolbarActions(false);
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

	// Clear the injected body so the next lightbox open starts from a blank swap.
	const body = getID('lightbox-body');
	if (body) body.innerHTML = '';

	// Restore the host document state clobbered by mountDestination.
	setDocumentId(SAVED_DOCUMENT_ID);
	setState(SAVED_STATE);
	setFirestoreDestinationsData(SAVED_DESTINATION_DATA);

	LIGHTBOX_ACTIVE = false;
}

export async function openItineraryLightbox(): Promise<void> {
	openLightbox();
	renderLightboxBody('itinerary-content-template');
	setItineraryToolbarActions(true);
	updateLightboxNightModeIcon();

	// Hide the toggle when the trip locks visibility to a single theme (same
	// rule as the page top-bar's night-mode button).
	const visibility = getState().visibility;
	const nightBtn = getID('lightbox-nightmode-btn');
	if (nightBtn && visibility && (visibility.light === false || visibility.dark === false)) {
		nightBtn.style.display = 'none';
	}

	const container = getID('content');
	if (!container) {
		closeViewLightbox();
		return;
	}

	// Itinerary is a plain scrollable document; the template's #content already
	// carries the `.content` class so no destination chrome is involved.
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
	if (!destinationId) return;

	openLightbox();
	renderLightboxBody('destination-content-template');
	setItineraryToolbarActions(false);

	const container = getID('content');
	if (!container) {
		closeViewLightbox();
		return;
	}

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
		const { loadDestinationTabBar, loadDestinationSearch } = await import(
			'../../destination/support/chrome.js'
		);

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

		// Wire the same chrome as the standalone destination page (category tab
		// bar + search input) so the lightbox matches destination.html exactly.
		loadDestinationTabBar();
		loadDestinationSearch();
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
