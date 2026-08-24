import { cloneObject, firstCharToUpperCase, getID } from '../../../utils/dom.js';
import { translate } from '../../../i18n/translation.js';
import { initializeSortableForGroup } from '../../../ui/sortable.js';
import {
	closeMessage,
	displayFullMessage,
	getContainersInput,
	MESSAGE_PROPERTIES,
	registerActions,
} from '../../../utils/messages.js';
import { getFieldValueOrNotify } from '../../../ui/fields.js';
import { getTravelersObject } from './travelers.js';
import { TRAVELERS } from '../../../data/state.js';
import { getTravelerName } from './travelers.js';
import { getTravelersSelectOptionsHTML } from './travelers.js';
import { FIRESTORE_EXPENSES_DATA } from '../edit-trip.js';
import { getSharingObject } from '../set-trip.js';
import { getCurrencies } from '../../../app/config.js';

var INNER_EXPENSES = {
	preTrip: [],
	duringTrip: [],
};

var LAST_INNER_EXPENSE_TYPE = '';

export function loadExpenses(data = FIRESTORE_EXPENSES_DATA) {
	pushExpense('preTrip', data);
	pushExpense('duringTrip', data);
	loadExpensesHTML();
}

export async function getExpensesObject(_protectedOnly?) {
	const duringTrip = getExpenses('duringTrip');
	const preTrip = getExpenses('preTrip');

	if (duringTrip.length === 0 && preTrip.length === 0) {
		return {};
	}

	return {
		sharing: await getSharingObject(),
		duringTrip: duringTrip,
		preTrip: preTrip,
		currency: getID('currency').value,
		travelers: getTravelersObject(),
		version: {
			lastUpdated: new Date().toISOString(),
		},
	};

	function getExpenses(category) {
		let result = [];
		for (const typeObj of INNER_EXPENSES[category]) {
			result = [...result, ...typeObj.expenses];
		}
		return result;
	}
}

// Gastos e Inner Gastos
function pushExpense(type, data) {
	data = data || {};
	if (!data[type]) {
		data[type] = [];
	}

	for (const expense of data[type]) {
		const types = INNER_EXPENSES[type].map((expense) => expense.type);
		const index = types.indexOf(expense.type);
		if (index === -1) {
			INNER_EXPENSES[type].push({
				type: expense.type,
				expenses: [expense],
			});
		} else {
			INNER_EXPENSES[type][index].expenses.push(expense);
		}
	}
}

function loadExpensesHTML() {
	for (const category in INNER_EXPENSES) {
		const container = getID(category);
		if (!container) continue;
		container.innerHTML = '';

		// Category total (pre-trip / during-trip) — shown when there is content.
		const allExpenses = INNER_EXPENSES[category].flatMap((t) => t.expenses);
		if (allExpenses.length > 0) {
			const totalDiv = document.createElement('div');
			totalDiv.className = 'expenses-category-total';
			totalDiv.innerHTML = `${translate('labels.total')}: <span class="highlight">${formatTripCurrency(
				sumExpenses(allExpenses),
			)}</span>`;
			container.appendChild(totalDiv);
		}

		for (const innerExpense of INNER_EXPENSES[category]) {
			buildInnerExpense(category, innerExpense);
		}
	}

	function buildInnerExpense(category, innerExpense) {
		const div = document.createElement('div');
		const id = `${category}-${innerExpense.type}`;
		div.className = 'expenses-item draggable-area';
		div.dataset.group = id;
		div.id = id;

		const label = document.createElement('label');
		const subtotal = sumExpenses(innerExpense.expenses);
		label.innerHTML = `${translate(innerExpense.type, {}, false)}<span class="expense-type-subtotal">${formatTripCurrency(
			subtotal,
		)}</span>`;
		div.appendChild(label);

		for (let i = 0; i < innerExpense.expenses.length; i++) {
			const expense = innerExpense.expenses[i];
			const container = document.createElement('div');
			container.className = 'input-button-container';

			const button = document.createElement('button');
			button.className = 'btn input-button draggable expense-item-button';
			const travelerLabel = expense.person
				? `<span class="highlight">${getTravelerName(expense.person)}:</span> `
				: '';
			button.innerHTML = `<span class="expense-item-main">${travelerLabel}${escapeHtml(
				expense.name,
			)}</span><span class="expense-item-price">${formatTripCurrency(
				Number(expense.price) || 0,
				expense.currency,
			)}</span>`;
			button.onclick = () => openInnerExpense(category, innerExpense.type, i);
			container.appendChild(button);

			const icon = document.createElement('i');
			icon.className = 'iconify drag-icon';
			icon.dataset.icon = 'mdi:drag';
			container.appendChild(icon);

			div.appendChild(container);
		}

		getID(category).appendChild(div);
		// All expense categories share one Sortable group so items can be dragged
		// between them; afterDragInnerExpense resolves the real category/type from
		// the dragged element's data-group on drop.
		initializeSortableForGroup(id, {
			onEnd: afterDragInnerExpense,
			sortGroup: 'trip-expenses',
		});
	}
}

// ======= Edit-page helpers =======

function sumExpenses(expenses): number {
	return expenses.reduce((sum, e) => sum + (Number(e.price) || 0), 0);
}

/** Format an amount using the trip's currency (or the expense's own currency). */
function formatTripCurrency(amount: number, currency?: string): string {
	const cur = currency || getID('currency')?.value || 'BRL';
	const symbols = getCurrencies()?.symbols || {};
	const symbol = symbols[cur] || cur;
	const formatted = new Intl.NumberFormat('pt-BR', {
		style: 'decimal',
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	}).format(amount);
	return `${symbol} ${formatted}`;
}

function escapeHtml(str: string): string {
	return String(str ?? '')
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

function getExpensePeopleCheckboxesHTML(selected: string[] = []): string {
	return TRAVELERS.filter((t) => t.name)
		.map((traveler, index) => {
			const checked = selected.includes(traveler.id) ? 'checked' : '';
			return `<div class="nice-form-group expense-people-item">
					<input type="checkbox" id="expense-people-${index}" value="${traveler.id}" ${checked} />
					<label for="expense-people-${index}" class="checkbox-label">${escapeHtml(
						traveler.name,
					)}</label>
				</div>`;
		})
		.join('');
}

function setExpensePeople(selected: string[]) {
	const container = getID('expense-people-checkboxes');
	if (!container) return;
	container.innerHTML = getExpensePeopleCheckboxesHTML(selected || []);
}

function getCheckedExpensePeople(): string[] {
	const container = getID('expense-people-checkboxes');
	if (!container) return [];
	const result = [];
	for (const checkbox of container.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')) {
		if (checkbox.checked) result.push(checkbox.value);
	}
	return result;
}

export function openInnerExpense(category, type = '', index = -1) {
	registerActions({ saveInnerExpense });
	const properties = cloneObject(MESSAGE_PROPERTIES);
	properties.title = type ? translate('labels.edit') : translate('labels.add');
	properties.content = getInnerExpenseContent(category, type, index);
	properties.icons = [{ type: 'goBack', action: '' }];
	properties.containers = getContainersInput();
	properties.fullscreen = true;
	properties.buttons = [
		{
			type: 'cancel',
		},
		{
			type: 'confirm',
			action: `saveInnerExpense('${category}', '${type}', ${index})`,
		},
	];
	displayFullMessage(properties);

	if (type && index >= 0) {
		const expense = INNER_EXPENSES[category].find((typeObj) => typeObj.type === type).expenses[
			index
		];
		getID('expense-name').value = expense.name;
		getID('expense-person').value = expense.person || '';
		getID('expense-currency').value = expense.currency;
		getID('expense-price').value = expense.price;
		getID('expense-link').value = expense.link || '';
		setExpensePeople(expense.people || []);
		applyExpenseInnerType(expense.type);
	} else {
		getID('expense-delete').style.display = 'none';
		getID('expense-currency').value = getID('currency').value;
		getID('expense-link').value = '';
		setExpensePeople([]);
		if (LAST_INNER_EXPENSE_TYPE) {
			applyExpenseInnerType(LAST_INNER_EXPENSE_TYPE);
		}
	}

	// Build the compact currency picker (short code when closed, full label in the
	// dropdown) from the current #expense-currency value.
	initExpenseCurrencySelect();

	getID('expense-type-select').addEventListener('change', (e) => {
		getID('expense-type-input').style.display =
			(e.target as HTMLSelectElement).value === 'custom' ? 'block' : 'none';
	});

	getID('expense-price').addEventListener('input', (e) => {
		const target = e.target as HTMLInputElement;
		const value = target.value;
		if (value && !isNaN(Number(value))) {
			const floatValue = parseFloat(value);
			const decimals = floatValue.toString().split('.')[1];
			if (decimals && decimals.length > 2) {
				target.value = floatValue.toFixed(2);
			}
		}
	});

	getID('expense-type-input').addEventListener('change', (e) => {
		const target = e.target as HTMLInputElement;
		target.value = firstCharToUpperCase(target.value.trim());
	});
}

function applyExpenseInnerType(type) {
	const values = Array.from(getID('expense-type-select').options).map((option) => option.value);
	if (values.includes(type)) {
		getID('expense-type-select').value = type;
	} else {
		getID('expense-type-select').value = 'custom';
		getID('expense-type-input').value = type;
		getID('expense-type-input').style.display = 'block';
	}
}

function getInnerExpenseContent(category, type, index) {
	return `<div id='inner-expense-box'>
                <div class="nice-form-group">
                    <label>${translate('labels.name')}</label>
                    <input required id="expense-name" type="text" placeholder="${translate('trip.transportation.type.flight')}" />
                </div>
                <div class="nice-form-group">
                    <label>${translate('labels.type')}</label>
                    <select id="expense-type-select" class="edit-select">
                        <option value="trip.transportation.type.flights">${translate('trip.transportation.type.flights')}</option>
                        <option value="trip.accommodation.title">${translate('trip.accommodation.title')}</option>
                        <option value="labels.entrertainment">${translate('labels.entrertainment')}</option>
                        <option value="trip.expenses.daily">${translate('trip.expenses.daily')}</option>
                        <option value="labels.people">${translate('labels.people')}</option>
                        <option value="trip.transportation.type.car">${translate('trip.transportation.type.car')}</option>
                        <option value="trip.transportation.title">${translate('trip.transportation.title')}</option>
                        <option value="trip.expenses.shopping">${translate('trip.expenses.shopping')}</option>
                        <option value="labels.other">${translate('labels.other')}</option>
                        <option value="custom">${translate('labels.custom')}</option>
                    </select>
                    <input required id="expense-type-input" type="text" placeholder="${translate('trip.transportation.title')}" style="margin-top: 8px; display: none"/>
                </div>
                <div class="nice-form-group" style="display:${TRAVELERS.length === 0 ? 'none' : ''}">
                    <label>${translate('trip.expenses.paid_by')}</label>
                        <select id="expense-person" class="edit-select" name="person">
                        <option value="">${translate('labels.non_specified')}</option>
                        ${getTravelersSelectOptionsHTML()}
                    </select>
                </div>
                <div class="nice-form-group" id="expense-people-group" style="display:${TRAVELERS.length === 0 ? 'none' : ''}">
                    <label>${translate('trip.expenses.split_with')}</label>
                    <div id="expense-people-checkboxes" class="expense-people-list">${getExpensePeopleCheckboxesHTML()}</div>
                </div>
                <div class="side-by-side-box-fixed expense-currency-row">
                    <div class="nice-form-group side-by-side-fixed">
                        <label>${translate('labels.cost')}</label>
                        <input required class="input-full" id="expense-price" type="number" placeholder="0.00" step="0.01">
                    </div>
                    <div class="nice-form-group side-by-side-fixed">
                        <label>${translate('currency.title')}</label>
                        <select id="expense-currency" class="edit-select" name="currency" style="display: none">
                            ${getCurrencyOptionsHTML()}
                        </select>
                        <div class="expense-currency-select" id="expense-currency-select"></div>
                    </div>
                </div>
                <div class="nice-form-group">
                    <label>${translate('trip.expenses.link')}</label>
                    <input id="expense-link" class="input-full" type="url" placeholder="https://..." />
                </div>
                <div class="button-box-right" id="expense-delete" style="margin-top: 8px; margin-bottom: 8px;">
                        <button data-action="delete-inner-expense" data-category="${category}" data-type="${type}" data-index="${index}" class="btn btn-basic btn-format">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
                                <path fill="currentColor" fill-rule="evenodd" d="M8.106 2.553A1 1 0 0 1 9 2h6a1 1 0 0 1 .894.553L17.618 6H20a1 1 0 1 1 0 2h-1v11a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3V8H4a1 1 0 0 1 0-2h2.382l1.724-3.447ZM14.382 4l1 2H8.618l1-2h4.764ZM11 11a1 1 0 1 0-2 0v6a1 1 0 1 0 2 0v-6Zm4 0a1 1 0 1 0-2 0v6a1 1 0 1 0 2 0v-6Z" clip-rule="evenodd"></path>
                            </svg>
                        </button>
                    </div>
            </div>`;
}

// ======= Compact currency picker =======
// Shows the short currency code (BRL, USD…) on the closed control so it never
// clips inside the side-by-side layout, but lists the full translated label in
// the open dropdown. The real value lives in the hidden native
// <select id="expense-currency"> so save/open logic is unchanged.

function getCurrencyOptions() {
	return [
		{ value: 'BRL', label: translate('currency.type.BRL') },
		{ value: 'USD', label: translate('currency.type.USD') },
		{ value: 'EUR', label: translate('currency.type.EUR') },
		{ value: 'GBP', label: translate('currency.type.GBP') },
		{ value: 'JPY', label: translate('currency.type.JPY') },
		{ value: 'INR', label: translate('currency.type.INR') },
		{ value: 'RUB', label: translate('currency.type.RUB') },
		{ value: 'CAD', label: translate('currency.type.CAD') },
		{ value: 'AUD', label: translate('currency.type.AUD') },
		{ value: 'CHF', label: translate('currency.type.CHF') },
		{ value: 'SEK', label: translate('currency.type.SEK') },
		{ value: 'NOK', label: translate('currency.type.NOK') },
		{ value: 'DKK', label: translate('currency.type.DKK') },
		{ value: 'NZD', label: translate('currency.type.NZD') },
		{ value: 'MXN', label: translate('currency.type.MXN') },
		{ value: 'ZAR', label: translate('currency.type.ZAR') },
		{ value: 'KRW', label: translate('currency.type.KRW') },
		{ value: 'SGD', label: translate('currency.type.SGD') },
		{ value: 'HKD', label: translate('currency.type.HKD') },
		{ value: 'ILS', label: translate('currency.type.ILS') },
		{ value: 'PLN', label: translate('currency.type.PLN') },
		{ value: 'HUF', label: translate('currency.type.HUF') },
		{ value: 'TWD', label: translate('currency.type.TWD') },
		{ value: 'THB', label: translate('currency.type.THB') },
	];
}

function getCurrencyOptionsHTML() {
	return getCurrencyOptions()
		.map((option) => `<option value="${option.value}">${option.label}</option>`)
		.join('');
}

let EXPENSE_CURRENCY_OUTSIDE_HANDLER = null;
let EXPENSE_CURRENCY_FLOATING_DROPDOWN = null;

function initExpenseCurrencySelect() {
	// Remove a floating dropdown left behind by a previous dialog instance.
	if (EXPENSE_CURRENCY_FLOATING_DROPDOWN) {
		EXPENSE_CURRENCY_FLOATING_DROPDOWN.remove();
		EXPENSE_CURRENCY_FLOATING_DROPDOWN = null;
	}

	const select = getID('expense-currency');
	const container = getID('expense-currency-select');
	if (!select || !container) return;

	const current = select.value || 'BRL';
	const options = getCurrencyOptions();

	container.innerHTML = `
		<button type="button" class="expense-currency-trigger" id="expense-currency-trigger" aria-haspopup="listbox" aria-expanded="false">
			<span class="expense-currency-value">${escapeHtml(current)}</span>
			<svg class="expense-currency-chevron" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24">
				<path fill="none" stroke="currentColor" stroke-linecap="square" stroke-width="2" d="M17.5 14.5L12 9l-5.5 5.5"></path>
			</svg>
		</button>
		<div class="expense-currency-dropdown" id="expense-currency-dropdown" style="display: none" role="listbox">
			${options
				.map(
					(option) =>
						`<div class="expense-currency-option${option.value === current ? ' active' : ''}" role="option" data-value="${option.value}">${option.label}</div>`,
				)
				.join('')}
		</div>
	`;

	const trigger = getID('expense-currency-trigger');
	const dropdown = getID('expense-currency-dropdown');
	const valueSpan = container.querySelector('.expense-currency-value') as HTMLElement | null;

	function closeDropdown() {
		if (dropdown.style.display !== 'block') return;
		dropdown.remove();
		if (EXPENSE_CURRENCY_FLOATING_DROPDOWN === dropdown) {
			EXPENSE_CURRENCY_FLOATING_DROPDOWN = null;
		}
		dropdown.style.display = 'none';
		container.classList.remove('opened');
		trigger.setAttribute('aria-expanded', 'false');
	}

	function openDropdown() {
		const rect = trigger.getBoundingClientRect();

		// Render above everything (escape the dialog's scroll/overflow containers).
		dropdown.style.position = 'fixed';
		dropdown.style.left = `${rect.left}px`;
		dropdown.style.width = `${rect.width}px`;
		dropdown.style.zIndex = '99999';
		dropdown.style.display = 'block';
		document.body.appendChild(dropdown);
		EXPENSE_CURRENCY_FLOATING_DROPDOWN = dropdown;

		// Open downward when there's room; otherwise flip above the trigger.
		const spaceBelow = window.innerHeight - rect.bottom - 4;
		const height = dropdown.offsetHeight;
		if (spaceBelow < height) {
			dropdown.style.top = `${Math.max(4, rect.top - height - 4)}px`;
		} else {
			dropdown.style.top = `${rect.bottom + 4}px`;
		}

		container.classList.add('opened');
		trigger.setAttribute('aria-expanded', 'true');
	}

	trigger.addEventListener('click', (e) => {
		e.stopPropagation();
		if (dropdown.style.display === 'block') {
			closeDropdown();
		} else {
			openDropdown();
		}
	});

	for (const option of container.querySelectorAll('.expense-currency-option')) {
		option.addEventListener('click', (e) => {
			e.stopPropagation();
			const value = option.getAttribute('data-value');
			select.value = value;
			if (valueSpan) valueSpan.innerText = value;
			for (const opt of dropdown.querySelectorAll('.expense-currency-option')) {
				opt.classList.toggle('active', opt === option);
			}
			closeDropdown();
		});
	}

	if (EXPENSE_CURRENCY_OUTSIDE_HANDLER) {
		document.removeEventListener('click', EXPENSE_CURRENCY_OUTSIDE_HANDLER);
	}
	EXPENSE_CURRENCY_OUTSIDE_HANDLER = (e) => {
		if (!(e.target instanceof Element)) return;
		if (
			e.target.closest('.expense-currency-trigger') ||
			e.target.closest('.expense-currency-dropdown')
		) {
			return;
		}
		closeDropdown();
	};
	document.addEventListener('click', EXPENSE_CURRENCY_OUTSIDE_HANDLER);
}

export function saveInnerExpense(category, type, index = -1) {
	const price = getFieldValueOrNotify('expense-price');
	const newExpense = {
		name: getFieldValueOrNotify('expense-name'),
		type:
			getID('expense-type-select').value === 'custom'
				? getFieldValueOrNotify('expense-type-input')
				: getID('expense-type-select').value,
		person: getID('expense-person').value || '',
		people: getCheckedExpensePeople(),
		currency: getFieldValueOrNotify('expense-currency'),
		price: price ? parseFloat(parseFloat(price).toFixed(2)) : null,
		link: getID('expense-link')?.value?.trim() || '',
	};

	if (!newExpense.name || !newExpense.type || !newExpense.currency || !newExpense.price) return;

	LAST_INNER_EXPENSE_TYPE = newExpense.type;

	if (type && index >= 0) {
		if (type == newExpense.type) {
			INNER_EXPENSES[category].find((typeObj) => typeObj.type === type).expenses[index] =
				newExpense;
		} else {
			INNER_EXPENSES[category].find((typeObj) => typeObj.type === type).expenses.splice(index, 1);
			let typeObj = INNER_EXPENSES[category].find((typeObj) => typeObj.type === newExpense.type);
			if (typeObj) {
				typeObj.expenses.push(newExpense);
			} else {
				INNER_EXPENSES[category].push({
					type: newExpense.type,
					expenses: [newExpense],
				});
			}
		}
	} else {
		const types = INNER_EXPENSES[category].map((typeObj) => typeObj.type);
		if (types.includes(newExpense.type)) {
			INNER_EXPENSES[category]
				.find((typeObj) => typeObj.type === newExpense.type)
				.expenses.push(newExpense);
		} else {
			INNER_EXPENSES[category].push({
				type: newExpense.type,
				expenses: [newExpense],
			});
		}
	}
	updateInnerExpenses();
	loadExpensesHTML();
	closeMessage();
}

function updateInnerExpenses() {
	for (const category in INNER_EXPENSES) {
		for (let i = 0; i < INNER_EXPENSES[category].length; i++) {
			const typeObj = INNER_EXPENSES[category][i];
			if (typeObj.expenses.length === 0) {
				INNER_EXPENSES[category].splice(i, 1);
			}
		}
	}
}

export function deleteInnerExpense(category, type, index) {
	INNER_EXPENSES[category].find((typeObj) => typeObj.type === type).expenses.splice(index, 1);
	loadExpensesHTML();
	closeMessage();
}

function afterDragInnerExpense(evt) {
	const from = parseExpenseGroup(evt.from.getAttribute('data-group'));
	const to = parseExpenseGroup(evt.to.getAttribute('data-group'));

	// Sortable indices include the group's <label> as item 0, so subtract 1 to get
	// the expense position within the subgroup.
	const fromIndex = evt.oldIndex - 1;
	const toIndex = evt.newIndex - 1;

	// Same category + type → simple reorder inside the subgroup.
	if (from.category === to.category && from.type === to.type) {
		const subgroup = INNER_EXPENSES[from.category]?.find((entry) => entry.type === from.type);
		if (!subgroup) return;

		const expenses = [...subgroup.expenses];
		const [moved] = expenses.splice(fromIndex, 1);
		expenses.splice(toIndex, 0, moved);

		INNER_EXPENSES[from.category] = INNER_EXPENSES[from.category].map((entry) =>
			entry.type === from.type ? { ...entry, expenses } : entry,
		);
	} else {
		// Cross-category (and possibly cross-section) move.
		const fromSubgroup = INNER_EXPENSES[from.category]?.find(
			(entry) => entry.type === from.type,
		);
		if (!fromSubgroup) return;

		const [moved] = fromSubgroup.expenses.splice(fromIndex, 1);

		let toSubgroup = INNER_EXPENSES[to.category]?.find((entry) => entry.type === to.type);
		if (toSubgroup) {
			toSubgroup.expenses.splice(toIndex, 0, moved);
		} else {
			INNER_EXPENSES[to.category].push({ type: to.type, expenses: [moved] });
		}

		// Drop the source subgroup if the move emptied it.
		if (fromSubgroup.expenses.length === 0) {
			INNER_EXPENSES[from.category] = INNER_EXPENSES[from.category].filter(
				(entry) => entry !== fromSubgroup,
			);
		}
	}

	loadExpensesHTML();
}

/**
 * Splits a group id like "duringTrip-trip.expenses.shopping" into its parts.
 * The category is always the first segment; the type is everything after it.
 */
function parseExpenseGroup(id) {
	const split = id.split('-');
	return { category: split[0], type: split.slice(1).join('-') };
}
