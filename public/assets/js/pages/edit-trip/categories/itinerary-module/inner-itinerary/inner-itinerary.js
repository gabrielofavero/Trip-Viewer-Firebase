import { getDestinos, getItinerary } from '../../../../../app/config.js';

var INNER_PROGRAMACAO = {};
var INNER_PROGRAMACAO_DETINOS_DATA = {};
var LAST_OPENED_TURNO = {};

// Carregamento Principal
function loadInnerItineraryHTML(j) {
	const key = jsDateToKey(DATAS[j - 1]);
	if (Object.keys(INNER_PROGRAMACAO).length == 0 || !INNER_PROGRAMACAO[key])
		return;

	getID(`inner-programacao-madrugada-${j}`).innerHTML = "";
	getID(`inner-programacao-manha-${j}`).innerHTML = "";
	getID(`inner-programacao-tarde-${j}`).innerHTML = "";
	getID(`inner-programacao-noite-${j}`).innerHTML = "";

	for (turno in INNER_PROGRAMACAO[key]) {
		const turnoDados = INNER_PROGRAMACAO[key][turno];
		for (let k = 1; k <= turnoDados.length; k++) {
			const dado = turnoDados[k - 1];
			const div = getID(`inner-programacao-${turno}-${j}`);

			if (dado.programacao) {
				div.innerHTML += `<div class="input-botao-container">
                                    <button id="input-botao-${turno}-${j}-${k}" class="btn input-botao draggable" onclick="openInnerItinerary(${j}, ${k}, '${turno}')">
                                        ${getInnerItineraryTitleHTML(dado, "inner-programacao-highlight")}
                                    </button>
                                    <i class="iconify drag-icon" data-icon="mdi:drag"></i>
                                </div>`;
			}

			getID(`programacao-${turno}-${j}`).style.display = div.innerHTML
				? "block"
				: "none";
		}
	}
}

// Carregamento Interno (Modal)
async function openInnerItinerary(j, k, turno) {
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
	propriedades.icones = [
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
		getID("inner-programacao-item-destinos-local").style.display = "none";
		getID("inner-programacao-item-destinos-radio-label").innerText =
			getSelectCurrentLabel(getID(`inner-programacao-select-local`));
	}

	await loadInnerProgramacaoListeners(j);
	enableAllTravelersFieldset("inner-programacao-travelers");
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
		getID("habilitado-destinos").checked === false ||
		DESTINOS_ATIVOS.length === 0
	)
		returnFalse();
	const destinations = getDestinosFromCheckbox("programacao", j);
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
		getID("inner-programacao-select-turno").value = turno;
		getID("inner-programacao-select-troca-turno").value = turno;
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
		const itemAssociado = getID("inner-programacao-item-associado");

		getID(`inner-programacao`).value = dados.programacao;
		getID(`inner-programacao-inicio`).value = dados.inicio;
		getID(`inner-programacao-fim`).value = dados.fim;
		updateTravelersFieldset(
			"inner-programacao-travelers",
			dados.pessoas || [],
		);

		switch (dados?.item?.tipo) {
			case "transporte":
				getID(`inner-programacao-item-transporte-radio`).checked = true;
				getID(`inner-programacao-item-transporte`).style.display = "block";
				getID(`inner-programacao-select-transporte`).value = dados.item.id;
				itemAssociado.innerText = getSelectCurrentLabel(
					getID(`inner-programacao-select-transporte`),
				);
				break;
			case "hospedagens":
				getID(`inner-programacao-item-hospedagens-radio`).checked = true;
				getID(`inner-programacao-item-hospedagens`).style.display = "block";
				getID(`inner-programacao-select-hospedagens`).value = dados.item.id;
				itemAssociado.innerText = getSelectCurrentLabel(
					getID(`inner-programacao-select-hospedagens`),
				);
				break;
			case "destinos":
				getID(`inner-programacao-item-destinos-radio`).checked = true;
				getID("inner-programacao-item-destinos").style.display = "block";

				getID(`inner-programacao-select-local`).value = dados.item.local;
				await innerProgramacaoSelectLocalAction();

				getID(`inner-programacao-select-categoria`).value =
					dados.item.categoria;
				await innerProgramacaoSelectCategoriaAction();

				const passeio = dados.item.id;
				if (passeio) {
					getID(`inner-programacao-select-passeio`).value = passeio;
					itemAssociado.innerText = translate(
						"trip.itinerary.linked_destination",
					);
				}
				break;
			default:
				getID(`inner-programacao-item-nenhum-radio`).checked = true;
		}
	} else if (isNew) {
		const selectTurno = getID("inner-programacao-select-turno");
		selectTurno.value = getNewTurno(j);
		LAST_OPENED_TURNO[j] = selectTurno.value;
	}
}

// Navegação do Modal
async function openInnerItineraryItem(j) {
	const height = getID("inner-programacao-tela-principal").offsetHeight;
	const itemSelecionar = getID("inner-programacao-item-selecionar");
	itemSelecionar.style.minHeight = `${height}px`;

	if (getID("inner-programacao").value) {
		getID("message-title").innerText = translate("trip.itinerary.link_item");
	}

	animate(
		["inner-programacao-item-selecionar"],
		["inner-programacao-tela-principal"],
	);
	getID("back-icon").style.visibility = "visible";
	loadTextReplacementCheckboxes(j);
	TEXT_REPLACEMENT_APPLIED = false;
}

function openInnerItinerarySwap() {
	const height = getID("inner-programacao-tela-principal").offsetHeight;
	const itemTrocar = getID("inner-programacao-item-trocar");
	itemTrocar.style.minHeight = `${height}px`;

	getID("message-title").innerText = "Trocar Programação";
	animate(
		["inner-programacao-item-trocar"],
		["inner-programacao-tela-principal"],
	);
	getID("back-icon").style.visibility = "visible";
}

function closeInnerProgramacao(j) {
	if (getID("inner-programacao-item-selecionar").style.display === "block") {
		const itemAssociado = getID("inner-programacao-item-associado");
		if (getID("inner-programacao-item-transporte-radio").checked) {
			itemAssociado.innerText = getSelectCurrentLabel(
				getID(`inner-programacao-select-transporte`),
			);
		} else if (getID("inner-programacao-item-hospedagens-radio").checked) {
			itemAssociado.innerText = getSelectCurrentLabel(
				getID(`inner-programacao-select-hospedagens`),
			);
		} else if (getID("inner-programacao-item-destinos-radio").checked) {
			itemAssociado.innerText = getSelectCurrentLabel(
				getID(`inner-programacao-select-passeio`),
			);
		} else {
			itemAssociado.innerText = translate("trip.itinerary.link_item");
		}

		getID("message-title").innerText = getInnerProgramacaoMessageTitle(j);
		getID("back-icon").style.visibility = "hidden";

		replaceTextIfEnabled();
		replaceTimeIfEnabled();
		TEXT_REPLACEMENT_APPLIED = true;

		animate(
			["inner-programacao-tela-principal"],
			["inner-programacao-item-selecionar"],
		);
	} else if (getID("inner-programacao-item-trocar").style.display === "block") {
		getID("message-title").innerText = getInnerProgramacaoMessageTitle(j);
		getID("back-icon").style.visibility = "hidden";

		animate(
			["inner-programacao-tela-principal"],
			["inner-programacao-item-trocar"],
		);
	}
}

function getInnerProgramacaoMessageTitle(j) {
	const newJ = getMostRecentJ(j);
	return getDateTitle(DATAS[newJ - 1], "mini");
}

function innerProgramacaoConfirmAction(j, k, turno) {
	if (getID("inner-programacao-item-selecionar").style.display === "block") {
		closeInnerProgramacao(j);
		return;
	}
	if (turno && turno != "undefined") {
		addInnerProgramacao(j, k, turno);
	} else {
		addInnerProgramacao(j);
	}

	if (!getID("inner-programacao")?.value) {
		return;
	}

	closeMessage();
}

// Salvar Inner Programação
function addInnerProgramacao(j, k, turno) {
	const programacao = getID(`inner-programacao`);

	if (!TEXT_REPLACEMENT_APPLIED) {
		replaceTextIfEnabled();
		replaceTimeIfEnabled();
	}

	if (
		!programacao.value ||
		!validateTravelersFieldset("inner-programacao-travelers")
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
			getID("inner-programacao-item-transporte-radio").checked &&
			getID(`inner-programacao-select-transporte`).value
		) {
			item.tipo = "transporte";
			item.id = getID(`inner-programacao-select-transporte`).value;
		} else if (
			getID("inner-programacao-item-hospedagens-radio").checked &&
			getID(`inner-programacao-select-hospedagens`).value
		) {
			item.tipo = "hospedagens";
			item.id = getID(`inner-programacao-select-hospedagens`).value;
		} else if (
			getID("inner-programacao-item-destinos-radio").checked &&
			getID(`inner-programacao-select-passeio`).value
		) {
			item.tipo = "destinos";
			item.local = getID(`inner-programacao-select-local`).value;
			item.id = getID(`inner-programacao-select-passeio`).value;
			item.categoria = getID(`inner-programacao-select-categoria`).value;
		}

		return {
			programacao: programacao.value,
			pessoas: getCheckedTravelersIDs("inner-programacao-travelers"),
			inicio: getID(`inner-programacao-inicio`).value,
			fim: getID(`inner-programacao-fim`).value,
			item: item,
		};
	}

	function setInnerProgramacao(innerItinerary, j, k, turno) {
		const key = jsDateToKey(DATAS[j - 1]);
		const isNew = !k && !turno;
		const newTurno = getID(`inner-programacao-select-turno`).value;

		if (isNew) {
			// Nova Inner Programação (Apenas Adição)
			INNER_PROGRAMACAO[key][newTurno].push(innerItinerary);
			LAST_OPENED_TURNO[j] = newTurno;
		} else {
			// Inner Programacao Existente (Substituição)
			const newJ = getMostRecentJ(j);
			if (turno == newTurno && newJ == j) {
				// Substituição Simples
				INNER_PROGRAMACAO[key][turno][k - 1] = innerItinerary;
			} else {
				// Substituição Composta
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

// Deletar Inner Programação
function deleteInnerProgramacao(j, k, turno) {
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
	const itemTransporte = getID(`inner-programacao-item-transporte`);
	const itemHospedagens = getID(`inner-programacao-item-hospedagens`);
	const itemDestinos = getID(`inner-programacao-item-destinos`);

	getID(`inner-programacao-item-transporte-radio`).addEventListener(
		"change",
		() => {
			itemTransporte.style.display = "block";
			itemHospedagens.style.display = "none";
			itemDestinos.style.display = "none";
			loadTextReplacementCheckboxes(j);
		},
	);

	getID(`inner-programacao-item-hospedagens-radio`).addEventListener(
		"change",
		() => {
			itemTransporte.style.display = "none";
			itemHospedagens.style.display = "block";
			itemDestinos.style.display = "none";
			loadTextReplacementCheckboxes(j);
		},
	);

	getID(`inner-programacao-item-destinos-radio`).addEventListener(
		"change",
		() => {
			itemTransporte.style.display = "none";
			itemHospedagens.style.display = "none";
			itemDestinos.style.display = "block";
			loadTextReplacementCheckboxes(j);
		},
	);

	getID(`inner-programacao-item-nenhum-radio`).addEventListener(
		"change",
		() => {
			itemTransporte.style.display = "none";
			itemHospedagens.style.display = "none";
			itemDestinos.style.display = "none";
			loadTextReplacementCheckboxes(j);
		},
	);

	getID(`inner-programacao-select-local`).addEventListener("change", () =>
		innerProgramacaoSelectLocalAction(),
	);
	getID(`inner-programacao-select-categoria`).addEventListener("change", () =>
		innerProgramacaoSelectCategoriaAction(),
	);
	getID("inner-programacao-select-passeio").addEventListener("change", () =>
		loadTextReplacementCheckboxes(j),
	);

	getID("inner-programacao-select-transporte").addEventListener("change", () =>
		loadTextReplacementCheckboxes(j),
	);
	getID("inner-programacao-select-hospedagens").addEventListener("change", () =>
		loadTextReplacementCheckboxes(j),
	);

	getID("inner-programacao-select-turno").addEventListener("change", () =>
		pairTurnos("inner-programacao-select-turno"),
	);
	getID("inner-programacao-select-troca-turno").addEventListener("change", () =>
		pairTurnos("inner-programacao-select-troca-turno"),
	);
}

async function innerProgramacaoSelectLocalAction() {
	const selectLocal = getID("inner-programacao-select-local");
	const selectCategoria = getID("inner-programacao-select-categoria");
	const selectPasseio = getID("inner-programacao-select-passeio");

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
	const selectLocal = getID("inner-programacao-select-local");
	const selectCategoria = getID("inner-programacao-select-categoria");
	const selectPasseio = getID("inner-programacao-select-passeio");

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

	const passeios = getDestinos().categorias.passeios;
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
			...value,
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
	getID("inner-programacao-inicio").addEventListener(
		"change",
		function (event) {
			const inicioValue = event.target.value;
			const inicioHora = parseInt(inicioValue.split(":")[0]);
			getID("inner-programacao-select-turno").value = getTurno(inicioHora);
		},
	);

	getID(`inner-programacao-fim`).addEventListener("change", function (event) {
		const fimValue = event.target.value;
		const fimHora = parseInt(fimValue.split(":")[0]);
		const fimMinuto = parseInt(fimValue.split(":")[1]);

		const inicioValue = getID(`inner-programacao-inicio`).value;
		const inicioHora = parseInt(inicioValue.split(":")[0]);
		const inicioMinuto = parseInt(inicioValue.split(":")[1]);

		if (
			fimHora < inicioHora ||
			(fimHora == inicioHora && fimMinuto < inicioMinuto)
		) {
			getID(`inner-programacao-fim`).value = "";
			getID(`inner-programacao-fim`).reportValidity();
		}
	});

	getID("inner-programacao-item-destinos-radio").addEventListener(
		"click",
		function () {
			innerProgramacaoSelectLocalAction();
		},
	);
}

function getTurno(inicioHora) {
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
	const id1 = "inner-programacao-select-turno";
	const id2 = "inner-programacao-select-troca-turno";

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
	const nova = getID("inner-programacao-select-troca-data")?.value;

	if (nova) {
		const keys = DATAS.map((data) => jsDateToKey(data));
		const atual = keys[j - 1];
		if (atual != nova) {
			const turno = getID("inner-programacao-select-troca-turno").value;
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
		for (const turno of getItinerary().timeofday) {
			const element = getID(`inner-programacao-${turno}-${j}`);
			if (element && !element.innerText) {
				return turno;
			}
		}
	}
	return "noite";
}

function afterDragInnerItinerary(evt) {
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
