// ======= Expense Model =======
// Pure data transformation functions for expenses (currency conversion, aggregation, chart data)
// Extracted from: expenses-converted.js, support/currency.js, support/data.js

import { getColors } from '../app/config.js';
import { getEmptyChar } from '../utils/dom.js';
import { isOnDarkMode } from '../theme/visibility.js';
import { hexToRgb, rgbToText } from '../theme/colors.js';
import { EXPENSES_DATA } from '../pages/expenses/mount.js';
import { CURRENCIES, CURRENT_CURRENCY } from '../pages/expenses/support/currency.js';
import {
	canConvert,
	convertCurrency,
	DEFAULT_CURRENCY,
	filterCurrencies,
	formatCurrency as formatCurrencyShared,
	sortCurrencies,
} from './currency.model.js';

// Re-export the shared conversion helpers so existing importers of
// expense.model.js keep working. `formatCurrency` is wrapped below to keep the
// expenses-page signature `(amount, includeSymbol)` used by data.ts/categories.ts.
export {
	canConvert,
	convertCurrency,
	filterCurrencies,
	getCurrencySymbol,
	sortCurrencies,
} from './currency.model.js';

// ======= Global state (shared across modules) =======
export var EXPENSES_CONVERTED: Record<string, any> = {};

// Active single-person view filter ('' = unified "all" view). Set by mount.ts.
var ACTIVE_EXPENSE_PERSON = '';

export function setActiveExpensePerson(personId: string): void {
	ACTIVE_EXPENSE_PERSON = personId || '';
}

export function getActiveExpensePerson(): string {
	return ACTIVE_EXPENSE_PERSON;
}

// ======= Expense Splitting & Single-Person Filter =======

function round2(value: number): number {
	return Math.round(value * 100) / 100;
}

/** Traveler IDs an expense is split among (falls back to the payer). */
export function getExpensePeople(expense: any): string[] {
	if (Array.isArray(expense?.people) && expense.people.length > 0) {
		return expense.people;
	}
	return expense?.person ? [expense.person] : [];
}

/** Equal share multiplier for an expense (1 when not split). */
export function getExpenseShare(expense: any): number {
	const people = getExpensePeople(expense);
	return people.length > 1 ? 1 / people.length : 1;
}

/** Whether an expense involves the given traveler (payer or split member). */
export function isExpenseForPerson(expense: any, personId: string): boolean {
	return getExpensePeople(expense).includes(personId);
}

/**
 * The expense list used for rendering. In the unified view it returns the raw
 * list; when a single person is selected it returns only that person's
 * expenses with the price reduced to their equal share.
 */
export function getEffectiveExpensesList(type: string): any[] {
	const expenses = EXPENSES_DATA?.[type] || [];
	if (!ACTIVE_EXPENSE_PERSON) {
		return expenses;
	}
	return expenses
		.filter((expense: any) => isExpenseForPerson(expense, ACTIVE_EXPENSE_PERSON))
		.map((expense: any) => {
			const share = getExpenseShare(expense);
			const price = share === 1 ? expense.price : round2((Number(expense.price) || 0) * share);
			return { ...expense, price };
		});
}

// ======= Currency Filtering, Sorting, Conversion & Formatting =======
// The shared conversion/filtering/sorting helpers now live in
// models/currency.model.ts (used by both the Expenses page and the Edit Trip
// page). This file keeps only the expenses-page `formatCurrency` wrapper so the
// `(amount, includeSymbol)` signature used by data.ts / categories.ts is preserved.

export function formatCurrency(currencyFloat: number, includeSymbol = false): string {
	return formatCurrencyShared(currencyFloat, CURRENT_CURRENCY, includeSymbol);
}

// ======= Currency Loading =======

export function loadCurrenciesObject(): void {
	const preTrip = EXPENSES_DATA?.preTrip;
	const duringTrip = EXPENSES_DATA?.duringTrip;
	if (preTrip?.length > 0 || duringTrip?.length > 0) {
		// was "gastosPrevios" / "gastosDurante"
		let previousCurrencies: string[] = [];
		let duringCurrencies: string[] = [];

		if (preTrip?.length > 0) {
			previousCurrencies = filterCurrencies(
				preTrip.map((expense: any) => expense.currency), // was "moeda"
			);
			CURRENCIES.preTrip = previousCurrencies;
		}

		if (duringTrip?.length > 0) {
			duringCurrencies = filterCurrencies(
				duringTrip.map((expense: any) => expense.currency), // was "moeda"
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
	processConvertedExpenses('duringTrip'); // was "gastosDurante"
	processConvertedExpenses('preTrip'); // was "gastosPrevios"
	processConvertedTravelerExpenses();
}

export function processConvertedExpenses(expenseType: string): void {
	for (const currency of CURRENCIES.summary) {
		if (!EXPENSES_CONVERTED[currency]) {
			EXPENSES_CONVERTED[currency] = {};
		}
		EXPENSES_CONVERTED[currency][expenseType] = calculateConvertedExpenses(expenseType, currency);
	}
}

export function processConvertedTravelerExpenses(): void {
	const types: Record<string, string> = {
		preTrip: 'trip.expenses.pre_trip', // was "gastosPrevios"
		duringTrip: 'trip.expenses.during_trip', // was "gastosDurante"
	};

	for (const currency of CURRENCIES.summary) {
		const travelerMap = new Map(); // was "viajanteMap"
		const summaryMap = new Map(); // was "resumoMap"
		let totalSummary = 0;

		const addToTraveler = (person: string, amount: number, name: string): void => {
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
		};

		for (const type in types) {
			const group = EXPENSES_CONVERTED?.[currency]?.[type]; // was "grupo"
			if (!group?.items) continue; // was "itens"

			for (const expense of group.items) {
				// was "gasto"
				if (!expense?.items?.length) continue; // was "itens"

				for (const item of expense.items) {
					// was "itens"
					const amount = Number(item.amount) || 0; // was "valor"
					const name = types[type];

					if (ACTIVE_EXPENSE_PERSON) {
						// Single-person view: the amount is already this person's share.
						const person =
							EXPENSES_DATA?.travelers?.[ACTIVE_EXPENSE_PERSON] || ACTIVE_EXPENSE_PERSON;
						addToTraveler(person, amount, name);
						continue;
					}

					const people =
						Array.isArray(item.people) && item.people.length > 0
							? item.people
							: item.person
								? [item.person]
								: [];

					if (people.length === 0) {
						// No payer (`person`) and no split members (`people`): the
						// expense isn't attributed to anyone, so it's left out of
						// the per-person breakdown (no "Non-specified" bucket).
						continue;
					}

					const share = people.length > 1 ? 1 / people.length : 1;
					for (const personId of people) {
						const person = EXPENSES_DATA?.travelers?.[personId] || personId;
						addToTraveler(person, round2(amount * share), name);
					}
				}
			}
		}

		function compareTravelerNames(a: any, b: any): number {
			return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }); // was "nome"
		}

		const items = Array.from(travelerMap.values()) // was "itens"
			.map((v: any) => {
				delete v._byType; // was "_byTipo"
				return v;
			})
			.sort(compareTravelerNames);

		const summary = {
			// was "resumo"
			total: totalSummary,
			items: Array.from(summaryMap.values()).sort(compareTravelerNames), // was "itens"
		};

		EXPENSES_CONVERTED[currency].expensesTravelers = { summary, items }; // was "gastosViajantes", "resumo", "itens"
	}
}

export function calculateConvertedExpenses(
	type: string,
	currency: string,
): { summary: any; items: any[] } {
	function updateSummary(summary: any, expenseTypeName: string, amount: number): void {
		// was "resumo", "tipoGasto", "valor"
		const summaryNames = summary.items.map((item: any) => item.name); // was "resumoNomes", "itens", "nome"
		const summaryIndex = summaryNames.indexOf(expenseTypeName);
		if (summaryIndex >= 0) {
			summary.items[summaryIndex].amount += amount; // was "itens", "valor"
		} else {
			summary.items.push({
				// was "itens"
				name: expenseTypeName, // was "nome"
				amount, // was "valor"
			});
		}
	}

	function updateItems(items: any[], expense: any, amount: number): void {
		// was "updateItens", "itens", "gasto", "valor"
		const expenseName = expense.name; // was "nome"
		const expenseType = expense.type; // was "tipo"
		const expensePerson = expense.person; // was "pessoa"
		const expensePeople = Array.isArray(expense.people) ? expense.people : [];
		const expenseLink = expense.link || '';

		const itemNames = items.map((item: any) => item.name); // was "itemNomes", "itens", "nome"
		const itemIndex = itemNames.indexOf(expenseType);
		if (itemIndex >= 0) {
			items[itemIndex].total += amount; // was "itens"
			items[itemIndex].items.push({
				name: expenseName,
				person: expensePerson,
				people: expensePeople,
				link: expenseLink,
				amount,
			}); // was "itens", "nome", "pessoa", "valor"
		} else {
			items.push({
				// was "itens"
				name: expenseType, // was "nome"
				total: amount,
				items: [
					// was "itens"
					{
						name: expenseName, // was "nome"
						person: expensePerson, // was "pessoa"
						people: expensePeople,
						link: expenseLink,
						amount, // was "valor"
					},
				],
			});
		}
	}

	const expenses = getEffectiveExpensesList(type); // was "gastos" (filtered by active person)
	const summary = {
		// was "resumo"
		total: 0,
		items: [], // was "itens"
	};
	const items: any[] = []; // was "itens"

	for (const expense of expenses) {
		// was "gasto"
		let amount = Number(expense.price) || 0; // was "valor"
		let include = true;

		if (expense.currency != currency) {
			// was "moeda"
			if (canConvert([expense.currency, currency])) {
				// was "moeda"
				amount = convertCurrency(expense.currency, currency, Number(expense.price) || 0); // was "moeda", "valor"
			} else {
				include = false;
			}
		}

		if (include && amount > 0) {
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
	for (const currency of CURRENCIES.summary) {
		// was "moeda"
		if (currency == DEFAULT_CURRENCY) {
			// was "moeda"
			continue;
		}
		conversions.push(
			// was "conversoes"
			`${convertCurrency(currency, DEFAULT_CURRENCY, 1).toFixed(2)} ${currency}`, // was "moeda"
		);
	}
	return conversions.join(' = '); // was "conversoes"
}

// ======= Chart Data (Pure) =======

export function getChartData(labels: string[], values: number[], rgbColors: number[][]): any {
	return {
		labels: labels,
		datasets: [
			{
				label: '',
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

	if (type === 'doughnut' || type === 'pie') {
		legend.display = true;
		legend.position = 'right';
		legend.labels = {
			color: isOnDarkMode() ? 'rgba(227, 236, 248, 1)' : 'rgba(75, 85, 99, 1)',
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

	if (type === 'bar') {
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

export function getArrayRGBA(rgbColors: number[][], a: number): string[] {
	// was "coresRGB"
	const result: string[] = [];

	for (const rgb of rgbColors) {
		// was "coresRGB"
		result.push(rgbToText(rgb[0], rgb[1], rgb[2], a));
	}

	return result;
}
