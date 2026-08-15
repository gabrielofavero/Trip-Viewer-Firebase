// ======= Destination Page Chrome =======
// Category tab bar + search input wiring, shared by the standalone
// destination.html bootstrap and the view.html destination lightbox so both
// surfaces render identical chrome around the shared destination component.

import { getDestinations } from '../../../app/config.js';
import { FIRESTORE_DESTINATIONS_DATA } from '../../../data/state.js';
import { translate } from '../../../i18n/translation.js';
import { getID } from '../../../utils/dom.js';
import { ACTIVE_CATEGORY, updateActiveCategory } from '../categories.js';
import { loadDestinationByType, setSearchQuery } from '../mount.js';
import { adjustDrawer } from './sort-and-filter/support/drawer.js';

export function loadDestinationTabBar() {
	const tabBar = getID('destination-tab-bar');
	if (!tabBar) return;

	tabBar.innerHTML = getDestinationTabsHTML();
	tabBar.style.display = '';

	for (const tab of Array.from(tabBar.querySelectorAll('.category-tab'))) {
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

		// Iterate the canonical config order (restaurants → snacks → nightlife →
		// tourism → shopping → myMaps) instead of the document key order, so the
		// tab bar always renders in the same category order.
		for (const value of values) {
			const data = FIRESTORE_DESTINATIONS_DATA?.[value];
			if (!data) continue;
			if (value !== 'myMaps' && Object.keys(data).length === 0) continue;

			const key = destinationsConfig.translation[value].toLowerCase();
			const label = translate(`destination.${key}.title`);
			const icon = destinationsConfig.icons[value] || destinationsConfig.icons['map'];
			const isActive = value === activeValue;

			result += `
                <button class="category-tab${isActive ? ' active' : ''}" data-category="${value}">
                    <i class="${icon}"></i>
                    <span class="tab-label">${label}</span>
                </button>`;
		}
		return result;
	}
}

function activateDestinationTab(tabBar: HTMLElement, activeTab: HTMLElement) {
	for (const tab of Array.from(tabBar.querySelectorAll('.category-tab'))) {
		tab.classList.toggle('active', tab === activeTab);
	}
}

export function loadDestinationSearch() {
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
