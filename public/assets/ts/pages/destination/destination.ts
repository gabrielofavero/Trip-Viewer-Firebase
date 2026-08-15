import { getPageURL, setPageName } from '../../app/main.js';
import { FIRESTORE_DESTINATIONS_DATA } from '../../data/state.js';
import { translate } from '../../i18n/translation.js';
import { getID, getURLParams } from '../../utils/dom.js';
import { openToast } from '../../utils/messages.js';
import { mountDestination } from './mount.js';
import { loadDestinationListeners } from './support/event-listeners.js';
import { loadDestinationTabBar, loadDestinationSearch } from './support/chrome.js';

// Re-exports for the destination page modules that historically import from
// this file (the shared helpers now live in ./mount.js).
export { ACTIVE_CATEGORY } from './categories.js';
export {
	CONTENT,
	applyContent,
	getDataSet,
	getDestinationID,
	getItemFromJ,
	getItem,
	isPlanned,
	refreshDestination,
	loadDestinationByType,
} from './mount.js';

export async function loadDestinationPage() {
	console.log(window.location.href);

	loadDestinationListeners();

	const urlParams = getURLParams();
	const tripId = urlParams['t'] || urlParams['v'];
	// Abort early when the read failed (e.g. access denied for unauthenticated
	// users) — the proper message was already shown by mountDestination.
	const dispose = await mountDestination(getID('content'), {
		destinationId: urlParams['d'],
		tripId,
		type: urlParams['type'],
	});
	if (!dispose) {
		return;
	}

	if (!FIRESTORE_DESTINATIONS_DATA) {
		throw translate('messages.errors.missing_data');
	}

	const title = FIRESTORE_DESTINATIONS_DATA.title || 'TripViewer';
	setPageName(title);
	getID('title').innerText = title;

	loadHeaderButtons(tripId);
	loadDestinationTabBar();
	loadDestinationSearch();
}

/**
 * Toggle the top-bar navigation icons based on how the page was opened:
 *   - Linked to a trip (?t=… / ?v=…): show the back button (returns to the
 *     trip detail page) and keep the share button hidden.
 *   - Standalone (no trip): hide the back button and surface the share button.
 */
function loadHeaderButtons(tripId?: string) {
	const closeButton = getID('closeButton');
	const share = getID('share');

	if (tripId) {
		if (closeButton) {
			closeButton.style.display = '';
			closeButton.onclick = () => {
				window.location.href = `view.html?t=${tripId}`;
			};
		}
		if (share) {
			share.style.display = 'none';
		}
		return;
	}

	if (closeButton) {
		closeButton.style.display = 'none';
	}
	if (share) {
		share.style.display = '';
		share.onclick = shareDestination;
	}
}

function shareDestination() {
	const title = FIRESTORE_DESTINATIONS_DATA?.title || document.title;
	const text = translate('destination.share', { name: title });
	const url = getPageURL();

	if (navigator.share) {
		navigator.share({ title, text, url }).catch(() => {});
		return;
	}

	if (navigator.clipboard?.writeText) {
		navigator.clipboard
			.writeText(url)
			.then(() => openToast(translate('messages.text_copied')))
			.catch(() => {});
	}
}


