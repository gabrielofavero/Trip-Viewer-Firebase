import { getChildIDs, getID, getIDs, getJ } from '../../../utils/dom.js';
import { getHTMLpage } from '../../../app/main.js';

var DESTINOS = [];
var DESTINOS_DATA = {};
var DESTINOS_ATIVOS = [];

function getDestinationsArray() {
	const result = [];
	for (const destino of DESTINOS_ATIVOS) {
		const destinosID = destino.destinosID;
		result.push({ destinosID });
	}
	return result;
}

// Destinos Ativos
async function loadDestinosAtivos(firstBoot = true) {
	DESTINOS_ATIVOS = [];
	const habilidadoDestinos = getID("habilitado-destinos");
	if (habilidadoDestinos && !habilidadoDestinos.checked) return;

	let result = [];
	const checkboxes = getID("destinos-checkboxes");
	for (const checkbox of checkboxes.children) {
		const input = checkbox.querySelector("input");
		if (!input.checked) continue;

		const titulo = checkbox.querySelector("label").innerText;
		const destinosID = input.value;

		result.push({ titulo, destinosID });
	}

	DESTINOS_ATIVOS = result;
	if (firstBoot) {
		reorganizeDestinosCheckbox();
		const offsetHeight = getID("destinos-checkboxes").offsetHeight;
		getID("destinos-checkboxes").style.height = `${offsetHeight}px`;
	}
}

async function updateDestinosAtivosHTMLs() {
	await loadDestinosAtivos(false);

	if (getHTMLpage() === "editar-viagem") {
		updateDestinosAtivosCheckboxHTML("programacao");
	}
}

function getDestinosAtivosSelectOptions(destinosAtivos = DESTINOS_ATIVOS) {
	let result = `<option value="">${translate("destination.undefined")}</option>`;
	for (const destino of destinosAtivos) {
		result += `<option value="${destino.destinosID}">${destino.titulo}</option>`;
	}
	return result;
}

function getActiveDestinationsSelectVisibility() {
	return DESTINOS_ATIVOS.length > 0 ? "block" : "none";
}

// Destinos Checkbox (Para Destinos e Programação)
function updateDestinosAtivosCheckboxHTML(tipo, j) {
	const visibility = DESTINOS_ATIVOS.length > 0 ? "block" : "none";
	const values = DESTINOS_ATIVOS.map((destino) => destino.destinosID);

	function write(tipo, j) {
		const id = `${tipo}-local-${j}`;
		const childs = getChildIDs(id);
		const div = getID(id);

		getID(`${tipo}-local-box-${j}`).style.display = visibility;
		const originalValues = [];

		for (const child of childs) {
			const k = child.split("-")[2];
			const checkbox = getID(`check-${tipo}-${j}-${k}`);
			if (values.includes(checkbox.value) && checkbox.checked) {
				originalValues.push(checkbox.value);
			}
		}

		div.innerHTML = getActiveDestinationsCheckboxOptions(tipo, j);

		if (originalValues.length > 0) {
			for (const child of childs) {
				const k = child.split("-")[2];
				const checkbox = getID(`check-${tipo}-${j}-${k}`);
				if (checkbox && originalValues.includes(checkbox.value)) {
					checkbox.checked = true;
				}
			}
		}
		loadDestinosCheckboxListeners(tipo, j);
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

function getActiveDestinationsCheckboxOptions(
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

function addValuesForDestinosAtivosCheckbox(tipo, j, values) {
	const fieldsetID = `${tipo}-local-${j}`;
	for (const containerID of getChildIDs(fieldsetID)) {
		const ids = getIDs(containerID);
		const checkbox = getID(`check-${tipo}-${ids}`);
		if (values.includes(checkbox.value)) {
			checkbox.checked = true;
		}
	}
}

function getDestinationsItemCheckbox(j, destinosID, titulo, tipo = "destinos", k) {
	if (!j) {
		console.error("Error in _getDestinationsItemCheckbox: j is undefined or null.");
	}
	const ids = k ? `${j}-${k}` : j;
	return `<div class="nice-form-group" id="checkbox-${ids}">
                <input type="checkbox" id="check-${tipo}-${ids}" value="${destinosID}">
                <label id=check-${tipo}-label-${ids} for="check-${tipo}-${ids}">${titulo}</label>
            </div>`;
}

function loadDestinosCheckboxListeners(tipo, j) {
	switch (tipo) {
		case "programacao":
			loadItineraryListeners(j);
	}
}

function getDestinosFromCheckbox(tipo, j) {
	result = [];
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

function reorganizeDestinosCheckbox() {
	const fieldset = document.getElementById("destinos-checkboxes");
	const checkboxes = Array.from(fieldset.querySelectorAll(".nice-form-group"));

	const ativos = [];
	const inativos = [];

	checkboxes.forEach((group) => {
		const input = group.querySelector('input[type="checkbox"]');
		const label = group.querySelector("label");
		const labelText = label.textContent.trim();

		const data = {
			element: group,
			label: labelText.toLowerCase(),
		};

		if (input.checked) {
			ativos.push(data);
		} else {
			inativos.push(data);
		}
	});

	ativos.sort((a, b) => a.label.localeCompare(b.label));
	inativos.sort((a, b) => a.label.localeCompare(b.label));

	[...ativos, ...inativos].forEach((item) => {
		fieldset.appendChild(item.element);
	});
}

// Outros (Genérico)
function getDestinoTitle(destinoID) {
	if (!destinoID) return "";
	for (const destino of DESTINOS) {
		if (destino.id === destinoID) {
			return destino.titulo;
		}
	}
}
