var REFRESHED = false;
var TYPE = "viagens";
var PIN = null;

var INICIO = {
	date: null,
	text: "",
};

var FIM = {
	date: null,
	text: "",
};

var TRAVELERS;

document.addEventListener("DOMContentLoaded", async function () {
	try {
		_startLoadingTimer();
		_mainView();
		_main();
	} catch (error) {
		_displayError(error);
		throw error;
	}
});

async function _loadViagemPage() {
	const urlParams = _getURLParams();
	TYPE = urlParams["l"] ? "listagens" : urlParams["d"] ? "destinos" : "viagens";
	DOCUMENT_ID = urlParams["l"] || urlParams["d"] || urlParams["v"];

	window.addEventListener("scroll", () => {
		if (window.scrollY > 0) {
			if (!REFRESHED) {
				_refreshCategorias();
				REFRESHED = true;
			}
		} else {
			REFRESHED = false;
		}
	});

	const firestoreData = await _getSingleData(TYPE);

	if (_haveErrorFromGetRequest()) {
		_displayError(_getErrorFromGetRequestMessage(), true);
		_stopLoadingScreen();
		return;
	}

	if (!_haveErrorFromGetRequest()) {
		if (firestoreData.pin === "all-data") {
			_loadProtectedData(firestoreData);
		} else {
			_setFirestoreData(firestoreData);
		}
	}
}

async function _syncModules() {
	try {
		if (CALL_SYNC.length > 0) {
			const callSyncOrder = [
				_loadResumo,
				_loadTransporte,
				_loadHospedagens,
				_loadDestinos,
				_loadGaleria,
			];
			CALL_SYNC.sort((a, b) => {
				const indexA = callSyncOrder.indexOf(a.name);
				const indexB = callSyncOrder.indexOf(b.name);
				return indexA - indexB;
			});
			for (let _function of CALL_SYNC) {
				_function();
			}
		} else {
			console.warn("No functions to sync");
		}
		// Loading Screen
		_stopLoadingScreen();
		_adjustDestinationsHTML();
	} catch (error) {
		_displayError(error);
		throw error;
	}
}

function _prepareViewData() {
	// Dados Básicos
	if (FIRESTORE_DATA.inicio && FIRESTORE_DATA.fim) {
		_loadInicioFim();
	}

	// Visibilidade
	_loadVisibility();
	_adjustCardsHeightsListener();
	_loadCloseCustomSelectListeners();

	// Cabeçalho
	_loadHeader();

	// Módulos
	_loadModules();
}

function _loadInicioFim(data = FIRESTORE_DATA) {
	INICIO.date = _convertFromDateObject(data.inicio);
	FIM.date = _convertFromDateObject(data.fim);

	INICIO.text = `${data.inicio.day}/${data.inicio.month}`;
	FIM.text = `${data.fim.day}/${data.fim.month}`;
}

function _loadHeader() {
	_loadTitle();

	if (TYPE == "destinos" && FIRESTORE_DATA.versao?.ultimaAtualizacao) {
		getID("subtitulo").innerHTML = _getLastUpdatedOnText(
			FIRESTORE_DATA.versao.ultimaAtualizacao,
		);
	}

	if (FIRESTORE_DATA?.versao.exibirEmDestinos) {
		let datas = [new Date(FIRESTORE_DATA.versao.ultimaAtualizacao)];

		for (const destino of FIRESTORE_DATA.destinos) {
			const ultimaAtualizacao = destino.destinos.versao.ultimaAtualizacao;
			if (ultimaAtualizacao) {
				datas.push(new Date(ultimaAtualizacao));
			}
		}

		const mostRecentDate = datas.reduce((a, b) => (a > b ? a : b));
		getID("dUpdate").innerHTML = _getLastUpdatedOnText(mostRecentDate);
	}

	if (FIRESTORE_DATA.descricao) {
		getID("dDescription").innerHTML = FIRESTORE_DATA.descricao;
		getID("dDescription").style.display = "block";
	}

	if (FIRESTORE_DATA.links?.ativo) {
		getID("social-links").style.display = "block";

		if (FIRESTORE_DATA.links.attachments) {
			getID("attachmentsLink").href = FIRESTORE_DATA.links.attachments;
		} else {
			getID("attachmentsLink").style.display = "none";
		}

		if (FIRESTORE_DATA.links.sheet) {
			getID("sheetLink").href = FIRESTORE_DATA.links.sheet;
		} else {
			getID("sheetLink").style.display = "none";
		}

		if (FIRESTORE_DATA.links.ppt) {
			getID("pptLink").href = FIRESTORE_DATA.links.ppt;
		} else {
			getID("pptLink").style.display = "none";
		}

		if (FIRESTORE_DATA.links.drive) {
			getID("driveLink").href = FIRESTORE_DATA.links.drive;
		} else {
			getID("driveLink").style.display = "none";
		}

		if (FIRESTORE_DATA.links.vacina) {
			getID("vaccineLink").href = FIRESTORE_DATA.links.vacina;
		} else {
			getID("vaccineLink").style.display = "none";
		}

		if (FIRESTORE_DATA.links.pdf) {
			getID("pdfLink").href = FIRESTORE_DATA.links.pdf;
		} else {
			getID("pdfLink").style.display = "none";
		}

		if (FIRESTORE_DATA.links.maps) {
			getID("mapsLink").href = FIRESTORE_DATA.links.maps;
		} else {
			getID("mapsLink").style.display = "none";
		}
	}

	_loadHeaderImageAndLogo();
}

function _loadTitle(data = FIRESTORE_DATA) {
	document.title = data.titulo;
	getID("header1").innerHTML = data.titulo;
	getID("header2").style.display = "none";

	if (data.subtitulo) {
		getID("subtitulo").innerHTML = data.subtitulo;
	}
}

function _loadHeaderImageAndLogo(data = FIRESTORE_DATA) {
	if (data.imagem?.ativo) {
		const background = data.imagem.background;
		const claro = data.imagem.claro;
		const escuro = data.imagem.escuro;

		if (background) {
			var hero = getID("hero");
			hero.style.background = 'url("' + background + '") top center no-repeat';
			hero.style.backgroundSize = "cover";
		}

		if (claro) {
			LOGO_CLARO = claro;
			if (escuro) {
				LOGO_ESCURO = escuro;
			} else {
				LOGO_ESCURO = LOGO_CLARO;
			}

			getID("header2").src = _isOnDarkMode() ? LOGO_ESCURO : LOGO_CLARO;
			getID("header1").style.display = "none";
			getID("header2").style.display = "block";
			document.querySelectorAll(".header-text").forEach((element) => {
				element.style.textAlign = "center";
			});
		}
	}
}

function _loadModules() {
	_loadCompartilhamentoModule();
	_loadResumoModule();
	_loadGastosModule();
	_loadTransportesModule();
	_loadHospedagensModule();
	_loadProgramacaoModule();
	_loadDestinosModule();
	_loadGaleriaModule();

	function _loadCompartilhamentoModule() {
		const share = getID("share");
		if (navigator.share && window.location.hostname != "localhost") {
			share.addEventListener("click", () => {
				_compartilhar();
			});
		} else {
			share.style.display = "none";
		}

		function _compartilhar() {
			const title = FIRESTORE_DATA.titulo || document.title;
			const text = _getCompartilhamentoText();
			const url = _getPageURL();
			navigator.share({ title, text, url });
		}

		function _getCompartilhamentoText() {
			switch (TYPE) {
				case "listagens":
					return translate("listing.share", { name: FIRESTORE_DATA.titulo });
				case "destinos":
					return translate("destination.share", {
						name: FIRESTORE_DATA.titulo,
					});
				case "viagem":
				case "viagens":
					return translate("trip.share", {
						name: FIRESTORE_DATA.titulo,
						start: INICIO.text,
						end: FIM.text,
					});
				default:
					return translate("messages.share");
			}
		}
	}

	function _loadResumoModule() {
		if (FIRESTORE_DATA.modulos?.resumo === true) {
			CALL_SYNC.push(_loadResumo);
		} else {
			getID("keypointsNav").innerHTML = "";
			getID("keypoints").innerHTML = "";
			getID("keypoints").style.display = "none";
		}
	}

	function _loadGastosModule() {
		const ativo = FIRESTORE_DATA.modulos?.gastos === true;
		localStorage.setItem(
			"gastos",
			JSON.stringify({ ativo, pin: FIRESTORE_DATA.pin || "no-pin" }),
		);

		if (ativo) {
			_openExpensesEmbed();
			_loadExpensesEmbed();
		} else {
			getID("expensesNav").innerHTML = "";
			getID("expenses").innerHTML = "";
			getID("expenses").style.display = "none";
		}
	}

	function _loadTransportesModule() {
		if (FIRESTORE_DATA.modulos?.transportes === true) {
			CALL_SYNC.push(_loadTransporte);
		} else {
			getID("transportationNav").innerHTML = "";
			getID("transportation").innerHTML = "";
			getID("transportation").style.display = "none";
		}
	}

	function _loadHospedagensModule() {
		if (FIRESTORE_DATA.modulos?.hospedagens === true) {
			CALL_SYNC.push(_loadHospedagens);
		} else {
			getID("stayNav").innerHTML = "";
			getID("stay").innerHTML = "";
			getID("stay").style.display = "none";
		}
	}

	function _loadProgramacaoModule() {
		if (FIRESTORE_DATA.modulos?.programacao === true) {
			CALL_SYNC.push(_loadProgramacao);
		} else {
			getID("scheduleCalendarNav").innerHTML = "";
			getID("scheduleCalendar").innerHTML = "";
			getID("scheduleCalendar").style.display = "none";
		}
	}

	function _loadDestinosModule() {
		switch (TYPE) {
			case "viagens":
				if (
					FIRESTORE_DATA.modulos?.destinos === true &&
					FIRESTORE_DATA.destinos?.length > 0
				) {
					_loadDestinosDefault();
				} else {
					_disableDestinos();
				}
				break;
			case "listagens":
				_loadDestinosDefault();
				break;
			case "destinos":
				_loadDestinosExclusive();
				break;
		}

		function _loadDestinosDefault() {
			_loadDestinationsCustomSelect();
			_loadDestinationsHTML(DESTINOS[0]);

			if (DESTINOS.length === 1) {
				_setUniqueDestinoText();
				DESTINO_ATIVO = DESTINOS[0].destinosID;
			}

			CALL_SYNC.push(_loadDestinos);
		}

		function _loadDestinosExclusive() {
			const destinosID = _getURLParam("d");
			const destinos = FIRESTORE_DATA;

			DESTINOS = [{ destinosID, destinos }];
			DESTINO_ATIVO = destinosID;

			getID("destinos-select").style.display = "none";

			_setUniqueDestinoText();
			_loadDestinationsHTML(DESTINOS[0]);

			CALL_SYNC.push(_loadDestinos);
		}

		function _disableDestinos() {
			getID("destinos").style.display = "none";
			getID("destinosNav").innerHTML = "";
		}

		function _setUniqueDestinoText() {
			const titulo = DESTINOS[0].destinos.titulo;
			getID("dTitle").innerHTML = titulo;
			getID("destinosNavText").innerHTML = titulo;
		}
	}

	function _loadGaleriaModule() {
		if (FIRESTORE_DATA.modulos?.galeria === true) {
			CALL_SYNC.push(_loadGaleria);
		} else {
			getID("portfolioM").innerHTML = "";
			getID("portfolio").style.display = "none";
		}
	}
}

function _setFirestoreData(firestoreData) {
	FIRESTORE_DATA = firestoreData;
	console.log("Firestore Database data loaded successfully");
	_loadDocumentData();
}

function _loadDocumentData() {
	_prepareViewData();
	_syncModules();
	_loadViagemVisibility();
	_adjustPortfolioHeight();
	_refreshCategorias();

	if (FIRESTORE_DATA.pin == "sensitive-only") {
		_loadSensitiveReservations();
	}

	$("body").css("overflow", "auto");

	if (!MESSAGE_MODAL_OPEN) {
		setTimeout(() => {
			_adjustCardsHeights();
			_adjustPortfolioHeight();
			_refreshCategorias();
		}, 1000);
	}
}

function _loadProtectedData(firestoreData) {
	_loadTitle(firestoreData);
	_loadInicioFim(firestoreData);
	_loadHeaderImageAndLogo(firestoreData);
	_loadVisibility(firestoreData);
	_requestDocumentPin();
}
