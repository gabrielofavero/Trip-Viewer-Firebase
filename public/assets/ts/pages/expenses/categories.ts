import { getIcons } from '../../app/config.js';
import { getID } from '../../utils/dom.js';
import { translate } from '../../i18n/translation.js';
import { openToast } from '../../utils/messages.js';
import { setChart, setTable } from './support/data.js';
import { formatCurrency, EXPENSES_CONVERTED } from '../../models/expense.model.js';
import { CURRENT_CURRENCY } from './support/currency.js';

// Summary
export function loadSummary() {
	loadChartSummary();

	if (
		EXPENSES_CONVERTED[CURRENT_CURRENCY]['preTrip'].length === 0 ||
		EXPENSES_CONVERTED[CURRENT_CURRENCY]['duringTrip'].length === 0
	) {
		getID('radio-summary').style.display = 'none';
		return;
	}

	const preTripExpenses = EXPENSES_CONVERTED[CURRENT_CURRENCY]['preTrip'].summary;
	getID(`summary-preTrip-title`).innerHTML = getTitleWithIcon('trip.expenses.pre_trip');
	setTable('summary-preTrip', preTripExpenses.items, preTripExpenses.total);

	const duringTripExpenses = EXPENSES_CONVERTED[CURRENT_CURRENCY]['duringTrip'].summary;
	getID(`summary-duringTrip-title`).innerHTML = getTitleWithIcon('trip.expenses.during_trip');
	setTable('summary-duringTrip', duringTripExpenses.items, duringTripExpenses.total);

	const travelerExpenses = EXPENSES_CONVERTED[CURRENT_CURRENCY]['expensesTravelers'].summary;
	getID(`summary-expensesTravelers-title`).innerHTML = getTitleWithIcon('trip.travelers.title');
	setTable('summary-expensesTravelers', travelerExpenses.items, travelerExpenses.total);
}

function loadChartSummary() {
	const labels = [translate('trip.expenses.pre_trip'), translate('trip.expenses.during_trip')];
	const values = [
		EXPENSES_CONVERTED[CURRENT_CURRENCY].preTrip.summary.total,
		EXPENSES_CONVERTED[CURRENT_CURRENCY].duringTrip.summary.total,
	];

	getID('summary-title').innerHTML = getTitleWithIcon('trip.expenses.overview');
	getID('summary-total').innerText =
		`${translate('labels.total')}: ${formatCurrency(values[0] + values[1], true)}`;

	setChart('doughnut', 'summary-chart', labels, values);
}

// Pre-Trip Expenses
export function loadPreTripExpenses() {
	setDoughnutChartCategoria('trip.expenses.pre_trip', 'preTrip');
	setTableCategoria('preTrip');
}

// Gastos na Viagem
export function loadDuringTripExpenses() {
	setDoughnutChartCategoria('trip.expenses.during_trip', 'duringTrip');
	setTableCategoria('duringTrip');
}

export function loadTravelerExpenses() {
	setDoughnutChartCategoria('trip.travelers.title', 'expensesTravelers');
	setTableCategoria('expensesTravelers');
}

function setDoughnutChartCategoria(title, type) {
	const items = EXPENSES_CONVERTED[CURRENT_CURRENCY][type].items;
	const total = EXPENSES_CONVERTED[CURRENT_CURRENCY][type].summary.total;

	getID(`${type}-title`).innerHTML = getTitleWithIcon(title, type);
	getID(`${type}-total`).innerText = `${translate('labels.total')}: ${formatCurrency(total, true)}`;

	const labels = items.map((item) => translate(item.name, {}, false));
	const values = items.map((item) => item.total);

	setChart('doughnut', `${type}-chart`, labels, values);
}

function setTableCategoria(type) {
	unsetTableCategoria(type);

	const items = EXPENSES_CONVERTED[CURRENT_CURRENCY][type].items;
	const container = getID(`${type}-container`);

	for (let j = 1; j <= items.length; j++) {
		const item = items[j - 1];
		const id = `${type}-${j}`;

		const recibo = document.createElement('div');
		recibo.id = `${id}-recibo`;
		recibo.className = 'expenses-card expenses-receipt';

		const titleRow = document.createElement('div');
		titleRow.className = 'expenses-title-row';

		const h2 = document.createElement('h2');
		h2.className = 'expenses-title';
		h2.innerHTML = getTitleWithIcon(item.name, type);
		titleRow.appendChild(h2);

		// Only the Shopping type gets the copy-to-iOS-Notes button.
		if (isShoppingType(item.name)) {
			const copyBtn = document.createElement('button');
			copyBtn.type = 'button';
			copyBtn.className = 'expenses-copy';
			copyBtn.title = translate('labels.copy_list');
			copyBtn.setAttribute('aria-label', translate('labels.copy_list'));
			copyBtn.innerHTML = `<i class="iconify" data-icon="mdi:content-copy"></i>`;
			copyBtn.addEventListener('click', () =>
				copyExpensesToClipboard(translate(item.name, {}, false), item.items),
			);
			titleRow.appendChild(copyBtn);
		}

		recibo.appendChild(titleRow);

		const tableEl = document.createElement('table');
		tableEl.className = 'card-full-size';
		tableEl.id = `${id}-table`;
		recibo.appendChild(tableEl);

		container.appendChild(recibo);

		setTable(id, item.items, item.total);
	}
}

function unsetTableCategoria(type) {
	let j = 1;
	while (getID(`${type}-${j}-recibo`)) {
		getID(`${type}-${j}-recibo`).remove();
		j++;
	}
}

function getTitleWithIcon(titlePath, backupIconPath?) {
	const title = translate(titlePath, {}, false);
	const icons = getIcons();
	const icon =
		icons[titlePath] ||
		getExpenseTypeIcon(titlePath) ||
		icons[backupIconPath] ||
		icons['trip.expenses.title'];
	return `<i class="iconify" data-icon="${icon}"></i> ${title}`;
}

const SHOPPING_ALIASES = new Set(['shopping', 'compras', 'lojas', 'compra', 'shoppings']);

/** Whether an expense type refers to the Shopping category (translation key or free text). */
function isShoppingType(name: string): boolean {
	const normalized = String(name ?? '').trim().toLowerCase();
	return normalized === 'trip.expenses.shopping' || SHOPPING_ALIASES.has(normalized);
}

/**
 * Resolves a dedicated icon for expense "type" values that aren't translation
 * keys already mapped in icons.json (e.g. the free-text "Shopping" type).
 * Returns undefined when the type isn't a known alias, so the normal fallback
 * chain applies.
 */
function getExpenseTypeIcon(name: string): string | undefined {
	if (isShoppingType(name)) {
		return getIcons()['trip.expenses.shopping'];
	}
	return undefined;
}

/**
 * Copies a category receipt to the clipboard in a dual format so the SAME copy
 * works in both iOS Notes and WhatsApp (like the itinerary export):
 * - text/html (used by iOS Notes): <h2> heading + a clean native <ul> list
 *   where each item is "hyperlinked-title: value". Apple Notes cannot turn
 *   pasted HTML into real (tappable) checklists — checklist state is a
 *   proprietary Apple format with no HTML/plain-text representation — so we
 *   emit a plain list the user can convert to a checklist in Notes if needed.
 * - text/plain (used by WhatsApp): "*Title* (value) link" markdown-style lines.
 */
async function copyExpensesToClipboard(title: string, items: any[]): Promise<void> {
	const htmlItems = (items || [])
		.map((item) => {
			const name = escapeHTML(translate(item.name, {}, false));
			const value = escapeHTML(formatCurrency(item.amount, true));
			const label = item.link ? `<a href="${escapeHTML(item.link)}">${name}</a>` : name;
			return `<li>${label}: ${value}</li>`;
		})
		.join('');

	const html = `<h2>${escapeHTML(title)}</h2><ul>${htmlItems}</ul>`;

	const plainLines = (items || [])
		.map((item) => {
			const name = translate(item.name, {}, false);
			const value = formatCurrency(item.amount, true);
			const link = item.link ? ` ${item.link}` : '';
			return `*${name}* (${value})${link}`;
		})
		.join('\n');
	const plainText = `*${title}*\n${plainLines}`;

	try {
		await navigator.clipboard.write([
			new ClipboardItem({
				'text/html': new Blob([html], { type: 'text/html' }),
				'text/plain': new Blob([plainText], { type: 'text/plain' }),
			}),
		]);
		openToast(translate('messages.expenses_copied'));
	} catch (error) {
		console.error('Failed to copy expenses list:', error);
	}
}

function escapeHTML(value: string): string {
	return String(value ?? '')
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}
