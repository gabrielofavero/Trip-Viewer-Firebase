// Text Utils
export function _firstCharToUpperCase(str) {
	return str.charAt(0).toUpperCase() + str.slice(1);
}

export function _codifyText(inputString) {
	let lowercaseString = inputString.toLowerCase();
	let validFolderName = lowercaseString.replace(/[^a-z0-9_]/g, "");
	return validFolderName;
}

export function _uncodifyText(inputString) {
	return inputString
		.replace(/_/g, " ")
		.replace(/\b\w/g, (l) => l.toUpperCase());
}

export function _getRandomID({ idLength = 5, pool = [] } = {}) {
	const characters =
		"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
	const array = new Uint32Array(idLength);
	crypto.getRandomValues(array); // native + secure

	let randomId = "";
	for (let i = 0; i < idLength; i++) {
		randomId += characters[array[i] % characters.length];
	}

	// avoid collision
	return pool.includes(randomId) ? _getRandomID({ idLength, pool }) : randomId;
}

export function _getEmptyChar() {
	return "\u200B";
}

export function _getLastUpdatedOnText(date) {
	if (typeof date === "string") {
		date = new Date(date);
	}
	const dateString = _getDateString(date, _getDateRegionalFormat());
	return `${translate("labels.last_updated_on")} ${dateString}`;
}

// Object Utils
export function _isObject(obj) {
	return obj === Object(obj);
}

export function _objectExistsAndHasKeys(obj) {
	return _isObject(obj) && obj && Object.keys(obj).length > 0;
}

export function _getIdFromObjectDB(dbObject) {
	try {
		const segments = dbObject.data._delegate._key.path.segments;
		return segments[segments.length - 1];
	} catch (e) {
		console.error("Cannot get ID from DB: " + e.message);
		return;
	}
}

export function _printObjectHTML(obj) {
	var str = "<br>";
	for (var key in obj) {
		if (obj.hasOwnProperty(key)) {
			const formattedKey = _uncodifyText(key);
			str += `<br><strong>${formattedKey}:</strong> ${obj[key]}`;
		}
	}
	return str;
}

export function _cloneObject(object) {
	return JSON.parse(JSON.stringify(object));
}

export function _getLocalJSON() {
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

export function _areObjectsEqual(obj1, obj2, ignoredPaths = []) {
	return _deepObjectsEqual(obj1, obj2, "", new Set(ignoredPaths));

	function _deepObjectsEqual(val1, val2, path, ignored) {
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
			if (!_deepObjectsEqual(val1[key], val2[key], nextPath, ignored)) {
				return false;
			}
		}

		return true;
	}
}

export function _getObjectDiff({ obj1, obj2, ignoredPaths = [], name = "Object" }) {
	const differences = [];
	const ignored = new Set(ignoredPaths);

	_collectObjectDiffs(obj1, obj2, "", ignored, differences);

	return {
		name,
		areEqual: differences.length === 0,
		differences,
	};
}

export function _collectObjectDiffs(val1, val2, path, ignored, diffs) {
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
		_collectObjectDiffs(val1[key], val2[key], nextPath, ignored, diffs);
	}
}

// Array Utils
export function _getReadableArray(arr) {
	if (arr.length <= 1) return arr[0] ?? "";
	const andLabel = translate("labels.and");
	const last = arr.pop();
	return `${arr.join(", ")} ${andLabel} ${last}`;
}

// Element Utils
export function _getChildIDs(parentId) {
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

export function _setRequired(id) {
	const div = getID(id);
	if (div) {
		div.setAttribute("required", "");
	}
}

export function _removeRequired(id) {
	const div = getID(id);
	if (div) {
		div.removeAttribute("required");
	}
}

export function _getOptionsFromSelect(id) {
	const selectElement = getID(id);
	let optionValues = [];

	for (let i = 0; i < selectElement.options.length; i++) {
		optionValues.push(selectElement.options[i].value);
	}
	return optionValues;
}

export function _removeChild(tipo) {
	const div = getID(tipo);
	div.parentNode.removeChild(div);
}

export function _removeChildWithValidation(categoria, j) {
	const id = getID(`${categoria}-inner-box-${j}`)
		? `${categoria}-inner-box-${j}`
		: `${categoria}-${j}`;
	_removeChild(id);
	_hideParentIfNoChildren(categoria);
}

export function _hideParentIfNoChildren(categoria) {
	if (_getChildIDs(`${categoria}-box`).length === 0) {
		getID(`habilitado-${categoria}`).checked = false;
		_hideContent(categoria);
	}
}

export function _removeEmptyChild(categoria) {
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
		const j = _getFirstJ(`${categoria}-box`);
		if (j && !_hasUserData(itens, j)) {
			_removeChild(`${categoria}-${j}`);
		}
	}

	function _hasUserData(itens, j) {
		for (const item of itens) {
			if (getID(`${item}-${j}`).value) {
				return true;
			}
		}
		return false;
	}
}

export function _getIDs(divID) {
	const ids = [];
	for (const item of divID.split("-")) {
		if (!isNaN(item)) {
			ids.push(parseInt(item));
		}
	}
	return ids.join("-");
}

export function _getJ(id) {
	const jSplit = id.split("-");
	return parseInt(jSplit[jSplit.length - 1]);
}

export function _getJs(parentID) {
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

export function _findJFromID(id, tipo) {
	const js = _getJs(`${tipo}-box`);
	for (const j of js) {
		const result = getID(`${tipo}-id-${j}`).value;
		if (result === id) {
			return j;
		}
	}
	return 0;
}

export function _getFirstJ(parentID) {
	const js = _getJs(parentID);
	return js[0];
}

export function _getLastJ(parentID) {
	const js = _getJs(parentID);
	return js.length === 0 ? 0 : js[js.length - 1];
}

export function _getLastUnorderedJ(parentID) {
	const js = _getJs(parentID);
	return js.length === 0 ? 0 : Math.max(...js);
}

export function _getNextJ(parentID) {
	return _getLastUnorderedJ(parentID) + 1;
}

export function _getCategoriaID(tipo, j) {
	const js = _getJs(`${tipo}-box`);
	let ids = [];

	for (const innerJ of js) {
		const id = getID(`${tipo}-id-${innerJ}`).value;
		if (id) ids.push(id);
	}

	const currentID = getID(`${tipo}-id-${j}`).value;
	if (currentID && !ids.includes(currentID)) {
		return currentID;
	}

	return _getRandomID({ pool: ids });
}

export function _getOrCreateCategoriaID(tipo, j) {
	const currentID = getID(`${tipo}-id-${j}`).value;
	return currentID ? currentID : _getCategoriaID(tipo, j);
}

// URL Utils
export function _getURLParams() {
	const urlParams = new URLSearchParams(window.location.search);
	const params = {};
	for (const [internalKey, value] of urlParams) {
		params[internalKey] = value;
	}
	return params;
}

export function _getURLParam(param) {
	const urlParams = new URLSearchParams(window.location.search);
	return urlParams.get(param);
}

export function _setURLParam(key, value) {
	const url = new URL(window.location.href);
	url.searchParams.set(key, value);
	window.history.replaceState({}, "", url);
}

// Document Utils

export function _getDataDocument(tipo) {
	switch (tipo) {
		case "viagens":
		case "listagens":
			return FIRESTORE_DATA;
		case "destinos":
			return FIRESTORE_DESTINOS_DATA;
		default:
			return null;
	}
}

export function _getNewDataDocument(tipo) {
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

export function _getTranslatedDocumentLabel(type) {
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

export function _getOrderedDocumentByUpdateDate(data) {
	return Object.entries(data)
		.map(([id, v]) => ({ id, ...v }))
		.sort(
			(a, b) =>
				new Date(b.versao.ultimaAtualizacao) -
				new Date(a.versao.ultimaAtualizacao),
		);
}

export function _getOrderedDocumentByTitle(data) {
	return Object.entries(data)
		.map(([id, v]) => ({ id, ...v }))
		.sort((a, b) => a.titulo.localeCompare(b.titulo));
}

// Destination
export function _getAndDestinationTitle(value, destinos = [], placeholder = true) {
	if (!destinos || destinos.length === 0) {
		const placeholderValue = placeholder
			? translate("trip.itinerary.title")
			: "";
		return value || placeholderValue;
	}

	const titles = destinos.map((d) => d.titulo);
	if (value.includes("departure")) {
		return _getReadableArray([
			translate("trip.transportation.departure"),
			...titles,
		]);
	}

	if (value.includes("return")) {
		return _getReadableArray([
			...titles,
			translate("trip.transportation.return"),
		]);
	}

	return _getReadableArray([titles]);
}

export async function _normalizeTikTokLink(link) {
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

export function _getDestinationTitle(item) {
	if (item.nome && item.emoji) {
		return `${item.nome} ${item.emoji}`;
	} else return item.nome;
}

export function _getDestinosBoxHTML({
	j,
	item,
	innerProgramacao,
	valores,
	moeda,
	planejado,
	editBtn,
}) {
	return `
    <div ${innerProgramacao ? "" : `class="accordion-body" id="accordion-body-${j}"`}>
        ${_getDestinosAccordionBodyHTML({ j, item, valores, moeda, planejado, editBtn })}
    </div>`;
}

// Itinerary
export function _getInnerProgramacaoTitle(dado, viajantes = TRAVELERS) {
	const programacao = dado.programacao || "";
	const presentes = !dado.pessoas
		? []
		: dado.pessoas
				.filter((p) => p.isPresent)
				.map((p) => viajantes.find((t) => t.id === p.id)?.nome ?? "");

	const pessoasTexto =
		presentes.length === 0 || presentes.length === viajantes.length
			? ""
			: _getReadableArray(presentes);

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

export function _getInnerProgramacaoTitleHTML(dado, spanClass) {
	const titleObj = _getInnerProgramacaoTitle(dado);
	return titleObj.title
		? `<span class="${spanClass}">${titleObj.title}:</span> ${titleObj.content}`
		: titleObj.content;
}

export function _getInnerProgramacao(item, destinos) {
	const innerProgramacao = {
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
			if (FIRESTORE_DATA.modulos.transportes === true && item.id) {
				index = FIRESTORE_DATA.transportes.dados
					.map((programacao) => programacao.id)
					.indexOf(item.id);
				if (index >= 0) {
					const transporte = FIRESTORE_DATA.transportes.dados[index];
					innerProgramacao.titulo = `${transporte.pontos.partida} → ${transporte.pontos.chegada}`;
					innerProgramacao.content = _getFlightBoxHTML(
						index + 1,
						"inner-programacao",
						true,
					);
				}
			}
			break;
		case "hospedagens":
			if (FIRESTORE_DATA.modulos.hospedagens === true && item.id) {
				index = FIRESTORE_DATA.hospedagens
					.map((hospedagem) => hospedagem.id)
					.indexOf(item.id);
				if (index >= 0) {
					innerProgramacao.titulo = "";
					innerProgramacao.content = _getHospedagensHTML(index, true);
				}
			}
			break;
		case "destinos":
			if (
				FIRESTORE_DATA.modulos.destinos === true &&
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
						innerProgramacao.titulo = _getDestinationTitle(destinoItem);
						innerProgramacao.content = _getDestinosBoxHTML({
							j: 1,
							id: item.id,
							item: destinoItem,
							innerProgramacao: true,
							valores: _getDestinoValores(DESTINOS[index]),
							moeda: destinos.moeda,
						});
						innerProgramacao.midia = destinoItem?.midia;
					}
				}
			}
	}

	return innerProgramacao;

	function _getDestinoValores(destino) {
		const moeda = _cloneObject(CONFIG.moedas.escala[destino.destinos.moeda]);
		const max = translate("destination.price.max", { value: moeda["$$$$"] });
		moeda["-"] = translate("destination.price.free");
		moeda["default"] = translate("destination.price.default");
		moeda["$$$$"] = max;
		return moeda;
	}
}

export function _getLinkMediaButton(midia, tipo) {
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
export function _getCurrentTrips(data) {
	const today = _convertFromDateObject(_getTodayDateObject());
	return Object.entries(data)
		.filter(([_, v]) => {
			const start = _convertFromDateObject(v.inicio);
			const end = _convertFromDateObject(v.fim);
			return start <= today && today <= end;
		})
		.map(([id, v]) => ({ id, ...v }));
}

export function _getPreviousTrips(data) {
	const today = _convertFromDateObject(_getTodayDateObject());
	return Object.entries(data)
		.filter(([_, v]) => _convertFromDateObject(v.fim) < today)
		.map(([id, v]) => ({ id, ...v }))
		.sort(
			(a, b) => _convertFromDateObject(b.fim) - _convertFromDateObject(a.fim),
		);
}

export function _getNextTrips(data) {
	const today = _convertFromDateObject(_getTodayDateObject());
	return Object.entries(data)
		.filter(([_, v]) => _convertFromDateObject(v.inicio) > today)
		.map(([id, v]) => ({ id, ...v }))
		.sort(
			(a, b) =>
				_convertFromDateObject(a.inicio) - _convertFromDateObject(b.inicio),
		);
}

// Accommodation
export function _getHospedagensHTML(i, innerProgramacao = false) {
	const original = FIRESTORE_DATA.hospedagens[i];
	const hospedagem = {
		id: original.id,
		cafe: original.cafe,
		checkIn: _getHospedagensData(original.datas.checkin),
		checkOut: _getHospedagensData(original.datas.checkout),
		reserva: original.reserva,
		descricao: original.descricao,
		endereco: original.endereco,
		imagens: original.imagens,
		link: original.link,
		nome: original.nome,
	};

	if (innerProgramacao) {
		return _getHotelBoxHTML(hospedagem, "inner-programacao", true);
	}

	const j = i + 1;
	return `<div class="swiper-slide" id="hospedagens-slide-${j}">
            <div class="testimonial-item">
              ${_getHotelBoxHTML(hospedagem, j)}
            </div>
          </div>`;
}

// Request Utils
export function _getErrorFromGetRequestMessage() {
	return ERROR_FROM_GET_REQUEST.message.includes(
		"Missing or insufficient permissions",
	)
		? translate("messages.access_denied.message.default")
		: ERROR_FROM_GET_REQUEST;
}

export function _combineDatabaseResponses(responses) {
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

// BACKWARD COMPAT: attach to window during migration
window.CALL_SYNC = [];
window.FIRESTORE_DATA = undefined;
window.SHEET_DATA = undefined;
window.P_DATA = undefined;
window.HYPERLINK = undefined;
window.CONFIG = undefined;
window._firstCharToUpperCase = _firstCharToUpperCase;
window._codifyText = _codifyText;
window._uncodifyText = _uncodifyText;
window._getRandomID = _getRandomID;
window._getEmptyChar = _getEmptyChar;
window._getLastUpdatedOnText = _getLastUpdatedOnText;
window._isObject = _isObject;
window._objectExistsAndHasKeys = _objectExistsAndHasKeys;
window._getIdFromObjectDB = _getIdFromObjectDB;
window._printObjectHTML = _printObjectHTML;
window._cloneObject = _cloneObject;
window._getLocalJSON = _getLocalJSON;
window._areObjectsEqual = _areObjectsEqual;
window._getObjectDiff = _getObjectDiff;
window._collectObjectDiffs = _collectObjectDiffs;
window._getReadableArray = _getReadableArray;
window._getChildIDs = _getChildIDs;
window._setRequired = _setRequired;
window._removeRequired = _removeRequired;
window._getOptionsFromSelect = _getOptionsFromSelect;
window._removeChild = _removeChild;
window._removeChildWithValidation = _removeChildWithValidation;
window._hideParentIfNoChildren = _hideParentIfNoChildren;
window._removeEmptyChild = _removeEmptyChild;
window._getIDs = _getIDs;
window._getJ = _getJ;
window._getJs = _getJs;
window._findJFromID = _findJFromID;
window._getFirstJ = _getFirstJ;
window._getLastJ = _getLastJ;
window._getLastUnorderedJ = _getLastUnorderedJ;
window._getNextJ = _getNextJ;
window._getCategoriaID = _getCategoriaID;
window._getOrCreateCategoriaID = _getOrCreateCategoriaID;
window._getURLParams = _getURLParams;
window._getURLParam = _getURLParam;
window._setURLParam = _setURLParam;
window._getDataDocument = _getDataDocument;
window._getNewDataDocument = _getNewDataDocument;
window._getTranslatedDocumentLabel = _getTranslatedDocumentLabel;
window._getOrderedDocumentByUpdateDate = _getOrderedDocumentByUpdateDate;
window._getOrderedDocumentByTitle = _getOrderedDocumentByTitle;
window._getAndDestinationTitle = _getAndDestinationTitle;
window._normalizeTikTokLink = _normalizeTikTokLink;
window._getDestinationTitle = _getDestinationTitle;
window._getDestinosBoxHTML = _getDestinosBoxHTML;
window._getInnerProgramacaoTitle = _getInnerProgramacaoTitle;
window._getInnerProgramacaoTitleHTML = _getInnerProgramacaoTitleHTML;
window._getInnerProgramacao = _getInnerProgramacao;
window._getLinkMediaButton = _getLinkMediaButton;
window._getCurrentTrips = _getCurrentTrips;
window._getPreviousTrips = _getPreviousTrips;
window._getNextTrips = _getNextTrips;
window._getHospedagensHTML = _getHospedagensHTML;
window._getErrorFromGetRequestMessage = _getErrorFromGetRequestMessage;
window._combineDatabaseResponses = _combineDatabaseResponses;
