// ======= Itinerary Page Bootstrap (itinerary.html) =======
// Standalone entry: parses URL params, mounts the full-itinerary component
// into #content, then wires the page chrome (top-bar night mode, mobile
// drawer). All data fetching, PIN gating and rendering live in ./mount.js
// (mountFullItinerary).

import { getID, getURLParam, on, select } from '../../utils/dom.js';
import { translate } from '../../i18n/translation.js';
import { isOnDarkMode, loadVisibility, switchVisibility } from '../../theme/visibility.js';
import { setPageName } from '../../app/main.js';
import { loadItineraryListeners } from './support/event-listeners.js';
import { exportItinerary, mountFullItinerary } from './mount.js';

export async function loadItineraryPage() {
	loadItineraryListeners();
	setPageName(translate('trip.itinerary.title'));

	const container = getID('content');
	if (!container) return;

	// Render the itinerary into #content (component owns data fetch + PIN gate).
	// Page chrome runs after mount so getState() is populated and the trip's
	// colors can be applied by loadVisibility().
	await mountFullItinerary(container, { tripId: getURLParam('t') || '' });

	// Page chrome — top-bar night mode + mobile drawer.
	loadVisibility();
	loadNightModeButtonLabel();
	initializeMobileMenu();
}

// Mobile Menu
function initializeMobileMenu() {
	// Mobile nav toggle
	on('click', '.mobile-nav-toggle', function (e) {
		select('body').classList.toggle('mobile-nav-active');
		this.classList.toggle('bi-list');
		this.classList.toggle('bi-x');
	});

	// Mobile menu item handlers
	getID('mobile-night-mode')?.addEventListener('click', (e) => {
		e.preventDefault();
		switchVisibility();
		closeMobileMenu();
		loadNightModeButtonLabel();
	});

	getID('mobile-export')?.addEventListener('click', (e) => {
		e.preventDefault();
		exportItinerary();
		closeMobileMenu();
	});

	getID('mobile-print')?.addEventListener('click', (e) => {
		e.preventDefault();
		print();
		closeMobileMenu();
	});
}

function closeMobileMenu() {
	let body = select('body');
	if (body.classList.contains('mobile-nav-active')) {
		body.classList.remove('mobile-nav-active');
		let navbarToggle = select('.mobile-nav-toggle');
		navbarToggle.classList.toggle('bi-list');
		navbarToggle.classList.toggle('bi-x');
	}
}

function loadNightModeButtonLabel() {
	const label = isOnDarkMode() ? translate('labels.light_mode') : translate('labels.dark_mode');
	getID('mobile-night-mode-label').innerText = label;
}
