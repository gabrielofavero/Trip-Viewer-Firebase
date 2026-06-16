import { getIcons } from '../../app/config.js';
import { getID } from '../../utils/dom.js';
import { translate } from '../../i18n/translation.js';
import { setChart, setTable } from "./support/data.js";
import { formatCurrency } from "../../models/expense.model.js";

// Summary
export function loadSummary() {
	loadChartSummary();

	if (
		EXPENSES_CONVERTED[CURRENT_CURRENCY]["preTrip"].length === 0 ||
		EXPENSES_CONVERTED[CURRENT_CURRENCY]["duringTrip"].length === 0
	) {
		getID("radio-summary").style.display = "none";
		return;
	}

	const preTripExpenses = EXPENSES_CONVERTED[CURRENT_CURRENCY]["preTrip"].summary;
	getID(`summary-preTrip-title`).innerHTML = getTitleWithIcon(
		"trip.expenses.pre_trip",
	);
	setTable("summary-preTrip", preTripExpenses.items, preTripExpenses.total);

	const duringTripExpenses = EXPENSES_CONVERTED[CURRENT_CURRENCY]["duringTrip"].summary;
	getID(`summary-duringTrip-title`).innerHTML = getTitleWithIcon(
		"trip.expenses.during_trip",
	);
	setTable("summary-duringTrip", duringTripExpenses.items, duringTripExpenses.total);

	const travelerExpenses =
		EXPENSES_CONVERTED[CURRENT_CURRENCY]["travelerExpenses"].summary;
	getID(`summary-expensesTravelers-title`).innerHTML = getTitleWithIcon(
		"trip.travelers.title",
	);
	setTable(
		"summary-expensesTravelers",
		travelerExpenses.items,
		travelerExpenses.total,
	);
}

function loadChartSummary() {
	const labels = [
		translate("trip.expenses.pre_trip"),
		translate("trip.expenses.during_trip"),
	];
	const values = [
		EXPENSES_CONVERTED[CURRENT_CURRENCY].preTrip.summary.total,
		EXPENSES_CONVERTED[CURRENT_CURRENCY].duringTrip.summary.total,
	];

	getID("summary-title").innerHTML = getTitleWithIcon(
		"trip.expenses.overview",
	);
	getID("summary-total").innerText =
		`${translate("labels.total")}: ${formatCurrency(values[0] + values[1], true)}`;

	setChart("doughnut", "summary-chart", labels, values);
}

// Pre-Trip Expenses
export function loadPreTripExpenses() {
	setDoughnutChartCategoria("trip.expenses.pre_trip", "preTrip");
	setTableCategoria("preTrip");
}

// Gastos na Viagem
export function loadDuringTripExpenses() {
	setDoughnutChartCategoria("trip.expenses.during_trip", "duringTrip");
	setTableCategoria("duringTrip");
}

export function loadTravelerExpenses() {
	setDoughnutChartCategoria("trip.travelers.title", "expensesTravelers");
	setTableCategoria("expensesTravelers");
}

function setDoughnutChartCategoria(title, type) {
	const items = EXPENSES_CONVERTED[CURRENT_CURRENCY][type].items;
	const total = EXPENSES_CONVERTED[CURRENT_CURRENCY][type].summary.total;

	getID(`${type}-title`).innerHTML = getTitleWithIcon(title, type);
	getID(`${type}-total`).innerText = `${translate("labels.total")}: ${formatCurrency(total, true)}`;

	const labels = items.map((item) => translate(item.name, {}, false));
	const values = items.map((item) => item.total);

	setChart("doughnut", `${type}-grafico`, labels, values);
}

function setTableCategoria(type) {
	unsetTableCategoria(type);

	const items = EXPENSES_CONVERTED[CURRENT_CURRENCY][type].items;
	const container = getID(`${type}-container`);

	for (let j = 1; j <= items.length; j++) {
		const item = items[j - 1];
		const id = `${type}-${j}`;

		const recibo = document.createElement("div");
		recibo.id = `${id}-recibo`;
		recibo.className = "expenses-card expenses-recibo";

		const h2 = document.createElement("h2");
		h2.className = "expenses-title";
		h2.innerHTML = getTitleWithIcon(item.name, type);
		recibo.appendChild(h2);

		const tableEl = document.createElement("table");
		tableEl.className = "card-full-size";
		tableEl.id = `${id}-tabela`;
		recibo.appendChild(tableEl);

		container.appendChild(recibo);

		setTable(id, item.items, item.total);
	}
}

function unsetTableCategoria(type) {
	let j = 1;
	while (getID(`${type}-${j}-recibo`)) {
		getID(`${type}-${j}-recibo`).remove();
		j++;
	}
}

function getTitleWithIcon(titlePath, backupIconPath?) {
	const title = translate(titlePath, {}, false);
	const icons = getIcons();
	return `<i class="iconify" data-icon="${icons[titlePath] || icons[backupIconPath] || icons["trip.expenses.title"]}"></i> ${title}`;
}
