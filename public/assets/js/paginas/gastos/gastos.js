var GASTOS;
var GASTOS_QUANTIDADE = 0;
var GASTOS_TOTAIS = {
	resumo: {},
	gastosPrevios: {},
	gastosDurante: {},
};
var GASTO_ATIVO = "resumo";

document.addEventListener("DOMContentLoaded", async function () {
	_startLoadingScreen();
	_main();
});

async function _loadGastosPage() {
	console.log(window.location.href);
	_loadVisibilityExternal();

	const closeButton = getID("closeButton");
	if (window.parent._closeViewEmbed) {
		closeButton.onclick = function () {
			window.parent._closeViewEmbed();
		};
	} else {
		closeButton.style.display = "none";
	}

	getID("logo-link").onclick = function () {
		if (window.parent._closeViewEmbed) {
			window.parent._closeViewEmbed(true);
		} else {
			window.location.href = "index.html";
		}
	};

	const gastosExport = localStorage.getItem("gastos")
		? JSON.parse(localStorage.getItem("gastos"))
		: "";
	const params = _getURLParams();
	const documentID = params.g;
	GASTOS_EMBED.enabled = params.embed === "1";

	if (GASTOS_EMBED.enabled && !GASTOS_EMBED.applied) {
		_loadEmbedMode(params.visibility);
	}

	if (!gastosExport || !documentID) {
		const url = documentID ? `view.html?v=${documentID}` : "index.html";
		_displayForbidden(
			`${translate("messages.documents.get.error")}. ${translate(translate("messages.documents.get.no_code"))}`,
			url,
		);
		return;
	}

	if (!gastosExport?.ativo) {
		_displayForbidden(
			translate("messages.errors.module_not_active", {
				module: translate("trip.expenses.title"),
			}),
			`view.html?v=${documentID}`,
		);
		return;
	}

	if (gastosExport?.pin == "no-pin") {
		_loadGastos();
	} else {
		_stopLoadingScreen();
		_requestPinGastos();
	}
	_stopLoadingScreen();
}

function _requestPinGastos() {
	const cancelAction = `_exitGastos()`;
	const confirmAction = "_loadGastos()";
	const precontent = translate("trip.basic_information.pin.request");
	_requestPin({ confirmAction, cancelAction, precontent });
}

function _requestPinGastosInvalido() {
	const cancelAction = `_exitGastos()`;
	const confirmAction = "_loadGastos()";
	const precontent = translate("trip.basic_information.pin.invalid");
	const invalido = true;
	_requestPin({ confirmAction, cancelAction, precontent, invalido });
}

function _exitGastos() {
	if (window.parent._closeViewEmbed) {
		window.parent._closeViewEmbed();
	} else if (_getURLParam("g")) {
		window.location.href = `view.html?v=${_getURLParam("g")}`;
	} else {
		window.location.href = "index.html";
	}
}

async function _loadGastos() {
	const documentID = _getURLParam("g");
	const pin = getID("pin-code")?.innerText || "";
	_closeMessage();
	_removePinListener();
	_startLoadingScreen();
	try {
		if (pin) {
			GASTOS = await _get(`gastos/protected/${pin}/${documentID}`, false);
		} else {
			GASTOS = await _get(`gastos/${documentID}`, false);
		}

		if (GASTOS) {
			await _loadMoedas();
			_loadGastosConvertidos();
			_applyGastos();
			getID("conversao").innerText = _getConversaoText();
			_setTabListeners();
			_stopLoadingScreen();
			if (GASTOS_EMBED.enabled) {
				_embedAfterLoadAction(pin);
			}
		}
	} catch (error) {
		if (error?.message == "Missing or insufficient permissions.") {
			console.warn(error.message);
			_requestPinGastosInvalido();
		} else {
			console.error(error);
			_displayError(translate("messages.errors.unknown"));
		}
		_stopLoadingScreen();
	}
}

function _applyGastos() {
	const hasGastosPrevios = GASTOS.gastosPrevios.length > 0;
	const hasGastosDurante = GASTOS.gastosDurante.length > 0;

	if (hasGastosPrevios && hasGastosDurante) {
		getID("tab-gastos").style.display = "";
		getID("radio-resumo").style.display = "";
		getID("radio-gastosPrevios").style.display = "";
		getID("radio-gastosDurante").style.display = "";

		_loadResumo();
		_loadGastosPrevios();
		_loadGastosDurante();
		_loadGastosViajantes();

		_applyAndLoadGastosViajantes();
		return;
	}

	if (hasGastosPrevios) {
		getID("radio-gastosPrevios").style.display = "";
		getID("resumo").style.display = "none";
		getID("gastosPrevios").style.display = "";

		_loadGastosPrevios();

		_applyAndLoadGastosViajantes();
		return;
	}

	if (hasGastosDurante) {
		getID("radio-gastosDurante").style.display = "";
		getID("resumo").style.display = "none";
		getID("gastosDurante").style.display = "";
		_applyGastosViajantes();

		_loadGastosDurante();

		_applyAndLoadGastosViajantes();
		return;
	}

	_displayError(
		translate("messages.errors.no_data_on_module", {
			module: translate("trip.expenses.title"),
		}),
	);

	function _applyAndLoadGastosViajantes() {
		if (!_hasGastosViajantes()) {
			return;
		}
		getID("radio-gastosPrevios").style.display = "";
		_loadGastosViajantes();
	}

	function _hasGastosViajantes() {
		const hasPessoaDurante = GASTOS.gastosDurante.some((i) => i.pessoa);
		const hasPessoaPrevios = GASTOS.gastosPrevios.some((i) => i.pessoa);
		return GASTOS.pessoas && (hasPessoaDurante || hasPessoaPrevios);
	}
}

function _setTabListeners() {
	const radios = [
		"radio-resumo",
		"radio-gastosPrevios",
		"radio-gastosDurante",
		"radio-gastosViajantes",
	];
	radios.forEach((radio) => {
		getID(radio).addEventListener("click", function () {
			const gasto = radio.replace("radio-", "");
			if (GASTO_ATIVO === gasto) return;

			const gastoAnterior = GASTO_ATIVO;
			GASTO_ATIVO = gasto;

			const antigo = radios.indexOf(`radio-${gastoAnterior}`);
			const novo = radios.indexOf(radio);

			if (novo > antigo) {
				_fade([gastoAnterior], [GASTO_ATIVO], 150);
			} else {
				_fade([gastoAnterior], [GASTO_ATIVO], 150);
			}

			if (GASTOS_EMBED.enabled) {
				_sendHeightMessageToParent();
			}
		});
	});
}
