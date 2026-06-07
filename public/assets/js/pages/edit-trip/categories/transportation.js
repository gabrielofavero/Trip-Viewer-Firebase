import { getTransportations } from '../../../app/config.js';
import { getChildIDs, getID, getJ, getOrCreateCategoryID, removeRequired, setRequired } from '../../../utils/dom.js';
import { formattedDateToDateObject, getTimeBetweenDates } from '../../../utils/dates.js';
import { translate } from '../../../i18n/translation.js';
import { validateLink } from '../../../ui/fields.js';
import { closeAccordions, openLastAccordion } from '../../../ui/accordion.js';
import { buildDS } from '../../../ui/dynamic-select.js';
import { addTransportation } from "../new-trip.js";

export function getTransportationObject(protectedReservationCodes = false) {
	const result = {
		dados: [],
		visualizacao: getID("people-view").checked
			? "people-view"
			: getID("leg-view").checked
				? "leg-view"
				: "simple-view",
	};
	for (const child of getChildIDs("transporte-box")) {
		const j = getJ(child);
		result.dados.push({
			datas: {
				chegada: formattedDateToDateObject(
					getID(`chegada-${j}`).value,
					getID(`chegada-horario-${j}`).value,
				),
				partida: formattedDateToDateObject(
					getID(`partida-${j}`).value,
					getID(`partida-horario-${j}`).value,
				),
			},
			duracao: getID(`transporte-duracao-${j}`).value,
			empresa: getCompanyValue(j),
			id: getOrCreateCategoryID("transporte", j),
			idaVolta: getID(`ida-${j}`).checked
				? "ida"
				: getID(`volta-${j}`).checked
					? "volta"
					: "durante",
			link: protectedReservationCodes
				? ""
				: getID(`transporte-link-${j}`).value,
			pontos: {
				chegada: getID(`ponto-chegada-${j}`).value,
				partida: getID(`ponto-partida-${j}`).value,
			},
			reserva: protectedReservationCodes
				? ""
				: getID(`reserva-transporte-${j}`).value,
			transporte: getID(`transporte-tipo-${j}`).value,
			pessoa: getID(`transporte-pessoa-select-${j}`).value,
		});
	}
	return result;
}

export function getProtectedTransportationObject() {
	const result = {};
	for (const childID of getChildIDs("transporte-box")) {
		const j = getJ(childID);
		const id = getID(`transporte-id-${j}`).value;
		const reserva = getID(`reserva-transporte-${j}`).value;
		const link = getID(`transporte-link-${j}`).value;
		result[id] = { reserva, link };
	}
	return result;
}

export function updateTransportationTitle(i) {
	const partida = getID(`ponto-partida-${i}`).value;
	const chegada = getID(`ponto-chegada-${i}`).value;

	if (!partida || !chegada) {
		return;
	}

	let texto = `${partida} → ${chegada}`;

	if (getID("leg-view").checked) {
		texto = `${getTransportationType(i)}: ${texto}`;
	} else {
		const pessoa = getPerson(i);
		if (getID("people-view").checked && pessoa) {
			texto = `${pessoa}: ${texto}`;
		}
	}

	getID(`transporte-title-${i}`).innerText = texto;
}

function getTransportationType(i) {
	const ida = getID(`ida-${i}`).checked
		? translate("trip.transportation.departure")
		: "";
	const durante = getID(`durante-${i}`).checked
		? translate("trip.transportation.during")
		: "";
	const volta = getID(`volta-${i}`).checked
		? translate("trip.transportation.return")
		: "";

	return ida || durante || volta;
}

function getPerson(i) {
	const select = getID(`transporte-pessoa-select-${i}`).value;
	const input = getID(`transporte-pessoa-${i}`).value;

	if (select === "outra" || select === "selecione") {
		return input;
	}

	return select;
}

export function loadTransportationVisibility(j) {
	const empresasPorTipo = getTransportations().empresas;

	const empresaSelect = getID(`empresa-select-${j}`);
	const empresaInput = getID(`empresa-${j}`);
	const tipo = getID(`transporte-tipo-${j}`).value;
	const previousValue = empresaSelect.value;

	const empresas = empresasPorTipo[tipo];

	if (!empresas) {
		showOnlyEmpresaInput(empresaSelect, empresaInput);
		return;
	}

	populateEmpresaSelect(empresaSelect, empresas);
	restorePreviousSelection(empresaSelect, previousValue);

	empresaSelect.style.display = "block";
	empresaInput.style.display =
		empresaSelect.value === "outra" ? "block" : "none";

	function populateEmpresaSelect(select, empresas) {
		let options = `<option value="selecione">${translate("labels.select")}</option>`;

		for (const [value, label] of Object.entries(empresas)) {
			options += `<option value="${value}">${label}</option>`;
		}

		options += `<option value="outra">${translate("labels.other")}</option>`;
		select.innerHTML = options;
	}

	function restorePreviousSelection(select, value) {
		if (!value) return;

		const exists = Array.from(select.options).some(
			(option) => option.value === value,
		);

		if (exists) {
			select.value = value;
		}
	}

	function showOnlyEmpresaInput(select, input) {
		select.style.display = "none";
		input.style.display = "block";
	}
}

export function applyTransportationTypeVisualization(i) {
	if (i) {
		apply(i);
		return;
	}

	for (const child of getChildIDs("transporte-box")) {
		apply(getJ(child));
	}

	function apply(j) {
		updateTransportationTitle(j);
		getID(`idaVolta-box-${j}`).style.display = getID("leg-view").checked
			? "block"
			: "none";
		getID(`people-box-${j}`).style.display = getID("people-view").checked
			? "block"
			: "none";

		if (getID("people-view").checked) {
			setRequired(`transporte-pessoa-select-${j}`);
		} else {
			removeRequired(`transporte-pessoa-select-${j}`);
		}
	}
}

function loadAutoDuration(i) {
	const div = getID(`transporte-duracao-${i}`);

	const startDate = getID(`partida-${i}`).value;
	const startTime = getID(`partida-horario-${i}`).value;

	const endDate = getID(`chegada-${i}`).value;
	const endTime = getID(`chegada-horario-${i}`).value;

	if (startDate != "" && startTime != "" && endDate != "" && endTime != "") {
		const start = new Date(`${startDate}T${startTime}`);
		const end = new Date(`${endDate}T${endTime}`);
		div.value = getTimeBetweenDates(start, end);
	}
}

// Set Viagem
function getCompanyValue(j) {
	const divSelect = getID(`empresa-select-${j}`);
	const divEmpresa = getID(`empresa-${j}`);

	if (divSelect && divEmpresa) {
		if (divSelect.value == "outra" || divSelect.value == "selecione") {
			return divEmpresa.value;
		} else {
			return divSelect.value;
		}
	}

	return "";
}

// Listeners
export function loadTransportationListeners(j) {
	// Selects Dinâmicos
	getID(`empresa-select-${j}`).addEventListener("change", () =>
		loadTransportationVisibility(j),
	);
	getID(`transporte-tipo-${j}`).addEventListener("change", () =>
		loadTransportationVisibility(j),
	);

	// Título Dinâmico
	getID(`ponto-partida-${j}`).addEventListener("change", () =>
		updateTransportationTitle(j),
	);
	getID(`ponto-chegada-${j}`).addEventListener("change", () =>
		updateTransportationTitle(j),
	);
	getID(`ida-${j}`).addEventListener("change", () => updateTransportationTitle(j));
	getID(`durante-${j}`).addEventListener("change", () =>
		updateTransportationTitle(j),
	);
	getID(`volta-${j}`).addEventListener("change", () =>
		updateTransportationTitle(j),
	);

	// Cálculo Automático da Duração do Trajeto
	getID(`partida-${j}`).addEventListener("change", () => loadAutoDuration(j));
	getID(`partida-horario-${j}`).addEventListener("change", () =>
		loadAutoDuration(j),
	);
	getID(`chegada-${j}`).addEventListener("change", () => loadAutoDuration(j));
	getID(`chegada-horario-${j}`).addEventListener("change", () =>
		loadAutoDuration(j),
	);

	// Validação de Link
	getID(`transporte-link-${j}`).addEventListener("change", () =>
		validateLink(`transporte-link-${j}`),
	);
}

function transportationAddListenerAction() {
	closeAccordions("transporte");
	addTransportation();
	openLastAccordion("transporte");
	buildDS("transporte-pessoa");
}
