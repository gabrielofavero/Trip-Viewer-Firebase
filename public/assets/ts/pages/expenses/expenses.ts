import { startLoadingScreen, stopLoadingScreen } from '../../utils/loading.js';
import { getLocalColors } from '../../theme/colors.js';
import { loadVisibility } from '../../theme/visibility.js';
import { getID, getURLParam, getURLParams } from '../../utils/dom.js';
import { closeMessage, displayError, displayForbidden, registerActions } from '../../utils/messages.js';
import { translate } from '../../i18n/translation.js';
import { loadCurrencies } from '../../app/config.js';
import { CURRENCIES, CURRENCY_CONVERSION, CURRENT_CURRENCY, DEFAULT_CURRENCY, loadExpenseCurrencies } from './support/currency.js';
import { EXPENSES_CONVERTED, getConversionText, loadConvertedExpenses } from '../../models/expense.model.js';
import { fade } from '../../theme/animations.js';
import { requestPin } from '../../utils/pin.js';
import { get } from '../../data/firebase/database.js';

export var EXPENSES_DATA;
var EXPENSES_COUNT = 0;
var TOTAL_EXPENSES = {
	summary: {},
	preTrip: {},
	duringTrip: {},
};
var ACTIVE_EXPENSE_TAB = "summary";

import { loadExpensesListeners } from './support/event-listeners.js';
import { loadEmbedMode, embedAfterLoadAction, sendHeightMessageToParent } from "./support/embed.js";
import { requestInvalidPin } from "../../utils/pin.js";
import { loadDuringTripExpenses, loadPreTripExpenses, loadSummary, loadTravelerExpenses } from "./categories.js";
import { EXPENSES_EMBED } from './support/embed.js';

export async function loadExpensesPage() {
	loadExpensesListeners();
	registerActions({ loadExpenses, exitExpenses });

	console.log(window.location.href);

	const colors = getLocalColors();
	loadVisibility(colors);

	const closeButton = getID("closeButton");
	if (closeButton) {
		if ((window.parent as any).closeViewEmbed) {
			closeButton.onclick = function () {
				(window.parent as any).closeViewEmbed();
			};
		} else {
			closeButton.style.display = "none";
		}
	}

	const logoLink = getID("logo-link");
	if (logoLink) {
		logoLink.onclick = function () {
			if ((window.parent as any).closeViewEmbed) {
				(window.parent as any).closeViewEmbed(true);
			} else {
				window.location.href = "index.html";
			}
		};
	}

	const expensesExport = localStorage.getItem("expenses")
		? JSON.parse(localStorage.getItem("expenses"))
		: "";
	const params = getURLParams();
	const documentID = params.e;
	EXPENSES_EMBED.enabled = params.embed === "1";

	if (EXPENSES_EMBED.enabled && !EXPENSES_EMBED.applied) {
		loadEmbedMode(params.visibility);
	}

	// Populate dev.page early so console inspection works even before Firestore data loads
	populateDevPage({ documentID, expensesExport, params });

	if (!expensesExport || !documentID) {
		const url = documentID ? `view.html?t=${documentID}` : "index.html";
		displayForbidden(
			`${translate("messages.documents.get.error")}. ${translate(translate("messages.documents.get.no_code"))}`,
			url,
		);
		return;
	}

	if (!expensesExport?.active) {
		displayForbidden(
			translate("messages.errors.module_not_active", {
				module: translate("trip.expenses.title"),
			}),
			`view.html?t=${documentID}`,
		);
		return;
	}

	if (expensesExport?.pin == "no-pin") {
		loadExpenses();
	} else {
		stopLoadingScreen();
		requestPinExpenses();
	}
	stopLoadingScreen();
}

function requestPinExpenses() {
	const cancelAction = `exitExpenses()`;
	const confirmAction = "loadExpenses()";
	requestPin({ confirmAction, cancelAction, precontent: undefined as any });
}

function requestPinExpensesInvalid() {
	const cancelAction = `exitExpenses()`;
	const confirmAction = "loadExpenses()";
	requestInvalidPin({ confirmAction, cancelAction, precontent: undefined as any });
}

function exitExpenses() {
	if (window.parent.closeViewEmbed) {
		window.parent.closeViewEmbed();
	} else if (getURLParam("e")) {
		window.location.href = `view.html?t=${getURLParam("e")}`;
	} else {
		window.location.href = "index.html";
	}
}

async function loadExpenses() {
	const documentID = getURLParam("e");
	const pin = getID("pin-code")?.innerText || "";
	closeMessage();
	startLoadingScreen();
	try {
		if (pin) {
			EXPENSES_DATA = await get(`expenses/protected/${pin}/${documentID}`, false);
		} else {
			EXPENSES_DATA = await get(`expenses/${documentID}`, false);
		}

		if (EXPENSES_DATA) {
			await loadCurrencies();
			await loadExpenseCurrencies();
			loadConvertedExpenses();
			applyExpenses();
			getID("conversion").innerText = getConversionText();
			setTabListeners();
			populateDevPage();
			stopLoadingScreen();
			if (EXPENSES_EMBED.enabled) {
				embedAfterLoadAction(pin);
			}
		}
	} catch (error) {
		if (error?.message == "Missing or insufficient permissions.") {
			console.warn(error.message);
			requestPinExpensesInvalid();
		} else {
			console.error(error);
			displayError(translate("messages.errors.unknown"));
		}
		stopLoadingScreen();
	}
}

export function applyExpenses() {
	const hasPreTrip = EXPENSES_DATA.preTrip?.length > 0;
	const hasDuringTrip = EXPENSES_DATA.duringTrip?.length > 0;

	if (hasPreTrip && hasDuringTrip) {
		getID("tab-expenses").style.display = "";
		getID("radio-summary").style.display = "";
		getID("radio-preTrip").style.display = "";
		getID("radio-duringTrip").style.display = "";

		loadSummary();
		loadPreTripExpenses();
		loadDuringTripExpenses();
		loadTravelerExpenses();

		applyAndLoadTravelerExpenses();
		return;
	}

	if (hasPreTrip) {
		getID("radio-preTrip").style.display = "";
		getID("summary").style.display = "none";
		getID("preTrip").style.display = "";

		loadPreTripExpenses();

		applyAndLoadTravelerExpenses();
		return;
	}

	if (hasDuringTrip) {
		getID("radio-duringTrip").style.display = "";
		getID("summary").style.display = "none";
		getID("duringTrip").style.display = "";
		applyAndLoadTravelerExpenses();

		loadDuringTripExpenses();

		applyAndLoadTravelerExpenses();
		return;
	}

	displayError(
		translate("messages.errors.no_data_on_module", {
			module: translate("trip.expenses.title"),
		}),
	);

	function applyAndLoadTravelerExpenses() {
		if (!hasTravelerExpenses()) {
			return;
		}
		getID("radio-expensesTravelers").style.display = "";
		loadTravelerExpenses();
	}

	function hasTravelerExpenses() {
		const hasPersonDuring = EXPENSES_DATA.duringTrip?.some((i: any) => i.person);
		const hasPersonPre = EXPENSES_DATA.preTrip?.some((i: any) => i.person);
		return EXPENSES_DATA.travelers && (hasPersonDuring || hasPersonPre);
	}
}

/** Populate dev.page.* with useful references (only on localhost).
 *  Called early (with page-level state) and again after Firestore data loads (with full state). */
function populateDevPage(early?: { documentID?: string; expensesExport?: any; params?: Record<string, string> }) {
	const dev = (window as any).dev;
	if (!dev?.isEnabled) return;
	const page = dev.page;

	if (early) {
		page.documentID = early.documentID;
		page.expensesExport = early.expensesExport;
		page.params = early.params;
	}

	page.EXPENSES_DATA = EXPENSES_DATA;
	page.CURRENT_CURRENCY = CURRENT_CURRENCY;
	page.DEFAULT_CURRENCY = DEFAULT_CURRENCY;
	page.CURRENCIES = CURRENCIES;
	page.CURRENCY_CONVERSION = CURRENCY_CONVERSION;
	page.EXPENSES_CONVERTED = EXPENSES_CONVERTED;
	page.EXPENSES_EMBED = EXPENSES_EMBED;
	page.ACTIVE_EXPENSE_TAB = () => ACTIVE_EXPENSE_TAB;

	console.log("%c[DEV]%c dev.page populated for expenses — type %cdev.page%c to explore",
		"color:#f0c040;font-weight:bold;", "", "font-weight:bold;", "");
}

export function setTabListeners() {
	const radios = [
		"radio-summary",
		"radio-preTrip",
		"radio-duringTrip",
		"radio-expensesTravelers",
	];
	radios.forEach((radio) => {
		getID(radio).addEventListener("click", function () {
			const tab = radio.replace("radio-", "");
			if (ACTIVE_EXPENSE_TAB === tab) return;

			const previousTab = ACTIVE_EXPENSE_TAB;
			ACTIVE_EXPENSE_TAB = tab;

			const oldIdx = radios.indexOf(`radio-${previousTab}`);
			const newIdx = radios.indexOf(radio);

			if (newIdx > oldIdx) {
				fade([previousTab], [ACTIVE_EXPENSE_TAB], 150, false);
			} else {
				fade([previousTab], [ACTIVE_EXPENSE_TAB], 150, false);
			}

			if (EXPENSES_EMBED.enabled) {
				sendHeightMessageToParent();
			}
		});
	});
}
