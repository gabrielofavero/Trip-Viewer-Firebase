import { cloneObject, firstCharToUpperCase, getID } from '../../../utils/dom.js';
import { translate } from '../../../i18n/translation.js';
import { initializeSortableForGroup } from '../../../ui/sortable.js';
import { closeMessage, displayFullMessage, getContainersInput } from '../../../utils/messages.js';
import { getFieldValueOrNotify } from '../../../ui/fields.js';

var INNER_EXPENSES = {
	gastosPrevios: [],
	gastosDurante: [],
};

var LAST_INNER_EXPENSE_TYPE = "";

function loadExpenses(data = FIRESTORE_GASTOS_DATA) {
	pushExpense("gastosPrevios", data);
	pushExpense("gastosDurante", data);
	loadExpensesHTML();
}

async function getExpensesObject() {
	const gastosDurante = getExpenses("gastosDurante");
	const gastosPrevios = getExpenses("gastosPrevios");

	if (gastosDurante.length === 0 && gastosPrevios.length === 0) {
		return {};
	}

	return {
		compartilhamento: await getSharingObject(),
		gastosDurante,
		gastosPrevios,
		moeda: getID(`moeda`).value,
		pessoas: getTravelersObject(),
		versao: {
			ultimaAtualizacao: new Date().toISOString(),
		},
	};

	function getExpenses(categoria) {
		let result = [];
		for (const tipoObj of INNER_EXPENSES[categoria]) {
			result = [...result, ...tipoObj.gastos];
		}
		return result;
	}
}

// Gastos e Inner Gastos
function pushExpense(tipo, data) {
	data = data || {};
	if (!data[tipo]) {
		data[tipo] = [];
	}

	for (const gasto of data[tipo]) {
		const tipos = INNER_EXPENSES[tipo].map((gasto) => gasto.tipo);
		const index = tipos.indexOf(gasto.tipo);
		if (index === -1) {
			INNER_EXPENSES[tipo].push({
				tipo: gasto.tipo,
				gastos: [gasto],
			});
		} else {
			INNER_EXPENSES[tipo][index].gastos.push(gasto);
		}
	}
}

function loadExpensesHTML() {
	for (const categoria in INNER_EXPENSES) {
		getID(categoria).innerHTML = "";
		for (const innerGasto of INNER_EXPENSES[categoria]) {
			buildInnerGasto(categoria, innerGasto);
		}
	}

	function buildInnerGasto(categoria, innerGasto) {
		const div = document.createElement("div");
		const id = `${categoria}-${innerGasto.tipo}`;
		div.className = "gastos-item draggable-area";
		div.dataset.group = id;
		div.id = id;

		const label = document.createElement("label");
		label.innerText = translate(innerGasto.tipo, {}, false);
		div.appendChild(label);

		for (let i = 0; i < innerGasto.gastos.length; i++) {
			const gasto = innerGasto.gastos[i];
			const container = document.createElement("div");
			container.className = "input-botao-container";

			const button = document.createElement("button");
			button.className = "btn input-botao draggable";
			button.innerHTML = gasto.pessoa
				? `<span class="highlight">${getTravelerName(gasto.pessoa)}:</span> ${gasto.nome}`
				: gasto.nome;
			button.onclick = () => openInnerExpense(categoria, innerGasto.tipo, i);
			container.appendChild(button);

			const icon = document.createElement("i");
			icon.className = "iconify drag-icon";
			icon.dataset.icon = "mdi:drag";
			container.appendChild(icon);

			div.appendChild(container);
		}

		getID(categoria).appendChild(div);
		initializeSortableForGroup(id, { onEnd: _afterDragInnerGasto });
	}
}

export function openInnerExpense(categoria, tipo = "", index = -1) {
	const propriedades = cloneObject(MESSAGE_PROPERTIES);
	propriedades.titulo = tipo
		? translate("labels.edit")
		: translate("labels.add");
	propriedades.conteudo = getInnerExpenseContent(categoria, tipo, index);
	propriedades.icones = [{ tipo: "voltar", acao: "" }];
	propriedades.containers = getContainersInput();
	propriedades.botoes = [
		{
			tipo: "cancelar",
		},
		{
			tipo: "confirmar",
			acao: `saveInnerExpense('${categoria}', '${tipo}', ${index})`,
		},
	];
	displayFullMessage(propriedades);

	if (tipo && index >= 0) {
		const gasto = INNER_EXPENSES[categoria].find(
			(tipoObj) => tipoObj.tipo === tipo,
		).gastos[index];
		getID("gasto-nome").value = gasto.nome;
		getID("gasto-pessoa").value = gasto.pessoa || "";
		getID("gasto-moeda").value = gasto.moeda;
		getID("gasto-valor").value = gasto.valor;
		applyExpenseInnerType(gasto.tipo);
	} else {
		getID("gasto-deletar").style.display = "none";
		getID("gasto-moeda").value = getID("moeda").value;
		if (LAST_INNER_EXPENSE_TYPE) {
			applyExpenseInnerType(LAST_INNER_EXPENSE_TYPE);
		}
	}

	getID("gasto-tipo-select").addEventListener("change", (e) => {
		getID("gasto-tipo-input").style.display =
			e.target.value === "custom" ? "block" : "none";
	});

	getID("gasto-valor").addEventListener("input", (e) => {
		const value = e.target.value;
		if (value && !isNaN(value)) {
			const floatValue = parseFloat(e.target.value);
			const decimals = floatValue.toString().split(".")[1];
			if (decimals && decimals.length > 2) {
				e.target.value = floatValue.toFixed(2);
			}
		}
	});

	getID("gasto-tipo-input").addEventListener("change", (e) => {
		e.target.value = firstCharToUpperCase(e.target.value.trim());
	});
}

function applyExpenseInnerType(tipo) {
	const values = Array.from(getID("gasto-tipo-select").options).map(
		(option) => option.value,
	);
	if (values.includes(tipo)) {
		getID("gasto-tipo-select").value = tipo;
	} else {
		getID("gasto-tipo-select").value = "custom";
		getID("gasto-tipo-input").value = tipo;
		getID("gasto-tipo-input").style.display = "block";
	}
}

function getInnerExpenseContent(categoria, tipo, index) {
	return `<div id='inner-gasto-box'>
                <div class="nice-form-group">
                    <label>${translate("labels.name")}</label>
                    <input required id="gasto-nome" type="text" placeholder="${translate("trip.transportation.type.flight")}" />
                </div>
                <div class="nice-form-group">
                    <label>${translate("labels.type")}</label>
                    <select id="gasto-tipo-select" clas="editar-select"">
                        <option value="trip.transportation.type.flights">${translate("trip.transportation.type.flights")}</option>
                        <option value="trip.accommodation.title">${translate("trip.accommodation.title")}</option>
                        <option value="labels.entrertainment">${translate("labels.entrertainment")}</option>
                        <option value="trip.expenses.daily">${translate("trip.expenses.daily")}</option>
                        <option value="labels.people">${translate("labels.people")}</option>
                        <option value="trip.transportation.type.car">${translate("trip.transportation.type.car")}</option>
                        <option value="trip.transportation.title">${translate("trip.transportation.title")}</option>
                        <option value="labels.other">${translate("labels.other")}</option>
                        <option value="custom">${translate("labels.custom")}</option>
                    </select>
                    <input required id="gasto-tipo-input" type="text" placeholder="${translate("trip.transportation.title")}" style="margin-top: 8px; display: none"/>
                </div>
                <div class="nice-form-group" style="display:${TRAVELERS.length === 0 ? "none" : ""}">
                    <label>${translate("trip.expenses.paid_by")}</label>
                        <select id="gasto-pessoa" class="editar-select" name="pessoa">
                        <option value="">${translate("labels.non_specified")}</option>
                        ${getTravelersSelectOptionsHTML()}
                    </select>
                </div>
                <div class="nice-form-group">
                    <label>${translate("currency.title")}</label>
                        <select id="gasto-moeda" class="editar-select" name="currency">
                        <option value="BRL">${translate("currency.type.BRL")}</option>
                        <option value="USD">${translate("currency.type.USD")}</option>
                        <option value="EUR">${translate("currency.type.EUR")}</option>
                        <option value="GBP">${translate("currency.type.GBP")}</option>
                        <option value="JPY">${translate("currency.type.JPY")}</option>
                        <option value="INR">${translate("currency.type.INR")}</option>
                        <option value="RUB">${translate("currency.type.RUB")}</option>
                        <option value="CAD">${translate("currency.type.CAD")}</option>
                        <option value="AUD">${translate("currency.type.AUD")}</option>
                        <option value="CHF">${translate("currency.type.CHF")}</option>
                        <option value="SEK">${translate("currency.type.SEK")}</option>
                        <option value="NOK">${translate("currency.type.NOK")}</option>
                        <option value="DKK">${translate("currency.type.DKK")}</option>
                        <option value="NZD">${translate("currency.type.NZD")}</option>
                        <option value="MXN">${translate("currency.type.MXN")}</option>
                        <option value="ZAR">${translate("currency.type.ZAR")}</option>
                        <option value="KRW">${translate("currency.type.KRW")}</option>
                        <option value="SGD">${translate("currency.type.SGD")}</option>
                        <option value="HKD">${translate("currency.type.HKD")}</option>
                        <option value="ILS">${translate("currency.type.ILS")}</option>
                        <option value="PLN">${translate("currency.type.PLN")}</option>
                        <option value="HUF">${translate("currency.type.HUF")}</option>
                        <option value="TWD">${translate("currency.type.TWD")}</option>
                        <option value="THB">${translate("currency.type.THB")}</option>
                    </select>
                </div>
                <div class="nice-form-group">
                    <label>${translate("labels.cost")}</label>
                    <input required class="input-full" id="gasto-valor" type="number" placeholder="0.00" step="0.01">
                </div>
                <div class="button-box-right" id="gasto-deletar" style="margin-top: 8px; margin-bottom: 8px;">
                        <button data-action="delete-inner-expense" data-category="${categoria}" data-type="${tipo}" data-index="${index}" class="btn btn-basic btn-format">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
                                <path fill="currentColor" fill-rule="evenodd" d="M8.106 2.553A1 1 0 0 1 9 2h6a1 1 0 0 1 .894.553L17.618 6H20a1 1 0 1 1 0 2h-1v11a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3V8H4a1 1 0 0 1 0-2h2.382l1.724-3.447ZM14.382 4l1 2H8.618l1-2h4.764ZM11 11a1 1 0 1 0-2 0v6a1 1 0 1 0 2 0v-6Zm4 0a1 1 0 1 0-2 0v6a1 1 0 1 0 2 0v-6Z" clip-rule="evenodd"></path>
                            </svg>
                        </button>
                    </div>
            </div>`;
}

function saveInnerExpense(categoria, tipo, index = -1) {
	const valor = getFieldValueOrNotify("gasto-valor");
	const newGasto = {
		nome: getFieldValueOrNotify("gasto-nome"),
		tipo:
			getID("gasto-tipo-select").value === "custom"
				? getFieldValueOrNotify("gasto-tipo-input")
				: getID("gasto-tipo-select").value,
		pessoa: getID("gasto-pessoa").value || "",
		moeda: getFieldValueOrNotify("gasto-moeda"),
		valor: valor ? parseFloat(parseFloat(valor).toFixed(2)) : null,
	};

	if (!newGasto.nome || !newGasto.tipo || !newGasto.moeda || !newGasto.valor)
		return;

	LAST_INNER_EXPENSE_TYPE = newGasto.tipo;

	if (tipo && index >= 0) {
		if (tipo == newGasto.tipo) {
			INNER_EXPENSES[categoria].find((tipoObj) => tipoObj.tipo === tipo).gastos[
				index
			] = newGasto;
		} else {
			INNER_EXPENSES[categoria]
				.find((tipoObj) => tipoObj.tipo === tipo)
				.gastos.splice(index, 1);
			let tipoObj = INNER_EXPENSES[categoria].find(
				(tipoObj) => tipoObj.tipo === newGasto.tipo,
			);
			if (tipoObj) {
				tipoObj.gastos.push(newGasto);
			} else {
				INNER_EXPENSES[categoria].push({
					tipo: newGasto.tipo,
					gastos: [newGasto],
				});
			}
		}
	} else {
		const tipos = INNER_EXPENSES[categoria].map((tipoObj) => tipoObj.tipo);
		if (tipos.includes(newGasto.tipo)) {
			INNER_EXPENSES[categoria]
				.find((tipoObj) => tipoObj.tipo === newGasto.tipo)
				.gastos.push(newGasto);
		} else {
			INNER_EXPENSES[categoria].push({ tipo: newGasto.tipo, gastos: [newGasto] });
		}
	}
	updateInnerGastos();
	loadExpensesHTML();
	closeMessage();
}

function updateInnerGastos() {
	for (const categoria in INNER_EXPENSES) {
		for (let i = 0; i < INNER_EXPENSES[categoria].length; i++) {
			const tipoObj = INNER_EXPENSES[categoria][i];
			if (tipoObj.gastos.length === 0) {
				INNER_EXPENSES[categoria].splice(i, 1);
			}
		}
	}
}

export function deleteInnerGasto(categoria, tipo, index) {
	INNER_EXPENSES[categoria]
		.find((tipoObj) => tipoObj.tipo === tipo)
		.gastos.splice(index, 1);
	loadExpensesHTML();
	closeMessage();
}

function afterDragInnerGasto(evt) {
	const id = evt.from.getAttribute("data-group");
	const split = id.split("-");

	const categoria = split[0];
	const from = evt.oldIndex - 1;
	const to = evt.newIndex - 1;

	const grupos = INNER_EXPENSES[categoria];
	if (!grupos) return;

	const tipo = split.slice(1).join("-");

	// locate subgroup + index
	const subgroupIndex = grupos.findIndex(
		(entry) => entry && entry.tipo === tipo,
	);

	if (subgroupIndex === -1) return;

	const subgroup = grupos[subgroupIndex];
	const gastos = [...subgroup.gastos];

	const [moved] = gastos.splice(from, 1);
	gastos.splice(to, 0, moved);

	INNER_EXPENSES[categoria][subgroupIndex] = {
		...subgroup,
		gastos,
	};

	loadExpensesHTML();
}
