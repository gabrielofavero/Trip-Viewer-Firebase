// ======= Expenses Page (Standalone Bootstrap) =======
// Parses URL params and delegates rendering to the shared mountExpenses
// component (./mount.ts). Keeps only the standalone page wiring:
// top-bar / close / logo, listeners, and theme/visibility init.
//
// No iframe adapter, no postMessage, no localStorage handoff — all the data
// loading, PIN gate and render logic live in mountExpenses.

import { getLocalColors } from '../../theme/colors.js';
import { loadVisibility } from '../../theme/visibility.js';
import { getID, getURLParams } from '../../utils/dom.js';
import { displayForbidden, registerActions } from '../../utils/messages.js';
import { translate } from '../../i18n/translation.js';
import { loadExpensesListeners } from './support/event-listeners.js';
import { mountExpenses } from './mount.js';

export async function loadExpensesPage() {
	loadExpensesListeners();
	registerActions({ exitExpenses });

	const colors = getLocalColors();
	loadVisibility(colors);

	// Standalone wiring: no close button (nothing to embed into) and the logo
	// returns home. The previous iframe-embed close behavior (window.parent)
	// was removed along with the iframe adapter.
	const closeButton = getID('closeButton');
	if (closeButton) {
		closeButton.style.display = 'none';
	}

	const logoLink = getID('logo-link');
	if (logoLink) {
		logoLink.onclick = function () {
			window.location.href = 'index.html';
		};
	}

	const params = getURLParams();
	const documentID = params.e;

	if (!documentID) {
		displayForbidden(
			`${translate('messages.documents.get.error')}. ${translate(
				translate('messages.documents.get.no_code'),
			)}`,
			'index.html',
		);
		return;
	}

	const container = getID('expenses-content');
	if (!container) return;

	// Render the expenses content into the page skeleton. The component owns
	// data fetch + PIN gate; page chrome above runs before it (top-bar wiring,
	// theme init) so the standalone page renders identically to before.
	await mountExpenses(container as HTMLElement, {
		tripId: documentID,
	});
}

function exitExpenses() {
	// Cancelling the PIN gate on the standalone expenses page goes home.
	window.location.href = 'index.html';
}
