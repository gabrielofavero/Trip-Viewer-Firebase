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
	const currencies = CURRENCIES.summary;
	currencyTab.innerHTML = '';
	currencyTab.style.display = currencies.length > 1 ? '' : 'none';

	for (let j = 1; j <= currencies.length; j++) {
		const checked = currencies[j - 1] === CURRENT_CURRENCY ? 'checked' : '';
		currencyTab.innerHTML += `<input type="radio" id="radio-currency-${j}" name="tabs-currencies" ${checked} />`;
		currencyTab.innerHTML += `<label class="tab" for="radio-currency-${j}">${currencies[j - 1]}</label>`;
	}

	currencyTab.innerHTML += '<span class="glider"></span>';

	// Currency tabs render one .tab label per currency (equal flex columns), so
	// the .glider width must match a single tab for the translateX(100%) steps
	// to land exactly one tab; the count varies. #tab-currencies shares the
	// unified pill styling of #tab-expenses (expenses.css).
	setCSSRule(
		'#tab-currencies .glider',
		'width',
		`calc((100% - 0.5rem) / ${currencies.length})`,
	);

	const childs = getChildIDs('tab-currencies');
	for (let i = 0; i < childs.length; i++) {
		setCSSRule(
			`#tab-currencies input[id="${childs[i]}"]:checked~.glider`,
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
