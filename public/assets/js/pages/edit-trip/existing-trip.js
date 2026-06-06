import { displayError } from '../../../utils/messages.js';
import { getState } from '../../data/state.js';

async function loadTripData() {
	try {
		loadBasicTripData();
		loadCustomizacaoData();
		await loadExpensesData();
		loadTransportationData();
		loadAccommodationData();
		await loadDestinationsData();
		loadItineraryData();
		loadGaleriaData();

		setPageName(`${translate("labels.edit")} ${getState().titulo}`);
	} catch (error) {
		displayError(error);
		throw error;
	}
}

function loadBasicTripData() {
	getID("titulo").value = getState().titulo;
	getID("moeda").value = getState().moeda;

	const inicio = convertFromDateObject(getState().inicio);
	const fim = convertFromDateObject(getState().fim);

	getID("inicio").value = getDateString(inicio, "yyyy-mm-dd");
	getID("fim").value = getDateString(fim, "yyyy-mm-dd");

	TRAVELERS = cloneObject(getState().pessoas);
	validateTravelersObject();
	updateTravelersButtonLabel();
	setCurrentPreferencePIN(getState().pin);
	switchPinVisibility();
	switchPinLabel();
}

function loadCustomizacaoData() {
	// Imagens
	const background = getState().imagem.background;
	const logoClaro = getState().imagem.claro;
	const logoEscuro = getState().imagem.escuro;

	if (getState().imagem.ativo === true) {
		getID("habilitado-imagens").checked = true;
		getID("habilitado-imagens-content").style.display = "block";
	}

	loadCustomizacaoImageData(background, "link-background");
	loadCustomizacaoImageData(logoClaro, "link-logo-light");
	loadCustomizacaoImageData(logoEscuro, "link-logo-dark");

	// Cores
	const claro = getID("claro");
	const escuro = getID("escuro");

	if (getState().cores.ativo === true) {
		getID("habilitado-cores").checked = true;
		claro.value = getState().cores.claro;
		escuro.value = getState().cores.escuro;
		CURRENT_LIGHT = getState().cores.claro;
		getID("habilitado-cores-content").style.display = "block";
	}

	// Visibilidade
	const visibilidade = getState().visibilidade;
	if (visibilidade) {
		visibilityListenerAction(visibilidade);
		getID("dark-and-light").checked = visibilidade.claro && visibilidade.escuro;
		getID("light-exclusive").checked =
			visibilidade.claro && !visibilidade.escuro;
		getID("dark-exclusive").checked =
			!visibilidade.claro && visibilidade.escuro;
	}

	// Links Personalizados
	getID("habilitado-links").checked = getState().links.ativo;
	getID("link-attachments").value = getState().links.attachments;
	getID("link-drive").value = getState().links.drive;
	getID("link-maps").value = getState().links.maps;
	getID("link-pdf").value = getState().links.pdf;
	getID("link-ppt").value = getState().links.ppt;
	getID("link-sheet").value = getState().links.sheet;
	getID("link-vacina").value = getState().links.vacina;
}

async function loadExpensesData() {
	if (getState().modulos.gastos === true) {
		getID("habilitado-gastos").checked = true;
		getID("habilitado-gastos-content").style.display = "block";
	}

	const getPath = PIN.current
		? `gastos/protected/${PIN.current}/${DOCUMENT_ID}`
		: `gastos/${DOCUMENT_ID}`;

	FIRESTORE_GASTOS_DATA = await get(getPath, true, true);

	if (haveErrorFromGetRequest()) {
		displayError(ERROR_FROM_GET_REQUEST);
		return;
	}

	loadExpensesData();
}

async function loadTransportationData() {
	if (getState().modulos.transportes === true) {
		getID("habilitado-transporte").checked = true;
		getID("habilitado-transporte-content").style.display = "block";
		getID("transporte-adicionar-box").style.display = "block";
	}
	getID(getState().transportes.visualizacao || "simple-view").checked =
		true;

	for (let j = 1; j <= getState().transportes.dados.length; j++) {
		addTransportation();
		const transporte = getState().transportes.dados[j - 1];

		getID(`${transporte.idaVolta}-${j}`).checked = true;

		const pessoa = transporte.pessoa;
		if (pessoa) {
			getID(`transporte-pessoa-${j}`).value = pessoa;
			updateValueDS(
				"transporte-pessoa",
				pessoa,
				`transporte-pessoa-select-${j}`,
			);
			buildDS("transporte-pessoa");
		}

		const partida = convertFromDateObject(transporte.datas.partida);
		const chegada = convertFromDateObject(transporte.datas.chegada);

		if (partida) {
			getID(`partida-${j}`).value = getDateString(partida, "yyyy-mm-dd");
			getID(`partida-horario-${j}`).value = getTimeStringFromDate(partida);
		}

		if (chegada) {
			getID(`chegada-${j}`).value = getDateString(chegada, "yyyy-mm-dd");
			getID(`chegada-horario-${j}`).value = getTimeStringFromDate(chegada);
		}

		getID(`transporte-tipo-${j}`).value = transporte.transporte;
		const empresa = transporte.empresa;
		if (empresa) {
			loadTransportationVisibility(j);
			if (getOptionsFromSelect(`empresa-select-${j}`).includes(empresa)) {
				getID(`empresa-select-${j}`).value = empresa;
			} else {
				getID(`empresa-select-${j}`).value = "outra";
				getID(`empresa-${j}`).value = empresa;
				loadTransportationVisibility(j);
			}
		}

		getID(`transporte-id-${j}`).value = transporte.id;
		getID(`transporte-duracao-${j}`).value = transporte.duracao;
		getID(`reserva-transporte-${j}`).value = transporte.reserva;
		getID(`ponto-partida-${j}`).value = transporte.pontos.partida;
		getID(`ponto-chegada-${j}`).value = transporte.pontos.chegada;
		getID(`transporte-link-${j}`).value = transporte.link;

		updateTransportationTitle(j);
	}
	applyTransportationTypeVisualization();
}

function loadAccommodationData() {
	if (getState().modulos.hospedagens === true) {
		getID("habilitado-hospedagens").checked = true;
		getID("habilitado-hospedagens-content").style.display = "block";
		getID("hospedagens-adicionar-box").style.display = "block";
	}

	for (let j = 1; j <= getState().hospedagens.length; j++) {
		addHospedagens();
		const hospedagem = getState().hospedagens[j - 1];
		ACCOMMODATION_IMAGES[j] = hospedagem.imagens || [];

		getID(`hospedagens-id-${j}`).value = hospedagem.id;
		getID(`hospedagens-cafe-${j}`).checked = hospedagem.cafe;
		getID(`hospedagens-nome-${j}`).value = hospedagem.nome;
		getID(`hospedagens-title-${j}`).innerText =
			hospedagem.nome || getID(`hospedagens-title-${j}`).innerText;
		getID(`hospedagens-endereco-${j}`).value = hospedagem.endereco;
		getID(`hospedagens-descricao-${j}`).value = hospedagem.descricao;
		getID(`reserva-hospedagens-${j}`).value = hospedagem.reserva || "";
		getID(`reserva-hospedagens-link-${j}`).value = hospedagem.link;

		setImagemButtonLabel(j);
		loadCheckIn(hospedagem, j);
		loadCheckOut(hospedagem, j);
	}
}

async function loadDestinationsData() {
	if (
		getHTMLpage() === "edit-listing" ||
		getState().modulos.destinos === true
	) {
		if (getID("habilitado-destinos")) {
			getID("habilitado-destinos").checked = true;
		}
		getID("habilitado-destinos-content").style.display = "block";
		getID("sem-destinos").style.display = "none";
		getID("com-destinos").style.display = "block";
	} else {
		getID("sem-destinos").style.display = "block";
		getID("com-destinos").style.display = "none";
	}

	loadDestinations();
	const checkboxes = document.querySelectorAll(
		'#destinos-checkboxes input[type="checkbox"]',
	);
	for (const destino of getState().destinos) {
		const id = destino.destinosID;
		for (const checkbox of checkboxes) {
			if (checkbox.value === id) {
				checkbox.checked = true;
				break;
			}
		}
	}
	await loadDestinosAtivos();
}

function loadItineraryData() {
	if (getState().modulos.programacao === true) {
		getID("habilitado-programacao").checked = true;
		getID("habilitado-programacao-content").style.display = "block";
	}

	loadItinerarySchedule();

	let j = 1;
	while (getID(`programacao-title-${j}`)) {
		const dados = getState().programacoes[j - 1];
		if (dados?.data) {
			applyLoadedItineraryData(j, dados);
		}
		j++;
	}
	updateDestinosAtivosCheckboxHTML("programacao");
	FIRESTORE_PROGRAMACAO_DATA = cloneObject(getState().programacoes);
}

function loadGaleriaData() {
	if (getState().modulos.galeria === true) {
		getID("habilitado-galeria").checked = true;
		getID("habilitado-galeria-content").style.display = "block";
		getID("galeria-adicionar-box").style.display = "block";
	}

	const galeriaSize = getState().galeria?.imagens.length;
	if (galeriaSize > 0) {
		for (let j = 1; j <= galeriaSize; j++) {
			const i = j - 1;
			addGaleria();

			const titulo = getState().galeria.titulos[i];
			if (titulo) {
				getID(`galeria-titulo-${j}`).value = titulo;
				getID(`galeria-title-${j}`).innerText = titulo;
			}

			const categoria = getState().galeria.categorias[i];
			if (categoria) {
				getID(`galeria-categoria-${j}`).value = categoria;
				updateValueDS(
					"galeria-categoria",
					categoria,
					`galeria-categoria-select-${j}`,
				);
				buildDS("galeria-categoria");
			}

			const descricao = getState().galeria.descricoes[i];
			if (descricao) {
				getID(`galeria-descricao-${j}`).value = descricao;
			}

			getID(`link-galeria-${j}`).value = getState().galeria.imagens[i];
		}
	}
}
