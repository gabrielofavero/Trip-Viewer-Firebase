import { getDestinations, getCurrencies } from '../../../app/config.js';
import { getChildIDs, getID } from '../../../utils/dom.js';
import { translate } from '../../../i18n/translation.js';

export var VALOR_OPTIONS = "";

export function loadCurrencySelects() {
	loadCurrencyOptions();

	const destinationsConfig = getDestinations();
	for (const category of destinationsConfig.categories.tours) {
		const childs = getChildIDs(`${category}-box`);
		for (const child of childs) {
			const i = child.split("-").pop();
			if (VALOR_OPTIONS) {
				const select = getID(`${category}-valor-${i}`);
				const value = select.value;
				select.innerHTML = VALOR_OPTIONS;
				select.value = value;
			} else {
				getID(`${category}-valor-${i}`).style.display = "none";
				getID(`${category}-outro-valor-${i}`).style.display = "none";
			}
		}
	}
}

export function loadCurrencyOptions() {
	const currencies = getCurrencies();
	const categories = currencies.values;
	const moeda = getID("currency").value;
	VALOR_OPTIONS = "";

	if (moeda != "outra" && currencies.scale[moeda]) {
		for (const category of categories) {
			const label = getLabel(category);
			VALOR_OPTIONS += `<option value="${category}">${label}</option>`;
		}
		if (VALOR_OPTIONS) {
			VALOR_OPTIONS += `<option value="outro">${translate("labels.other")}</option>`;
		}
	}

	function getLabel(category) {
		switch (category) {
			case "default":
				return translate(`destination.price.default`);
			case "-":
			case "free":
				return translate(`destination.price.free`);
			case "$":
			case "$$":
			case "$$$":
				return currencies.scale[moeda][category];
			case "$$$$":
				return translate(`destination.price.max`, {
					value: currencies.scale[moeda][category],
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

export function loadCurrencyValueAndVisibility(valor, categoria, i) {
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
