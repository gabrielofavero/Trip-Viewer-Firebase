import { getIcons } from '../../../core/config.js';

// Resumo
function loadSummary() {
	loadChartSummary();

	if (
		GASTOS_CONVERTIDOS[CURRENT_CURRENCY]["gastosPrevios"].length === 0 ||
		GASTOS_CONVERTIDOS[CURRENT_CURRENCY]["gastosDurante"].length === 0
	) {
		getID("radio-resumo").style.display = "none";
		return;
	}

	const gastosPrevios = GASTOS_CONVERTIDOS[CURRENT_CURRENCY]["gastosPrevios"].resumo;
	getID(`resumo-gastosPrevios-titulo`).innerHTML = getTitleWithIcon(
		"trip.expenses.pre_trip",
	);
	setTable("resumo-gastosPrevios", gastosPrevios.itens, gastosPrevios.total);

	const gastosDurante = GASTOS_CONVERTIDOS[CURRENT_CURRENCY]["gastosDurante"].resumo;
	getID(`resumo-gastosDurante-titulo`).innerHTML = getTitleWithIcon(
		"trip.expenses.during_trip",
	);
	setTable("resumo-gastosDurante", gastosDurante.itens, gastosDurante.total);

	const gastosViajantes =
		GASTOS_CONVERTIDOS[CURRENT_CURRENCY]["gastosViajantes"].resumo;
	getID(`resumo-gastosViajantes-titulo`).innerHTML = getTitleWithIcon(
		"trip.travelers.title",
	);
	setTable(
		"resumo-gastosViajantes",
		gastosViajantes.itens,
		gastosViajantes.total,
	);
}

function loadChartSummary() {
	const labels = [
		translate("trip.expenses.pre_trip"),
		translate("trip.expenses.during_trip"),
	];
	const valores = [
		GASTOS_CONVERTIDOS[CURRENT_CURRENCY].gastosPrevios.resumo.total,
		GASTOS_CONVERTIDOS[CURRENT_CURRENCY].gastosDurante.resumo.total,
	];

	getID("resumo-titulo").innerHTML = getTitleWithIcon(
		"trip.expenses.overview",
	);
	getID("resumo-total").innerText =
		`Total: ${formatCurrency(valores[0] + valores[1], true)}`;

	setChart("doughnut", "resumo-grafico", labels, valores);
}

// Gastos Prévios
function loadPreTripExpenses() {
	setDoughnutChartCategoria("trip.expenses.pre_trip", "gastosPrevios");
	setTableCategoria("gastosPrevios");
}

// Gastos na Viagem
function loadDuringTripExpenses() {
	setDoughnutChartCategoria("trip.expenses.during_trip", "gastosDurante");
	setTableCategoria("gastosDurante");
}

function loadTravelerExpenses() {
	setDoughnutChartCategoria("trip.travelers.title", "gastosViajantes");
	setTableCategoria("gastosViajantes");
}

function setDoughnutChartCategoria(titulo, tipo) {
	const itens = GASTOS_CONVERTIDOS[CURRENT_CURRENCY][tipo].itens;
	const total = GASTOS_CONVERTIDOS[CURRENT_CURRENCY][tipo].resumo.total;

	getID(`${tipo}-titulo`).innerHTML = getTitleWithIcon(titulo, tipo);
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

function getTitleWithIcon(titlePath, backupIconPath) {
	const title = translate(titlePath, {}, false);
	const icons = getIcons();
	return `<i class="iconify" data-icon="${icons[titlePath] || icons[backupIconPath] || icons["trip.expenses.title"]}"></i> ${title}`;
}
