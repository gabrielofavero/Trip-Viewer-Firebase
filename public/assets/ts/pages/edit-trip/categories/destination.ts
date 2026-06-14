import { getChildIDs, getID, getIDs, getJ } from '../../../utils/dom.js';
import { getHTMLpage } from '../../../app/main.js';
import { translate } from "../../../i18n/translation.js";
import { loadItineraryListeners } from "./itinerary-module/itinerary-module.js";

var DESTINOS = [];
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
	const destinationsEnabled = getID("destinations-enabled");
	if (destinationsEnabled && !destinationsEnabled.checked) return;

	let result = [];
	const container = getID("destinations-checkboxes");
	for (const card of container.children) {
		if (!card.classList.contains("selected")) continue;

		const title = card.querySelector(".destination-card-name")?.textContent?.trim() || "";
		const destinationId = card.getAttribute("data-destino-id") || "";

		result.push({ title, destinationId });
	}

	ACTIVE_DESTINATIONS = result;
}

export async function updateActiveDestinationsHTMLs() {
	await loadActiveDestinations(false);

	if (getHTMLpage() === "editar-viagem") {
		updateActiveDestinationsCardsHTML("programacao");
	}
}

function getActiveDestinationsSelectOptions(activeDestinations = ACTIVE_DESTINATIONS) {
	let result = `<option value="">${translate("destination.undefined")}</option>`;
	for (const dest of activeDestinations) {
		result += `<option value="${dest.destinationId}">${dest.title}</option>`;
	}
	return result;
}

export function getActiveDestinationsSelectVisibility() {
	return ACTIVE_DESTINATIONS.length > 0 ? "block" : "none";
}

// Destination Cards for Itinerary
export function updateActiveDestinationsCardsHTML(tipo, j?) {
	const visibility = ACTIVE_DESTINATIONS.length > 0 ? "block" : "none";
	const values = ACTIVE_DESTINATIONS.map((dest) => dest.id);

	function write(tipo, j) {
		const container = getID(`${tipo}-local-${j}`);
		if (!container) return;

		getID(`${tipo}-local-box-${j}`).style.display = visibility;

		// Collect currently selected values before rebuild
		const selectedValues: string[] = [];
		for (const card of container.querySelectorAll(".destination-card.selected")) {
			const id = card.getAttribute("data-destino-id");
			if (id) selectedValues.push(id);
		}

		container.innerHTML = getActiveDestinationsCardOptions(tipo, j);

		// Re-select previously selected cards
		for (const card of container.querySelectorAll(".destination-card")) {
			const destinationId = card.getAttribute("data-destino-id");
			if (selectedValues.includes(destinationId)) {
				card.classList.add("selected");
				container.prepend(card);
			}
			// Add click listeners
			card.addEventListener("click", () => {
				card.classList.toggle("selected");
				if (card.classList.contains("selected")) {
					container.prepend(card);
				}
			});
		}
	}

	if (j) {
		write(tipo, j);
	} else {
		const childs = getChildIDs(`${tipo}-box`);
		for (const child of childs) {
			const innerJ = getJ(child);
			write(tipo, innerJ);
		}
	}
}

export function getActiveDestinationsCheckboxOptions(
	tipo,
	j,
	activeDestinations = ACTIVE_DESTINATIONS,
) {
	let items = [];
	for (let k = 1; k <= activeDestinations.length; k++) {
		const dest = activeDestinations[k - 1];
		items.push(
			getDestinationsItemCheckbox(j, dest.destinationId, dest.title, tipo, k),
		);
	}
	return items.join("");
}

function getDestinosAtivosCheckboxOptionWithID(checkboxOption, tipo) {
	return checkboxOption.replace(/check-destinos/g, `check-${tipo}`);
}

export function addValuesForDestinosAtivosCheckbox(tipo, j, values) {
	const fieldsetID = `${tipo}-local-${j}`;
	for (const containerID of getChildIDs(fieldsetID)) {
		const ids = getIDs(containerID);
		const checkbox = getID(`check-${tipo}-${ids}`);
		if (values.includes(checkbox.value)) {
			checkbox.checked = true;
		}
	}
}

export function getDestinationsItemCheckbox(j, destinationId, title, tipo = "destinos", k?) {
	if (!j) {
		console.error("Error in _getDestinationsItemCheckbox: j is undefined or null.");
	}
	const ids = k ? `${j}-${k}` : j;
	return `<div class="nice-form-group" id="checkbox-${ids}">
                <input type="checkbox" id="check-${tipo}-${ids}" value="${destinationId}">
                <label id=check-${tipo}-label-${ids} for="check-${tipo}-${ids}">${title}</label>
            </div>`;
}

export function getDestinationsItemCard(destinationId: string, title: string): string {
	return `<div class="destino-card" data-destino-id="${destinationId}">
                <span class="destino-card-name">${title}</span>
            </div>`;
}

function loadDestinosCheckboxListeners(tipo, j) {
	switch (tipo) {
		case "programacao":
			loadItineraryListeners(j);
	}
}

export function getDestinationsFromCheckbox(tipo, j) {
	let result = [];
	for (const child of getChildIDs(`${tipo}-local-${j}`)) {
		const k = child.split("-")[2];
		const checkbox = getID(`check-${tipo}-${j}-${k}`);
		if (checkbox.checked) {
			result.push({
				title: getID(`check-${tipo}-label-${j}-${k}`).innerText,
				destinationId: checkbox.value,
			});
		}
	}
	return result;
}

// Card-based versions for itinerary (programacao-local-x)
export function getActiveDestinationsCardOptions(
	tipo: string,
	j: number,
	activeDestinations = ACTIVE_DESTINATIONS,
): string {
	let items: string[] = [];
	for (const dest of activeDestinations) {
		items.push(getDestinationsItemCard(dest.destinationId, dest.title));
	}
	return items.join("");
}

export function getDestinationsFromCards(tipo: string, j: number) {
	let result: { title: string; destinationId: string }[] = [];
	const container = getID(`${tipo}-local-${j}`);
	if (!container) return result;
	for (const card of container.querySelectorAll(".destination-card.selected")) {
		const title = card.querySelector(".destination-card-name")?.textContent?.trim() || "";
		const destinationId = card.getAttribute("data-destino-id") || "";
		result.push({ title, destinationId });
	}
	return result;
}

export function addValuesForActiveDestinationsCards(tipo: string, j: number, values: string[]) {
	const container = getID(`${tipo}-local-${j}`);
	if (!container) return;
	for (const card of container.querySelectorAll(".destination-card")) {
		const destinationId = card.getAttribute("data-destino-id");
		if (values.includes(destinationId)) {
			card.classList.add("selected");
			container.prepend(card);
		}
	}
}

function reorganizeDestinationsCheckbox() {
	const fieldset = document.getElementById("destinations-checkboxes");
	const cards = Array.from(fieldset.querySelectorAll(".destination-card"));

	const selected: { element: Element; label: string }[] = [];
	const unselected: { element: Element; label: string }[] = [];

	cards.forEach((card) => {
		const nameEl = card.querySelector(".destination-card-name");
		const labelText = nameEl?.textContent?.trim() || "";

		if (card.classList.contains("selected")) {
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
	if (!destinationId) return "";
	for (const dest of DESTINOS) {
		if (dest.id === destinationId) {
			return dest.title;
		}
	}
}
