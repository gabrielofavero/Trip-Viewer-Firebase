import { getID } from '../../../utils/dom.js';

export var CURRENT_LIGHT;
export function setCurrentLight(val) { CURRENT_LIGHT = val; }

export function loadCustomizationImageData(value, id) {
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

export function autoFillDarkColor() {
	const DARK_COLOR = getID("dark-color");
	if (
		DARK_COLOR.value == "#7f75b6" ||
		(CURRENT_LIGHT && DARK_COLOR.value == CURRENT_LIGHT)
	) {
		DARK_COLOR.value = getID("light-color").value;
	}
	CURRENT_LIGHT = getID("light").value;
}
