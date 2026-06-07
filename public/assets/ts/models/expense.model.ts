// ======= Expense Model =======
// Pure data transformation functions for expenses (currency conversion, aggregation, chart data)
// Extracted from: expenses-converted.js, support/currency.js, support/data.js

import { getCurrencies, getColors } from '../app/config.js';
import { displayError } from '../utils/messages.js';
import { translate } from '../i18n/translation.js';
import { getEmptyChar } from '../utils/dom.js';
import { isOnDarkMode } from '../theme/visibility.js';
import { hexToRgb, rgbToText } from '../theme/colors.js';
import { GASTOS } from "../pages/expenses/expenses.js";
import { MOEDAS } from "../pages/expenses/support/currency.js";

// ======= Currency Filtering & Sorting =======

export function filterCurrencies(arr) {
	return arr.filter(
		(currency, index, self) => self.indexOf(currency) === index && currency,
	);
}

export function sortCurrencies(arr) {
	return arr.sort((a, b) => {
		if (a === DEFAULT_CURRENCY) {
			return -1;
		} else if (b === DEFAULT_CURRENCY) {
			return 1;
		} else {
			return 0;
		}
	});
}

// ======= Currency Conversion =======

export function convertCurrency(from, to, amount) {
	if (from === to) {
		return amount;
	}

	if (MOEDA_CONVERSAO[from + to]) {
		return amount * MOEDA_CONVERSAO[from + to];
	}

	if (MOEDA_CONVERSAO[to + from]) {
		return amount / MOEDA_CONVERSAO[to + from];
	} else {
		console.error(`Conversion error: from ${amount} ${from} to ? ${to}`);
		displayError(translate("messages.errors.unknown"));
	}
}

export function canConvert(currencies) {
	if (currencies.length == 1) {
		return true;
	}

	const keys = Object.keys(MOEDA_CONVERSAO);
	if (keys.length === 0) {
		return false;
	}

	for (const moeda of currencies) {
		if (!keys.some((key) => key.includes(moeda))) {
			return false;
		}
	}
	return true;
}

export function getCurrencySymbol(currency) {
	const moedas = getCurrencies();
	if (moedas.simbolos[currency]) {
		return moedas.simbolos[currency];
	} else {
		return currency;
	}
}

export function formatCurrency(currencyFloat, includeSymbol = false) {
	const result = new Intl.NumberFormat("pt-BR", {
		style: "decimal",
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	}).format(currencyFloat);

	return includeSymbol ? `${getCurrencySymbol(CURRENT_CURRENCY)} ${result}` : result;
}

// ======= Currency Loading =======

export function loadCurrenciesObject() {
	if (GASTOS.gastosPrevios.length > 0 || GASTOS.gastosDurante.length > 0) {
		let previousCurrencies = [];
		let duringCurrencies = [];

		if (GASTOS.gastosPrevios.length > 0) {
			previousCurrencies = filterCurrencies(
				GASTOS.gastosPrevios.map((gasto) => gasto.moeda),
			);
			MOEDAS.gastosPrevios = previousCurrencies;
		}

		if (GASTOS.gastosDurante.length > 0) {
			duringCurrencies = filterCurrencies(
				GASTOS.gastosDurante.map((gasto) => gasto.moeda),
			);
			MOEDAS.gastosDurante = duringCurrencies;
		}

		MOEDAS.resumo = [...new Set([...previousCurrencies, ...duringCurrencies])];

		MOEDAS.resumo = sortCurrencies(MOEDAS.resumo);
		MOEDAS.gastosPrevios = sortCurrencies(MOEDAS.gastosPrevios);
		MOEDAS.gastosDurante = sortCurrencies(MOEDAS.gastosDurante);
	}
}

// ======= Expense Conversion =======

export function loadConvertedExpenses() {
	processConvertedExpenses("gastosDurante");
	processConvertedExpenses("gastosPrevios");
	processConvertedTravelerExpenses();
}

export function processConvertedExpenses(expenseType) {
	for (const currency of MOEDAS.resumo) {
		if (!GASTOS_CONVERTIDOS[currency]) {
			GASTOS_CONVERTIDOS[currency] = {};
		}
		GASTOS_CONVERTIDOS[currency][expenseType] = calculateConvertedExpenses(
			expenseType,
			currency,
		);
	}
}

export function processConvertedTravelerExpenses() {
	const tipos = {
		gastosPrevios: "trip.expenses.pre_trip",
		gastosDurante: "trip.expenses.during_trip",
	};

	for (const currency of MOEDAS.resumo) {
		const viajanteMap = new Map();
		const resumoMap = new Map();
		let totalSummary = 0;

		for (const type in tipos) {
			const grupo = GASTOS_CONVERTIDOS?.[currency]?.[type];
			if (!grupo?.itens) continue;

			for (const gasto of grupo.itens) {
				if (!gasto?.itens?.length) continue;

				for (const item of gasto.itens) {
					const person = item.pessoa
						? GASTOS.pessoas[item.pessoa]
						: "labels.non_specified";

					const amount = Number(item.valor) || 0;
					const name = tipos[type];

					let entry = viajanteMap.get(person);
					if (!entry) {
						entry = { nome: person, total: 0, itens: [] };
						entry._byTipo = new Map();
						viajanteMap.set(person, entry);
					}

					let tipoItem = entry._byTipo.get(name);
					if (!tipoItem) {
						tipoItem = { nome: name, pessoa: person, valor: 0 };
						entry._byTipo.set(name, tipoItem);
						entry.itens.push(tipoItem);
					}

					tipoItem.valor += amount;
					entry.total += amount;

					totalSummary += amount;

					let resumoEntry = resumoMap.get(person);
					if (!resumoEntry) {
						resumoEntry = { nome: person, valor: 0 };
						resumoMap.set(person, resumoEntry);
					}

					resumoEntry.valor += amount;
				}
			}
		}

		function compareWithNonSpecifiedLast(a, b) {
			const nonSpecified = "labels.non_specified";

			const aIsNS = a.nome === nonSpecified;
			const bIsNS = b.nome === nonSpecified;

			if (aIsNS && !bIsNS) return 1; // a goes last
			if (!aIsNS && bIsNS) return -1; // b goes last

			return a.nome.localeCompare(b.nome, undefined, { sensitivity: "base" });
		}

		const itens = Array.from(viajanteMap.values())
			.map((v) => {
				delete v._byTipo;
				return v;
			})
			.sort(compareWithNonSpecifiedLast);

		const resumo = {
			total: totalSummary,
			itens: Array.from(resumoMap.values()).sort(compareWithNonSpecifiedLast),
		};

		GASTOS_CONVERTIDOS[currency].gastosViajantes = { resumo, itens };
	}
}

export function calculateConvertedExpenses(type, currency) {
	function updateSummary(resumo, tipoGasto, valor) {
		const resumoNomes = resumo.itens.map((item) => item.nome);
		const resumoIndex = resumoNomes.indexOf(tipoGasto);
		if (resumoIndex >= 0) {
			resumo.itens[resumoIndex].valor += valor;
		} else {
			resumo.itens.push({
				nome: tipoGasto,
				valor,
			});
		}
	}

	function updateItens(itens, gasto, valor) {
		const nome = gasto.nome;
		const tipo = gasto.tipo;
		const pessoa = gasto.pessoa;

		const itemNomes = itens.map((item) => item.nome);
		const itemIndex = itemNomes.indexOf(tipo);
		if (itemIndex >= 0) {
			itens[itemIndex].total += valor;
			itens[itemIndex].itens.push({ nome, pessoa, valor });
		} else {
			itens.push({
				nome: tipo,
				total: valor,
				itens: [
					{
						nome,
						pessoa,
						valor,
					},
				],
			});
		}
	}

	const gastos = GASTOS[type];
	const resumo = {
		total: 0,
		itens: [],
	};
	const itens = [];

	for (const gasto of gastos) {
		let valor = gasto.valor;
		let include = true;

		if (gasto.moeda != currency) {
			if (canConvert([gasto.moeda, currency])) {
				valor = convertCurrency(gasto.moeda, currency, gasto.valor);
			} else {
				include = false;
			}
		}

		if (include) {
			resumo.total += valor;
			valor = parseFloat(valor.toFixed(2));

			updateSummary(resumo, gasto.tipo, valor);
			updateItens(itens, gasto, valor);
		}
	}

	resumo.total = parseFloat(resumo.total.toFixed(2));
	return { resumo, itens };
}

export function getConversionText() {
	if (MOEDAS.resumo.length == 1) {
		return getEmptyChar();
	}
	const conversoes = [`1 ${DEFAULT_CURRENCY}`];
	for (const moeda of MOEDAS.resumo) {
		if (moeda == DEFAULT_CURRENCY) {
			continue;
		}
		conversoes.push(
			`${convertCurrency(moeda, DEFAULT_CURRENCY, 1).toFixed(2)} ${moeda}`,
		);
	}
	return conversoes.join(" = ");
}

// ======= Chart Data (Pure) =======

export function getChartData(labels, values, rgbColors) {
	return {
		labels: labels,
		datasets: [
			{
				label: "",
				data: values,
				backgroundColor: getArrayRGBA(rgbColors, 0.5),
				borderColor: getArrayRGBA(rgbColors, 1),
				borderWidth: 1,
			},
		],
	};
}

export function getChartConfig(type, data) {
	let legend: Record<string, any> = {
		display: false,
	};

	if (type === "doughnut" || type === "pie") {
		legend.display = true;
		legend.position = "right";
		legend.labels = {
			color: isOnDarkMode() ? "rgba(227, 236, 248, 1)" : "rgba(75, 85, 99, 1)",
		};
	}

	let result: Record<string, any> = {
		type: type,
		data: data,
		options: {
			plugins: {
				legend,
			},
		},
	};

	if (type === "bar") {
		const scales = {
			x: {
				grid: {
					display: false,
				},
			},
			y: {
				grid: {
					display: false,
				},
			},
		};
		result.options.scales = scales;
	}

	return result;
}

export function getChartColorsRGB(size) {
	const result = [];
	const hexColors = getColors().opcoes.map((color) => color.hex);
	const rgbColors = hexColors.map((color) => hexToRgb(color));

	for (let i = 0; i < size; i++) {
		const index = i % rgbColors.length;
		result.push(rgbColors[index]);
	}

	return result;
}

export function getArrayRGBA(coresRGB, a) {
	const result = [];

	for (const rgb of coresRGB) {
		result.push(rgbToText(rgb[0], rgb[1], rgb[2], a));
	}

	return result;
}
