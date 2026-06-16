import { getDestinations, getItinerary } from '../../../../../app/config.js';
import { getDateTitle, jsDateToKey } from '../../../../../utils/dates.js';
import { cloneObject, getID, getInnerItineraryTitleHTML } from '../../../../../utils/dom.js';
import { closeMessage, displayFullMessage, getContainersInput, MESSAGE_PROPERTIES } from '../../../../../utils/messages.js';
import { getSelectCurrentLabel } from '../../../../../ui/fields.js';
import { translate } from '../../../../../i18n/translation.js';
import { animate } from '../../../../../theme/animations.js';
import { getDestination } from '../../../../../data/firebase/database.js';
import { ACTIVE_DESTINATIONS } from '../../destination.js';
import { DATAS } from '../../../new-trip.js';
import {DESTINOS_DATA, getDestinationsFromCards} from "../../destination.js";
import { getInnerItineraryContent } from "./content.js";
import { loadTextReplacementCheckboxes, TEXT_REPLACEMENT } from "./text-replacement.js";
import { replaceTextIfEnabled } from "./text-replacement.js";
import { replaceTimeIfEnabled } from "./text-replacement.js";
import { getActiveDestinations } from "../itinerary-module.js";
import { enableAllTravelersFieldset } from "../../travelers.js";
import { getCheckedTravelersIDs } from "../../travelers.js";
import { updateTravelersFieldset } from "../../travelers.js";
import { validateTravelersFieldset } from "../../travelers.js";
import { getDataSelectOptions } from "../../../edit-trip.js";

export var INNER_ITINERARY = {};
var INNER_ITINERARY_DESTINATIONS_DATA = {};
var LAST_OPENED_PERIOD = {};

// Main Loading
export function loadInnerItineraryHTML(j) {
	const key = jsDateToKey(DATAS[j - 1]);
	if (Object.keys(INNER_ITINERARY).length == 0 || !INNER_ITINERARY[key])
		return;

	getID(`inner-itinerary-early-morning-${j}`).innerHTML = "";
	getID(`inner-itinerary-morning-${j}`).innerHTML = "";
	getID(`inner-itinerary-afternoon-${j}`).innerHTML = "";
	getID(`inner-itinerary-night-${j}`).innerHTML = "";

	for (let period in INNER_ITINERARY[key]) {
		const periodData = INNER_ITINERARY[key][period];
		for (let k = 1; k <= periodData.length; k++) {
			const dataEntry = periodData[k - 1];
			const div = getID(`inner-itinerary-${period}-${j}`);

			if (dataEntry.label) {
				div.innerHTML += `<div class='input-button-container'>
                                    <button id="input-button-${period}-${j}-${k}" class="btn input-button draggable" data-action="open-inner-itinerary-detail" data-j="${j}" data-k="${k}" data-period="${period}">
                                        ${getInnerItineraryTitleHTML(dataEntry, "inner-itinerary-highlight")}
                                    </button>
                                    <i class="iconify drag-icon" data-icon="mdi:drag"></i>
                                </div>`;
			}

			getID(`itinerary-${period}-${j}`).style.display = div.innerHTML
				? "block"
				: "none";
		}
	}
}

// Carregamento Interno (Modal)
export async function openInnerItinerary(j, k?, period?) {
	const selects = getInnerItinerarySelects(j);
	const isNew = !k && !period;

	const properties = cloneObject(MESSAGE_PROPERTIES);
	properties.title = getInnerItineraryMessageTitle(j);
	properties.containers = getContainersInput();
	properties.content = getInnerItineraryContent(
		j,
		k,
		period,
		selects,
		isNew,
	);
	properties.icons = [
		{ type: "back", action: `closeInnerItinerary(${j})` },
	];
	properties.buttons = [
		{
			type: "cancel",
		},
		{
			type: "confirm",
			action: `innerItineraryConfirmAction(${j}, ${k}, '${period}')`,
		},
	];

	displayFullMessage(properties);

	const activeDestinations = getActiveDestinations(j);
	if (activeDestinations.length === 1) {
		getID("inner-itinerary-item-destinations-location").style.display = "none";
		getID("inner-itinerary-item-destinations-radio-label").innerText =
			getSelectCurrentLabel(getID(`inner-itinerary-select-location`));
	}

	await loadInnerItineraryListeners(j);
	enableAllTravelersFieldset("inner-itinerary-travelers");
	await loadInnerItineraryCurrentData(j, k, period, isNew);
	loadInnerItineraryEventListeners();
}

// Selects
function getInnerItinerarySelects(j) {
	return {
		transportation: getInnerItinerarySelect("transportation"),
		accommodations: getInnerItinerarySelect("accommodations"),
		destinations: getInnerItinerarySelectsDestinations(j),
		dates: getDataSelectOptions(j),
	};
}

function getInnerItinerarySelect(type) {
	let active = false;
	let options = "";

	for (const child of getID(`${type}-box`).children) {
		const j = child.id.split("-")[3];
		const label = getID(`${type}-title-${j}`).innerText;
		const id = getID(`${type}-id-${j}`).value;
		if (id && label) {
			active = true;
			options += `<option value="${id}">${label}</option>`;
		}
	}

	return {
		active: active,
		options: options,
	};
}

function getInnerItinerarySelectsDestinations(j) {
	if (
		getID("destinations-enabled").checked === false ||
		ACTIVE_DESTINATIONS.length === 0
	)
		returnFalse();
	const destinations = getDestinationsFromCards("itinerary", j);
	if (destinations.length === 0) returnFalse();

	let options = "";
	let active = false;
	for (const strippedData of destinations) {
		const id = strippedData.destinationId;
		if (!id) continue;
		active = true;
		options += `<option value="${id}">${strippedData.title}</option>`;
	}

	return { active, options };
	function returnFalse() {
		const active = false;
		return { active };
	}
}

// Load current data into Modal
async function loadInnerItineraryCurrentData(j, k, period, isNew) {
	if (period) {
		getID("inner-itinerary-select-period").value = period;
		getID("inner-itinerary-select-swap-period").value = period;
		LAST_OPENED_PERIOD[j] = period;
	}

	const key = jsDateToKey(DATAS[j - 1]);
	if (
		!isNew &&
		INNER_ITINERARY &&
		INNER_ITINERARY[key] &&
		INNER_ITINERARY[key][period] &&
		INNER_ITINERARY[key][period][k - 1]
	) {
		const dataEntry = INNER_ITINERARY[key][period][k - 1];
		const linkedItem = getID("inner-itinerary-linked-item");

		getID(`inner-itinerary`).value = dataEntry.label;
	getID(`inner-itinerary-start`).value = dataEntry.start;
	getID(`inner-itinerary-end`).value = dataEntry.end;
		updateTravelersFieldset(
			"inner-itinerary-travelers",
			dataEntry.people || [],
		);

		switch (dataEntry?.item?.type) {
		case "transportation":
			getID(`inner-itinerary-item-transportation-radio`).checked = true;
			getID(`inner-itinerary-item-transportation`).style.display = "block";
			getID(`inner-itinerary-select-transportation`).value = dataEntry.item.id;
			linkedItem.innerText = getSelectCurrentLabel(
				getID(`inner-itinerary-select-transportation`),
			);
			break;
		case "accommodations":
				getID(`inner-itinerary-item-accommodations-radio`).checked = true;
				getID(`inner-itinerary-item-accommodations`).style.display = "block";
				getID(`inner-itinerary-select-accommodations`).value = dataEntry.item.id;
				linkedItem.innerText = getSelectCurrentLabel(
					getID(`inner-itinerary-select-accommodations`),
				);
				break;
		case "destinations":
				getID(`inner-itinerary-item-destinations-radio`).checked = true;
				getID("inner-itinerary-item-destinations").style.display = "block";

				getID(`inner-itinerary-select-location`).value = dataEntry.item.location;
				await innerItinerarySelectLocationAction();

				getID(`inner-itinerary-select-category`).value =
					dataEntry.item.category;
				await innerItinerarySelectCategoryAction();

				const tour = dataEntry.item.id;
				if (tour) {
					getID(`inner-itinerary-select-passeio`).value = tour;
					linkedItem.innerText = translate(
						"trip.itinerary.linked_destination",
					);
				}
				break;
			default:
				getID(`inner-itinerary-item-none-radio`).checked = true;
		}
	} else if (isNew) {
		const selectPeriod = getID("inner-itinerary-select-period");
		selectPeriod.value = getNewPeriod(j);
		LAST_OPENED_PERIOD[j] = selectPeriod.value;
	}
}

// Modal Navigation
export async function openInnerItineraryItem(j) {
	const height = getID("inner-itinerary-tela-principal").offsetHeight;
	const itemSelect = getID("inner-itinerary-select-item");
	itemSelect.style.minHeight = `${height}px`;

	if (getID("inner-itinerary").value) {
		getID("message-title").innerText = translate("trip.itinerary.link_item");
	}

	animate(
		["inner-itinerary-item-selecionar"],
		["inner-itinerary-tela-principal"],
	);
	getID("back-icon").style.visibility = "visible";
	loadTextReplacementCheckboxes(j);
	TEXT_REPLACEMENT.applied = false;
}

export function openInnerItinerarySwap() {
	const height = getID("inner-itinerary-tela-principal").offsetHeight;
	const itemSwap = getID("inner-itinerary-swap-item");
	itemSwap.style.minHeight = `${height}px`;

	getID("message-title").innerText = translate("trip.itinerary.swap_title");
	animate(
		["inner-itinerary-item-trocar"],
		["inner-itinerary-tela-principal"],
	);
	getID("back-icon").style.visibility = "visible";
}

export function closeInnerItinerary(j) {
	if (getID("inner-itinerary-select-item").style.display === "block") {
		const linkedItem = getID("inner-itinerary-linked-item");
		if (getID("inner-itinerary-item-transportation-radio").checked) {
			linkedItem.innerText = getSelectCurrentLabel(
				getID(`inner-itinerary-select-transportation`),
			);
		} else if (getID("inner-itinerary-item-accommodations-radio").checked) {
			linkedItem.innerText = getSelectCurrentLabel(
				getID(`inner-itinerary-select-accommodations`),
			);
		} else if (getID("inner-itinerary-item-destinations-radio").checked) {
			linkedItem.innerText = getSelectCurrentLabel(
				getID(`inner-itinerary-select-passeio`),
			);
		} else {
			linkedItem.innerText = translate("trip.itinerary.link_item");
		}

		getID("message-title").innerText = getInnerItineraryMessageTitle(j);
		getID("back-icon").style.visibility = "hidden";

		replaceTextIfEnabled();
		replaceTimeIfEnabled();
		TEXT_REPLACEMENT.applied = true;

		animate(
			["inner-itinerary-tela-principal"],
			["inner-itinerary-item-selecionar"],
		);
	} else if (getID("inner-itinerary-swap-item").style.display === "block") {
		getID("message-title").innerText = getInnerItineraryMessageTitle(j);
		getID("back-icon").style.visibility = "hidden";

		animate(
			["inner-itinerary-tela-principal"],
			["inner-itinerary-item-trocar"],
		);
	}
}

function getInnerItineraryMessageTitle(j) {
	const newJ = getMostRecentJ(j);
	return getDateTitle(DATAS[newJ - 1], "mini");
}

export function innerItineraryConfirmAction(j, k, period) {
	if (getID("inner-itinerary-select-item").style.display === "block") {
		closeInnerItinerary(j);
		return;
	}
	if (period && period != "undefined") {
		addInnerItinerary(j, k, period);
	} else {
		addInnerItinerary(j);
	}

	if (!getID("inner-itinerary")?.value) {
		return;
	}

	closeMessage();
}

// Save Inner Itinerary
function addInnerItinerary(j, k?, period?) {
	const itinerary = getID(`inner-itinerary`);

	if (!TEXT_REPLACEMENT.applied) {
		replaceTextIfEnabled();
		replaceTimeIfEnabled();
	}

	if (
		!itinerary.value ||
		!validateTravelersFieldset("inner-itinerary-travelers")
	) {
		itinerary.reportValidity();
	} else {
		const innerItinerary = buildInnerItinerary(itinerary);
		setInnerItinerary(innerItinerary, j, k, period);
	}

	function buildInnerItinerary(itinerary) {
		let item = {
			type: "",
			id: "",
			location: "",
			category: "",
		};

		if (
			getID("inner-itinerary-item-transportation-radio").checked &&
			getID(`inner-itinerary-select-transportation`).value
		) {
			item.type = "transportation";
			item.id = getID(`inner-itinerary-select-transportation`).value;
		} else if (
			getID("inner-itinerary-item-accommodations-radio").checked &&
			getID(`inner-itinerary-select-accommodations`).value
		) {
			item.type = "accommodations";
			item.id = getID(`inner-itinerary-select-accommodations`).value;
		} else if (
			getID("inner-itinerary-item-destinations-radio").checked &&
			getID(`inner-itinerary-select-passeio`).value
		) {
			item.type = "destinations";
			item.location = getID(`inner-itinerary-select-location`).value;
			item.id = getID(`inner-itinerary-select-passeio`).value;
			item.category = getID(`inner-itinerary-select-category`).value;
		}

		return {
			schedule: itinerary.value,
			people: getCheckedTravelersIDs("inner-itinerary-travelers"),
		start: getID(`inner-itinerary-start`).value,
		end: getID(`inner-itinerary-end`).value,
			item: item,
		};
	}

	function setInnerItinerary(innerItinerary, j, k, period) {
		const key = jsDateToKey(DATAS[j - 1]);
		const isNew = !k && !period;
		const newPeriod = getID(`inner-itinerary-select-period`).value;

		if (isNew) {
		// New Inner Itinerary (Addition Only)
		INNER_ITINERARY[key][newPeriod].push(innerItinerary);
		LAST_OPENED_PERIOD[j] = newPeriod;
	} else {
		// Existing Inner Itinerary (Replacement)
		const newJ = getMostRecentJ(j);
		if (period == newPeriod && newJ == j) {
			// Simple Replacement
			INNER_ITINERARY[key][period][k - 1] = innerItinerary;
		} else {
			// Compound Replacement
				const newKey = jsDateToKey(DATAS[newJ - 1]);
				INNER_ITINERARY[newKey][newPeriod].push(innerItinerary);
				INNER_ITINERARY[key][period].splice(k - 1, 1);
				LAST_OPENED_PERIOD[newJ] = newPeriod;
				loadInnerItineraryHTML(newJ);
			}
		}
		loadInnerItineraryHTML(j);
	}
}

// Delete Inner Itinerary
export function deleteInnerItinerary(j, k, period) {
	const isNew = !k && !period;
	if (isNew) {
		closeMessage();
		return;
	} else {
		const key = jsDateToKey(DATAS[j - 1]);
		INNER_ITINERARY[key][period].splice(k - 1, 1);
		loadInnerItineraryHTML(j);
		closeMessage();
	}
}

// Listeners
async function loadInnerItineraryListeners(j) {
	const itemTransportation = getID(`inner-itinerary-item-transportation`);
	const itemAccommodations = getID(`inner-itinerary-item-accommodations`);
	const itemDestinations = getID(`inner-itinerary-item-destinations`);

	getID(`inner-itinerary-item-transportation-radio`).addEventListener(
		"change",
		() => {
			itemTransportation.style.display = "block";
			itemAccommodations.style.display = "none";
			itemDestinations.style.display = "none";
			loadTextReplacementCheckboxes(j);
		},
	);

	getID(`inner-itinerary-item-accommodations-radio`).addEventListener(
		"change",
		() => {
			itemTransportation.style.display = "none";
			itemAccommodations.style.display = "block";
			itemDestinations.style.display = "none";
			loadTextReplacementCheckboxes(j);
		},
	);

	getID(`inner-itinerary-item-destinations-radio`).addEventListener(
		"change",
		() => {
			itemTransportation.style.display = "none";
			itemAccommodations.style.display = "none";
			itemDestinations.style.display = "block";
			loadTextReplacementCheckboxes(j);
		},
	);

	getID(`inner-itinerary-item-none-radio`).addEventListener(
		"change",
		() => {
			itemTransportation.style.display = "none";
			itemAccommodations.style.display = "none";
			itemDestinations.style.display = "none";
			loadTextReplacementCheckboxes(j);
		},
	);

	getID(`inner-itinerary-select-location`).addEventListener("change", () =>
		innerItinerarySelectLocationAction(),
	);
	getID(`inner-itinerary-select-category`).addEventListener("change", () =>
		innerItinerarySelectCategoryAction(),
	);
	getID("inner-itinerary-select-passeio").addEventListener("change", () =>
		loadTextReplacementCheckboxes(j),
	);

	getID("inner-itinerary-select-transportation").addEventListener("change", () =>
		loadTextReplacementCheckboxes(j),
	);
	getID("inner-itinerary-select-accommodations").addEventListener("change", () =>
		loadTextReplacementCheckboxes(j),
	);

	getID("inner-itinerary-select-period").addEventListener("change", () =>
		pairTurnos("inner-itinerary-select-period"),
	);
	getID("inner-itinerary-select-swap-period").addEventListener("change", () =>
		pairTurnos("inner-itinerary-select-troca-period"),
	);
}

async function innerItinerarySelectLocationAction() {
	const selectLocal = getID("inner-itinerary-select-location");
	const selectCategoria = getID("inner-itinerary-select-category");
	const selectPasseio = getID("inner-itinerary-select-passeio");

	const id = selectLocal.value;
	const locais =
		INNER_ITINERARY_DESTINATIONS_DATA[id] ||
		(await buildInnerItineraryDestinationsData(id));

	if (locais) {
		selectCategoria.innerHTML =
			`<option value="">${translate("labels.select")}</option>` +
			locais.categoriaOptions;
	} else {
		selectCategoria.innerHTML = `<option value="">${translate("labels.no_data")}</option>`;
		selectPasseio.innerHTML = `<option value="">${translate("labels.no_data")}</option>`;
	}

	selectCategoria.addEventListener("change", () => {
		innerItinerarySelectCategoryAction();
	});
}

async function innerItinerarySelectCategoryAction() {
	const selectLocal = getID("inner-itinerary-select-location");
	const selectCategoria = getID("inner-itinerary-select-category");
	const selectPasseio = getID("inner-itinerary-select-passeio");

	const id2 = selectLocal.value;
	const locais2 =
		INNER_ITINERARY_DESTINATIONS_DATA[id2] ||
		(await buildInnerItineraryDestinationsData(id2));

	if (
		selectLocal.value &&
		selectCategoria.value &&
		locais2?.passeioOptions?.[selectCategoria.value]
	) {
		selectPasseio.innerHTML =
			`<option value="">${translate("labels.select")}</option>` +
			locais2.passeioOptions[selectCategoria.value];
	} else {
		selectPasseio.innerHTML = `<option value="">${translate("labels.no_data")}</option>`;
	}
}

async function buildInnerItineraryDestinationsData(id) {
	if (INNER_ITINERARY_DESTINATIONS_DATA[id]) {
		return INNER_ITINERARY_DESTINATIONS_DATA[id];
	}

	if (!DESTINOS_DATA[id]) {
		DESTINOS_DATA[id] = await getDestination(id);
	}

	const data = DESTINOS_DATA[id];
	const titles = {
		restaurants: translate("destination.restaurants.title"),
		snacks: translate("destination.snacks.title"),
		nightlife: translate("destination.nightlife.title"),
		tourism: translate("destination.tourism.title"),
		shopping: translate("destination.shopping.title"),
	};

	const passeios = getDestinations().categories.tours;
	const categories = Object.keys(data)
		.filter(
			(key) =>
				passeios.includes(key) &&
				data[key] &&
				typeof data[key] === "object" &&
				Object.keys(data[key]).length > 0,
		)
		.sort((a, b) => passeios.indexOf(a) - passeios.indexOf(b));

	const categoriaOptions = categories
		.map(
			(category) =>
				`<option value="${category}">${titles[category]}</option>`,
		)
		.join("");

	const passeioOptions = {};
	for (const category of categories) {
		const passeiosArr = Object.entries(data[category]).map(([id, value]) => ({
			id,
			...(value as any),
		}));
		passeiosArr.sort((a, b) => a.name.localeCompare(b.name));
		passeioOptions[category] = passeiosArr
			.map(
				(passeio) => `<option value="${passeio.id}">${passeio.name}</option>`,
			)
			.join("");
	}

	INNER_ITINERARY_DESTINATIONS_DATA[id] = { categoriaOptions, passeioOptions };
	return INNER_ITINERARY_DESTINATIONS_DATA[id];
}

function loadInnerItineraryEventListeners() {
	getID("inner-itinerary-start").addEventListener(
		"change",
		function (event) {
			const inicioValue = (event.target as HTMLInputElement).value;
			const inicioHora = parseInt(inicioValue.split(":")[0]);
			getID("inner-itinerary-select-period").value = getPeriod(inicioHora);
		},
	);

	getID(`inner-itinerary-end`).addEventListener("change", function (event) {
		const fimValue = (event.target as HTMLInputElement).value;
		const fimHora = parseInt(fimValue.split(":")[0]);
		const fimMinuto = parseInt(fimValue.split(":")[1]);

		const inicioValue = getID(`inner-itinerary-start`).value;
		const inicioHora = parseInt(inicioValue.split(":")[0]);
		const inicioMinuto = parseInt(inicioValue.split(":")[1]);

		if (
			fimHora < inicioHora ||
			(fimHora == inicioHora && fimMinuto < inicioMinuto)
		) {
		getID(`inner-itinerary-end`).value = "";
		getID(`inner-itinerary-end`).reportValidity();
		}
	});

	getID("inner-itinerary-item-destinations-radio").addEventListener(
		"click",
		function () {
			innerItinerarySelectLocationAction();
		},
	);
}

export function getPeriod(inicioHora) {
	if (inicioHora < 6) {
		return "earlyMorning";
	} else if (inicioHora < 12) {
		return "morning";
	} else if (inicioHora < 18) {
		return "afternoon";
	} else {
		return "night";
	}
}

function pairTurnos(callerID) {
	const id1 = "inner-itinerary-select-period";
	const id2 = "inner-itinerary-select-troca-period";

	const turno1 = getID(id1).value;
	const turno2 = getID(id2).value;

	if (turno1 !== turno2) {
		if (callerID === id1) {
			getID(id2).value = turno1;
		} else if (callerID === id2) {
			getID(id1).value = turno2;
		}
	}
}

function getMostRecentJ(j) {
	const nova = getID("inner-itinerary-select-swap-date")?.value;

	if (nova) {
		const keys = DATAS.map((data) => jsDateToKey(data));
		const atual = keys[j - 1];
		if (atual != nova) {
			const period = getID("inner-itinerary-select-swap-period").value;
			if (
				keys.includes(nova) &&
			INNER_ITINERARY[nova] &&
			INNER_ITINERARY[nova][period]
			) {
				return keys.indexOf(nova) + 1;
			}
		}
	}

	return j;
}

function getNewPeriod(j) {
	if (LAST_OPENED_PERIOD[j]) {
		return LAST_OPENED_PERIOD[j];
	} else {
		for (const period of getItinerary().timeOfDay) {
			const element = getID(`inner-itinerary-${period}-${j}`);
			if (element && !element.innerText) {
				return period;
			}
		}
	}
	return "night";
}

export function afterDragInnerItinerary(evt) {
	const turnoInicial = evt.from.id.split("-")[2];
	const turnoFinal = evt.to.id.split("-")[2];

	const j = evt.item.children[0].id.split("-")[3];
	const key = jsDateToKey(DATAS[j - 1]);

	const element = INNER_ITINERARY[key][turnoInicial].splice(
		evt.oldIndex,
		1,
	)[0]; // First
	INNER_ITINERARY[key][turnoFinal].splice(evt.newIndex, 0, element); // Last
	LAST_OPENED_PERIOD[j] = turnoFinal;

	loadInnerItineraryHTML(j);
}
