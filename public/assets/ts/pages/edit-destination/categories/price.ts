import { getDestinations, getCurrencies } from '../../../app/config.js';
import { getChildIDs, getID } from '../../../utils/dom.js';
import { translate } from '../../../i18n/translation.js';

export var PRICE_OPTIONS = '';

export function loadCurrencySelects() {
	loadCurrencyOptions();

	const destinationsConfig = getDestinations();
	for (const category of destinationsConfig.categories.tours) {
		const childs = getChildIDs(`${category}-box`);
		for (const child of childs) {
			const i = child.split('-').pop();
			if (PRICE_OPTIONS) {
				const select = getID(`${category}-price-${i}`);
				const value = select.value;
				select.innerHTML = PRICE_OPTIONS;
				select.value = value;
			} else {
				getID(`${category}-price-${i}`).style.display = 'none';
				getID(`${category}-other-price-${i}`).style.display = 'none';
			}
		}
	}
}

export function loadCurrencyOptions() {
	const currencies = getCurrencies();
	const categories = currencies.values;
	const selectedCurrency = getID('currency').value;
	PRICE_OPTIONS = '';

	if (selectedCurrency != 'other' && currencies.scale[selectedCurrency]) {
		for (const category of categories) {
			const label = getLabel(category);
			PRICE_OPTIONS += `<option value="${category}">${label}</option>`;
		}
		if (PRICE_OPTIONS) {
			PRICE_OPTIONS += `<option value="other">${translate('labels.other')}</option>`;
		}
	}

	function getLabel(category) {
		switch (category) {
			case 'default':
				return translate(`destination.price.default`);
			case '-':
			case 'free':
				return translate(`destination.price.free`);
			case '$':
			case '$$':
			case '$$$':
				return currencies.scale[selectedCurrency][category];
			case '$$$$':
				return translate(`destination.price.max`, {
					value: currencies.scale[selectedCurrency][category],
				});
			default:
				return translate('labels.other');
		}
	}
}

export function getOtherPriceVisibility() {
	if (PRICE_OPTIONS) return 'none';
	else return 'block';
}

export function loadCurrencyValueAndVisibility(price, category, i) {
	const priceSelect = getID(`${category}-price-${i}`);
	const otherPriceDiv = getID(`${category}-other-price-${i}`);

	const texts = Array.from(priceSelect.options).map((option) => option.text);
	const values = Array.from(priceSelect.options).map((option) => option.value);

	if (PRICE_OPTIONS && values.includes(price)) {
		priceSelect.value = price;
		otherPriceDiv.style.display = 'none';
	} else if (PRICE_OPTIONS && texts.includes(price)) {
		priceSelect.value = values[texts.indexOf(price)];
		otherPriceDiv.style.display = 'none';
	} else {
		priceSelect.value = 'other';
		otherPriceDiv.style.display = 'block';
		otherPriceDiv.value = price;
	}
}
