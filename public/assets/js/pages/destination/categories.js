// ======= Destination Categories =======
// Destination formatting functions moved to models/destination.js — imported here for backward compat

import {
	_getNotaTranslation,
	_getValorValue,
	_convertCustomValor,
	_getDescricaoValue,
} from '../../models/destination.js';
import { getDestinos } from '../../core/config.js';

// BACKWARD COMPAT: attach to window during migration
window._getNotaTranslation = _getNotaTranslation;
window._getValorValue = _getValorValue;
window._convertCustomValor = _convertCustomValor;
window._getDescricaoValue = _getDescricaoValue;

// Active Category
function _loadActiveCategory(urlParams) {
	let type = urlParams["type"];
	const destinos = getDestinos();
	const originals = destinos.original;

	if (!type || !originals[type]) {
		type = _getFirstCategory();
	}

	ACTIVE_CATEGORY = originals[type];

	function _getFirstCategory() {
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

function _updateActiveCategory(category) {
	const urlParam = _getURLParam("type");
	const translations = getDestinos().translation;
	const param = translations[category];

	if (urlParam === param) {
		return;
	}

	ACTIVE_CATEGORY = category;
	_setURLParam("type", param);
}

// Nota
function _getNotaIcon(nota) {
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

function _getNotaClass(nota) {
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
function _getLinkOnClick(item, tipo) {
	if (item[tipo]) {
		return ` onclick="_openLinkInNewTab('${item[tipo]}')"`;
	} else return "";
}

// Planejado
function _getPlanejado(id) {
	const plannedItems = _getPlannedDestinations(id);
	return _getPlanejadoValue(plannedItems);

	function _getPlanejadoValue(plannedItems = []) {
		if (plannedItems.length === 0) {
			return "";
		}

		if (plannedItems.length > 1) {
			return translate("labels.planned.multiple");
		}

		const plannedItem = plannedItems[0];
		const date = _convertFromDateObject(plannedItem.data);
		const weekday = _getWeekday(date.getUTCDay());
		const day = plannedItem.data.day;
		const month = _getMonth(plannedItem.data.month - 1).toLowerCase();
		const turno = _getTurno(plannedItem.turno).toLowerCase();
		const turnoLabel = turno ? ` (${turno})` : "";
		return `${translate("labels.planned.title")}: ${weekday}, ${translate("datetime.titles.day_month", { day, month })}${turnoLabel}`;
	}
}

function _getTurno(turno) {
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
