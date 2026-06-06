import { getChildIDs, getID } from '../../../utils/dom.js';
import { setCSSRule } from '../../../theme/stylesheets.js';
import { canConvert, convertCurrency, filterCurrencies, formatCurrency, getCurrencySymbol, loadCurrenciesObject, sortCurrencies } from '../../../models/expense.model.js';

var DEFAULT_CURRENCY;
var MOEDA_CONVERSAO = {};
var CURRENT_CURRENCY;

var MOEDAS = {
	resumo: [],
	gastosPrevios: [],
	gastosDurante: [],
};



async function loadCurrencies() {
	DEFAULT_CURRENCY = GASTOS.moeda;

	loadCurrenciesObject();

	switch (MOEDAS.resumo.length) {
		case 0:
			CURRENT_CURRENCY = MOEDAS.resumo.includes(DEFAULT_CURRENCY)
				? DEFAULT_CURRENCY
				: MOEDAS.resumo[0];
			getID("tab-moedas").style.display = "none";
			break;
		case 1:
			CURRENT_CURRENCY = MOEDAS.resumo[0];
		default:
			CURRENT_CURRENCY = MOEDAS.resumo.includes(DEFAULT_CURRENCY)
				? DEFAULT_CURRENCY
				: MOEDAS.resumo[0];
			await loadCurrencyConversion();
			loadCurrenciesTab();
	}
}

async function loadCurrencyConversion() {
	const comparacoes = [];
	const chaves = [];
	for (const moeda of MOEDAS.resumo) {
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
			MOEDA_CONVERSAO[chave] = data[chave].bid;
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

function loadCurrenciesTab() {
	const moedasTab = getID("tab-moedas");
	moedasTab.innerHTML = "";
	moedasTab.style.display = MOEDAS.resumo.length > 1 ? "" : "none";

	for (let j = 1; j <= MOEDAS.resumo.length; j++) {
		const checked = MOEDAS.resumo[j - 1] === CURRENT_CURRENCY ? "checked" : "";
		moedasTab.innerHTML += `<input type="radio" id="radio-moeda-${j}" name="tabs-moedas" ${checked} />`;
		moedasTab.innerHTML += `<label class="tab-mini" for="radio-moeda-${j}">${MOEDAS.resumo[j - 1]}</label>`;
	}

	moedasTab.innerHTML += '<span class="glider-mini"></span>';

	const childs = getChildIDs("tab-moedas");
	for (let i = 0; i < childs.length; i++) {
		setCSSRule(
			`input[id="${childs[i]}"]:checked~.glider-mini`,
			"transform",
			`translateX(${i * 100}%)`,
		);

		const radio = getID(`radio-moeda-${i + 1}`);
		radio.addEventListener("change", () => {
			if (radio.checked) {
				CURRENT_CURRENCY = MOEDAS.resumo[i];
				applyExpenses();
				setTabListeners();
			}
		});
	}
}
