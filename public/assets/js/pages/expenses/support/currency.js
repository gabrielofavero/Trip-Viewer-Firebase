import {
	_filterMoedas,
	_sortMoedas,
	_convertMoeda,
	_canConvert,
	_getMoedaSymbol,
	_formatMoeda,
	_loadMoedasObject,
} from '../../../models/expense.js';

var MOEDA_PADRAO;
var MOEDA_CONVERSAO = {};
var MOEDA_ATUAL;

var MOEDAS = {
	resumo: [],
	gastosPrevios: [],
	gastosDurante: [],
};

// BACKWARD COMPAT: attach to window during migration
window._filterMoedas = _filterMoedas;
window._sortMoedas = _sortMoedas;
window._convertMoeda = _convertMoeda;
window._canConvert = _canConvert;
window._getMoedaSymbol = _getMoedaSymbol;
window._formatMoeda = _formatMoeda;
window._loadMoedasObject = _loadMoedasObject;

async function _loadMoedas() {
	MOEDA_PADRAO = GASTOS.moeda;

	_loadMoedasObject();

	switch (MOEDAS.resumo.length) {
		case 0:
			MOEDA_ATUAL = MOEDAS.resumo.includes(MOEDA_PADRAO)
				? MOEDA_PADRAO
				: MOEDAS.resumo[0];
			getID("tab-moedas").style.display = "none";
			break;
		case 1:
			MOEDA_ATUAL = MOEDAS.resumo[0];
		default:
			MOEDA_ATUAL = MOEDAS.resumo.includes(MOEDA_PADRAO)
				? MOEDA_PADRAO
				: MOEDAS.resumo[0];
			await _loadMoedaConversao();
			_loadMoedasTab();
	}
}

async function _loadMoedaConversao() {
	const comparacoes = [];
	const chaves = [];
	for (const moeda of MOEDAS.resumo) {
		if (moeda !== MOEDA_PADRAO) {
			comparacoes.push(`${moeda}-${MOEDA_PADRAO}`);
			chaves.push(moeda + MOEDA_PADRAO);
		}
	}
	if (comparacoes.length === 0) {
		return;
	}
	const url = `https://economia.awesomeapi.com.br/last/${comparacoes.join(",")}`;
	const data = await _fetchConversoes(url);
	if (data) {
		for (const chave of chaves) {
			MOEDA_CONVERSAO[chave] = data[chave].bid;
		}
	}
}

async function _fetchConversoes(url) {
	try {
		const response = await fetch(url);
		if (!response.ok) {
			console.error(
				`Network issue while trying to fetch currency information:`,
			);
			console.error(response);
			console.warn(`Using default currency ${MOEDA_PADRAO}`);
		}
		const data = await response.json();
		return data;
	} catch (error) {
		console.error(error);
		console.warn(`Using default currency ${MOEDA_PADRAO}`);
	}
}

function _loadMoedasTab() {
	const moedasTab = getID("tab-moedas");
	moedasTab.innerHTML = "";
	moedasTab.style.display = MOEDAS.resumo.length > 1 ? "" : "none";

	for (let j = 1; j <= MOEDAS.resumo.length; j++) {
		const checked = MOEDAS.resumo[j - 1] === MOEDA_ATUAL ? "checked" : "";
		moedasTab.innerHTML += `<input type="radio" id="radio-moeda-${j}" name="tabs-moedas" ${checked} />`;
		moedasTab.innerHTML += `<label class="tab-mini" for="radio-moeda-${j}">${MOEDAS.resumo[j - 1]}</label>`;
	}

	moedasTab.innerHTML += '<span class="glider-mini"></span>';

	const childs = _getChildIDs("tab-moedas");
	for (let i = 0; i < childs.length; i++) {
		_setCSSRule(
			`input[id="${childs[i]}"]:checked~.glider-mini`,
			"transform",
			`translateX(${i * 100}%)`,
		);

		const radio = getID(`radio-moeda-${i + 1}`);
		radio.addEventListener("change", () => {
			if (radio.checked) {
				MOEDA_ATUAL = MOEDAS.resumo[i];
				_applyGastos();
				_setTabListeners();
			}
		});
	}
}
