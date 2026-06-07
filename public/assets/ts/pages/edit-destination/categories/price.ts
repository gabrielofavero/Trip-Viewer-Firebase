import { getDestinos, getCurrencies } from '../../../app/config.js';
import { getChildIDs, getID } from '../../../utils/dom.js';
import { translate } from '../../../i18n/translation.js';

export var VALOR_OPTIONS = "";

export function loadCurrencySelects() {
	loadMoedaOptions();

	const destinos = getDestinos();
	for (const categoria of destinos.categorias.passeios) {
		const childs = getChildIDs(`${categoria}-box`);
		for (const child of childs) {
			const i = child.split("-").pop();
			if (VALOR_OPTIONS) {
				const select = getID(`${categoria}-valor-${i}`);
				const value = select.value;
				select.innerHTML = VALOR_OPTIONS;
				select.value = value;
			} else {
				getID(`${categoria}-valor-${i}`).style.display = "none";
				getID(`${categoria}-outro-valor-${i}`).style.display = "none";
			}
		}
	}
}

export function loadMoedaOptions() {
	const moedas = getCurrencies();
	const categorias = moedas.valores;
	const moeda = getID("moeda").value;
	VALOR_OPTIONS = "";

	if (moeda != "outra" && moedas.escala[moeda]) {
		for (const categoria of categorias) {
			const label = getLabel(categoria);
			VALOR_OPTIONS += `<option value="${categoria}">${label}</option>`;
		}
		if (VALOR_OPTIONS) {
			VALOR_OPTIONS += `<option value="outro">${translate("labels.other")}</option>`;
		}
	}

	function getLabel(categoria) {
		switch (categoria) {
			case "default":
				return translate(`destination.price.default`);
			case "-":
			case "free":
				return translate(`destination.price.free`);
			case "$":
			case "$$":
			case "$$$":
				return moedas.escala[moeda][categoria];
			case "$$$$":
				return translate(`destination.price.max`, {
					value: moedas.escala[moeda][categoria],
				});
			default:
				return translate("labels.other");
		}
	}
}

export function getOutroValorVisibility() {
	if (VALOR_OPTIONS) return "none";
	else return "block";
}

export function loadMoedaValorAndVisibility(valor, categoria, i) {
	const valorSelect = getID(`${categoria}-valor-${i}`);
	const outroValorDiv = getID(`${categoria}-outro-valor-${i}`);

	const texts = Array.from(valorSelect.options).map((option) => option.text);
	const values = Array.from(valorSelect.options).map((option) => option.value);

	if (VALOR_OPTIONS && values.includes(valor)) {
		valorSelect.value = valor;
		outroValorDiv.style.display = "none";
	} else if (VALOR_OPTIONS && texts.includes(valor)) {
		valorSelect.value = values[texts.indexOf(valor)];
		outroValorDiv.style.display = "none";
	} else {
		valorSelect.value = "outro";
		outroValorDiv.style.display = "block";
		outroValorDiv.value = valor;
	}
}
