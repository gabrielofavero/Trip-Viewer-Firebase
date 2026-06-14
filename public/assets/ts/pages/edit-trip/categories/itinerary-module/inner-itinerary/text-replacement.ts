import { findJFromID, getID } from '../../../../../utils/dom.js';
import { translate } from '../../../../../i18n/translation.js';
import { getSelectCurrentLabel } from '../../../../../ui/fields.js';
import { inputDateToKey, jsDateToInputDate } from '../../../../../utils/dates.js';
import { DATAS } from "../../../new-trip.js";
import { INNER_ITINERARY } from "./inner-itinerary.js";
import { getTurno } from "../../../../destination/categories.js";

const TITLE_REPLACEMENT = {
	current: "",
	replacement: "",
};

const TIME_REPLACEMENT = {
	current: {
		start: "",
		end: "",
	},
	replacement: {
		start: "",
		end: "",
	},
};

export const TEXT_REPLACEMENT = { applied: false };

export function loadTextReplacementCheckboxes(j) {
	loadTitleReplacementCheckbox(j);
	loadTimeReplacementCheckbox();
}

function loadTitleReplacementCheckbox(j) {
	const container = getID("title-replacement-container");
	TITLE_REPLACEMENT.current = getID("inner-itinerary").value;
	TITLE_REPLACEMENT.replacement = getTitleReplacement(j);

	if (
		TITLE_REPLACEMENT.replacement &&
		TITLE_REPLACEMENT.replacement !== TITLE_REPLACEMENT.current
	) {
		container.style.display = "block";
		if (TITLE_REPLACEMENT.current) {
			const replacements = {
				old: TITLE_REPLACEMENT.current,
				new: TITLE_REPLACEMENT.replacement,
			};
			getID("title-replacement-label").innerText = translate(
				"trip.itinerary.replace_title",
				replacements,
			);
		} else {
			getID("title-replacement-label").innerText = translate(
				"trip.itinerary.set_title",
				{ title: TITLE_REPLACEMENT.replacement },
			);
			getID("title-replacement-checkbox").checked = true;
		}
	} else {
		container.style.display = "none";
	}
}

function getTitleReplacement(j) {
	const selected = Array.from(
		document.getElementsByName("inner-itinerary-item-radio"),
	).find((r) => (r as HTMLInputElement).checked);

	if (!selected?.id) return "";

	const idToSelectMap = {
		"inner-itinerary-item-transporte-radio":
			"inner-itinerary-select-transporte",
		"inner-itinerary-item-hospedagens-radio":
			"inner-itinerary-select-hospedagens",
		"inner-itinerary-item-destinos-radio": "inner-itinerary-select-passeio",
	};

	const select = getID(idToSelectMap[selected.id]);
	const labelValue = select?.value && getSelectCurrentLabel(select);

	if (!labelValue) return "";

	return selected.id.includes("accommodations")
		? processAccomodationReplacement(labelValue, j)
		: labelValue;
}

export function replaceTextIfEnabled() {
	const checkbox = getID("title-replacement-checkbox");
	if (checkbox.checked && TITLE_REPLACEMENT.replacement) {
		getID("inner-itinerary").value = TITLE_REPLACEMENT.replacement;
	}
	TITLE_REPLACEMENT.current = "";
	TITLE_REPLACEMENT.replacement = "";
	getID("title-replacement-checkbox").checked = false;
	getID("title-replacement-container").style.display = "none";
}

function loadTimeReplacementCheckbox() {
	TIME_REPLACEMENT.current.start = getID("inner-itinerary-start").value;
	TIME_REPLACEMENT.current.end = getID("inner-itinerary-end").value;
	const value = getID("inner-itinerary-select-transportation").value;

	if (getID("inner-itinerary-item-transportation-radio").checked && value) {
		const j = findJFromID(value, "transportation");

		TIME_REPLACEMENT.replacement.start = getID(`partida-horario-${j}`).value;
		TIME_REPLACEMENT.replacement.end = getID(`chegada-horario-${j}`).value;

		if (
			TIME_REPLACEMENT.current.start != TIME_REPLACEMENT.replacement.start ||
			TIME_REPLACEMENT.current.end != TIME_REPLACEMENT.replacement.end
		) {
			getID("time-replacement-container").style.display = "block";

			let action;

			if (
				TIME_REPLACEMENT.current.start !=
					TIME_REPLACEMENT.replacement.start &&
				TIME_REPLACEMENT.current.end != TIME_REPLACEMENT.replacement.end
			) {
				action =
					!TIME_REPLACEMENT.current.start && !TIME_REPLACEMENT.current.end
						? translate("labels.set")
						: translate("labels.replace");
				getID("time-replacement-label").innerText =
				`${action} start and end time to "${TIME_REPLACEMENT.replacement.start}" and "${TIME_REPLACEMENT.replacement.end}"`;
			} else if (
				TIME_REPLACEMENT.current.start != TIME_REPLACEMENT.replacement.start
			) {
				action = !TIME_REPLACEMENT.current.start
					? translate("labels.set")
					: translate("labels.replace");
				getID("time-replacement-label").innerText =
				`${action} start time to "${TIME_REPLACEMENT.replacement.start}"`;
			} else {
				action = !TIME_REPLACEMENT.current.end
					? translate("labels.set")
					: translate("labels.replace");
				getID("time-replacement-label").innerText =
				`${action} end time to "${TIME_REPLACEMENT.replacement.end}"`;
			}

			if (action === translate("labels.set")) {
				getID("time-replacement-checkbox").checked = true;
			}
		}
	} else {
		getID("time-replacement-container").style.display = "none";
	}
}

export function replaceTimeIfEnabled() {
	if (getID("time-replacement-checkbox").checked) {
		getID("inner-itinerary-start").value =
			TIME_REPLACEMENT.replacement.start;
		getID("inner-itinerary-end").value = TIME_REPLACEMENT.replacement.end;

		if (TIME_REPLACEMENT.replacement.start) {
			const startHour = parseInt(
				TIME_REPLACEMENT.replacement.start.split(":")[0],
			);
			getID("inner-itinerary-select-period").value = getTurno(startHour);
		}
	}
	TIME_REPLACEMENT.current.start = "";
	TIME_REPLACEMENT.current.end = "";
	TIME_REPLACEMENT.replacement.start = "";
	TIME_REPLACEMENT.replacement.end = "";
	getID("time-replacement-checkbox").checked = false;
	getID("time-replacement-container").style.display = "none";
}

function processAccomodationReplacement(labelValue, itineraryJ) {
	const date = DATAS[itineraryJ - 1];
	const inputDate = jsDateToInputDate(date);
	const value = getID("inner-itinerary-select-accommodations").value;
	if (!inputDate || !value) return labelValue;

	const j = findJFromID(value, "accommodations");
	const checkInValue = getID(`check-in-${j}`).value;
	const checkOutValue = getID(`check-out-${j}`).value;

	const isCheckIn = inputDate === checkInValue;
	const isCheckOut = inputDate === checkOutValue;

	if (!isCheckIn && !isCheckOut) return labelValue;

	const labelKey = isCheckIn
		? "trip.accommodation.checkin"
		: "trip.accommodation.checkout";
	const treatedLabel = `${translate(labelKey)}: ${labelValue}`;

	const itineraries = INNER_ITINERARY[inputDateToKey(inputDate)];
	const allEntries = Object.values(itineraries).flat();
	const hasTreatedLabel = allEntries.some(
		(entry: any) => entry.programacao === treatedLabel,
	);
	const alreadyIncluded = allEntries.some((entry: any) =>
		entry.programacao.includes(labelValue),
	);
	const labelKeyMentioned = allEntries.some((entry: any) =>
		entry.programacao.includes(labelKey),
	);

	return hasTreatedLabel || alreadyIncluded || labelKeyMentioned
		? labelValue
		: treatedLabel;
}
