import { getID } from '../../../utils/dom.js';
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
	const currencies = CURRENCIES.summary;
	currencyTab.innerHTML = '';
	currencyTab.style.display = currencies.length > 1 ? '' : 'none';

	// One .tab chip per currency, inside #tab-currencies, which sits in the
	// conversion bar (#conversion) next to the rate it changes. Chips auto-size
	// to their label and the active one is a raised chip (expenses.css) — no
	// glider here, unlike the equal-width main tabs.
	for (let j = 1; j <= currencies.length; j++) {
		const checked = currencies[j - 1] === CURRENT_CURRENCY ? 'checked' : '';
		currencyTab.innerHTML += `<input type="radio" id="radio-currency-${j}" name="tabs-currencies" ${checked} />`;
		currencyTab.innerHTML += `<label class="tab" for="radio-currency-${j}">${currencies[j - 1]}</label>`;
	}

	for (let i = 0; i < currencies.length; i++) {
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
