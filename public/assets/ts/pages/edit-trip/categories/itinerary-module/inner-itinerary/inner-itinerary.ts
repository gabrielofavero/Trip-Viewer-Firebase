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
import { getInnerProgramacaoContent } from "./content.js";
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

// Carregamento Principal
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
			const dado = periodData[k - 1];
			const div = getID(`inner-itinerary-${period}-${j}`);

			if (dado.programacao) {
				div.innerHTML += `<div class='input-button-container'>
                                    <button id="input-button-${period}-${j}-${k}" class="btn input-button draggable" data-action="open-inner-itinerary-detail" data-j="${j}" data-k="${k}" data-period="${period}">
                                        ${getInnerItineraryTitleHTML(dado, "inner-itinerary-highlight")}
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
	properties.content = getInnerProgramacaoContent(
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
			getSelectCurrentLabel(getID(`inner-itinerary-select-local`));
	}

	await loadInnerProgramacaoListeners(j);
	enableAllTravelersFieldset("inner-itinerary-travelers");
	await loadInnerItineraryCurrentData(j, k, period, isNew);
	loadInnerProgramacaoEventListeners();
}

// Selects
function getInnerItinerarySelects(j) {
	return {
		transporte: getInnerItinerarySelect("transportation"),
		hospedagens: getInnerItinerarySelect("accommodations"),
		destinos: getInnerItinerarySelectsDestinos(j),
		datas: getDataSelectOptions(j),
	};
}

function getInnerItinerarySelect(tipo) {
	let ativo = false;
	let options = "";

	for (const child of getID(`${tipo}-box`).children) {
		const j = child.id.split("-")[3];
		const label = getID(`${tipo}-title-${j}`).innerText;
		const id = getID(`${tipo}-id-${j}`).value;
		if (id && label) {
			ativo = true;
			options += `<option value="${id}">${label}</option>`;
		}
	}

	return {
		ativo: ativo,
		options: options,
	};
}

function getInnerItinerarySelectsDestinos(j) {
	if (
		getID("destinations-enabled").checked === false ||
		ACTIVE_DESTINATIONS.length === 0
	)
		returnFalse();
	const destinations = getDestinationsFromCards("itinerary", j);
	if (destinations.length === 0) returnFalse();

	let options = "";
	let ativo = false;
	for (const strippedData of destinations) {
		const id = strippedData.destinationId;
		if (!id) continue;
		ativo = true;
		options += `<option value="${id}">${strippedData.title}</option>`;
	}

	return { ativo, options };
	function returnFalse() {
		const ativo = false;
		return { ativo };
	}
}

// Carrega dados atuais no Modal
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
		const dados = INNER_ITINERARY[key][period][k - 1];
		const itemAssociado = getID("inner-itinerary-linked-item");

		getID(`inner-itinerary`).value = dados.programacao;
	getID(`inner-itinerary-start`).value = dados.start;
	getID(`inner-itinerary-end`).value = dados.end;
		updateTravelersFieldset(
			"inner-itinerary-travelers",
			dados.people || [],
		);

		switch (dados?.item?.tipo) {
		case "transportation":
			getID(`inner-itinerary-item-transportation-radio`).checked = true;
			getID(`inner-itinerary-item-transporte`).style.display = "block";
			getID(`inner-itinerary-select-transporte`).value = dados.item.id;
			itemAssociado.innerText = getSelectCurrentLabel(
				getID(`inner-itinerary-select-transporte`),
			);
			break;
		case "accommodations":
				getID(`inner-itinerary-item-accommodations-radio`).checked = true;
				getID(`inner-itinerary-item-hospedagens`).style.display = "block";
				getID(`inner-itinerary-select-hospedagens`).value = dados.item.id;
				itemAssociado.innerText = getSelectCurrentLabel(
					getID(`inner-itinerary-select-hospedagens`),
				);
				break;
		case "destinations":
				getID(`inner-itinerary-item-destinations-radio`).checked = true;
				getID("inner-itinerary-item-destinations").style.display = "block";

				getID(`inner-itinerary-select-local`).value = dados.item.local;
				await innerProgramacaoSelectLocalAction();

				getID(`inner-itinerary-select-categoria`).value =
					dados.item.categoria;
				await innerProgramacaoSelectCategoriaAction();

				const passeio = dados.item.id;
				if (passeio) {
					getID(`inner-itinerary-select-passeio`).value = passeio;
					itemAssociado.innerText = translate(
						"trip.itinerary.linked_destination",
					);
				}
				break;
			default:
				getID(`inner-itinerary-item-nenhum-radio`).checked = true;
		}
	} else if (isNew) {
		const selectPeriod = getID("inner-itinerary-select-period");
		selectPeriod.value = getNewPeriod(j);
		LAST_OPENED_PERIOD[j] = selectPeriod.value;
	}
}

// Modal Navigation
export async function openInnerItineraryItem(j) {
	const height = getID("inner-itinerary-main-screen").offsetHeight;
	const itemSelecionar = getID("inner-itinerary-select-item");
	itemSelecionar.style.minHeight = `${height}px`;

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
	const height = getID("inner-itinerary-main-screen").offsetHeight;
	const itemTrocar = getID("inner-itinerary-swap-item");
	itemTrocar.style.minHeight = `${height}px`;

	getID("message-title").innerText = "Swap Itinerary";
	animate(
		["inner-itinerary-item-trocar"],
		["inner-itinerary-tela-principal"],
	);
	getID("back-icon").style.visibility = "visible";
}

export function closeInnerItinerary(j) {
	if (getID("inner-itinerary-select-item").style.display === "block") {
		const itemAssociado = getID("inner-itinerary-linked-item");
		if (getID("inner-itinerary-item-transportation-radio").checked) {
			itemAssociado.innerText = getSelectCurrentLabel(
				getID(`inner-itinerary-select-transporte`),
			);
		} else if (getID("inner-itinerary-item-accommodations-radio").checked) {
			itemAssociado.innerText = getSelectCurrentLabel(
				getID(`inner-itinerary-select-hospedagens`),
			);
		} else if (getID("inner-itinerary-item-destinations-radio").checked) {
			itemAssociado.innerText = getSelectCurrentLabel(
				getID(`inner-itinerary-select-passeio`),
			);
		} else {
			itemAssociado.innerText = translate("trip.itinerary.link_item");
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
			tipo: "",
			id: "",
			local: "",
			categoria: "",
		};

		if (
			getID("inner-itinerary-item-transportation-radio").checked &&
			getID(`inner-itinerary-select-transporte`).value
		) {
			item.tipo = "transportation";
			item.id = getID(`inner-itinerary-select-transporte`).value;
		} else if (
			getID("inner-itinerary-item-accommodations-radio").checked &&
			getID(`inner-itinerary-select-hospedagens`).value
		) {
			item.tipo = "accommodations";
			item.id = getID(`inner-itinerary-select-hospedagens`).value;
		} else if (
			getID("inner-itinerary-item-destinations-radio").checked &&
			getID(`inner-itinerary-select-passeio`).value
		) {
			item.tipo = "destinations";
			item.local = getID(`inner-itinerary-select-local`).value;
			item.id = getID(`inner-itinerary-select-passeio`).value;
			item.categoria = getID(`inner-itinerary-select-categoria`).value;
		}

		return {
			itinerary: itinerary.value,
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
async function loadInnerProgramacaoListeners(j) {
	const itemTransporte = getID(`inner-itinerary-item-transporte`);
	const itemHospedagens = getID(`inner-itinerary-item-hospedagens`);
	const itemDestinos = getID(`inner-itinerary-item-destinations`);

	getID(`inner-itinerary-item-transportation-radio`).addEventListener(
		"change",
		() => {
			itemTransporte.style.display = "block";
			itemHospedagens.style.display = "none";
			itemDestinos.style.display = "none";
			loadTextReplacementCheckboxes(j);
		},
	);

	getID(`inner-itinerary-item-accommodations-radio`).addEventListener(
		"change",
		() => {
			itemTransporte.style.display = "none";
			itemHospedagens.style.display = "block";
			itemDestinos.style.display = "none";
			loadTextReplacementCheckboxes(j);
		},
	);

	getID(`inner-itinerary-item-destinations-radio`).addEventListener(
		"change",
		() => {
			itemTransporte.style.display = "none";
			itemHospedagens.style.display = "none";
			itemDestinos.style.display = "block";
			loadTextReplacementCheckboxes(j);
		},
	);

	getID(`inner-itinerary-item-nenhum-radio`).addEventListener(
		"change",
		() => {
			itemTransporte.style.display = "none";
			itemHospedagens.style.display = "none";
			itemDestinos.style.display = "none";
			loadTextReplacementCheckboxes(j);
		},
	);

	getID(`inner-itinerary-select-local`).addEventListener("change", () =>
		innerProgramacaoSelectLocalAction(),
	);
	getID(`inner-itinerary-select-categoria`).addEventListener("change", () =>
		innerProgramacaoSelectCategoriaAction(),
	);
	getID("inner-itinerary-select-tour").addEventListener("change", () =>
		loadTextReplacementCheckboxes(j),
	);

	getID("inner-itinerary-select-transportation").addEventListener("change", () =>
		loadTextReplacementCheckboxes(j),
	);
	getID("inner-itinerary-select-accommodations").addEventListener("change", () =>
		loadTextReplacementCheckboxes(j),
	);

	getID("inner-itinerary-select-period").addEventListener("change", () =>
		pairTurnos("inner-itinerary-select-turno"),
	);
	getID("inner-itinerary-select-swap-period").addEventListener("change", () =>
		pairTurnos("inner-itinerary-select-troca-turno"),
	);
}

async function innerProgramacaoSelectLocalAction() {
	const selectLocal = getID("inner-itinerary-select-location");
	const selectCategoria = getID("inner-itinerary-select-category");
	const selectPasseio = getID("inner-itinerary-select-tour");

	const id = selectLocal.value;
	const locais =
		INNER_ITINERARY_DESTINATIONS_DATA[id] ||
		(await buildInnerProgramacaoDestinosData(id));

	if (locais) {
		selectCategoria.innerHTML =
			`<option value="">${translate("labels.select")}</option>` +
			locais.categoriaOptions;
	} else {
		selectCategoria.innerHTML = `<option value="">${translate("labels.no_data")}</option>`;
		selectPasseio.innerHTML = `<option value="">${translate("labels.no_data")}</option>`;
	}

	selectCategoria.addEventListener("change", () => {
		innerProgramacaoSelectCategoriaAction();
	});
}

async function innerProgramacaoSelectCategoriaAction() {
	const selectLocal = getID("inner-itinerary-select-location");
	const selectCategoria = getID("inner-itinerary-select-category");
	const selectPasseio = getID("inner-itinerary-select-tour");

	const id2 = selectLocal.value;
	const locais2 =
		INNER_ITINERARY_DESTINATIONS_DATA[id2] ||
		(await buildInnerProgramacaoDestinosData(id2));

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

async function buildInnerProgramacaoDestinosData(id) {
	if (INNER_ITINERARY_DESTINATIONS_DATA[id]) {
		return INNER_ITINERARY_DESTINATIONS_DATA[id];
	}

	if (!DESTINOS_DATA[id]) {
		DESTINOS_DATA[id] = await getDestination(id);
	}

	const data = DESTINOS_DATA[id];
	const titulos = {
		restaurantes: translate("destination.restaurants.title"),
		lanches: translate("destination.snacks.title"),
		saidas: translate("destination.nightlife.title"),
		turismo: translate("destination.tourism.title"),
		lojas: translate("destination.shopping.title"),
	};

	const passeios = getDestinations().categories.tours;
	const categorias = Object.keys(data)
		.filter(
			(key) =>
				passeios.includes(key) &&
				data[key] &&
				typeof data[key] === "object" &&
				Object.keys(data[key]).length > 0,
		)
		.sort((a, b) => passeios.indexOf(a) - passeios.indexOf(b));

	const categoriaOptions = categorias
		.map(
			(categoria) =>
				`<option value="${categoria}">${titulos[categoria]}</option>`,
		)
		.join("");

	const passeioOptions = {};
	for (const categoria of categorias) {
		const passeiosArr = Object.entries(data[categoria]).map(([id, value]) => ({
			id,
			...(value as any),
		}));
		passeiosArr.sort((a, b) => a.nome.localeCompare(b.nome));
		passeioOptions[categoria] = passeiosArr
			.map(
				(passeio) => `<option value="${passeio.id}">${passeio.nome}</option>`,
			)
			.join("");
	}

	INNER_ITINERARY_DESTINATIONS_DATA[id] = { categoriaOptions, passeioOptions };
	return INNER_ITINERARY_DESTINATIONS_DATA[id];
}

function loadInnerProgramacaoEventListeners() {
	getID("inner-itinerary-start").addEventListener(
		"change",
		function (event) {
			const inicioValue = (event.target as HTMLInputElement).value;
			const inicioHora = parseInt(inicioValue.split(":")[0]);
			getID("inner-itinerary-select-period").value = getTurno(inicioHora);
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
			innerProgramacaoSelectLocalAction();
		},
	);
}

export function getTurno(inicioHora) {
	if (inicioHora < 6) {
		return "madrugada";
	} else if (inicioHora < 12) {
		return "manha";
	} else if (inicioHora < 18) {
		return "tarde";
	} else {
		return "noite";
	}
}

function pairTurnos(callerID) {
	const id1 = "inner-itinerary-select-turno";
	const id2 = "inner-itinerary-select-troca-turno";

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
			const turno = getID("inner-itinerary-select-swap-period").value;
			if (
				keys.includes(nova) &&
			INNER_ITINERARY[nova] &&
			INNER_ITINERARY[nova][turno]
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
		for (const turno of getItinerary().timeOfDay) {
			const element = getID(`inner-itinerary-${turno}-${j}`);
			if (element && !element.innerText) {
				return turno;
			}
		}
	}
	return "noite";
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
