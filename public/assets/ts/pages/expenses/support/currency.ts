import { getChildIDs, getID } from '../../../utils/dom.js';
import { setCSSRule } from '../../../theme/stylesheets.js';
import { loadCurrenciesObject } from '../../../models/expense.model.js';
import {
	CURRENCY_CONVERSION,
	DEFAULT_CURRENCY,
	loadCurrencyConversion,
	setDefaultCurrency,
} from '../../../models/currency.model.js';
import { setTabListeners, applyExpenses, EXPENSES_DATA } from '../mount.js';

// Re-exported for existing importers (mount.ts, expense.model.ts, categories.ts).
export { CURRENCY_CONVERSION, DEFAULT_CURRENCY };

export var CURRENT_CURRENCY;

export var CURRENCIES = {
	summary: [],
	preTrip: [],
	duringTrip: [],
};

export async function loadExpenseCurrencies() {
	setDefaultCurrency(EXPENSES_DATA.currency);

	loadCurrenciesObject();

	switch (CURRENCIES.summary.length) {
		case 0:
			CURRENT_CURRENCY = CURRENCIES.summary.includes(DEFAULT_CURRENCY)
				? DEFAULT_CURRENCY
				: CURRENCIES.summary[0];
			getID('tab-currencies').style.display = 'none';
			break;
		case 1:
			CURRENT_CURRENCY = CURRENCIES.summary[0];
		// fall through to default
		default:
			CURRENT_CURRENCY = CURRENCIES.summary.includes(DEFAULT_CURRENCY)
				? DEFAULT_CURRENCY
				: CURRENCIES.summary[0];
			await loadCurrencyConversion(DEFAULT_CURRENCY, CURRENCIES.summary);
			loadCurrenciesTab();
	}
}

export function loadCurrenciesTab() {
	const currencyTab = getID('tab-currencies');
	currencyTab.innerHTML = '';
	currencyTab.style.display = CURRENCIES.summary.length > 1 ? '' : 'none';

	for (let j = 1; j <= CURRENCIES.summary.length; j++) {
		const checked = CURRENCIES.summary[j - 1] === CURRENT_CURRENCY ? 'checked' : '';
		currencyTab.innerHTML += `<input type="radio" id="radio-currency-${j}" name="tabs-currencies" ${checked} />`;
		currencyTab.innerHTML += `<label class="tab-mini" for="radio-currency-${j}">${CURRENCIES.summary[j - 1]}</label>`;
	}

	currencyTab.innerHTML += '<span class="glider-mini"></span>';

	const childs = getChildIDs('tab-currencies');
	for (let i = 0; i < childs.length; i++) {
		setCSSRule(
			`input[id="${childs[i]}"]:checked~.glider-mini`,
			'transform',
			`translateX(${i * 100}%)`,
		);

		const radio = getID(`radio-currency-${i + 1}`);
		radio.addEventListener('change', () => {
			if (radio.checked) {
				CURRENT_CURRENCY = CURRENCIES.summary[i];
				applyExpenses();
				setTabListeners();
			}
		});
	}
}
