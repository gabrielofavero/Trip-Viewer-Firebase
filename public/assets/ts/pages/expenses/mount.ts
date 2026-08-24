// ======= Expenses Mount Component =======
// Render-only component shared by:
//   - expenses.html (standalone bootstrap calls mountExpenses)
//   - view.html     (Workstream D renders it inline via dynamic import())
//
// Contract (see docs/implementation-plans/20260812-iframe-to-components.md, Workstream A):
//   - mountExpenses(container, opts) renders the expenses content into `container`.
//     `container` must already contain the expenses skeleton (tabs + summary +
//     preTrip + duringTrip + expensesTravelers) — the render pipeline fills it.
//   - Pure: no URL-param parsing, no `window.parent`, no `localStorage`, no iframes.
//   - Idempotent: resets module state + skeleton display state before rendering,
//     so it can be re-mounted safely.

import { startLoadingScreen, stopLoadingScreen } from '../../utils/loading.js';
import { getID } from '../../utils/dom.js';
import { closeMessage, displayError, displayForbidden } from '../../utils/messages.js';
import { translate } from '../../i18n/translation.js';
import { loadCurrencies } from '../../app/config.js';
import {
	CURRENCIES,
	CURRENCY_CONVERSION,
	CURRENT_CURRENCY,
	DEFAULT_CURRENCY,
	loadExpenseCurrencies,
} from './support/currency.js';
import {
	EXPENSES_CONVERTED,
	getActiveExpensePerson,
	getConversionText,
	loadConvertedExpenses,
	setActiveExpensePerson,
} from '../../models/expense.model.js';
import { fade } from '../../theme/animations.js';
import { requestPin, requestInvalidPin } from '../../utils/pin.js';
import { get } from '../../data/firebase/database.js';
import { loadExternalVisibility } from '../../theme/visibility.js';
import {
	loadDuringTripExpenses,
	loadPreTripExpenses,
	loadSummary,
	loadTravelerExpenses,
} from './categories.js';

export interface MountExpensesOptions {
	/** Trip (document) ID whose expenses should be rendered. */
	tripId: string;
	/**
	 * PIN mode ('no-pin' | 'sensitive-only' | 'all-data') or an already-resolved
	 * 4-digit pin. When absent (standalone), the public document is attempted
	 * first and the PIN gate is used as a fallback.
	 */
	pin?: string;
	/** External visibility ('light' | 'dark') to apply, if the host needs to sync theme. */
	visibility?: string;
	/** When true, adds the `container-mode` class to expense cards (view.html embed). */
	embedMode?: boolean;
	/** Called with the resolved pin ('', or the 4-digit pin) once data loads. */
	onPinResolved?: (pin: string) => void;
}

export var EXPENSES_DATA;
var ACTIVE_EXPENSE_TAB = 'summary';

// When embedding into view.html (embedMode), skip the global preloader +
// scroll-lock so the page doesn't flicker while the section loads inline.
var EMBED_MODE = false;

// True while a PIN-gate confirm is in flight. A user-entered PIN that matches
// no protected document means the PIN was wrong (show the invalid dialog); a
// host-resolved PIN mount instead treats a missing document as an inactive /
// empty module and just hides the loading state.
var PIN_FROM_GATE = false;

function showLoading() {
	if (!EMBED_MODE) startLoadingScreen();
}

function hideLoading() {
	if (!EMBED_MODE) stopLoadingScreen();
}

export async function mountExpenses(
	container: HTMLElement,
	opts: MountExpensesOptions,
): Promise<() => void> {
	if (!container) return () => {};

	EMBED_MODE = !!opts.embedMode;

	// Idempotent re-mount: reset shared module state + skeleton display state.
	// Note: unlike mountFullItinerary/mountDestination we do NOT wipe
	// container.innerHTML — expenses.html keeps a static skeleton (tabs,
	// summary sections, chart canvases) inside #expenses-content that the
	// render pipeline fills via getID(). resetExpensesState() restores it to a
	// clean state instead, so a re-mount still renders fresh.
	resetExpensesState();

	// Clear any locked state left over from a previous mount (e.g. when the
	// view page re-mounts expenses with a resolved PIN).
	container.classList.remove('expenses-locked');
	container.querySelectorAll('.expenses-lock-card').forEach((el) => el.remove());

	// A fresh mount is host-driven (mode or resolved pin), not a PIN-gate confirm.
	PIN_FROM_GATE = false;

	if (!opts.tripId) {
		displayForbidden(
			`${translate('messages.documents.get.error')}. ${translate(
				translate('messages.documents.get.no_code'),
			)}`,
			'index.html',
		);
		return () => {};
	}

	if (opts.visibility) {
		loadExternalVisibility(opts.visibility);
	}

	if (opts.pin === 'no-pin') {
		// Host confirmed a public trip → read the public expenses document.
		await loadExpenses(container, opts, '');
	} else if (opts.pin && /^\d{4}$/.test(opts.pin)) {
		// Host already knows the resolved pin → read the protected document directly.
		await loadExpenses(container, opts, opts.pin);
	} else if (opts.pin) {
		if (opts.embedMode && opts.pin === 'sensitive-only') {
			// Sensitive-only trip embedded in view.html: the rest of the page is
			// public, so do NOT gate the page with a PIN on load. Instead render a
			// locked state in the expenses section that the user can expand to
			// reveal (triggers an internal PIN request on demand).
			renderLockedExpenses(container, opts);
		} else {
			// Standalone expenses.html, or an all-data embed → ask for the pin.
			requestPinExpenses(container, opts);
		}
	} else {
		// Standalone bootstrap: no host state. Attempt the public read first and
		// fall back to the PIN gate when the document is missing/forbidden.
		await loadExpenses(container, opts, '');
	}

	// Dispose: shared state is reset by resetExpensesState() on the next mount.
	return () => {};
}

// ======= PIN Gate =======

function requestPinExpenses(container: HTMLElement, opts: MountExpensesOptions): void {
	hideLoading();
	requestPin({
		confirmAction: () => {
			const pin = getID('pin-code')?.innerText || '';
			PIN_FROM_GATE = true;
			loadExpenses(container, opts, pin);
		},
		cancelAction: () => exitExpenses(opts),
		precontent: undefined as any,
	});
}

function requestPinExpensesInvalid(container: HTMLElement, opts: MountExpensesOptions): void {
	hideLoading();
	requestInvalidPin({
		confirmAction: () => {
			const pin = getID('pin-code')?.innerText || '';
			PIN_FROM_GATE = true;
			loadExpenses(container, opts, pin);
		},
		cancelAction: () => exitExpenses(opts),
		precontent: undefined as any,
	});
}

function exitExpenses(opts: MountExpensesOptions): void {
	if (opts.embedMode) {
		// Embedded in view.html (sensitive-only): cancelling the PIN just
		// dismisses the dialog — the rest of the trip stays visible.
		closeMessage();
	} else {
		// Standalone expenses.html: cancelling the PIN gate goes back home.
		window.location.href = 'index.html';
	}
}

/**
 * Sensitive-only trips keep the rest of the page public, so the expenses
 * section renders a locked card instead of gating the page on load. Clicking
 * the unlock button triggers an internal PIN request; cancelling just dismisses
 * the dialog (the trip stays visible without the expenses unlocked).
 */
function renderLockedExpenses(container: HTMLElement, opts: MountExpensesOptions): void {
	container.classList.add('expenses-locked');

	const card = document.createElement('div');
	card.className = 'expenses-lock-card';
	card.innerHTML = `
		<span class="expenses-lock-icon bx bx-lock-alt" aria-hidden="true"></span>
		<p class="expenses-lock-title">${translate('trip.expenses.locked_title')}</p>
		<p class="expenses-lock-text">${translate('trip.expenses.locked_text')}</p>
		<button type="button" class="btn btn-theme btn-format expenses-unlock-btn">${translate('trip.expenses.unlock')}</button>
	`;
	container.appendChild(card);

	const unlockBtn = card.querySelector<HTMLButtonElement>('.expenses-unlock-btn');
	if (unlockBtn) {
		unlockBtn.addEventListener('click', () => {
			requestPinExpenses(container, opts);
		});
	}
}

// ======= Data Load + Render =======

async function loadExpenses(
	container: HTMLElement,
	opts: MountExpensesOptions,
	pin: string,
): Promise<void> {
	closeMessage();
	showLoading();
	try {
		const path = pin ? `expenses/protected/${pin}/${opts.tripId}` : `expenses/${opts.tripId}`;
		const data = await get(path, false);

		if (data) {
			// If this mount started in the locked state (sensitive-only embed),
			// the PIN was just resolved in the same mount — remove the lock card
			// so the real skeleton content shows.
			container.classList.remove('expenses-locked');
			container.querySelectorAll('.expenses-lock-card').forEach((el) => el.remove());
			EXPENSES_DATA = data;
			await loadCurrencies();
			await loadExpenseCurrencies();
			loadConvertedExpenses();
			applyExpenses();
			const conversion = getID('conversion');
			if (conversion) conversion.innerText = getConversionText();
			setTabListeners();
			if (opts.embedMode) {
				for (const card of document.querySelectorAll('.expenses-card')) {
					card.classList.add('container-mode');
				}
			}
			populateDevPage();
			hideLoading();
			opts.onPinResolved?.(pin);
			return;
		}

		// No document at the requested path.
		if (opts.pin === 'no-pin') {
			// Host confirmed a public trip but the expenses module is inactive/empty.
			hideLoading();
			return;
		}
		if (!opts.pin) {
			// Standalone: a missing public document usually means a protected trip.
			requestPinExpenses(container, opts);
			return;
		}
		if (pin && PIN_FROM_GATE) {
			// A user-entered PIN matched no protected document → wrong pin. Keep
			// the dialog open showing the invalid message instead of dismissing it.
			requestPinExpensesInvalid(container, opts);
			return;
		}
		// Host supplied a resolved pin but no data → module inactive/empty.
		hideLoading();
	} catch (error) {
		if (error?.message == 'Missing or insufficient permissions.') {
			if (pin) {
				requestPinExpensesInvalid(container, opts);
			} else {
				requestPinExpenses(container, opts);
			}
			return;
		}
		console.error(error);
		displayError(translate('messages.errors.unknown'), false, false);
		hideLoading();
	}
}

export function applyExpenses() {
	loadTravelerViewSelector();

	const hasPreTrip = EXPENSES_DATA.preTrip?.length > 0;
	const hasDuringTrip = EXPENSES_DATA.duringTrip?.length > 0;

	if (hasPreTrip && hasDuringTrip) {
		getID('tab-expenses').style.display = '';
		getID('radio-summary').style.display = '';
		getID('radio-preTrip').style.display = '';
		getID('radio-duringTrip').style.display = '';

		loadSummary();
		loadPreTripExpenses();
		loadDuringTripExpenses();
		loadTravelerExpenses();

		applyAndLoadTravelerExpenses();
		return;
	}

	if (hasPreTrip) {
		getID('radio-preTrip').style.display = '';
		getID('summary').style.display = 'none';
		getID('preTrip').style.display = '';

		loadPreTripExpenses();

		applyAndLoadTravelerExpenses();
		return;
	}

	if (hasDuringTrip) {
		getID('radio-duringTrip').style.display = '';
		getID('summary').style.display = 'none';
		getID('duringTrip').style.display = '';
		applyAndLoadTravelerExpenses();

		loadDuringTripExpenses();

		applyAndLoadTravelerExpenses();
		return;
	}

	displayError(
		translate('messages.errors.no_data_on_module', {
			module: translate('trip.expenses.title'),
		}),
		false,
		false,
	);

	function applyAndLoadTravelerExpenses() {
		if (!hasTravelerExpenses()) {
			return;
		}
		getID('radio-expensesTravelers').style.display = '';
		loadTravelerExpenses();
	}

	function hasTravelerExpenses() {
		// Consider both the payer (`person`) and split members (`people`): an
		// expense can be tied to travelers via `people` alone (no payer chosen).
		const referencesAny = (list: any[]) =>
			list?.some((i: any) => i?.person || (Array.isArray(i?.people) && i.people.length > 0));
		return (
			EXPENSES_DATA.travelers &&
			(referencesAny(EXPENSES_DATA.duringTrip) || referencesAny(EXPENSES_DATA.preTrip))
		);
	}
}

export function setTabListeners() {
	const radios = ['radio-summary', 'radio-preTrip', 'radio-duringTrip', 'radio-expensesTravelers'];
	radios.forEach((radio) => {
		const radioEl = getID(radio);
		if (!radioEl) return;
		radioEl.addEventListener('click', function () {
			const tab = radio.replace('radio-', '');
			if (ACTIVE_EXPENSE_TAB === tab) return;

			const previousTab = ACTIVE_EXPENSE_TAB;
			ACTIVE_EXPENSE_TAB = tab;

			fade([previousTab], [ACTIVE_EXPENSE_TAB], 150, false);
		});
	});
}

// ======= Traveler View Selector =======

/**
 * Traveler IDs referenced by any expense (payer `person` or split `people`).
 */
function collectExpenseTravelerIds(): Set<string> {
	const set = new Set<string>();
	for (const type of ['preTrip', 'duringTrip']) {
		for (const expense of EXPENSES_DATA?.[type] || []) {
			if (expense?.person) set.add(expense.person);
			for (const id of expense?.people || []) set.add(id);
		}
	}
	return set;
}

function hasSplitExpenses(): boolean {
	for (const type of ['preTrip', 'duringTrip']) {
		for (const expense of EXPENSES_DATA?.[type] || []) {
			if (Array.isArray(expense?.people) && expense.people.length > 1) return true;
		}
	}
	return false;
}

/**
 * Any expense with no payer (`person`) and no split members (`people`). These
 * belong to nobody, so a per-person view would exclude them — which makes the
 * "All vs single traveler" toggle meaningful even with a single traveler.
 */
function hasUnregisteredExpenses(): boolean {
	for (const type of ['preTrip', 'duringTrip']) {
		for (const expense of EXPENSES_DATA?.[type] || []) {
			const hasPerson = !!expense?.person;
			const hasPeople = Array.isArray(expense?.people) && expense.people.length > 0;
			if (!hasPerson && !hasPeople) return true;
		}
	}
	return false;
}

/**
 * Renders the "View by" traveler selector (All / per traveler) and wires it
 * to recompute the converted data + re-render the whole page.
 */
function loadTravelerViewSelector() {
	const container = getID('traveler-view');
	const select = getID('expense-view-traveler');
	if (!container || !select) return;

	const usedIds = collectExpenseTravelerIds();
	// Show the toggle when there is at least one traveler referenced AND a
	// per-person view would actually differ from the "All" view: multiple
	// travelers, split expenses, or unregistered expenses to exclude.
	if (
		usedIds.size === 0 ||
		(usedIds.size < 2 && !hasSplitExpenses() && !hasUnregisteredExpenses())
	) {
		container.style.display = 'none';
		return;
	}

	container.style.display = '';
	const travelers = EXPENSES_DATA?.travelers || {};
	const current = getActiveExpensePerson();

	let options = `<option value="">${translate('labels.all')}</option>`;
	for (const id of usedIds) {
		const name = travelers[id] || id;
		options += `<option value="${id}" ${id === current ? 'selected' : ''}>${name}</option>`;
	}
	select.innerHTML = options;

	select.onchange = () => {
		setActiveExpensePerson(select.value);
		loadConvertedExpenses();
		applyExpenses();
		setTabListeners();
		const conversion = getID('conversion');
		if (conversion) conversion.innerText = getConversionText();
	};
}

// ======= State Reset (idempotent re-mount) =======

function resetExpensesState() {
	EXPENSES_DATA = undefined;
	ACTIVE_EXPENSE_TAB = 'summary';
	setActiveExpensePerson('');
	CURRENCIES.summary = [];
	CURRENCIES.preTrip = [];
	CURRENCIES.duringTrip = [];
	for (const key in EXPENSES_CONVERTED) {
		delete EXPENSES_CONVERTED[key];
	}

	// Remove dynamically-rendered category receipt cards (created by setTableCategoria).
	for (const type of ['preTrip', 'duringTrip', 'expensesTravelers']) {
		let j = 1;
		while (getID(`${type}-${j}-recibo`)) {
			getID(`${type}-${j}-recibo`).remove();
			j++;
		}
	}

	// Restore skeleton default display states (see expenses.html).
	const restore = (id: string, display: string) => {
		const el = getID(id);
		if (el) el.style.display = display;
	};
	restore('tab-expenses', 'none');
	for (const id of [
		'radio-summary',
		'radio-preTrip',
		'radio-duringTrip',
		'radio-expensesTravelers',
	]) {
		restore(id, 'none');
	}
	restore('summary', '');
	restore('preTrip', 'none');
	restore('duringTrip', 'none');
	restore('expensesTravelers', 'none');
	restore('summary-preTrip', 'none');
	restore('summary-duringTrip', 'none');
	restore('summary-expensesTravelers', 'none');
	restore('tab-currencies', 'none');
	restore('traveler-view', 'none');
	restore('conversion', '');
}

// ======= Dev Helpers =======

/** Populate dev.page.* with useful references (only on localhost). */
function populateDevPage() {
	const dev = (window as any).dev;
	if (!dev?.isEnabled) return;
	const page = dev.page;

	page.EXPENSES_DATA = EXPENSES_DATA;
	page.CURRENT_CURRENCY = CURRENT_CURRENCY;
	page.DEFAULT_CURRENCY = DEFAULT_CURRENCY;
	page.CURRENCIES = CURRENCIES;
	page.CURRENCY_CONVERSION = CURRENCY_CONVERSION;
	page.EXPENSES_CONVERTED = EXPENSES_CONVERTED;
	page.ACTIVE_EXPENSE_TAB = () => ACTIVE_EXPENSE_TAB;

	console.log(
		'%c[DEV]%c dev.page populated for expenses — type %cdev.page%c to explore',
		'color:#f0c040;font-weight:bold;',
		'',
		'font-weight:bold;',
		'',
	);
}
