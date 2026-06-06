// Text Utils
import { getCurrencies } from '../app/config.js';
import { getState } from '../data/state.js';
import { convertFromDateObject, getDateRegionalFormat, getDateString, getTodayDateObject } from './dates.js';
import { translate } from '../i18n/translation.js';
import { hideContent } from '../theme/visibility.js';

export function firstCharToUpperCase(str) {
	return str.charAt(0).toUpperCase() + str.slice(1);
}

export function codifyText(inputString) {
	let lowercaseString = inputString.toLowerCase();
	let validFolderName = lowercaseString.replace(/[^a-z0-9_]/g, "");
	return validFolderName;
}

export function uncodifyText(inputString) {
	return inputString
		.replace(/_/g, " ")
		.replace(/\b\w/g, (l) => l.toUpperCase());
}

export function getRandomID({ idLength = 5, pool = [] } = {}) {
	const characters =
		"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
	const array = new Uint32Array(idLength);
	crypto.getRandomValues(array); // native + secure

	let randomId = "";
	for (let i = 0; i < idLength; i++) {
		randomId += characters[array[i] % characters.length];
	}

	// avoid collision
	return pool.includes(randomId) ? getRandomID({ idLength, pool }) : randomId;
}

export function getEmptyChar() {
	return "\u200B";
}

export function getLastUpdatedOnText(date) {
	if (typeof date === "string") {
		date = new Date(date);
	}
	const dateString = getDateString(date, getDateRegionalFormat());
	return `${translate("labels.last_updated_on")} ${dateString}`;
}

// Object Utils
export function isObject(obj) {
	return obj === Object(obj);
}

export function objectExistsAndHasKeys(obj) {
	return isObject(obj) && obj && Object.keys(obj).length > 0;
}

export function getIdFromObjectDB(dbObject) {
	try {
		const segments = dbObject.data._delegate._key.path.segments;
		return segments[segments.length - 1];
	} catch (e) {
		console.error("Cannot get ID from DB: " + e.message);
		return;
	}
}

export function printObjectHTML(obj) {
	var str = "<br>";
	for (var key in obj) {
		if (obj.hasOwnProperty(key)) {
			const formattedKey = uncodifyText(key);
			str += `<br><strong>${formattedKey}:</strong> ${obj[key]}`;
		}
	}
	return str;
}

export function cloneObject(object) {
	return JSON.parse(JSON.stringify(object));
}

export function getLocalJSON() {
	return new Promise((resolve, reject) => {
		const input = document.createElement("input");
		input.type = "file";
		input.accept = "application/json";

		input.onchange = (event) => {
			const file = event.target.files[0];
			if (!file) {
				reject("No file selected");
				return;
			}

			const reader = new FileReader();
			reader.onload = (e) => {
				try {
					const json = JSON.parse(e.target.result);
					resolve(json);
				} catch (err) {
					reject("Invalid JSON file");
				}
			};
			reader.onerror = () => reject("Failed to read file");

			reader.readAsText(file);
		};

		input.click();
	});
}

export function areObjectsEqual(obj1, obj2, ignoredPaths = []) {
	return deepObjectsEqual(obj1, obj2, "", new Set(ignoredPaths));

	function deepObjectsEqual(val1, val2, path, ignored) {
		if (ignored.has(path)) return true;

		if (val1 === val2) return true;

		if (
			typeof val1 !== "object" ||
			typeof val2 !== "object" ||
			val1 === null ||
			val2 === null
		) {
			return false;
		}

		const keys = new Set([...Object.keys(val1), ...Object.keys(val2)]);

		for (const key of keys) {
			const nextPath = path ? `${path}.${key}` : key;
			if (!deepObjectsEqual(val1[key], val2[key], nextPath, ignored)) {
				return false;
			}
		}

		return true;
	}
}

export function getObjectDiff({ obj1, obj2, ignoredPaths = [], name = "Object" }) {
	const differences = [];
	const ignored = new Set(ignoredPaths);

	collectObjectDiffs(obj1, obj2, "", ignored, differences);

	return {
		name,
		areEqual: differences.length === 0,
		differences,
	};
}

export function collectObjectDiffs(val1, val2, path, ignored, diffs) {
	if (ignored.has(path)) return;

	if (val1 === val2) return;

	if (
		typeof val1 !== "object" ||
		typeof val2 !== "object" ||
		val1 === null ||
		val2 === null
	) {
		diffs.push({
			path,
			value1: val1,
			value2: val2,
		});
		return;
	}

	const keys = new Set([...Object.keys(val1), ...Object.keys(val2)]);

	for (const key of keys) {
		const nextPath = path ? `${path}.${key}` : key;
		collectObjectDiffs(val1[key], val2[key], nextPath, ignored, diffs);
	}
}

// Array Utils
export function getReadableArray(arr) {
	if (arr.length <= 1) return arr[0] ?? "";
	const andLabel = translate("labels.and");
	const last = arr.pop();
	return `${arr.join(", ")} ${andLabel} ${last}`;
}

// Element Utils
export function getChildIDs(parentId) {
	var parentElement = getID(parentId);

	if (parentElement) {
		var childElements = parentElement.children;
		var idsArray = [];

		for (var i = 0; i < childElements.length; i++) {
			var elementId = childElements[i].id;
			if (elementId) {
				idsArray.push(elementId);
			}
		}
		return idsArray;
	} else {
		console.error("Element with id '" + parentId + "' not found");
		return null;
	}
}

export function setRequired(id) {
	const div = getID(id);
	if (div) {
		div.setAttribute("required", "");
	}
}

export function removeRequired(id) {
	const div = getID(id);
	if (div) {
		div.removeAttribute("required");
	}
}

export function getOptionsFromSelect(id) {
	const selectElement = getID(id);
	let optionValues = [];

	for (let i = 0; i < selectElement.options.length; i++) {
		optionValues.push(selectElement.options[i].value);
	}
	return optionValues;
}

export function removeChild(tipo) {
	const div = getID(tipo);
	div.parentNode.removeChild(div);
}

export function removeChildWithValidation(categoria, j) {
	const id = getID(`${categoria}-inner-box-${j}`)
		? `${categoria}-inner-box-${j}`
		: `${categoria}-${j}`;
	removeChild(id);
	hideParentIfNoChildren(categoria);
}

export function hideParentIfNoChildren(categoria) {
	if (getChildIDs(`${categoria}-box`).length === 0) {
		getID(`habilitado-${categoria}`).checked = false;
		hideContent(categoria);
	}
}

export function removeEmptyChild(categoria) {
	let itens = [];

	switch (categoria) {
		case "restaurantes":
		case "lanches":
		case "saidas":
		case "turismo":
		case "lojas":
		case "lineup":
			itens = [`${categoria}-nome`];
			break;
		case "transporte":
			itens = ["ponto-partida", "ponto-chegada"];
			break;
		case "hospedagens":
			itens = [`${categoria}-nome`, `${categoria}-endereco`];
			break;
		case "galeria":
			itens = [`${categoria}-titulo`, `link-${categoria}`];
			break;
	}

	if (itens.length > 0) {
		const j = getFirstJ(`${categoria}-box`);
		if (j && !hasUserData(itens, j)) {
			removeChild(`${categoria}-${j}`);
		}
	}

	function hasUserData(itens, j) {
		for (const item of itens) {
			if (getID(`${item}-${j}`).value) {
				return true;
			}
		}
		return false;
	}
}

export function getIDs(divID) {
	const ids = [];
	for (const item of divID.split("-")) {
		if (!isNaN(item)) {
			ids.push(parseInt(item));
		}
	}
	return ids.join("-");
}

export function getJ(id) {
	const jSplit = id.split("-");
	return parseInt(jSplit[jSplit.length - 1]);
}

export function getJs(parentID) {
	const parent = getID(parentID);
	if (!parent) return [];

	return Array.from(parent.querySelectorAll("[id]"))
		.map((el) => {
			const id = el.id;
			const dash = id.lastIndexOf("-");
			return dash === -1 ? NaN : Number(id.slice(dash + 1));
		})
		.filter(Number.isFinite);
}

export function findJFromID(id, tipo) {
	const js = getJs(`${tipo}-box`);
	for (const j of js) {
		const result = getID(`${tipo}-id-${j}`).value;
		if (result === id) {
			return j;
		}
	}
	return 0;
}

export function getFirstJ(parentID) {
	const js = getJs(parentID);
	return js[0];
}

export function getLastJ(parentID) {
	const js = getJs(parentID);
	return js.length === 0 ? 0 : js[js.length - 1];
}

export function getLastUnorderedJ(parentID) {
	const js = getJs(parentID);
	return js.length === 0 ? 0 : Math.max(...js);
}

export function getNextJ(parentID) {
	return getLastUnorderedJ(parentID) + 1;
}

export function getCategoryID(tipo, j) {
	const js = getJs(`${tipo}-box`);
	let ids = [];

	for (const innerJ of js) {
		const id = getID(`${tipo}-id-${innerJ}`).value;
		if (id) ids.push(id);
	}

	const currentID = getID(`${tipo}-id-${j}`).value;
	if (currentID && !ids.includes(currentID)) {
		return currentID;
	}

	return getRandomID({ pool: ids });
}

export function getOrCreateCategoryID(tipo, j) {
	const currentID = getID(`${tipo}-id-${j}`).value;
	return currentID ? currentID : getCategoryID(tipo, j);
}

// URL Utils
export function getURLParams() {
	const urlParams = new URLSearchParams(window.location.search);
	const params = {};
	for (const [internalKey, value] of urlParams) {
		params[internalKey] = value;
	}
	return params;
}

export function getURLParam(param) {
	const urlParams = new URLSearchParams(window.location.search);
	return urlParams.get(param);
}

export function setURLParam(key, value) {
	const url = new URL(window.location.href);
	url.searchParams.set(key, value);
	window.history.replaceState({}, "", url);
}

// Document Utils

export function getDataDocument(tipo) {
	switch (tipo) {
		case "viagens":
		case "listagens":
			return getState();
		case "destinos":
			return FIRESTORE_DESTINOS_DATA;
		default:
			return null;
	}
}

export function getNewDataDocument(tipo) {
	switch (tipo) {
		case "viagens":
		case "listagens":
			return FIRESTORE_NEW_DATA;
		case "destinos":
			return FIRESTORE_DESTINOS_NEW_DATA;
		default:
			return null;
	}
}

export function getTranslatedDocumentLabel(type) {
	switch (type) {
		case "viagens":
			return translate("trip.document");
		case "viagens/protected":
			return translate("trip.protected");
		case "destinos":
			return translate("destination.document");
		case "listagens":
			return translate("listing.document");
		case "gastos":
			return translate("trip.expenses.document");
		case "gastos/protected":
			return translate("trip.expenses.protected");
		case "protegido":
			return translate("labels.protected");
		default:
			return translate("labels.unknown");
	}
}

export function getOrderedDocumentByUpdateDate(data) {
	return Object.entries(data)
		.map(([id, v]) => ({ id, ...v }))
		.sort(
			(a, b) =>
				new Date(b.versao.ultimaAtualizacao) -
				new Date(a.versao.ultimaAtualizacao),
		);
}

export function getOrderedDocumentByTitle(data) {
	return Object.entries(data)
		.map(([id, v]) => ({ id, ...v }))
		.sort((a, b) => a.titulo.localeCompare(b.titulo));
}

// Destination
export function getAndDestinationTitle(value, destinos = [], placeholder = true) {
	if (!destinos || destinos.length === 0) {
		const placeholderValue = placeholder
			? translate("trip.itinerary.title")
			: "";
		return value || placeholderValue;
	}

	const titles = destinos.map((d) => d.titulo);
	if (value.includes("departure")) {
		return getReadableArray([
			translate("trip.transportation.departure"),
			...titles,
		]);
	}

	if (value.includes("return")) {
		return getReadableArray([
			...titles,
			translate("trip.transportation.return"),
		]);
	}

	return getReadableArray([titles]);
}

export async function normalizeTikTokLink(link) {
	if (!link) return link;

	const isMobile =
		link.startsWith("https://vm.tiktok.com/") ||
		link.startsWith("https://vt.tiktok.com/");

	if (!isMobile) return link;

	try {
		const res = await fetch(`https://www.tiktok.com/oembed?url=${link}`, {
			method: "GET",
		});

		const data = await res.json();

		if (data.author_unique_id && data.embed_product_id) {
			return `https://www.tiktok.com/@${data.author_unique_id}/video/${data.embed_product_id}`;
		}

		return link;
	} catch (err) {
		return link;
	}
}

export function getDestinationTitle(item) {
	if (item.nome && item.emoji) {
		return `${item.nome} ${item.emoji}`;
	} else return item.nome;
}

export function getDestinationsBoxHTML({
	j,
	item,
	innerItinerary,
	valores,
	moeda,
	planejado,
	editBtn,
}) {
	return `
    <div ${innerItinerary ? "" : `class="accordion-body" id="accordion-body-${j}"`}>
        ${getDestinationsAccordionBodyHTML({ j, item, valores, moeda, planejado, editBtn })}
    </div>`;
}

// Itinerary
export function getInnerItineraryTitle(dado, viajantes = TRAVELERS) {
	const programacao = dado.programacao || "";
	const presentes = !dado.pessoas
		? []
		: dado.pessoas
				.filter((p) => p.isPresent)
				.map((p) => viajantes.find((t) => t.id === p.id)?.nome ?? "");

	const pessoasTexto =
		presentes.length === 0 || presentes.length === viajantes.length
			? ""
			: getReadableArray(presentes);

	let horario = "";
	if (dado.inicio && dado.fim) {
		horario = `${dado.inicio} - ${dado.fim}`;
	} else if (dado.inicio) {
		horario = dado.inicio;
	}

	if (pessoasTexto && horario && programacao) {
		return {
			title: `${horario} (${pessoasTexto})`,
			content: programacao,
		};
	}

	if (pessoasTexto && programacao) {
		return {
			title: pessoasTexto,
			content: programacao,
		};
	}

	if (horario && programacao) {
		return {
			title: horario,
			content: programacao,
		};
	}

	return {
		title: "",
		content: programacao,
	};
}

export function getInnerItineraryTitleHTML(dado, spanClass) {
	const titleObj = getInnerItineraryTitle(dado);
	return titleObj.title
		? `<span class="${spanClass}">${titleObj.title}:</span> ${titleObj.content}`
		: titleObj.content;
}

export function getInnerItinerary(item, destinos) {
	const innerItinerary = {
		tipo: item?.tipo,
		titulo: "",
		content: "",
		midia: "",
		container:
			item?.tipo === "destinos"
				? "destinos-container"
				: "programacao-container",
	};
	let index = -1;
	switch (item?.tipo) {
		case "transporte":
			if (getState().modulos.transportes === true && item.id) {
				index = getState().transportes.dados
					.map((programacao) => programacao.id)
					.indexOf(item.id);
				if (index >= 0) {
					const transporte = getState().transportes.dados[index];
					innerItinerary.titulo = `${transporte.pontos.partida} → ${transporte.pontos.chegada}`;
					innerItinerary.content = getFlightBoxHTML(
						index + 1,
						"inner-programacao",
						true,
					);
				}
			}
			break;
		case "hospedagens":
			if (getState().modulos.hospedagens === true && item.id) {
				index = getState().hospedagens
					.map((hospedagem) => hospedagem.id)
					.indexOf(item.id);
				if (index >= 0) {
					innerItinerary.titulo = "";
					innerItinerary.content = getAccommodationsHTML(index, true);
				}
			}
			break;
		case "destinos":
			if (
				getState().modulos.destinos === true &&
				item.local &&
				item.categoria &&
				item.id
			) {
				if (!destinos) {
					const destinosIDs = DESTINOS.map((destino) => destino.destinosID);
					index = destinosIDs.indexOf(item.local);
					destinos = DESTINOS?.[index]?.destinos;
				}

				if (!destinos) {
					return;
				}

				const destino = destinos[item.categoria];
				if (destino && Object.keys(destino).length) {
					const destinoItem = destino[item.id];
					if (destinoItem) {
						innerItinerary.titulo = getDestinationTitle(destinoItem);
						innerItinerary.content = getDestinationsBoxHTML({
							j: 1,
							id: item.id,
							item: destinoItem,
							innerItinerary: true,
							valores: getDestinationValues(DESTINOS[index]),
							moeda: destinos.moeda,
						});
						innerItinerary.midia = destinoItem?.midia;
					}
				}
			}
	}

	return innerItinerary;

	function getDestinationValues(destino) {
		const moeda = cloneObject(getCurrencies().escala[destino.destinos.moeda]);
		const max = translate("destination.price.max", { value: moeda["$$$$"] });
		moeda["-"] = translate("destination.price.free");
		moeda["default"] = translate("destination.price.default");
		moeda["$$$$"] = max;
		return moeda;
	}
}

export function getLinkMediaButton(midia, tipo) {
	if (!midia) return;
	const video = translate("trip.itinerary.media_button.video");
	const playlist = translate("trip.itinerary.media_button.playlist");

	let buttonText = `<i class="iconify" data-icon="lets-icons:video-fill"></i>${video}`;

	if (
		tipo == "youtube" ||
		midia.includes("youtube") ||
		midia.includes("youtu.be")
	) {
		buttonText = `<i class="iconify" data-icon="mdi:youtube"></i>${video}`;
	} else if (tipo == "tiktok" || midia.includes("tiktok")) {
		buttonText = `<i class="iconify" data-icon="ic:baseline-tiktok"></i>${video}`;
	} else if (tipo == "spotify" || midia.includes("spotify")) {
		buttonText = `<i class="iconify" data-icon="mdi:spotify"></i>${playlist}`;
	} else if (tipo == "instagram" || midia.includes("instagram")) {
		buttonText = `<i class="iconify" data-icon="mdi:instagram"></i> ${video}`;
	}

	return `<div class="button-box">
              <button class="btn btn-secondary btn-format" type="submit" onclick="window.open('${midia}', '_blank');">${buttonText}</button>
            </div>`;
}

// Trips
export function getCurrentTrips(data) {
	const today = convertFromDateObject(getTodayDateObject());
	return Object.entries(data)
		.filter(([_, v]) => {
			const start = convertFromDateObject(v.inicio);
			const end = convertFromDateObject(v.fim);
			return start <= today && today <= end;
		})
		.map(([id, v]) => ({ id, ...v }));
}

export function getPreviousTrips(data) {
	const today = convertFromDateObject(getTodayDateObject());
	return Object.entries(data)
		.filter(([_, v]) => convertFromDateObject(v.fim) < today)
		.map(([id, v]) => ({ id, ...v }))
		.sort(
			(a, b) => convertFromDateObject(b.fim) - convertFromDateObject(a.fim),
		);
}

export function getNextTrips(data) {
	const today = convertFromDateObject(getTodayDateObject());
	return Object.entries(data)
		.filter(([_, v]) => convertFromDateObject(v.inicio) > today)
		.map(([id, v]) => ({ id, ...v }))
		.sort(
			(a, b) =>
				convertFromDateObject(a.inicio) - convertFromDateObject(b.inicio),
		);
}

// Accommodation
export function getAccommodationsHTML(i, innerItinerary = false) {
	const original = getState().hospedagens[i];
	const hospedagem = {
		id: original.id,
		cafe: original.cafe,
		checkIn: getHospedagensData(original.datas.checkin),
		checkOut: getHospedagensData(original.datas.checkout),
		reserva: original.reserva,
		descricao: original.descricao,
		endereco: original.endereco,
		imagens: original.imagens,
		link: original.link,
		nome: original.nome,
	};

	if (innerItinerary) {
		return getHotelBoxHTML(hospedagem, "inner-programacao", true);
	}

	const j = i + 1;
	return `<div class="swiper-slide" id="hospedagens-slide-${j}">
            <div class="testimonial-item">
              ${getHotelBoxHTML(hospedagem, j)}
            </div>
          </div>`;
}

// Request Utils
export function getErrorFromGetRequestMessage() {
	return ERROR_FROM_GET_REQUEST.message.includes(
		"Missing or insufficient permissions",
	)
		? translate("messages.access_denied.message.default")
		: ERROR_FROM_GET_REQUEST;
}

export function combineDatabaseResponses(responses) {
	if (responses.length === 1) {
		return responses[0];
	}

	const success = !responses.some((response) => response.success === false);
	let message = success
		? translate("messages.operations.success")
		: `${translate("messages.operations.error")}. ${translate("messages.documents.update.error")}`;

	return {
		message: message,
		success: success,
		data: responses,
	};
}

let CALL_SYNC = [];

// DOM Selector Utilities
export function getID(id) {
	return document.getElementById(id);
}

export function select(el, all = false) {
	el = el.trim();
	if (all) {
		return [...document.querySelectorAll(el)];
	} else {
		return document.querySelector(el);
	}
}

export function on(type, el, listener, all = false) {
	if (el === "document") {
		document.addEventListener(type, listener);
	} else if (el === "window") {
		window.addEventListener(type, listener);
	} else {
		let selectEl = all
			? [...document.querySelectorAll(el)]
			: [document.querySelector(el)];
		selectEl.forEach((e) => e && e.addEventListener(type, listener));
	}
}

export function onscroll(el, listener) {
	el.addEventListener("scroll", listener);
}























































