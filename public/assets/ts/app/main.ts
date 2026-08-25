/* ======= Main JS =======
    - Template Name: MyResume - v4.5.0
    - Template URL: https://bootstrapmade.com/free-html-bootstrap-template-my-resume/
    - Author: BootstrapMade.com
    - License: https://bootstrapmade.com/license/
    - Modified by: Gabriel Fávero
*/

import { select, on, onscroll, getID } from '../utils/dom.js';
import { displayError } from '../utils/messages.js';
import { loadAllConfigs, setLanguage, getVersions } from '../app/config.js';
import {
	translate,
	translatePage,
	getLanguagePackName,
	loadLangSelectorSelect,
} from '../i18n/translation.js';
import { initActions } from '../ui/actions.js';
import { initDev } from '../utils/dev.js';
import { isStaticMode, loadStaticData } from '../static-mode/static-mode.js';
import { checkForAppUpdate } from '../app/version-check.js';

const APP = {
	projectId: null,
	version: null,
};

export async function main(pageLoaders: Record<string, () => void> = {}) {
	try {
		if (isStaticMode()) {
			await loadStaticData();
		}
		await loadAllConfigs(getLanguagePackName());
		translatePage();
		initializeApp();
		populateFooterVersion();
		// Detect a newly deployed version (LocalStorage-compared) and, on a
		// mismatch, prompt to refresh so the user loads the latest build.
		checkForAppUpdate(APP.version);
		loadLangSelectorSelect();
		loadPage(pageLoaders);
	} catch (error) {
		displayError('Initialization Error:' + error.message);
	}
}

function loadPage(pageLoaders: Record<string, () => void> = {}) {
	setPageName();
	switch (getHTMLpage()) {
		case 'index':
			pageLoaders.index();
			break;
		case 'view':
			pageLoaders.view();
			break;
		case 'destination':
			pageLoaders.destination();
			break;
		case 'expenses':
			pageLoaders.expenses();
			break;
		case 'edit-listing':
			pageLoaders.editListing();
			break;
		case 'edit-destination':
			pageLoaders.editDestination();
			break;
		case 'edit-trip':
			pageLoaders.editTrip();
			break;
		case 'itinerary':
			pageLoaders.itinerary();
			return;
		default:
			displayError(`Page "${getHTMLpage()}" not found.`);
			break;
	}
}

export function getHTMLpage() {
	const pathname = window.location.pathname.split('?')[0].split('#')[0];
	// A static export can live under any folder (e.g. /tmp/export/view.html),
	// so derive the page name from the filename, not the root-absolute path.
	// All of these must resolve the same: /view.html, /tmp/export/view.html,
	// /destination, / (→ index), /edit/trip.html (→ 'edit-trip').
	const clean = pathname.replace(/\.html$/i, '').replace(/\/+$/, '');
	const segments = clean.split('/').filter(Boolean);
	const name = segments[segments.length - 1] || 'index';
	if (segments.includes('edit') && name !== 'index') {
		return `edit-${name}`;
	}
	return name;
}

export function getPageURL() {
	const isAltPrd = window.location.hostname === 'trip-viewer-prd.firebaseapp.com';

	const base = isAltPrd ? 'https://trip-viewer.com' : window.location.origin;

	const url = new URL(window.location.pathname + window.location.search, base);

	url.searchParams.delete('visibility');

	return url.toString();
}

export function openLinkInNewTab(url) {
	var win = window.open(url, '_blank');
	win.focus();
}

function initializeApp() {
	// Dev mode — must run before anything that depends on the dev global
	initDev();

	if (isStaticMode()) {
		APP.projectId = 'static-export';
	} else {
		APP.projectId = firebase.app().options.projectId;
	}
	const versions = getVersions();
	APP.version = versions?.projects?.[APP.projectId]?.version?.system || 'Unknown';

	// Initialize the centralized delegated click handler (replaces all inline onclick)
	initActions();
}

/**
 * Fill the footer "TripViewer v{version}" badge from version.json (APP.version).
 * Runs after initializeApp() sets APP.version.
 */
function populateFooterVersion() {
	const elements = document.querySelectorAll<HTMLElement>('.tripviewer-version');
	elements.forEach((el) => {
		el.textContent = translate('labels.tripviewer_version', { version: APP.version });
	});
}

export function setPageName(pageName?) {
	const host = location.hostname;
	const isLocal = host === 'localhost' || host === '127.0.0.1' || host === '[::1]';
	// [DEV] when running locally with emulators, [PRD] when running locally with
	// real Firebase services; no tag when deployed to a real environment.
	const isEmulator = isLocal && window.__TRIPVIEWER_EMULATOR__ === true;
	const tag = isLocal ? (isEmulator ? '[DEV]' : '[PRD]') : '';
	const cleanTitle = document.title
		.replace(/\[(LOCAL )?(DEV|PRD)\]\s*/g, '')
		.trim();

	const resolvedPageName = pageName ?? cleanTitle;
	const newTitle = tag ? `${tag} ${resolvedPageName}` : resolvedPageName;

	if (document.title !== newTitle) {
		document.title = newTitle;
	}
}

// Global error handlers - catches all unhandled errors
window.addEventListener('unhandledrejection', function (event) {
	console.error('Unhandled promise rejection:', event.reason);
	displayError(event.reason?.message || event.reason || translate('messages.errors.unknown'), false, false);
	event.preventDefault(); // Prevent default browser error handling
});

window.addEventListener('error', function (event) {
	console.error('Global error:', event.error || event.message);
	displayError(event.error?.message || event.message || translate('messages.errors.unknown'), false, false);
	event.preventDefault(); // Prevent default browser error handling
});
