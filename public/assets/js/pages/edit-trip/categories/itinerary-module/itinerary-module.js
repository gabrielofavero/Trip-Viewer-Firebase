import { convertFromDateObject, convertToDateObject, dateObjectToKey, getDateTitle, jsDateToKey } from '../../../../utils/dates.js';
import { getAndDestinationTitle, getChildIDs, getID, getIDs, getReadableArray } from '../../../../utils/dom.js';
import { addValueToSelectIfExists, getAllValuesFromSelect } from '../../../../ui/fields.js';
import { initializeSortableForGroup } from '../../../../ui/sortable.js';
import { translate } from '../../../../i18n/translation.js';
import { addValuesForDestinosAtivosCheckbox, getDestinosFromCheckbox, DESTINOS_ATIVOS } from '../destination.js';
import { DESTINOS } from '../../edit-trip.js';
import { INNER_PROGRAMACAO, afterDragInnerItinerary, loadInnerItineraryHTML } from "../itinerary-module/inner-itinerary/inner-itinerary.js";
import { loadItinerarySchedule } from "../../../trip-detail/categories/itinerary-module/itinerary-module.js";
import { updateDestinosAtivosCheckboxHTML } from "../destination.js";
import { DATAS } from "../../new-trip.js";

export var FIRESTORE_PROGRAMACAO_DATA = {};
export function setProgramacaoData(val) { FIRESTORE_PROGRAMACAO_DATA = val; }

export function getItineraryArray() {
	let result = [];

	for (let j = 1; j <= DATAS.length; j++) {
		const innerResult = {
			data: convertToDateObject(DATAS[j - 1]),
			destinosIDs: [],
			titulo: {
				valor: "",
				traduzir: false,
				destinos: false,
			},
			madrugada: [],
			manha: [],
			tarde: [],
			noite: [],
		};

		innerResult.destinosIDs = getDestinosFromCheckbox("programacao", j);

		const tituloSelectValue = getID(
			`programacao-inner-title-select-${j}`,
		).value;
		if (tituloSelectValue == "outro") {
			innerResult.titulo.valor = getID(`programacao-inner-title-${j}`).value;
		} else {
			innerResult.titulo.valor = tituloSelectValue;
		}

		innerResult.titulo.traduzir = [
			"departure",
			"return",
			"during",
			"departure_and_destinations",
			"return_and_destinations",
		].includes(tituloSelectValue);

		innerResult.titulo.destinos =
			[
				"departure_and_destinations",
				"return_and_destinations",
				"all_destinations",
			].includes(tituloSelectValue) ||
			DESTINOS.map((d) => d.id).includes(tituloSelectValue);

		if (
			DATAS[j - 1] &&
			DATAS[j - 1] &&
			INNER_PROGRAMACAO[jsDateToKey(DATAS[j - 1])]
		) {
			const turnos = INNER_PROGRAMACAO[jsDateToKey(DATAS[j - 1])];
			innerResult.madrugada = turnos.madrugada;
			innerResult.manha = turnos.manha;
			innerResult.tarde = turnos.tarde;
			innerResult.noite = turnos.noite;
		}
		result.push(innerResult);
	}

	return result;
}

export function applyLoadedItineraryData(j, dados) {
	const jsDate = convertFromDateObject(dados.data);

	const destinosIDsObject = dados.destinosIDs;
	let destinosIDs = [];
	if (destinosIDsObject && destinosIDsObject.length > 0) {
		destinosIDs = destinosIDsObject.map((destino) => destino.destinosID);
		addValuesForDestinosAtivosCheckbox("programacao", j, destinosIDs);
	}

	getID(`programacao-inner-title-select-${j}`).innerHTML =
		getItineraryTitleSelectOptions(j);

	let titulo = dados.titulo?.valor ?? dados.titulo;
	if (titulo) {
		const selectValues = getAllValuesFromSelect(
			getID(`programacao-inner-title-select-${j}`),
		);
		if (destinosIDs && destinosIDs.includes(titulo)) {
			getID(`programacao-inner-title-${j}`).style.display = "none";
		} else if (
			titulo.toLowerCase() == "outro" ||
			!selectValues.includes(titulo)
		) {
			getID(`programacao-inner-title-select-${j}`).value = "outro";
			getID(`programacao-inner-title-${j}`).style.display = "block";
			getID(`programacao-inner-title-${j}`).value = titulo;
		} else {
			getID(`programacao-inner-title-select-${j}`).value = titulo;
			getID(`programacao-inner-title-${j}`).style.display = "none";
		}
	}

	INNER_PROGRAMACAO[jsDateToKey(jsDate)] = {
		madrugada: dados.madrugada || [],
		manha: dados.manha || [],
		tarde: dados.tarde || [],
		noite: dados.noite || [],
	};

	updateItineraryTitle(j);
	loadInnerItineraryHTML(j);
	initializeSortableForGroup(`programacao-${j}`, {
		onEnd: afterDragInnerItinerary,
	});
}

export function updateItineraryTitle(j) {
	const div = getID(`programacao-title-${j}`);
	const tituloInput = getID(`programacao-inner-title-${j}`);
	const tituloSelect = getID(`programacao-inner-title-select-${j}`);
	let titulo;
	let value;

	value = tituloSelect.value;
	switch (value) {
		case "":
			titulo = "";
			break;
		case "outro":
			titulo = tituloInput.value;
			tituloInput.style.display = "block";
			value = tituloInput.value;
			break;
		case "departure":
		case "return":
		case "during":
			titulo = translate(`trip.transportation.${tituloSelect.value}`);
			tituloInput.style.display = "none";
			break;
		default:
			titulo = getDestinationItineraryTitle(value, j);
			tituloInput.style.display = "none";
	}

	const data = DATAS[j - 1];
	const dataFormatada = getDateTitle(data, "weekday_day_month");
	div.innerText = getItineraryTitle(dataFormatada, titulo);
}

function getDestinationItineraryTitle(value, j) {
	const activeDestinations = getActiveDestinations(j);
	const destinosTitulos = activeDestinations.map((destino) => destino.label);
	const destinosIDs = activeDestinations.map((destino) => destino.value);

	if (value === "all_destinations") {
		return getReadableArray(destinosTitulos);
	}

	if (value.includes("_and_destinations")) {
		return getAndDestinationTitle(value, destinosTitulos);
	}

	if (destinosIDs.includes(value)) {
		const index = destinosIDs.indexOf(value);
		return destinosTitulos[index];
	}

	return "";
}

function getActiveDestinations(j) {
	const result = [];
	const fieldSet = getID(`programacao-local-${j}`);
	if (!fieldSet) return result;
	const children = fieldSet.children;
	for (const checkbox of children) {
		const input = checkbox.querySelector('input[type="checkbox"]');
		const label = checkbox.querySelector("label");
		if (input.checked) {
			result.push({ label: label.innerText, value: input.value });
		}
	}
	return result;
}

export function getItineraryTitleSelectOptions(j = null) {
	const semTitulo = `<option value="">${translate("labels.no_title")}</option>`;
	let destino = "";
	let idaVoltaDestino = "";

	if (j) {
		let labels = [];
		let values = [];

		for (const child of getChildIDs(`programacao-local-${j}`)) {
			const ids = getIDs(child);
			const checkbox = getID(`check-programacao-${ids}`);
			if (checkbox.checked) {
				labels.push(getID(`check-programacao-label-${ids}`).innerText);
				values.push(checkbox.value);
			}
		}

		if (values.length > 0 && DESTINOS_ATIVOS.length > 0) {
			for (let i = 0; i < values.length; i++) {
				destino += `<option value="${values[i]}">${labels[i]}</option>`;
			}
			if (labels.length > 1) {
				const text = getReadableArray(labels);
				destino += `<option value="all_destinations">${text}</option>`;
			}
			const idaArray = [translate("trip.transportation.departure"), ...labels];
			const idaText = getReadableArray(idaArray);
			idaVoltaDestino += `<option value="departure_and_destinations">${idaText}</option>`;

			const voltaArray = [...labels, translate("trip.transportation.return")];
			const voltaText = getReadableArray(voltaArray);
			idaVoltaDestino += `<option value="return_and_destinations">${voltaText}</option>`;
		}
	}

	return `${destino}
            ${destino ? "" : semTitulo}
            <option value="departure">${translate("trip.transportation.departure")}</option>
            <option value="return">${translate("trip.transportation.return")}</option>
            <option value="during">${translate("trip.transportation.during")}</option>
            ${idaVoltaDestino}
            ${destino ? semTitulo : ""}
            <option value="outro">${translate("labels.other")}</option>`;
}

function updateItineraryTitleSelect(j) {
	const select = getID(`programacao-inner-title-select-${j}`);
	const value = select.value;
	select.innerHTML = getItineraryTitleSelectOptions(j);
	if (value) {
		addValueToSelectIfExists(value, select);
	}
	updateItineraryTitle(j);
}

function getItineraryTitle(dataFormatada, titulo = "") {
	if (titulo) return `${titulo}: ${dataFormatada}`;
	else return dataFormatada;
}

export function reloadItinerary() {
	if (!getID("habilitado-programacao").checked) return;
	const originalData = getItineraryArray() || [];
	const originalDataInputs = originalData.map((data) =>
		dateObjectToKey(data.data),
	);

	loadItinerarySchedule();
	let j = 1;
	for (const data of DATAS.map((data) => jsDateToKey(data))) {
		if (originalDataInputs.includes(data)) {
			const index = originalDataInputs.indexOf(data);
			const dados = originalData[index];
			applyLoadedItineraryData(j, dados);
		}
		j++;
	}
	updateDestinosAtivosCheckboxHTML("programacao");
}

// Listeners
export function loadItineraryListeners(j) {
	// Checkbox Local
	const fieldsetID = `programacao-local-${j}`;
	for (const containerID of getChildIDs(fieldsetID)) {
		const ids = getIDs(containerID);
		getID(`check-programacao-${ids}`).addEventListener("change", () =>
			updateItineraryTitleSelect(j),
		);
	}
}
