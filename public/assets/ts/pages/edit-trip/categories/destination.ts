import { getChildIDs, getID, getIDs, getJ } from '../../../utils/dom.js';
import { getHTMLpage } from '../../../app/main.js';
import { translate } from '../../../i18n/translation.js';
import { loadItineraryListeners } from './itinerary-module/itinerary-module.js';

var DESTINATIONS = [];
export var DESTINOS_DATA = {};
export var ACTIVE_DESTINATIONS = [];

export function getDestinationsArray() {
	const result = [];
	for (const dest of ACTIVE_DESTINATIONS) {
		const destinationId = dest.destinationId;
		result.push({ destinationId });
	}
	return result;
}

// Active Destinations
export async function loadActiveDestinations(firstBoot = true) {
	ACTIVE_DESTINATIONS = [];
	const destinationsEnabled = getID('destinations-enabled');
	if (destinationsEnabled && !destinationsEnabled.checked) return;

	let result = [];
	const container = getID('destinations-checkboxes');
	for (const card of container.children) {
		if (!card.classList.contains('selected')) continue;

		const title = card.querySelector('.destination-card-name')?.textContent?.trim() || '';
		const destinationId = card.getAttribute('data-destination-id') || '';

		result.push({ title, destinationId });
	}

	ACTIVE_DESTINATIONS = result;
}

export async function updateActiveDestinationsHTMLs() {
	await loadActiveDestinations(false);

	if (getHTMLpage() === 'edit-trip') {
		updateActiveDestinationsCardsHTML('itinerary');
	}
}

function getActiveDestinationsSelectOptions(activeDestinations = ACTIVE_DESTINATIONS) {
	let result = `<option value="">${translate('destination.undefined')}</option>`;
	for (const dest of activeDestinations) {
		result += `<option value="${dest.destinationId}">${dest.title}</option>`;
	}
	return result;
}

export function getActiveDestinationsSelectVisibility() {
	return ACTIVE_DESTINATIONS.length > 0 ? 'block' : 'none';
}

// Destination Cards for Itinerary
export function updateActiveDestinationsCardsHTML(type, j?) {
	const visibility = ACTIVE_DESTINATIONS.length > 0 ? 'block' : 'none';
	const values = ACTIVE_DESTINATIONS.map((dest) => dest.id);

	function write(type, j) {
		const container = getID(`${type}-location-${j}`);
		if (!container) return;

		getID(`${type}-location-box-${j}`).style.display = visibility;

		// Collect currently selected values before rebuild
		const selectedValues: string[] = [];
		for (const card of container.querySelectorAll('.destination-card.selected')) {
			const id = card.getAttribute('data-destination-id');
			if (id) selectedValues.push(id);
		}

		container.innerHTML = getActiveDestinationsCardOptions(type, j);

		// Re-select previously selected cards
		for (const card of container.querySelectorAll('.destination-card')) {
			const destinationId = card.getAttribute('data-destination-id');
			if (selectedValues.includes(destinationId)) {
				card.classList.add('selected');
				container.prepend(card);
			}
			// Add click listeners
			card.addEventListener('click', () => {
				card.classList.toggle('selected');
				if (card.classList.contains('selected')) {
					container.prepend(card);
				}
			});
		}
	}

	if (j) {
		write(type, j);
	} else {
		const childs = getChildIDs(`${type}-box`);
		for (const child of childs) {
			const innerJ = getJ(child);
			write(type, innerJ);
		}
	}
}

export function getActiveDestinationsCheckboxOptions(
	type,
	j,
	activeDestinations = ACTIVE_DESTINATIONS,
) {
	let items = [];
	for (let k = 1; k <= activeDestinations.length; k++) {
		const dest = activeDestinations[k - 1];
		items.push(getDestinationsItemCheckbox(j, dest.destinationId, dest.title, type, k));
	}
	return items.join('');
}

function getActiveDestinationsCheckboxOptionWithID(checkboxOption, type) {
	return checkboxOption.replace(/check-destinations/g, `check-${type}`);
}

export function addValuesForActiveDestinationsCheckbox(type, j, values) {
	const fieldsetID = `${type}-location-${j}`;
	for (const containerID of getChildIDs(fieldsetID)) {
		const ids = getIDs(containerID);
		const checkbox = getID(`check-${type}-${ids}`);
		if (values.includes(checkbox.value)) {
			checkbox.checked = true;
		}
	}
}

export function getDestinationsItemCheckbox(j, destinationId, title, type = 'destinations', k?) {
	if (!j) {
		console.error('Error in _getDestinationsItemCheckbox: j is undefined or null.');
	}
	const ids = k ? `${j}-${k}` : j;
	return `<div class="nice-form-group" id="checkbox-${ids}">
                <input type="checkbox" id="check-${type}-${ids}" value="${destinationId}">
                <label id=check-${type}-label-${ids} for="check-${type}-${ids}">${title}</label>
            </div>`;
}

export function getDestinationsItemCard(destinationId: string, title: string): string {
	return `<div class="destination-card" data-destination-id="${destinationId}">
                <span class="destination-card-name">${title}</span>
            </div>`;
}

function loadDestinationsCheckboxListeners(type, j) {
	switch (type) {
		case 'itinerary':
			loadItineraryListeners(j);
	}
}

export function getDestinationsFromCheckbox(type, j) {
	let result = [];
	for (const child of getChildIDs(`${type}-location-${j}`)) {
		const k = child.split('-')[2];
		const checkbox = getID(`check-${type}-${j}-${k}`);
		if (checkbox.checked) {
			result.push({
				title: getID(`check-${type}-label-${j}-${k}`).innerText,
				destinationId: checkbox.value,
			});
		}
	}
	return result;
}

// Card-based versions for itinerary (label-location-x)
export function getActiveDestinationsCardOptions(
	type: string,
	j: number,
	activeDestinations = ACTIVE_DESTINATIONS,
): string {
	let items: string[] = [];
	for (const dest of activeDestinations) {
		items.push(getDestinationsItemCard(dest.destinationId, dest.title));
	}
	return items.join('');
}

export function getDestinationsFromCards(type: string, j: number) {
	let result: { title: string; destinationId: string }[] = [];
	const container = getID(`${type}-location-${j}`);
	if (!container) return result;
	for (const card of container.querySelectorAll('.destination-card.selected')) {
		const title = card.querySelector('.destination-card-name')?.textContent?.trim() || '';
		const destinationId = card.getAttribute('data-destination-id') || '';
		result.push({ title, destinationId });
	}
	return result;
}

export function addValuesForActiveDestinationsCards(type: string, j: number, values: string[]) {
	const container = getID(`${type}-location-${j}`);
	if (!container) return;
	for (const card of container.querySelectorAll('.destination-card')) {
		const destinationId = card.getAttribute('data-destination-id');
		if (values.includes(destinationId)) {
			card.classList.add('selected');
			container.prepend(card);
		}
	}
}

function reorganizeDestinationsCheckbox() {
	const fieldset = document.getElementById('destinations-checkboxes');
	const cards = Array.from(fieldset.querySelectorAll('.destination-card'));

	const selected: { element: Element; label: string }[] = [];
	const unselected: { element: Element; label: string }[] = [];

	cards.forEach((card) => {
		const nameEl = card.querySelector('.destination-card-name');
		const labelText = nameEl?.textContent?.trim() || '';

		if (card.classList.contains('selected')) {
			selected.push({ element: card, label: labelText.toLowerCase() });
		} else {
			unselected.push({ element: card, label: labelText.toLowerCase() });
		}
	});

	unselected.sort((a, b) => a.label.localeCompare(b.label));

	// Selected cards stay in their clicked order (already in DOM order = click order)
	// Re-append: selected first, then unselected alphabetically
	[...selected, ...unselected].forEach((item) => {
		fieldset.appendChild(item.element);
	});
}

export { reorganizeDestinationsCheckbox };

// Other (Generic)
function getDestinationTitle(destinationId) {
	if (!destinationId) return '';
	for (const dest of DESTINATIONS) {
		if (dest.id === destinationId) {
			return dest.title;
		}
	}
}
