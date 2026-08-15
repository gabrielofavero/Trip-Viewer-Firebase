import { getDestinations } from '../../app/config.js';
import { setPageName } from '../../app/main.js';
import { FIRESTORE_DESTINATIONS_DATA } from '../../data/state.js';
import { translate } from '../../i18n/translation.js';
import { getID, getURLParams } from '../../utils/dom.js';
import { ACTIVE_CATEGORY, updateActiveCategory } from './categories.js';
import { loadDestinationByType, mountDestination, setSearchQuery } from './mount.js';
import { loadDestinationListeners } from './support/event-listeners.js';
import { adjustMediaEmbeds } from './support/media-embed.js';
import { adjustDrawer } from './support/sort-and-filter/support/drawer.js';
import { applyDestinationsMediaHeight } from './support/visibility.js';

// Re-exports for the destination page modules that historically import from
// this file (the shared helpers now live in ./mount.js).
export { ACTIVE_CATEGORY } from './categories.js';
export {
	CONTENT,
	applyContent,
	processAccordion,
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
	// Abort early when the read failed (e.g. access denied for unauthenticated
	// users) — the proper message was already shown by mountDestination.
	const dispose = await mountDestination(getID('content'), {
		destinationId: urlParams['d'],
		tripId: urlParams['t'] || urlParams['v'],
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

	loadDestinationTabBar();
	loadDestinationSearch();
	window.addEventListener('resize', () => {
		applyDestinationsMediaHeight();
		adjustMediaEmbeds();
	});
}

function loadDestinationTabBar() {
	const tabBar = getID('destination-tab-bar');
	if (!tabBar) return;

	tabBar.innerHTML = getDestinationTabsHTML();
	tabBar.style.display = '';

	for (const tab of Array.from(tabBar.querySelectorAll('.edit-tab'))) {
		(tab as HTMLElement).addEventListener('click', () => {
			const value = tab.getAttribute('data-category');
			if (!value) return;
			activateDestinationTab(tabBar, tab as HTMLElement);
			adjustDrawer();
			updateActiveCategory(value);
			loadDestinationByType(value);
		});
	}

	function getDestinationTabsHTML() {
		const destinationsConfig = getDestinations();
		const values = destinationsConfig.categories.ids;
		const activeValue = ACTIVE_CATEGORY === 'map' ? 'myMaps' : ACTIVE_CATEGORY;
		let result = '';

		for (const value in FIRESTORE_DESTINATIONS_DATA) {
			if (
				!values.includes(value) ||
				(value !== 'myMaps' &&
					FIRESTORE_DESTINATIONS_DATA?.[value] &&
					Object.keys(FIRESTORE_DESTINATIONS_DATA[value]).length === 0)
			) {
				continue;
			}

			const key = destinationsConfig.translation[value].toLowerCase();
			const label = translate(`destination.${key}.title`);
			const icon = destinationsConfig.icons[value] || destinationsConfig.icons['map'];
			const isActive = value === activeValue;

			result += `
                <button class="edit-tab${isActive ? ' active' : ''}" data-category="${value}">
                    <i class="${icon}"></i>
                    <span>${label}</span>
                </button>`;
		}
		return result;
	}
}

function activateDestinationTab(tabBar: HTMLElement, activeTab: HTMLElement) {
	for (const tab of Array.from(tabBar.querySelectorAll('.edit-tab'))) {
		tab.classList.toggle('active', tab === activeTab);
	}
}

function loadDestinationSearch() {
	const input = getID('destination-search-input') as HTMLInputElement | null;
	const clear = getID('destination-search-clear');
	if (!input) return;

	input.addEventListener('input', () => {
		setSearchQuery(input.value);
		if (clear) clear.style.display = input.value ? 'flex' : 'none';
	});

	if (clear) {
		clear.addEventListener('click', () => {
			input.value = '';
			setSearchQuery('');
			clear.style.display = 'none';
		});
	}
}


