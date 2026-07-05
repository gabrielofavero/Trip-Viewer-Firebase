// ======= Expense Model =======
// Pure data transformation functions for expenses (currency conversion, aggregation, chart data)
// Extracted from: expenses-converted.js, support/currency.js, support/data.js

import { getCurrencies, getColors } from '../app/config.js';
import { displayError } from '../utils/messages.js';
import { translate } from '../i18n/translation.js';
import { getEmptyChar } from '../utils/dom.js';
import { isOnDarkMode } from '../theme/visibility.js';
import { hexToRgb, rgbToText } from '../theme/colors.js';
import { EXPENSES_DATA } from "../pages/expenses/expenses.js";
import { CURRENCIES, DEFAULT_CURRENCY, CURRENCY_CONVERSION, CURRENT_CURRENCY } from "../pages/expenses/support/currency.js";

// ======= Global state (shared across modules) =======
export var EXPENSES_CONVERTED: Record<string, any> = {};

// ======= Currency Filtering & Sorting =======

export function filterCurrencies(arr: string[]): string[] {
	return arr.filter(
		(currency, index, self) => self.indexOf(currency) === index && currency,
	);
}

export function sortCurrencies(arr: string[]): string[] {
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

export function convertCurrency(from: string, to: string, amount: number): number {
	if (from === to) {
		return amount;
	}

	if (CURRENCY_CONVERSION[from + to]) {
		return amount * CURRENCY_CONVERSION[from + to];
	}

	if (CURRENCY_CONVERSION[to + from]) {
		return amount / CURRENCY_CONVERSION[to + from];
	} else {
		console.error(`Conversion error: from ${amount} ${from} to ? ${to}`);
		displayError(translate("messages.errors.unknown"));
	}
}

export function canConvert(currencies: string[]): boolean {
	if (currencies.length == 1) {
		return true;
	}

	const keys = Object.keys(CURRENCY_CONVERSION);
	if (keys.length === 0) {
		return false;
	}

	for (const currency of currencies) {
		if (!keys.some((key) => key.includes(currency))) {
			return false;
		}
	}
	return true;
}

export function getCurrencySymbol(currency: string): string {
	const currencies = getCurrencies();
	if (currencies.symbols[currency]) {
		return currencies.symbols[currency];
	} else {
		return currency;
	}
}

export function formatCurrency(currencyFloat: number, includeSymbol = false): string {
	const result = new Intl.NumberFormat("pt-BR", {
		style: "decimal",
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	}).format(currencyFloat);

	return includeSymbol ? `${getCurrencySymbol(CURRENT_CURRENCY)} ${result}` : result;
}

// ======= Currency Loading =======

export function loadCurrenciesObject(): void {
	if (EXPENSES_DATA.preTrip.length > 0 || EXPENSES_DATA.duringTrip.length > 0) { // was "gastosPrevios" / "gastosDurante"
		let previousCurrencies: string[] = [];
		let duringCurrencies: string[] = [];

		if (EXPENSES_DATA.preTrip.length > 0) {
			previousCurrencies = filterCurrencies(
				EXPENSES_DATA.preTrip.map((expense: any) => expense.currency), // was "moeda"
			);
			CURRENCIES.preTrip = previousCurrencies;
		}

		if (EXPENSES_DATA.duringTrip.length > 0) {
			duringCurrencies = filterCurrencies(
				EXPENSES_DATA.duringTrip.map((expense: any) => expense.currency), // was "moeda"
			);
			CURRENCIES.duringTrip = duringCurrencies;
		}

		CURRENCIES.summary = [...new Set([...previousCurrencies, ...duringCurrencies])];

		CURRENCIES.summary = sortCurrencies(CURRENCIES.summary);
	CURRENCIES.preTrip = sortCurrencies(CURRENCIES.preTrip);
	CURRENCIES.duringTrip = sortCurrencies(CURRENCIES.duringTrip);
	}
}

// ======= Expense Conversion =======

export function loadConvertedExpenses(): void {
	processConvertedExpenses("duringTrip"); // was "gastosDurante"
	processConvertedExpenses("preTrip");     // was "gastosPrevios"
	processConvertedTravelerExpenses();
}

export function processConvertedExpenses(expenseType: string): void {
	for (const currency of CURRENCIES.summary) {
		if (!EXPENSES_CONVERTED[currency]) {
			EXPENSES_CONVERTED[currency] = {};
		}
		EXPENSES_CONVERTED[currency][expenseType] = calculateConvertedExpenses(
			expenseType,
			currency,
		);
	}
}

export function processConvertedTravelerExpenses(): void {
	const types: Record<string, string> = {
		preTrip: "trip.expenses.pre_trip",       // was "gastosPrevios"
		duringTrip: "trip.expenses.during_trip",  // was "gastosDurante"
	};

	for (const currency of CURRENCIES.summary) {
		const travelerMap = new Map(); // was "viajanteMap"
		const summaryMap = new Map();  // was "resumoMap"
		let totalSummary = 0;

		for (const type in types) {
			const group = EXPENSES_CONVERTED?.[currency]?.[type]; // was "grupo"
			if (!group?.items) continue; // was "itens"

			for (const expense of group.items) { // was "gasto"
				if (!expense?.items?.length) continue; // was "itens"

				for (const item of expense.items) { // was "itens"
					const person = item.person  // was "pessoa"
					? EXPENSES_DATA.travelers[item.person] // was "pessoas"
						: "labels.non_specified";

					const amount = Number(item.amount) || 0; // was "valor"
					const name = types[type];

					let entry = travelerMap.get(person);
					if (!entry) {
						entry = { name: person, total: 0, items: [] }; // was "nome", "itens"
						entry._byType = new Map(); // was "_byTipo"
						travelerMap.set(person, entry);
					}

					let typeItem = entry._byType.get(name); // was "tipoItem"
					if (!typeItem) {
						typeItem = { name: name, person: person, amount: 0 }; // was "nome", "pessoa", "valor"
						entry._byType.set(name, typeItem);
						entry.items.push(typeItem); // was "itens"
					}

					typeItem.amount += amount; // was "valor"
					entry.total += amount;

					totalSummary += amount;

					let summaryEntry = summaryMap.get(person); // was "resumoEntry"
					if (!summaryEntry) {
						summaryEntry = { name: person, amount: 0 }; // was "nome", "valor"
						summaryMap.set(person, summaryEntry);
					}

					summaryEntry.amount += amount; // was "valor"
				}
			}
		}

		function compareWithNonSpecifiedLast(a: any, b: any): number {
			const nonSpecified = "labels.non_specified";

			const aIsNS = a.name === nonSpecified; // was "nome"
			const bIsNS = b.name === nonSpecified; // was "nome"

			if (aIsNS && !bIsNS) return 1; // a goes last
			if (!aIsNS && bIsNS) return -1; // b goes last

			return a.name.localeCompare(b.name, undefined, { sensitivity: "base" }); // was "nome"
		}

		const items = Array.from(travelerMap.values()) // was "itens"
			.map((v: any) => {
				delete v._byType; // was "_byTipo"
				return v;
			})
			.sort(compareWithNonSpecifiedLast);

		const summary = { // was "resumo"
			total: totalSummary,
			items: Array.from(summaryMap.values()).sort(compareWithNonSpecifiedLast), // was "itens"
		};

		EXPENSES_CONVERTED[currency].travelerExpenses = { summary, items }; // was "gastosViajantes", "resumo", "itens"
	}
}

export function calculateConvertedExpenses(type: string, currency: string): { summary: any; items: any[] } {
	function updateSummary(summary: any, expenseTypeName: string, amount: number): void { // was "resumo", "tipoGasto", "valor"
		const summaryNames = summary.items.map((item: any) => item.name); // was "resumoNomes", "itens", "nome"
		const summaryIndex = summaryNames.indexOf(expenseTypeName);
		if (summaryIndex >= 0) {
			summary.items[summaryIndex].amount += amount; // was "itens", "valor"
		} else {
			summary.items.push({ // was "itens"
				name: expenseTypeName, // was "nome"
				amount, // was "valor"
			});
		}
	}

	function updateItems(items: any[], expense: any, amount: number): void { // was "updateItens", "itens", "gasto", "valor"
		const expenseName = expense.name; // was "nome"
		const expenseType = expense.type; // was "tipo"
		const expensePerson = expense.person; // was "pessoa"

		const itemNames = items.map((item: any) => item.name); // was "itemNomes", "itens", "nome"
		const itemIndex = itemNames.indexOf(expenseType);
		if (itemIndex >= 0) {
			items[itemIndex].total += amount; // was "itens"
			items[itemIndex].items.push({ name: expenseName, person: expensePerson, amount }); // was "itens", "nome", "pessoa", "valor"
		} else {
			items.push({ // was "itens"
				name: expenseType, // was "nome"
				total: amount,
				items: [ // was "itens"
					{
						name: expenseName, // was "nome"
						person: expensePerson, // was "pessoa"
						amount, // was "valor"
					},
				],
			});
		}
	}

	const expenses = EXPENSES_DATA[type]; // was "gastos"
	const summary = { // was "resumo"
		total: 0,
		items: [], // was "itens"
	};
	const items: any[] = []; // was "itens"

	for (const expense of expenses) { // was "gasto"
		let amount = expense.amount; // was "valor"
		let include = true;

		if (expense.currency != currency) { // was "moeda"
			if (canConvert([expense.currency, currency])) { // was "moeda"
				amount = convertCurrency(expense.currency, currency, expense.amount); // was "moeda", "valor"
			} else {
				include = false;
			}
		}

		if (include) {
			summary.total += amount; // was "resumo"
			amount = parseFloat(amount.toFixed(2));

			updateSummary(summary, expense.type, amount); // was "resumo", "tipo"
			updateItems(items, expense, amount); // was "itens"
		}
	}

	summary.total = parseFloat(summary.total.toFixed(2)); // was "resumo"
	return { summary, items }; // was "resumo", "itens"
}

export function getConversionText(): string {
	if (CURRENCIES.summary.length == 1) {
		return getEmptyChar();
	}
	const conversions = [`1 ${DEFAULT_CURRENCY}`]; // was "conversoes"
	for (const currency of CURRENCIES.summary) { // was "moeda"
		if (currency == DEFAULT_CURRENCY) { // was "moeda"
			continue;
		}
		conversions.push( // was "conversoes"
			`${convertCurrency(currency, DEFAULT_CURRENCY, 1).toFixed(2)} ${currency}`, // was "moeda"
		);
	}
	return conversions.join(" = "); // was "conversoes"
}

// ======= Chart Data (Pure) =======

export function getChartData(labels: string[], values: number[], rgbColors: number[][]): any {
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

export function getChartConfig(type: string, data: any): any {
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

export function getChartColorsRGB(size: number): number[][] {
	const result: number[][] = [];
	const hexColors = getColors().options.map((color: any) => color.hex);
	const rgbColors = hexColors.map((color: string) => hexToRgb(color));

	for (let i = 0; i < size; i++) {
		const index = i % rgbColors.length;
		result.push(rgbColors[index]);
	}

	return result;
}

export function getArrayRGBA(rgbColors: number[][], a: number): string[] { // was "coresRGB"
	const result: string[] = [];

	for (const rgb of rgbColors) { // was "coresRGB"
		result.push(rgbToText(rgb[0], rgb[1], rgb[2], a));
	}

	return result;
}
