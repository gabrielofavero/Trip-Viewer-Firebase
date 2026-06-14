import { getDestinations, getItinerary } from '../../../../../app/config.js';
import { getDateTitle, jsDateToKey } from '../../../../../utils/dates.js';
import { cloneObject, getID, getInnerItineraryTitleHTML } from '../../../../../utils/dom.js';
import { closeMessage, displayFullMessage, getContainersInput, MESSAGE_PROPERTIES } from '../../../../../utils/messages.js';
import { getSelectCurrentLabel } from '../../../../../ui/fields.js';
import { translate } from '../../../../../i18n/translation.js';
import { animate } from '../../../../../theme/animations.js';
import { getDestination } from '../../../../../data/firebase/database.js';
import { DESTINOS_ATIVOS } from '../../destination.js';
import { DATAS } from '../../../new-trip.js';
import {DESTINOS_DATA, getDestinosFromCards} from "../../destination.js";
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

export var INNER_PROGRAMACAO = {};
var INNER_PROGRAMACAO_DETINOS_DATA = {};
var LAST_OPENED_TURNO = {};

// Carregamento Principal
export function loadInnerItineraryHTML(j) {
	const key = jsDateToKey(DATAS[j - 1]);
	if (Object.keys(INNER_PROGRAMACAO).length == 0 || !INNER_PROGRAMACAO[key])
		return;

	getID(`inner-itinerary-early-morning-${j}`).innerHTML = "";
	getID(`inner-itinerary-morning-${j}`).innerHTML = "";
	getID(`inner-itinerary-afternoon-${j}`).innerHTML = "";
	getID(`inner-itinerary-night-${j}`).innerHTML = "";

	for (let turno in INNER_PROGRAMACAO[key]) {
		const turnoDados = INNER_PROGRAMACAO[key][turno];
		for (let k = 1; k <= turnoDados.length; k++) {
			const dado = turnoDados[k - 1];
			const div = getID(`inner-itinerary-${turno}-${j}`);

			if (dado.programacao) {
				div.innerHTML += `<div class="input-botao-container">
                                    <button id="input-botao-${turno}-${j}-${k}" class="btn input-botao draggable" data-action="open-inner-itinerary-detail" data-j="${j}" data-k="${k}" data-turno="${turno}">
                                        ${getInnerItineraryTitleHTML(dado, "inner-itinerary-highlight")}
                                    </button>
                                    <i class="iconify drag-icon" data-icon="mdi:drag"></i>
                                </div>`;
			}

			getID(`itinerary-${turno}-${j}`).style.display = div.innerHTML
				? "block"
				: "none";
		}
	}
}

// Carregamento Interno (Modal)
export async function openInnerItinerary(j, k?, turno?) {
	const selects = getInnerItinerarySelects(j);
	const isNew = !k && !turno;

	const propriedades = cloneObject(MESSAGE_PROPERTIES);
	propriedades.titulo = getInnerProgramacaoMessageTitle(j);
	propriedades.containers = getContainersInput();
	propriedades.conteudo = getInnerProgramacaoContent(
		j,
		k,
		turno,
		selects,
		isNew,
	);
	propriedades.icons = [
		{ tipo: "voltar", acao: `closeInnerProgramacao(${j})` },
	];
	propriedades.botoes = [
		{
			tipo: "cancelar",
		},
		{
			tipo: "confirmar",
			acao: `innerProgramacaoConfirmAction(${j}, ${k}, '${turno}')`,
		},
	];

	displayFullMessage(propriedades);

	const activeDestinations = getActiveDestinations(j);
	if (activeDestinations.length === 1) {
		getID("inner-itinerary-item-destinations-location").style.display = "none";
		getID("inner-itinerary-item-destinations-radio-label").innerText =
			getSelectCurrentLabel(getID(`inner-itinerary-select-local`));
	}

	await loadInnerProgramacaoListeners(j);
	enableAllTravelersFieldset("inner-itinerary-travelers");
	await loadInnerItineraryCurrentData(j, k, turno, isNew);
	loadInnerProgramacaoEventListeners();
}

// Selects
function getInnerItinerarySelects(j) {
	return {
		transporte: getInnerItinerarySelect("transporte"),
		hospedagens: getInnerItinerarySelect("hospedagens"),
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
		DESTINOS_ATIVOS.length === 0
	)
		returnFalse();
	const destinations = getDestinosFromCards("programacao", j);
	if (destinations.length === 0) returnFalse();

	let options = "";
	let ativo = false;
	for (const strippedData of destinations) {
		const id = strippedData.destinosID;
		if (!id) continue;
		ativo = true;
		options += `<option value="${id}">${strippedData.titulo}</option>`;
	}

	return { ativo, options };
	function returnFalse() {
		const ativo = false;
		return { ativo };
	}
}

// Carrega dados atuais no Modal
async function loadInnerItineraryCurrentData(j, k, turno, isNew) {
	if (turno) {
		getID("inner-itinerary-select-period").value = turno;
		getID("inner-itinerary-select-swap-period").value = turno;
		LAST_OPENED_TURNO[j] = turno;
	}

	const key = jsDateToKey(DATAS[j - 1]);
	if (
		!isNew &&
		INNER_PROGRAMACAO &&
		INNER_PROGRAMACAO[key] &&
		INNER_PROGRAMACAO[key][turno] &&
		INNER_PROGRAMACAO[key][turno][k - 1]
	) {
		const dados = INNER_PROGRAMACAO[key][turno][k - 1];
		const itemAssociado = getID("inner-itinerary-linked-item");

		getID(`inner-itinerary`).value = dados.programacao;
	getID(`inner-itinerary-start`).value = dados.inicio;
	getID(`inner-itinerary-end`).value = dados.fim;
		updateTravelersFieldset(
			"inner-itinerary-travelers",
			dados.pessoas || [],
		);

		switch (dados?.item?.tipo) {
			case "transporte":
				getID(`inner-itinerary-item-transportation-radio`).checked = true;
				getID(`inner-itinerary-item-transporte`).style.display = "block";
				getID(`inner-itinerary-select-transporte`).value = dados.item.id;
				itemAssociado.innerText = getSelectCurrentLabel(
					getID(`inner-itinerary-select-transporte`),
				);
				break;
			case "hospedagens":
				getID(`inner-itinerary-item-accommodations-radio`).checked = true;
				getID(`inner-itinerary-item-hospedagens`).style.display = "block";
				getID(`inner-itinerary-select-hospedagens`).value = dados.item.id;
				itemAssociado.innerText = getSelectCurrentLabel(
					getID(`inner-itinerary-select-hospedagens`),
				);
				break;
			case "destinos":
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
		const selectTurno = getID("inner-itinerary-select-period");
		selectTurno.value = getNewTurno(j);
		LAST_OPENED_TURNO[j] = selectTurno.value;
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

	getID("message-title").innerText = "Trocar Programação";
	animate(
		["inner-itinerary-item-trocar"],
		["inner-itinerary-tela-principal"],
	);
	getID("back-icon").style.visibility = "visible";
}

export function closeInnerProgramacao(j) {
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

		getID("message-title").innerText = getInnerProgramacaoMessageTitle(j);
		getID("back-icon").style.visibility = "hidden";

		replaceTextIfEnabled();
		replaceTimeIfEnabled();
		TEXT_REPLACEMENT.applied = true;

		animate(
			["inner-itinerary-tela-principal"],
			["inner-itinerary-item-selecionar"],
		);
	} else if (getID("inner-itinerary-swap-item").style.display === "block") {
		getID("message-title").innerText = getInnerProgramacaoMessageTitle(j);
		getID("back-icon").style.visibility = "hidden";

		animate(
			["inner-itinerary-tela-principal"],
			["inner-itinerary-item-trocar"],
		);
	}
}

function getInnerProgramacaoMessageTitle(j) {
	const newJ = getMostRecentJ(j);
	return getDateTitle(DATAS[newJ - 1], "mini");
}

export function innerProgramacaoConfirmAction(j, k, turno) {
	if (getID("inner-itinerary-select-item").style.display === "block") {
		closeInnerProgramacao(j);
		return;
	}
	if (turno && turno != "undefined") {
		addInnerProgramacao(j, k, turno);
	} else {
		addInnerProgramacao(j);
	}

	if (!getID("inner-itinerary")?.value) {
		return;
	}

	closeMessage();
}

// Save Inner Itinerary
function addInnerProgramacao(j, k?, turno?) {
	const programacao = getID(`inner-itinerary`);

	if (!TEXT_REPLACEMENT.applied) {
		replaceTextIfEnabled();
		replaceTimeIfEnabled();
	}

	if (
		!programacao.value ||
		!validateTravelersFieldset("inner-itinerary-travelers")
	) {
		programacao.reportValidity();
	} else {
		const innerItinerary = buildInnerProgramacao(programacao);
		setInnerProgramacao(innerItinerary, j, k, turno);
	}

	function buildInnerProgramacao(programacao) {
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
			item.tipo = "transporte";
			item.id = getID(`inner-itinerary-select-transporte`).value;
		} else if (
			getID("inner-itinerary-item-accommodations-radio").checked &&
			getID(`inner-itinerary-select-hospedagens`).value
		) {
			item.tipo = "hospedagens";
			item.id = getID(`inner-itinerary-select-hospedagens`).value;
		} else if (
			getID("inner-itinerary-item-destinations-radio").checked &&
			getID(`inner-itinerary-select-passeio`).value
		) {
			item.tipo = "destinos";
			item.local = getID(`inner-itinerary-select-local`).value;
			item.id = getID(`inner-itinerary-select-passeio`).value;
			item.categoria = getID(`inner-itinerary-select-categoria`).value;
		}

		return {
			programacao: programacao.value,
			pessoas: getCheckedTravelersIDs("inner-itinerary-travelers"),
		inicio: getID(`inner-itinerary-start`).value,
		fim: getID(`inner-itinerary-end`).value,
			item: item,
		};
	}

	function setInnerProgramacao(innerItinerary, j, k, turno) {
		const key = jsDateToKey(DATAS[j - 1]);
		const isNew = !k && !turno;
		const newTurno = getID(`inner-itinerary-select-turno`).value;

		if (isNew) {
		// New Inner Itinerary (Addition Only)
		INNER_PROGRAMACAO[key][newTurno].push(innerItinerary);
		LAST_OPENED_TURNO[j] = newTurno;
	} else {
		// Existing Inner Itinerary (Replacement)
		const newJ = getMostRecentJ(j);
		if (turno == newTurno && newJ == j) {
			// Simple Replacement
			INNER_PROGRAMACAO[key][turno][k - 1] = innerItinerary;
		} else {
			// Compound Replacement
				const newKey = jsDateToKey(DATAS[newJ - 1]);
				INNER_PROGRAMACAO[newKey][newTurno].push(innerItinerary);
				INNER_PROGRAMACAO[key][turno].splice(k - 1, 1);
				LAST_OPENED_TURNO[newJ] = newTurno;
				loadInnerItineraryHTML(newJ);
			}
		}
		loadInnerItineraryHTML(j);
	}
}

// Delete Inner Itinerary
export function deleteInnerProgramacao(j, k, turno) {
	const isNew = !k && !turno;
	if (isNew) {
		closeMessage();
		return;
	} else {
		const key = jsDateToKey(DATAS[j - 1]);
		INNER_PROGRAMACAO[key][turno].splice(k - 1, 1);
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
		INNER_PROGRAMACAO_DETINOS_DATA[id] ||
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

	const id = selectLocal.value;
	const locais =
		INNER_PROGRAMACAO_DETINOS_DATA[id] ||
		(await buildInnerProgramacaoDestinosData(id));

	if (
		selectLocal.value &&
		selectCategoria.value &&
		locais?.passeioOptions?.[selectCategoria.value]
	) {
		selectPasseio.innerHTML =
			`<option value="">${translate("labels.select")}</option>` +
			locais.passeioOptions[selectCategoria.value];
	} else {
		selectPasseio.innerHTML = `<option value="">${translate("labels.no_data")}</option>`;
	}
}

async function buildInnerProgramacaoDestinosData(id) {
	if (INNER_PROGRAMACAO_DETINOS_DATA[id]) {
		return INNER_PROGRAMACAO_DETINOS_DATA[id];
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

	INNER_PROGRAMACAO_DETINOS_DATA[id] = { categoriaOptions, passeioOptions };
	return INNER_PROGRAMACAO_DETINOS_DATA[id];
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
				INNER_PROGRAMACAO[nova] &&
				INNER_PROGRAMACAO[nova][turno]
			) {
				return keys.indexOf(nova) + 1;
			}
		}
	}

	return j;
}

function getNewTurno(j) {
	if (LAST_OPENED_TURNO[j]) {
		return LAST_OPENED_TURNO[j];
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

	const element = INNER_PROGRAMACAO[key][turnoInicial].splice(
		evt.oldIndex,
		1,
	)[0]; // First
	INNER_PROGRAMACAO[key][turnoFinal].splice(evt.newIndex, 0, element); // Last
	LAST_OPENED_TURNO[j] = turnoFinal;

	loadInnerItineraryHTML(j);
}
