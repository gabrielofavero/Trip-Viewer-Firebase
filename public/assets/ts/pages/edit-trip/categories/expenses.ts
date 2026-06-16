import { cloneObject, firstCharToUpperCase, getID } from '../../../utils/dom.js';
import { translate } from '../../../i18n/translation.js';
import { initializeSortableForGroup } from '../../../ui/sortable.js';
import { closeMessage, displayFullMessage, getContainersInput, MESSAGE_PROPERTIES, registerActions } from '../../../utils/messages.js';
import { getFieldValueOrNotify } from '../../../ui/fields.js';
import { getTravelersObject } from "./travelers.js";
import { TRAVELERS } from '../../../data/state.js';
import { getTravelerName } from "./travelers.js";
import { getTravelersSelectOptionsHTML } from "./travelers.js";
import { getSharingObject } from "../set-trip.js";

var INNER_EXPENSES = {
	preTrip: [],
	duringTrip: [],
};

var LAST_INNER_EXPENSE_TYPE = "";

function loadExpenses(data = FIRESTORE_EXPENSES_DATA) {
	pushExpense("preTrip", data);
	pushExpense("duringTrip", data);
	loadExpensesHTML();
}

export async function getExpensesObject(_protectedOnly?) {
	const duringTrip = getExpenses("duringTrip");
	const preTrip = getExpenses("preTrip");

	if (duringTrip.length === 0 && preTrip.length === 0) {
		return {};
	}

	return {
		sharing: await getSharingObject(),
		duringTrip: duringTrip,
		preTrip: preTrip,
		currency: getID("currency").value,
		travelers: getTravelersObject(),
		version: {
			lastUpdated: new Date().toISOString(),
		},
	};

	function getExpenses(category) {
		let result = [];
		for (const typeObj of INNER_EXPENSES[category]) {
			result = [...result, ...typeObj.expenses];
		}
		return result;
	}
}

// Gastos e Inner Gastos
function pushExpense(type, data) {
	data = data || {};
	if (!data[type]) {
		data[type] = [];
	}

	for (const expense of data[type]) {
		const types = INNER_EXPENSES[type].map((expense) => expense.type);
		const index = types.indexOf(expense.type);
		if (index === -1) {
			INNER_EXPENSES[type].push({
				type: expense.type,
				expenses: [expense],
			});
		} else {
			INNER_EXPENSES[type][index].expenses.push(expense);
		}
	}
}

function loadExpensesHTML() {
	for (const category in INNER_EXPENSES) {
		getID(category).innerHTML = "";
		for (const innerExpense of INNER_EXPENSES[category]) {
			buildInnerExpense(category, innerExpense);
		}
	}

	function buildInnerExpense(category, innerExpense) {
		const div = document.createElement("div");
		const id = `${category}-${innerExpense.type}`;
		div.className = "expenses-item draggable-area";
		div.dataset.group = id;
		div.id = id;

		const label = document.createElement("label");
		label.innerText = translate(innerExpense.type, {}, false);
		div.appendChild(label);

		for (let i = 0; i < innerExpense.expenses.length; i++) {
			const expense = innerExpense.expenses[i];
			const container = document.createElement("div");
			container.className = "input-button-container";

			const button = document.createElement("button");
			button.className = "btn input-button draggable";
			button.innerHTML = expense.person
				? `<span class="highlight">${getTravelerName(expense.person)}:</span> ${expense.name}`
				: expense.name;
			button.onclick = () => openInnerExpense(category, innerExpense.type, i);
			container.appendChild(button);

			const icon = document.createElement("i");
			icon.className = "iconify drag-icon";
			icon.dataset.icon = "mdi:drag";
			container.appendChild(icon);

			div.appendChild(container);
		}

		getID(category).appendChild(div);
		initializeSortableForGroup(id, { onEnd: afterDragInnerExpense });
	}
}

export function openInnerExpense(category, type = "", index = -1) {
	registerActions({ saveInnerExpense });
	const properties = cloneObject(MESSAGE_PROPERTIES);
	properties.title = type
		? translate("labels.edit")
		: translate("labels.add");
	properties.content = getInnerExpenseContent(category, type, index);
	properties.icons = [{ type: "goBack", action: "" }];
	properties.containers = getContainersInput();
	properties.buttons = [
		{
			type: "cancel",
		},
		{
			type: "confirm",
			action: `saveInnerExpense('${category}', '${type}', ${index})`,
		},
	];
	displayFullMessage(properties);

	if (type && index >= 0) {
		const expense = INNER_EXPENSES[category].find(
			(typeObj) => typeObj.type === type,
		).expenses[index];
		getID("expense-name").value = expense.name;
		getID("expense-person").value = expense.person || "";
		getID("expense-currency").value = expense.currency;
		getID("expense-price").value = expense.price;
		applyExpenseInnerType(expense.type);
	} else {
		getID("expense-delete").style.display = "none";
		getID("expense-currency").value = getID("currency").value;
		if (LAST_INNER_EXPENSE_TYPE) {
			applyExpenseInnerType(LAST_INNER_EXPENSE_TYPE);
		}
	}

	getID("expense-type-select").addEventListener("change", (e) => {
		getID("expense-type-input").style.display =
			(e.target as HTMLSelectElement).value === "custom" ? "block" : "none";
	});

	getID("expense-price").addEventListener("input", (e) => {
		const target = e.target as HTMLInputElement;
		const value = target.value;
		if (value && !isNaN(Number(value))) {
			const floatValue = parseFloat(value);
			const decimals = floatValue.toString().split(".")[1];
			if (decimals && decimals.length > 2) {
				target.value = floatValue.toFixed(2);
			}
		}
	});

	getID("expense-type-input").addEventListener("change", (e) => {
		const target = e.target as HTMLInputElement;
		target.value = firstCharToUpperCase(target.value.trim());
	});
}

function applyExpenseInnerType(type) {
	const values = Array.from(getID("expense-type-select").options).map(
		(option) => option.value,
	);
	if (values.includes(type)) {
		getID("expense-type-select").value = type;
	} else {
		getID("expense-type-select").value = "custom";
		getID("expense-type-input").value = type;
		getID("expense-type-input").style.display = "block";
	}
}

function getInnerExpenseContent(category, type, index) {
	return `<div id='inner-expense-box'>
                <div class="nice-form-group">
                    <label>${translate("labels.name")}</label>
                    <input required id="expense-name" type="text" placeholder="${translate("trip.transportation.type.flight")}" />
                </div>
                <div class="nice-form-group">
                    <label>${translate("labels.type")}</label>
                    <select id="expense-type-select" class="edit-select">
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
                    <input required id="expense-type-input" type="text" placeholder="${translate("trip.transportation.title")}" style="margin-top: 8px; display: none"/>
                </div>
                <div class="nice-form-group" style="display:${TRAVELERS.length === 0 ? "none" : ""}">
                    <label>${translate("trip.expenses.paid_by")}</label>
                        <select id="expense-person" class="edit-select" name="person">
                        <option value="">${translate("labels.non_specified")}</option>
                        ${getTravelersSelectOptionsHTML()}
                    </select>
                </div>
                <div class="nice-form-group">
                    <label>${translate("currency.title")}</label>
                        <select id="expense-currency" class="edit-select" name="currency">
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
                    <input required class="input-full" id="expense-price" type="number" placeholder="0.00" step="0.01">
                </div>
                <div class="button-box-right" id="expense-delete" style="margin-top: 8px; margin-bottom: 8px;">
                        <button data-action="delete-inner-expense" data-category="${category}" data-type="${type}" data-index="${index}" class="btn btn-basic btn-format">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
                                <path fill="currentColor" fill-rule="evenodd" d="M8.106 2.553A1 1 0 0 1 9 2h6a1 1 0 0 1 .894.553L17.618 6H20a1 1 0 1 1 0 2h-1v11a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3V8H4a1 1 0 0 1 0-2h2.382l1.724-3.447ZM14.382 4l1 2H8.618l1-2h4.764ZM11 11a1 1 0 1 0-2 0v6a1 1 0 1 0 2 0v-6Zm4 0a1 1 0 1 0-2 0v6a1 1 0 1 0 2 0v-6Z" clip-rule="evenodd"></path>
                            </svg>
                        </button>
                    </div>
            </div>`;
}

export function saveInnerExpense(category, type, index = -1) {
	const price = getFieldValueOrNotify("expense-price");
	const newExpense = {
		name: getFieldValueOrNotify("expense-name"),
		type:
			getID("expense-type-select").value === "custom"
				? getFieldValueOrNotify("expense-type-input")
				: getID("expense-type-select").value,
		person: getID("expense-person").value || "",
		currency: getFieldValueOrNotify("expense-currency"),
		price: price ? parseFloat(parseFloat(price).toFixed(2)) : null,
	};

	if (!newExpense.name || !newExpense.type || !newExpense.currency || !newExpense.price)
		return;

	LAST_INNER_EXPENSE_TYPE = newExpense.type;

	if (type && index >= 0) {
		if (type == newExpense.type) {
			INNER_EXPENSES[category].find((typeObj) => typeObj.type === type).expenses[
				index
			] = newExpense;
		} else {
			INNER_EXPENSES[category]
				.find((typeObj) => typeObj.type === type)
				.expenses.splice(index, 1);
			let typeObj = INNER_EXPENSES[category].find(
				(typeObj) => typeObj.type === newExpense.type,
			);
			if (typeObj) {
				typeObj.expenses.push(newExpense);
			} else {
				INNER_EXPENSES[category].push({
					type: newExpense.type,
					expenses: [newExpense],
				});
			}
		}
	} else {
		const types = INNER_EXPENSES[category].map((typeObj) => typeObj.type);
		if (types.includes(newExpense.type)) {
			INNER_EXPENSES[category]
				.find((typeObj) => typeObj.type === newExpense.type)
				.expenses.push(newExpense);
		} else {
			INNER_EXPENSES[category].push({ type: newExpense.type, expenses: [newExpense] });
		}
	}
	updateInnerExpenses();
	loadExpensesHTML();
	closeMessage();
}

function updateInnerExpenses() {
	for (const category in INNER_EXPENSES) {
		for (let i = 0; i < INNER_EXPENSES[category].length; i++) {
			const typeObj = INNER_EXPENSES[category][i];
			if (typeObj.expenses.length === 0) {
				INNER_EXPENSES[category].splice(i, 1);
			}
		}
	}
}

export function deleteInnerExpense(category, type, index) {
	INNER_EXPENSES[category]
		.find((typeObj) => typeObj.type === type)
		.expenses.splice(index, 1);
	loadExpensesHTML();
	closeMessage();
}

function afterDragInnerExpense(evt) {
	const id = evt.from.getAttribute("data-group");
	const split = id.split("-");

	const category = split[0];
	const from = evt.oldIndex - 1;
	const to = evt.newIndex - 1;

	const groups = INNER_EXPENSES[category];
	if (!groups) return;

	const type = split.slice(1).join("-");

	// locate subgroup + index
	const subgroupIndex = groups.findIndex(
		(entry) => entry && entry.type === type,
	);

	if (subgroupIndex === -1) return;

	const subgroup = groups[subgroupIndex];
	const expenses = [...subgroup.expenses];

	const [moved] = expenses.splice(from, 1);
	expenses.splice(to, 0, moved);

	INNER_EXPENSES[category][subgroupIndex] = {
		...subgroup,
		expenses,
	};

	loadExpensesHTML();
}
