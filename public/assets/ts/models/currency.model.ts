// ======= Currency Model =======
// Shared currency logic used across pages: exchange-rate fetching (AwesomeAPI),
// conversion and formatting. Currently consumed by the standalone Expenses page
// and the Edit Trip page (expense subtotals shown in the trip currency).

import { getCurrencies } from '../app/config.js';

// Rate table keyed as "FROMTO" — e.g. "USDBRL" is how many BRL a single USD buys.
export var CURRENCY_CONVERSION: Record<string, number> = {};

// Base currency all rates are fetched against (the trip currency).
export var DEFAULT_CURRENCY = 'BRL';

export function setDefaultCurrency(currency: string): void {
	DEFAULT_CURRENCY = currency || 'BRL';
}

export function getDefaultCurrency(): string {
	return DEFAULT_CURRENCY;
}

/**
 * Fetch AwesomeAPI rates for each currency in `currencies` against `base` and
 * store them in CURRENCY_CONVERSION (keys like "USDBRL").
 * Returns how many rates were loaded (0 on failure or when there's nothing to fetch).
 */
export async function loadCurrencyConversion(
	base: string,
	currencies: string[],
): Promise<number> {
	const pairs: string[] = [];
	const keys: string[] = [];
	for (const currency of currencies) {
		if (currency && currency !== base) {
			pairs.push(`${currency}-${base}`);
			keys.push(`${currency}${base}`);
		}
	}
	if (pairs.length === 0) {
		return 0;
	}

	const url = `https://economia.awesomeapi.com.br/last/${pairs.join(',')}`;
	const data = await fetchRates(url);
	if (!data) {
		return 0;
	}

	let loaded = 0;
	for (const key of keys) {
		const bid = data[key]?.bid;
		if (bid !== undefined) {
			CURRENCY_CONVERSION[key] = Number(bid);
			loaded++;
		}
	}
	return loaded;
}

async function fetchRates(url: string): Promise<any | null> {
	try {
		const response = await fetch(url);
		if (!response.ok) {
			console.error('Network issue while trying to fetch currency information:');
			console.error(response);
			console.warn(`Using default currency ${DEFAULT_CURRENCY}`);
		}
		return await response.json();
	} catch (error) {
		console.error(error);
		console.warn(`Using default currency ${DEFAULT_CURRENCY}`);
		return null;
	}
}

export function convertCurrency(from: string, to: string, amount: number): number {
	if (!from || !to || from === to) {
		return amount;
	}

	const direct = CURRENCY_CONVERSION[from + to];
	if (direct !== undefined) {
		return amount * direct;
	}

	const inverse = CURRENCY_CONVERSION[to + from];
	if (inverse !== undefined) {
		return amount / inverse;
	}

	// Cross-convert through the base currency: amount * (from→base) / (to→base).
	const fromToBase = CURRENCY_CONVERSION[from + DEFAULT_CURRENCY];
	const toToBase = CURRENCY_CONVERSION[to + DEFAULT_CURRENCY];
	if (fromToBase !== undefined && toToBase !== undefined) {
		return (amount * fromToBase) / toToBase;
	}

	console.error(`Conversion error: from ${amount} ${from} to ? ${to}`);
	return 0;
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
	}
	return currency;
}

export function formatCurrency(amount: number, currency?: string, includeSymbol = false): string {
	const result = new Intl.NumberFormat('pt-BR', {
		style: 'decimal',
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	}).format(amount);
	return includeSymbol ? `${getCurrencySymbol(currency || DEFAULT_CURRENCY)} ${result}` : result;
}

export function filterCurrencies(arr: string[]): string[] {
	return arr.filter((currency, index, self) => self.indexOf(currency) === index && currency);
}

export function sortCurrencies(arr: string[]): string[] {
	return arr.sort((a, b) => {
		if (a === DEFAULT_CURRENCY) {
			return -1;
		} else if (b === DEFAULT_CURRENCY) {
			return 1;
		}
		return 0;
	});
}
