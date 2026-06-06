import { getID } from '../../../utils/dom.js';

var CURRENT_LIGHT;

function loadCustomizacaoImageData(value, id) {
	if (value && typeof value === "string") {
		getID(id).value = value;
	} else if (value && value.link) {
		getID(id).value = value.link;
	}
}

function imageDataIncludes(value, includes) {
	if (value && typeof value === "string") {
		return value.includes(includes);
	} else if (value && value.url) {
		return value.url.includes(includes);
	}
	return false;
}

function autoFillDarkColor() {
	const DARK_COLOR = getID("escuro");
	if (
		DARK_COLOR.value == "#7f75b6" ||
		(CURRENT_LIGHT && DARK_COLOR.value == CURRENT_LIGHT)
	) {
		DARK_COLOR.value = getID("claro").value;
	}
	CURRENT_LIGHT = getID("claro").value;
}
