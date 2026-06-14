import { getChildIDs, getID, getIDs, getJ } from '../../../utils/dom.js';
import { getHTMLpage } from '../../../app/main.js';
import { translate } from "../../../i18n/translation.js";
import { loadItineraryListeners } from "./itinerary-module/itinerary-module.js";

var DESTINOS = [];
export var DESTINOS_DATA = {};
export var DESTINOS_ATIVOS = [];

export function getDestinationsArray() {
	const result = [];
	for (const destino of DESTINOS_ATIVOS) {
		const destinosID = destino.destinosID;
		result.push({ destinosID });
	}
	return result;
}

// Destinos Ativos
export async function loadDestinosAtivos(firstBoot = true) {
	DESTINOS_ATIVOS = [];
	const habilidadoDestinos = getID("destinations-enabled");
	if (habilidadoDestinos && !habilidadoDestinos.checked) return;

	let result = [];
	const container = getID("destinations-checkboxes");
	for (const card of container.children) {
		if (!card.classList.contains("selected")) continue;

		const titulo = card.querySelector(".destination-card-name")?.textContent?.trim() || "";
		const destinosID = card.getAttribute("data-destino-id") || "";

		result.push({ titulo, destinosID });
	}

	DESTINOS_ATIVOS = result;
}

export async function updateDestinosAtivosHTMLs() {
	await loadDestinosAtivos(false);

	if (getHTMLpage() === "editar-viagem") {
		updateDestinosAtivosCardsHTML("programacao");
	}
}

function getDestinosAtivosSelectOptions(destinosAtivos = DESTINOS_ATIVOS) {
	let result = `<option value="">${translate("destination.undefined")}</option>`;
	for (const destino of destinosAtivos) {
		result += `<option value="${destino.destinosID}">${destino.title}</option>`;
	}
	return result;
}

export function getActiveDestinationsSelectVisibility() {
	return DESTINOS_ATIVOS.length > 0 ? "block" : "none";
}

// Destination Cards for Itinerary
export function updateDestinosAtivosCardsHTML(tipo, j?) {
	const visibility = DESTINOS_ATIVOS.length > 0 ? "block" : "none";
	const values = DESTINOS_ATIVOS.map((destino) => destino.destinosID);

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
			const destinosID = card.getAttribute("data-destino-id");
			if (selectedValues.includes(destinosID)) {
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
	destinosAtivos = DESTINOS_ATIVOS,
) {
	let items = [];
	for (let k = 1; k <= destinosAtivos.length; k++) {
		const destino = destinosAtivos[k - 1];
		items.push(
			getDestinationsItemCheckbox(j, destino.destinosID, destino.titulo, tipo, k),
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

export function getDestinationsItemCheckbox(j, destinosID, titulo, tipo = "destinos", k?) {
	if (!j) {
		console.error("Error in _getDestinationsItemCheckbox: j is undefined or null.");
	}
	const ids = k ? `${j}-${k}` : j;
	return `<div class="nice-form-group" id="checkbox-${ids}">
                <input type="checkbox" id="check-${tipo}-${ids}" value="${destinosID}">
                <label id=check-${tipo}-label-${ids} for="check-${tipo}-${ids}">${titulo}</label>
            </div>`;
}

export function getDestinationsItemCard(destinosID: string, titulo: string): string {
	return `<div class="destino-card" data-destino-id="${destinosID}">
                <span class="destino-card-name">${titulo}</span>
            </div>`;
}

function loadDestinosCheckboxListeners(tipo, j) {
	switch (tipo) {
		case "programacao":
			loadItineraryListeners(j);
	}
}

export function getDestinosFromCheckbox(tipo, j) {
	let result = [];
	for (const child of getChildIDs(`${tipo}-local-${j}`)) {
		const k = child.split("-")[2];
		const checkbox = getID(`check-${tipo}-${j}-${k}`);
		if (checkbox.checked) {
			result.push({
				titulo: getID(`check-${tipo}-label-${j}-${k}`).innerText,
				destinosID: checkbox.value,
			});
		}
	}
	return result;
}

// Card-based versions for itinerary (programacao-local-x)
export function getActiveDestinationsCardOptions(
	tipo: string,
	j: number,
	destinosAtivos = DESTINOS_ATIVOS,
): string {
	let items: string[] = [];
	for (const destino of destinosAtivos) {
		items.push(getDestinationsItemCard(destino.destinosID, destino.titulo));
	}
	return items.join("");
}

export function getDestinosFromCards(tipo: string, j: number) {
	let result: { titulo: string; destinosID: string }[] = [];
	const container = getID(`${tipo}-local-${j}`);
	if (!container) return result;
	for (const card of container.querySelectorAll(".destination-card.selected")) {
		const titulo = card.querySelector(".destination-card-name")?.textContent?.trim() || "";
		const destinosID = card.getAttribute("data-destino-id") || "";
		result.push({ titulo, destinosID });
	}
	return result;
}

export function addValuesForDestinosAtivosCards(tipo: string, j: number, values: string[]) {
	const container = getID(`${tipo}-local-${j}`);
	if (!container) return;
	for (const card of container.querySelectorAll(".destination-card")) {
		const destinosID = card.getAttribute("data-destino-id");
		if (values.includes(destinosID)) {
			card.classList.add("selected");
			container.prepend(card);
		}
	}
}

function reorganizeDestinosCheckbox() {
	const fieldset = document.getElementById("destinations-checkboxes");
	const cards = Array.from(fieldset.querySelectorAll(".destination-card"));

	const selecionados: { element: Element; label: string }[] = [];
	const naoSelecionados: { element: Element; label: string }[] = [];

	cards.forEach((card) => {
		const nameEl = card.querySelector(".destination-card-name");
		const labelText = nameEl?.textContent?.trim() || "";

		if (card.classList.contains("selected")) {
			selecionados.push({ element: card, label: labelText.toLowerCase() });
		} else {
			naoSelecionados.push({ element: card, label: labelText.toLowerCase() });
		}
	});

	naoSelecionados.sort((a, b) => a.label.localeCompare(b.label));

	// Selected cards stay in their clicked order (already in DOM order = click order)
	// Re-append: selected first, then unselected alphabetically
	[...selecionados, ...naoSelecionados].forEach((item) => {
		fieldset.appendChild(item.element);
	});
}

export { reorganizeDestinosCheckbox };

// Other (Generic)
function getDestinoTitle(destinoID) {
	if (!destinoID) return "";
	for (const destino of DESTINOS) {
		if (destino.id === destinoID) {
			return destino.titulo;
		}
	}
}
