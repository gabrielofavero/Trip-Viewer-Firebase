// ======= Travelers =======
// Traveler functions moved to models/traveler.model.js — imported here for backward compat

import { cloneObject, getID, getReadableArray, import { cloneObject } from '../../../utils/dom.js';;
import { translate } from '../../../i18n/translation.js';
import { closeMessage, displayFullMessage, getContainersInput } from '../../../utils/messages.js';
import { getNewTravelerID } from '../../../models/traveler.model.js';
	getNewTravelerID,
	validateTravelersObject,
	hasDuplicateTravelerNames,
} from '../../../models/traveler.model.js';

var TRAVELERS = [];
const INCLUDE_LATE_TRAVELERS = false; // Flag to include late travelers in the fieldset
let TRAVELER_SELECT_OPTIONS = "";



function openTravelersInfo() {
	const propriedades = cloneObject(MESSAGE_PROPERTIES);
	propriedades.titulo = translate("trip.travelers.info");
	propriedades.containers = getContainersInput();
	propriedades.conteudo = getTravelersInfoContent();
	propriedades.botoes = [
		{
			tipo: "cancelar",
		},
		{
			tipo: "confirmar",
			acao: `saveTravelersInfo()`,
		},
	];

	displayFullMessage(propriedades);
	getID("quantidadePessoas").addEventListener("change", function () {
		getID("travelers-names-container").innerHTML = getTravelersNameContent();
	});
}

function getTravelersInfoContent() {
	return `
    <div class="nice-form-group">
        <label>${translate("trip.travelers.quantity")}</label>
        <input required class="flex-input" id="quantidadePessoas" type="number" placeholder="0" min="1" max="10" value="${TRAVELERS.length || 1}" />
    </div>
    <div id="travelers-names-container">
        ${getTravelersNameContent()}
    </div>
    <div class="nice-form-group" id="travelers-names-unique" style="display: none">
        <span class="red">${translate("trip.travelers.unique")}</span>
    </div>

    `;
}

function getTravelersNameContent() {
	const properties = [];
	const nameLabel = translate("labels.name");
	const quantidadePessoas = getID("quantidadePessoas");
	const quantity = quantidadePessoas
		? parseInt(quantidadePessoas.value) || 1
		: TRAVELERS.length || 1;

	for (let j = 1; j <= quantity; j++) {
		const traveler = TRAVELERS[j - 1];
		const id =
			getID(`traveler-id-${j}`)?.value || traveler?.id || getNewTravelerID();
		const name = getID(`traveler-name-${j}`)?.value || traveler?.nome || "";

		properties.push(`
            <div class="nice-form-group">
                <label>${nameLabel} ${j}</label>
                <input id="traveler-id-${j}" type="text" value="${id}" style="display: none" disabled>
                <input id="traveler-name-${j}" type="text" maxlength="10" placeholder="${nameLabel}" ${name ? `value="${name}"` : ""}>
            </div>
        `);
	}

	return properties.join("");
}

function saveTravelersInfo() {
	let j = 1;
	const travelers = [];
	while (getID(`traveler-name-${j}`)) {
		travelers.push({
			id: getID(`traveler-id-${j}`).value,
			nome: getID(`traveler-name-${j}`).value.trim(),
		});
		j++;
	}

	const nomes = travelers.map((t) => t.nome);
	const hasRepetitions = nomes.some((nome, index) => {
		return nomes.indexOf(nome) !== index && nome !== "";
	});

	if (hasRepetitions) {
		getID("travelers-names-unique").style.display = "block";
		return;
	}

	TRAVELERS = travelers;
	closeMessage();
	updateTravelersButtonLabel();
	if (DOCUMENT_ID) {
		loadItineraryData();
	}
}

function getTravelersFieldset(id) {
	const result = document.createElement("div");
	result.className = "nice-form-group";

	if (id) {
		result.id = id;
	}

	const mandatory = document.createElement("span");
	mandatory.id = `${id}-mandatory`;
	mandatory.className = "red";
	mandatory.textContent = `(${translate("messages.select_one")})`;
	mandatory.style.display = "none";

	const titleLabel = document.createElement("label");
	titleLabel.appendChild(
		document.createTextNode(translate("trip.travelers.title") + " "),
	);
	titleLabel.appendChild(mandatory);
	result.appendChild(titleLabel);

	const fieldset = document.createElement("fieldset");
	fieldset.className = "double-fieldset";
	let travelers = 0;

	for (let j = 1; j <= TRAVELERS.length; j++) {
		const traveler = TRAVELERS[j - 1];

		if (!traveler.nome) {
			continue; // Skip if no name is provided
		}

		const div = document.createElement("div");
		div.id = `checkbox-${j}`;
		div.className = "nice-form-group";
		div.style.marginTop = "0px";

		const input = document.createElement("input");
		input.type = "checkbox";
		input.id = `${id}-${j}`;
		input.value = traveler.id;
		input.checked = true;

		const label = document.createElement("label");
		label.id = `${id}-label-${j}`;
		label.className = "checkbox-label";
		label.setAttribute("for", input.id);
		label.textContent = traveler.nome;

		div.appendChild(input);
		div.appendChild(label);
		fieldset.appendChild(div);
		travelers++;
	}

	result.appendChild(fieldset);

	return travelers > 1 ? result.outerHTML : "";
}

function enableAllTravelersFieldset(id) {
	const checkedData = [];
	for (const traveler of TRAVELERS) {
		checkedData.push({ id: traveler.id, nome: traveler.nome, isPresent: true });
	}
	updateTravelersFieldset(id, checkedData);
}

function updateTravelersFieldset(id, checkedData = []) {
	let j = 1;
	while (getID(`${id}-${j}`)) {
		const checkbox = getID(`${id}-${j}`);
		const value = checkbox.value;
		const traveler = checkedData.find((t) => t.id === value);

		checkbox.checked =
			traveler?.isPresent === undefined
				? INCLUDE_LATE_TRAVELERS
				: traveler.isPresent;
		j++;
	}
}

function getCheckedTravelersIDs(containerID) {
	const container = getID(containerID);
	if (!container) {
		return [];
	}
	const result = [];
	const fieldset = container.querySelector("fieldset");

	for (const checkBoxContainer of fieldset.children) {
		const label = checkBoxContainer.querySelector("label");
		const checkbox = checkBoxContainer.querySelector("input");
		result.push({
			id: checkbox.value,
			nome: label.innerText,
			isPresent: checkbox.checked,
		});
	}

	const missingNames = TRAVELERS.filter(
		(t) => !result.some((r) => r.nome === t.nome),
	);
	for (const missing of missingNames) {
		result.push({
			id: missing.id,
			nome: missing.nome,
			isPresent: INCLUDE_LATE_TRAVELERS,
		});
	}

	return result;
}

function validateTravelersFieldset(id) {
	const mandatory = getID(`${id}-mandatory`);
	if (!mandatory) {
		return true;
	}
	let isValid = false;
	let j = 1;
	while (getID(`${id}-${j}`)) {
		const checkbox = getID(`${id}-${j}`);
		if (checkbox.checked) {
			isValid = true;
			break;
		}
		j++;
	}
	if (!isValid) {
		mandatory.style.display = "inline";
	}

	return isValid;
}

function updateTravelersButtonLabel() {
	const el = getID("travelers-info");

	if (TRAVELERS.length === 0) {
		el.textContent = translate("trip.travelers.add");
		return;
	}

	const names = TRAVELERS.map((t) => t.nome).filter((n) => n);
	el.textContent = getReadableArray(names);
}

function getTravelersSelectOptionsHTML() {
	if (!TRAVELER_SELECT_OPTIONS) {
		for (const traveler of TRAVELERS) {
			if (!traveler.nome) {
				continue;
			}
			TRAVELER_SELECT_OPTIONS += `<option value="${traveler.id}">${traveler.nome}</option>`;
		}
	}
	return TRAVELER_SELECT_OPTIONS;
}

function getTravelerName(id) {
	const traveler = TRAVELERS.find((t) => t.id === id);
	return traveler ? traveler.nome : "";
}

function getTravelersObject() {
	const result = {};
	for (const traveler of TRAVELERS) {
		result[traveler.id] = traveler.nome;
	}
	return result;
}
