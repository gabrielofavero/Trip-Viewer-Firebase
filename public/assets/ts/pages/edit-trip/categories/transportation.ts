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
	for (const child of getChildIDs("transportation-box")) {
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
			duracao: getID(`transportation-duracao-${j}`).value,
			empresa: getCompanyValue(j),
			id: getOrCreateCategoryID("transportation", j),
			idaVolta: getID(`ida-${j}`).checked
				? "ida"
				: getID(`volta-${j}`).checked
					? "volta"
					: "durante",
			link: protectedReservationCodes
				? ""
				: getID(`transportation-link-${j}`).value,
			pontos: {
				chegada: getID(`ponto-chegada-${j}`).value,
				partida: getID(`ponto-partida-${j}`).value,
			},
			reserva: protectedReservationCodes
				? ""
				: getID(`reserva-transportation-${j}`).value,
			transporte: getID(`transportation-tipo-${j}`).value,
			pessoa: getID(`transportation-pessoa-select-${j}`).value,
		});
	}
	return result;
}

export function getProtectedTransportationObject() {
	const result = {};
	for (const childID of getChildIDs("transportation-box")) {
		const j = getJ(childID);
		const id = getID(`transportation-id-${j}`).value;
		const reserva = getID(`reserva-transportation-${j}`).value;
		const link = getID(`transportation-link-${j}`).value;
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

	getID(`transportation-title-${i}`).innerText = texto;
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
	const select = getID(`transportation-pessoa-select-${i}`).value;
	const input = getID(`transportation-pessoa-${i}`).value;

	if (select === "outra" || select === "selecione") {
		return input;
	}

	return select;
}

export function loadTransportationVisibility(j) {
	const empresasPorTipo = getTransportations().companies;

	const empresaSelect = getID(`empresa-select-${j}`);
	const empresaInput = getID(`empresa-${j}`);
	const tipo = getID(`transportation-tipo-${j}`).value;
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
			(option: HTMLOptionElement) => option.value === value,
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

export function applyTransportationTypeVisualization(i?) {
	if (i) {
		apply(i);
		return;
	}

	for (const child of getChildIDs("transportation-box")) {
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
			setRequired(`transportation-pessoa-select-${j}`);
		} else {
			removeRequired(`transportation-pessoa-select-${j}`);
		}
	}
}

function loadAutoDuration(i) {
	const div = getID(`transportation-duracao-${i}`);

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
// Dynamic Selects
	getID(`empresa-select-${j}`).addEventListener("change", () =>
		loadTransportationVisibility(j),
	);
	getID(`transportation-tipo-${j}`).addEventListener("change", () =>
		loadTransportationVisibility(j),
	);

// Dynamic Title
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

	// Automatic Route Duration Calculation
	getID(`partida-${j}`).addEventListener("change", () => loadAutoDuration(j));
	getID(`partida-horario-${j}`).addEventListener("change", () =>
		loadAutoDuration(j),
	);
	getID(`chegada-${j}`).addEventListener("change", () => loadAutoDuration(j));
	getID(`chegada-horario-${j}`).addEventListener("change", () =>
		loadAutoDuration(j),
	);

// Link Validation
	getID(`transportation-link-${j}`).addEventListener("change", () =>
		validateLink(`transportation-link-${j}`),
	);
}

export function transportationAddListenerAction() {
	closeAccordions("transportation");
	addTransportation();
	openLastAccordion("transportation");
	buildDS("transportation-person");
}
