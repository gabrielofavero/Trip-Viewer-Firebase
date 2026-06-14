import { getChildIDs, getID } from '../../../utils/dom.js';
import { setCSSRule } from '../../../theme/stylesheets.js';
import { canConvert, convertCurrency, filterCurrencies, formatCurrency, getCurrencySymbol, loadCurrenciesObject, sortCurrencies } from '../../../models/expense.model.js';
import { setTabListeners } from "../expenses.js";
import { EXPENSES_DATA } from '../expenses.js';

var DEFAULT_CURRENCY;
var CURRENCY_CONVERSION = {};
var CURRENT_CURRENCY;

export var CURRENCIES = {
	summary: [],
	preTrip: [],
	duringTrip: [],
};



async function loadCurrencies() {
	DEFAULT_CURRENCY = EXPENSES_DATA.currency;

	loadCurrenciesObject();

	switch (CURRENCIES.summary.length) {
		case 0:
			CURRENT_CURRENCY = CURRENCIES.summary.includes(DEFAULT_CURRENCY)
				? DEFAULT_CURRENCY
				: CURRENCIES.summary[0];
			getID("tab-currencies").style.display = "none";
			break;
		case 1:
			CURRENT_CURRENCY = CURRENCIES.summary[0];
		default:
			CURRENT_CURRENCY = CURRENCIES.summary.includes(DEFAULT_CURRENCY)
				? DEFAULT_CURRENCY
				: CURRENCIES.summary[0];
			await loadCurrencyConversion();
			loadCurrenciesTab();
	}
}

async function loadCurrencyConversion() {
	const comparacoes = [];
	const chaves = [];
	for (const moeda of CURRENCIES.summary) {
		if (moeda !== DEFAULT_CURRENCY) {
			comparacoes.push(`${moeda}-${DEFAULT_CURRENCY}`);
			chaves.push(moeda + DEFAULT_CURRENCY);
		}
	}
	if (comparacoes.length === 0) {
		return;
	}
	const url = `https://economia.awesomeapi.com.br/last/${comparacoes.join(",")}`;
	const data = await fetchConversoes(url);
	if (data) {
		for (const chave of chaves) {
			CURRENCY_CONVERSION[chave] = data[chave].bid;
		}
	}
}

async function fetchConversoes(url) {
	try {
		const response = await fetch(url);
		if (!response.ok) {
			console.error(
				`Network issue while trying to fetch currency information:`,
			);
			console.error(response);
			console.warn(`Using default currency ${DEFAULT_CURRENCY}`);
		}
		const data = await response.json();
		return data;
	} catch (error) {
		console.error(error);
		console.warn(`Using default currency ${DEFAULT_CURRENCY}`);
	}
}

export function loadCurrenciesTab() {
	const currencyTab = getID("tab-currencies");
	currencyTab.innerHTML = "";
	currencyTab.style.display = CURRENCIES.summary.length > 1 ? "" : "none";

	for (let j = 1; j <= CURRENCIES.summary.length; j++) {
		const checked = CURRENCIES.summary[j - 1] === CURRENT_CURRENCY ? "checked" : "";
		currencyTab.innerHTML += `<input type="radio" id="radio-currency-${j}" name="tabs-currencies" ${checked} />`;
		currencyTab.innerHTML += `<label class="tab-mini" for="radio-currency-${j}">${CURRENCIES.summary[j - 1]}</label>`;
	}

	currencyTab.innerHTML += '<span class="glider-mini"></span>';

	const childs = getChildIDs("tab-currencies");
	for (let i = 0; i < childs.length; i++) {
		setCSSRule(
			`input[id="${childs[i]}"]:checked~.glider-mini`,
			"transform",
			`translateX(${i * 100}%)`,
		);

		const radio = getID(`radio-currency-${i + 1}`);
		radio.addEventListener("change", () => {
			if (radio.checked) {
				CURRENT_CURRENCY = CURRENCIES.summary[i];
				applyExpenses();
				setTabListeners();
			}
		});
	}
}
