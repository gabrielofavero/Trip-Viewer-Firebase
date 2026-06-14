import { startLoadingScreen, stopLoadingScreen } from '../../utils/loading.js';
import { getLocalColors } from '../../theme/colors.js';
import { loadVisibility } from '../../theme/visibility.js';
import { getID, getURLParam, getURLParams } from '../../utils/dom.js';
import { closeMessage, displayError, displayForbidden, registerActions } from '../../utils/messages.js';
import { translate } from '../../i18n/translation.js';
import { loadCurrencies } from '../../app/config.js';
import { getConversionText, loadConvertedExpenses } from '../../models/expense.model.js';
import { fade } from '../../theme/animations.js';
import { requestPin } from '../../utils/pin.js';
import { get } from '../../data/firebase/database.js';

export var GASTOS;
var EXPENSES_COUNT = 0;
var TOTAL_EXPENSES = {
	resumo: {},
	preTrip: {},
	duringTrip: {},
};
var ACTIVE_EXPENSE_TAB = "resumo";

import { loadExpensesListeners } from './support/event-listeners.js';
import { loadEmbedMode } from "./support/embed.js";
import { requestInvalidPin } from "../../utils/pin.js";
import { loadDuringTripExpenses, loadPreTripExpenses, loadSummary, loadTravelerExpenses } from "./categories.js";
import { GASTOS_EMBED } from './support/embed.js';

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

	const gastosExport = localStorage.getItem("gastos")
		? JSON.parse(localStorage.getItem("gastos"))
		: "";
	const params = getURLParams();
	const documentID = params.g;
	GASTOS_EMBED.enabled = params.embed === "1";

	if (GASTOS_EMBED.enabled && !GASTOS_EMBED.applied) {
		loadEmbedMode(params.visibility);
	}

	if (!gastosExport || !documentID) {
		const url = documentID ? `view.html?v=${documentID}` : "index.html";
		displayForbidden(
			`${translate("messages.documents.get.error")}. ${translate(translate("messages.documents.get.no_code"))}`,
			url,
		);
		return;
	}

	if (!gastosExport?.ativo) {
		displayForbidden(
			translate("messages.errors.module_not_active", {
				module: translate("trip.expenses.title"),
			}),
			`view.html?v=${documentID}`,
		);
		return;
	}

	if (gastosExport?.pin == "no-pin") {
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
	} else if (getURLParam("g")) {
		window.location.href = `view.html?v=${getURLParam("g")}`;
	} else {
		window.location.href = "index.html";
	}
}

async function loadExpenses() {
	const documentID = getURLParam("g");
	const pin = getID("pin-code")?.innerText || "";
	closeMessage();
	startLoadingScreen();
	try {
		if (pin) {
			GASTOS = await get(`expenses/protected/${pin}/${documentID}`, false);
		} else {
			GASTOS = await get(`expenses/${documentID}`, false);
		}

		if (GASTOS) {
			await loadCurrencies();
			loadConvertedExpenses();
			applyExpenses();
			getID("conversao").innerText = getConversionText();
			setTabListeners();
			stopLoadingScreen();
			if (GASTOS_EMBED.enabled) {
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

function applyExpenses() {
	const hasPreTrip = GASTOS.preTrip?.length > 0;
	const hasDuringTrip = GASTOS.duringTrip?.length > 0;

	if (hasPreTrip && hasDuringTrip) {
		getID("tab-expenses").style.display = "";
		getID("radio-resumo").style.display = "";
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
		getID("resumo").style.display = "none";
		getID("preTrip").style.display = "";

		loadPreTripExpenses();

		applyAndLoadTravelerExpenses();
		return;
	}

	if (hasDuringTrip) {
		getID("radio-duringTrip").style.display = "";
		getID("resumo").style.display = "none";
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
		const hasPersonDuring = GASTOS.duringTrip?.some((i: any) => i.person);
		const hasPersonPre = GASTOS.preTrip?.some((i: any) => i.person);
		return GASTOS.travelers && (hasPersonDuring || hasPersonPre);
	}
}

export function setTabListeners() {
	const radios = [
		"radio-resumo",
		"radio-preTrip",
		"radio-duringTrip",
		"radio-expensesTravelers",
	];
	radios.forEach((radio) => {
		getID(radio).addEventListener("click", function () {
			const gasto = radio.replace("radio-", "");
			if (ACTIVE_EXPENSE_TAB === gasto) return;

			const gastoAnterior = ACTIVE_EXPENSE_TAB;
			ACTIVE_EXPENSE_TAB = gasto;

			const antigo = radios.indexOf(`radio-${gastoAnterior}`);
			const novo = radios.indexOf(radio);

			if (novo > antigo) {
				fade([gastoAnterior], [ACTIVE_EXPENSE_TAB], 150, false);
			} else {
				fade([gastoAnterior], [ACTIVE_EXPENSE_TAB], 150, false);
			}

			if (GASTOS_EMBED.enabled) {
				sendHeightMessageToParent();
			}
		});
	});
}
