import {
	_getChartData,
	_getChartConfig,
	_getChartColorsRGB,
	_getArrayRGBA,
} from '../../../models/expense.js';

var GASTOS_CHARTS = {};

// BACKWARD COMPAT: attach to window during migration
window._getChartData = _getChartData;
window._getChartConfig = _getChartConfig;
window._getChartColorsRGB = _getChartColorsRGB;
window._getArrayRGBA = _getArrayRGBA;

// Tabelas
function _setTable(id, itens, total) {
	if (!itens || itens.length === 0) {
		return;
	}

	const tabela = getID(`${id}-tabela`);
	tabela.innerHTML = "";
	tabela.appendChild(tbody(itens));
	tabela.appendChild(tfoot(total));

	if (getID(id)) {
		getID(id).style.display = "";
	}

	function tbody(itens) {
		const tbody = document.createElement("tbody");

		for (const item of itens) {
			tbody.appendChild(tr(item));
		}

		return tbody;
	}

	function tr(item) {
		const titulo = translate(item.nome, {}, false);
		const pessoa = item.pessoa ? GASTOS?.pessoas?.[item.pessoa] : undefined;
		const tr = document.createElement("tr");

		const td1 = document.createElement("td");
		td1.className = `tabela-texto-esquerda`;
		td1.innerHTML = pessoa
			? `<span class="highlight">${pessoa}:</span> ${titulo}`
			: titulo;
		tr.appendChild(td1);

		const td2 = document.createElement("td");
		td2.className = `tabela-texto-direita`;
		td2.innerText = _formatMoeda(item.valor, true);
		tr.appendChild(td2);

		return tr;
	}

	function tfoot(total) {
		const tFoot = document.createElement("tfoot");

		const tr = document.createElement("tr");
		const td1 = document.createElement("td");
		td1.className = "tabela-texto-esquerda total";
		td1.innerText = translate("labels.total");
		tr.appendChild(td1);

		const td2 = document.createElement("td");
		td2.className = "tabela-texto-direita total";
		td2.innerText = _formatMoeda(total, true);
		tr.appendChild(td2);

		tFoot.appendChild(tr);
		return tFoot;
	}
}

function _setChart(tipo, id, labels, valores) {
	const div = getID(id);

	if (GASTOS_CHARTS[id]) {
		GASTOS_CHARTS[id].data.datasets[0].data = valores;
		GASTOS_CHARTS[id].update();
		return;
	}
	const coresRGB = _getChartColorsRGB(labels.length);
	const dados = _getChartData(labels, valores, coresRGB);
	const config = _getChartConfig(tipo, dados);
	GASTOS_CHARTS[id] = new Chart(div, config);
}

function _changeChartsLabelsVisibility() {
	const cor = _isOnDarkMode()
		? "rgba(227, 236, 248, 1)"
		: "rgba(75, 85, 99, 1)";
	for (const chart in GASTOS_CHARTS) {
		GASTOS_CHARTS[chart].options.plugins.legend.labels.color = cor;
		GASTOS_CHARTS[chart].update();
	}
}
