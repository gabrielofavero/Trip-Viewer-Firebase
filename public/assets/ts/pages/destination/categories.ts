// ======= Destination Categories =======
// Destination formatting functions moved to models/destination.model.js — imported here for backward compat

import {
	getNotaTranslation,
	getValorValue,
	convertCustomValor,
	getDescricaoValue,
} from '../../models/destination.model.js';
import { getDestinos } from '../../app/config.js';
import { translate } from '../../i18n/translation.js';
import { getURLParam, setURLParam } from '../../utils/dom.js';
import { convertFromDateObject, getMonth, getWeekday } from '../../utils/dates.js';
import { getPlannedDestinations } from "./support/trip.js";
import { FIRESTORE_DESTINOS_DATA } from '../../data/state.js';



// Active Category
export function loadActiveCategory(urlParams) {
	let type = urlParams["type"];
	const destinos = getDestinos();
	const originals = destinos.original;

	if (!type || !originals[type]) {
		type = getFirstCategory();
	}

	ACTIVE_CATEGORY = originals[type];

	function getFirstCategory() {
		const destinos = getDestinos();
		const types = destinos.categorias.ids;
		const translations = destinos.translation;
		const destinoIDs = Object.keys(FIRESTORE_DESTINOS_DATA);
		for (const type of types) {
			value = translations[type];
			if (destinoIDs.includes(type) && value) {
				return value;
			}
		}
		throw translate("messages.errors.missing_data");
	}
}

export function updateActiveCategory(category) {
	const urlParam = getURLParam("type");
	const translations = getDestinos().translation;
	const param = translations[category];

	if (urlParam === param) {
		return;
	}

	ACTIVE_CATEGORY = category;
	setURLParam("type", param);
}

// Nota
export function getNotaIcon(nota) {
	switch (nota) {
		case "5":
			return "ph:number-five-bold";
		case "4":
			return "ph:number-four-bold";
		case "3":
			return "ph:number-three-bold";
		case "2":
			return "ph:number-two-bold";
		case "1":
			return "ph:number-one-bold";
		default:
			return "ic:outline-question-mark";
	}
}

export function getNotaClass(nota) {
	switch (nota) {
		case "5":
		case "4":
		case "3":
		case "2":
		case "1":
			return `nota-${nota}`;
		default:
			return "nota-ausente";
	}
}

// Links
export function getLinkOnClick(item, tipo) {
	if (item[tipo]) {
		return ` data-action="open-link" data-url="${item[tipo]}"`;
	} else return "";
}

// Planejado
export function getPlanejado(id) {
	const plannedItems = getPlannedDestinations(id);
	return getPlanejadoValue(plannedItems);

	function getPlanejadoValue(plannedItems = []) {
		if (plannedItems.length === 0) {
			return "";
		}

		if (plannedItems.length > 1) {
			return translate("labels.planned.multiple");
		}

		const plannedItem = plannedItems[0];
		const date = convertFromDateObject(plannedItem.data);
		const weekday = getWeekday(date.getUTCDay());
		const day = plannedItem.data.day;
		const month = getMonth(plannedItem.data.month - 1).toLowerCase();
		const turno = getTurno(plannedItem.turno).toLowerCase();
		const turnoLabel = turno ? ` (${turno})` : "";
		return `${translate("labels.planned.title")}: ${weekday}, ${translate("datetime.titles.day_month", { day, month })}${turnoLabel}`;
	}
}

export function getTurno(turno) {
	switch (turno) {
		case "madrugada":
			return translate("datetime.time_of_day.early_hours");
		case "manha":
			return translate("datetime.time_of_day.morning");
		case "tarde":
			return translate("datetime.time_of_day.afternoon");
		case "noite":
			return translate("datetime.time_of_day.evening");
		default:
			return undefined;
	}
}
