import { stopLoadingScreen } from '../../utils/loading.js';

var GASTOS;
var EXPENSES_COUNT = 0;
var TOTAL_EXPENSES = {
	resumo: {},
	gastosPrevios: {},
	gastosDurante: {},
};
var ACTIVE_EXPENSE_TAB = "resumo";

export async function loadExpensesPage() {
	console.log(window.location.href);

	const colors = getLocalColors();
	loadVisibility(colors);

	const closeButton = getID("closeButton");
	if (window.parent.closeViewEmbed) {
		closeButton.onclick = function () {
			window.parent.closeViewEmbed();
		};
	} else {
		closeButton.style.display = "none";
	}

	getID("logo-link").onclick = function () {
		if (window.parent.closeViewEmbed) {
			window.parent.closeViewEmbed(true);
		} else {
			window.location.href = "index.html";
		}
	};

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
	requestPin({ confirmAction, cancelAction });
}

function requestPinExpensesInvalid() {
	const cancelAction = `exitExpenses()`;
	const confirmAction = "loadExpenses()";
	requestInvalidPin({ confirmAction, cancelAction });
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
			GASTOS = await get(`gastos/protected/${pin}/${documentID}`, false);
		} else {
			GASTOS = await get(`gastos/${documentID}`, false);
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
	const hasGastosPrevios = GASTOS.gastosPrevios.length > 0;
	const hasGastosDurante = GASTOS.gastosDurante.length > 0;

	if (hasGastosPrevios && hasGastosDurante) {
		getID("tab-gastos").style.display = "";
		getID("radio-resumo").style.display = "";
		getID("radio-gastosPrevios").style.display = "";
		getID("radio-gastosDurante").style.display = "";

		loadSummary();
		loadPreTripExpenses();
		loadDuringTripExpenses();
		loadTravelerExpenses();

		applyAndLoadTravelerExpenses();
		return;
	}

	if (hasGastosPrevios) {
		getID("radio-gastosPrevios").style.display = "";
		getID("resumo").style.display = "none";
		getID("gastosPrevios").style.display = "";

		loadPreTripExpenses();

		applyAndLoadTravelerExpenses();
		return;
	}

	if (hasGastosDurante) {
		getID("radio-gastosDurante").style.display = "";
		getID("resumo").style.display = "none";
		getID("gastosDurante").style.display = "";
		applyTravelerExpenses();

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
		getID("radio-gastosPrevios").style.display = "";
		loadTravelerExpenses();
	}

	function hasTravelerExpenses() {
		const hasPessoaDurante = GASTOS.gastosDurante.some((i) => i.pessoa);
		const hasPessoaPrevios = GASTOS.gastosPrevios.some((i) => i.pessoa);
		return GASTOS.pessoas && (hasPessoaDurante || hasPessoaPrevios);
	}
}

function setTabListeners() {
	const radios = [
		"radio-resumo",
		"radio-gastosPrevios",
		"radio-gastosDurante",
		"radio-gastosViajantes",
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
