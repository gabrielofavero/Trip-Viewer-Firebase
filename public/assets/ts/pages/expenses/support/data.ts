import { getID } from '../../../utils/dom.js';
import { translate } from '../../../i18n/translation.js';
import { isOnDarkMode } from '../../../theme/visibility.js';
import {
	formatCurrency,
	getArrayRGBA,
	getChartColorsRGB,
	getChartConfig,
	getChartData,
} from '../../../models/expense.model.js';
import { EXPENSES_DATA } from '../expenses.js';

var EXPENSES_CHARTS = {};

// Tabelas
export function setTable(id, items, total) {
	if (!items || items.length === 0) {
		return;
	}

	const table = getID(`${id}-table`);
	table.innerHTML = '';
	table.appendChild(tbody(items));
	table.appendChild(tfoot(total));

	if (getID(id)) {
		getID(id).style.display = '';
	}

	function tbody(items) {
		const tbody = document.createElement('tbody');

		for (const item of items) {
			tbody.appendChild(tr(item));
		}

		return tbody;
	}

	function tr(item) {
		const title = translate(item.name, {}, false);
		const person = item.person ? EXPENSES_DATA?.people?.[item.person] : undefined;
		const tr = document.createElement('tr');

		const td1 = document.createElement('td');
		td1.className = `table-texto-left`;
		td1.innerHTML = person ? `<span class="highlight">${person}:</span> ${title}` : title;
		tr.appendChild(td1);

		const td2 = document.createElement('td');
		td2.className = `table-texto-right`;
		td2.innerText = formatCurrency(item.amount, true);
		tr.appendChild(td2);

		return tr;
	}

	function tfoot(total) {
		const tFoot = document.createElement('tfoot');

		const tr = document.createElement('tr');
		const td1 = document.createElement('td');
		td1.className = 'table-texto-left total';
		td1.innerText = translate('labels.total');
		tr.appendChild(td1);

		const td2 = document.createElement('td');
		td2.className = 'table-texto-right total';
		td2.innerText = formatCurrency(total, true);
		tr.appendChild(td2);

		tFoot.appendChild(tr);
		return tFoot;
	}
}

export function setChart(type, id, labels, values) {
	const canvas = getID(id);

	if (!canvas) {
		console.warn(`setChart: canvas element "${id}" not found in DOM`);
		return;
	}

	// Destroy any existing Chart.js instance on this canvas (handles DOM re-creation)
	const existingChart = Chart.getChart(canvas);
	if (existingChart) {
		existingChart.destroy();
	}

	if (EXPENSES_CHARTS[id]) {
		EXPENSES_CHARTS[id].destroy();
	}

	const colorsRGB = getChartColorsRGB(labels.length);
	const chartData = getChartData(labels, values, colorsRGB);
	const config = getChartConfig(type, chartData);
	EXPENSES_CHARTS[id] = new Chart(canvas, config);
}

export function changeChartsLabelsVisibility() {
	const cor = isOnDarkMode() ? 'rgba(227, 236, 248, 1)' : 'rgba(75, 85, 99, 1)';
	for (const chart in EXPENSES_CHARTS) {
		EXPENSES_CHARTS[chart].options.plugins.legend.labels.color = cor;
		EXPENSES_CHARTS[chart].update();
	}
}
