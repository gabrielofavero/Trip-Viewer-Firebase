import { getIcons } from '../../app/config.js';
import { getID } from '../../utils/dom.js';
import { translate } from '../../i18n/translation.js';
import { setChart, setTable } from "./support/data.js";
import { formatCurrency } from "../../models/expense.model.js";
import { GASTOS_CONVERTIDOS } from "./expenses-converted.js";

// Resumo
export function loadSummary() {
	loadChartSummary();

	if (
		GASTOS_CONVERTIDOS[CURRENT_CURRENCY]["preTrip"].length === 0 ||
		GASTOS_CONVERTIDOS[CURRENT_CURRENCY]["duringTrip"].length === 0
	) {
		getID("radio-resumo").style.display = "none";
		return;
	}

	const preTripExpenses = GASTOS_CONVERTIDOS[CURRENT_CURRENCY]["preTrip"].resumo;
	getID(`summary-preTrip-title`).innerHTML = getTitleWithIcon(
		"trip.expenses.pre_trip",
	);
	setTable("summary-preTrip", preTripExpenses.itens, preTripExpenses.total);

	const duringTripExpenses = GASTOS_CONVERTIDOS[CURRENT_CURRENCY]["duringTrip"].resumo;
	getID(`summary-duringTrip-title`).innerHTML = getTitleWithIcon(
		"trip.expenses.during_trip",
	);
	setTable("summary-duringTrip", duringTripExpenses.itens, duringTripExpenses.total);

	const travelerExpenses =
		GASTOS_CONVERTIDOS[CURRENT_CURRENCY]["travelerExpenses"].resumo;
	getID(`summary-expensesTravelers-title`).innerHTML = getTitleWithIcon(
		"trip.travelers.title",
	);
	setTable(
		"summary-expensesTravelers",
		travelerExpenses.itens,
		travelerExpenses.total,
	);
}

function loadChartSummary() {
	const labels = [
		translate("trip.expenses.pre_trip"),
		translate("trip.expenses.during_trip"),
	];
	const valores = [
		GASTOS_CONVERTIDOS[CURRENT_CURRENCY].preTrip.resumo.total,
		GASTOS_CONVERTIDOS[CURRENT_CURRENCY].duringTrip.resumo.total,
	];

	getID("summary-title").innerHTML = getTitleWithIcon(
		"trip.expenses.overview",
	);
	getID("summary-total").innerText =
		`Total: ${formatCurrency(valores[0] + valores[1], true)}`;

	setChart("doughnut", "resumo-grafico", labels, valores);
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

function setDoughnutChartCategoria(titulo, tipo) {
	const itens = GASTOS_CONVERTIDOS[CURRENT_CURRENCY][tipo].itens;
	const total = GASTOS_CONVERTIDOS[CURRENT_CURRENCY][tipo].resumo.total;

	getID(`${tipo}-title`).innerHTML = getTitleWithIcon(titulo, tipo);
	getID(`${tipo}-total`).innerText = `Total: ${formatCurrency(total, true)}`;

	const labels = itens.map((item) => translate(item.nome, {}, false));
	const valores = itens.map((item) => item.total);

	setChart("doughnut", `${tipo}-grafico`, labels, valores);
}

function setTableCategoria(tipo) {
	unsetTableCategoria(tipo);

	const itens = GASTOS_CONVERTIDOS[CURRENT_CURRENCY][tipo].itens;
	const container = getID(`${tipo}-container`);

	for (let j = 1; j <= itens.length; j++) {
		const item = itens[j - 1];
		const id = `${tipo}-${j}`;

		const recibo = document.createElement("div");
		recibo.id = `${id}-recibo`;
		recibo.className = "gastos-card gastos-recibo";

		const h2 = document.createElement("h2");
		h2.className = "gastos-titulo";
		h2.innerHTML = getTitleWithIcon(item.nome, tipo);
		recibo.appendChild(h2);

		const table = document.createElement("table");
		table.className = "card-full-size";
		table.id = `${id}-tabela`;
		recibo.appendChild(table);

		container.appendChild(recibo);

		setTable(id, item.itens, item.total);
	}
}

function unsetTableCategoria(tipo) {
	let j = 1;
	while (getID(`${tipo}-${j}-recibo`)) {
		getID(`${tipo}-${j}-recibo`).remove();
		j++;
	}
}

function getTitleWithIcon(titlePath, backupIconPath?) {
	const title = translate(titlePath, {}, false);
	const icons = getIcons();
	return `<i class="iconify" data-icon="${icons[titlePath] || icons[backupIconPath] || icons["trip.expenses.title"]}"></i> ${title}`;
}
