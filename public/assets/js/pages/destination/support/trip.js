import { getItinerary } from '../../../app/config.js';

var FIRESTORE_DATA;
var TRIP_ID;
var PLANNED_DESTINATION = {};
var ACTIVE_PLANNED_DESTINATION = [];

async function getTripData(tripID) {
	if (!tripID) return;
	TRIP_ID = tripID;
	return await get(`viagens/${tripID}`);
}

async function refreshTripData() {
	if (!TRIP_ID) return;
	ACTIVE_PLANNED_DESTINATION = [];
	PLANNED_DESTINATION = {};
	FIRESTORE_DATA = await get(`viagens/${TRIP_ID}`);
	loadPlannedDestination();
}

// Planned Destination
function loadPlannedDestination() {
	const programacoes = FIRESTORE_DATA?.programacoes || [];
	for (const dia of programacoes) {
		const data = dia.data;
		for (const turno of getItinerary().timeofday) {
			const programacoes = dia[turno];
			if (!programacoes) continue;

			for (const programacao of programacoes) {
				const item = programacao?.item;
				if (!item || item.tipo !== "destinos") continue;
				addPlannedDestination(item, data, turno);
			}
		}
	}

	function addPlannedDestination(item, data, turno) {
		const destino = FIRESTORE_DATA.destinos.find(
			(d) => d.destinosID === item.local,
		);
		if (!destino || destino.destinosID != DOCUMENT_ID) return;

		PLANNED_DESTINATION[item.categoria] ??= {};
		PLANNED_DESTINATION[item.categoria][item.id] ??= [];
		PLANNED_DESTINATION[item.categoria][item.id].push({ data, turno });
	}
}

function getPlannedDestinations(id) {
	return PLANNED_DESTINATION[ACTIVE_CATEGORY]?.[id] || [];
}

function populatePlannedDestinationEditField(id, j) {
	if (!TRIP_ID) {
		return;
	}
	ACTIVE_PLANNED_DESTINATION = getPlannedDestinations(id);
	loadPlannedDestinationEditFieldHTML(j);
}

function loadPlannedDestinationEditFieldHTML(j) {
	const container = getID(`editar-planejado-container-${j}`);
	const dataSelect = getID(`editar-planejado-select-data-${j}`);
	const turnoSelect = getID(`editar-planejado-select-turno-${j}`);

	let options = `<option value="">${translate("labels.planned.not_planned")}</option>`;

	switch (ACTIVE_PLANNED_DESTINATION.length) {
		case 0:
			loadNoPD();
			break;
		case 1:
			loadSinglePD();
			break;
		default:
			loadMultiPD();
	}

	container.style.display = "";

	function loadNoPD() {
		loadAllOptions();
		dataSelect.innerHTML = options;
		dataSelect.value = "";
		turnoSelect.style.display = "none";
		addSelectListener();
	}

	function loadSinglePD() {
		loadAllOptions();
		const item = ACTIVE_PLANNED_DESTINATION[0];
		dataSelect.innerHTML = options;
		dataSelect.value = dateObjectToInputDate(item.data);
		turnoSelect.value = item.turno;
		addSelectListener();
	}

	function loadMultiPD() {
		options += `<option value="multi">${translate("labels.planned.multiple")}</option>`;
		dataSelect.innerHTML = options;
		dataSelect.value = "multi";
		turnoSelect.style.display = "none";
	}

	function loadAllOptions() {
		for (const programacao of FIRESTORE_DATA.programacoes) {
			const ids = programacao.destinosIDs.map((destino) => destino.destinosID);

			if (!ids.includes(DOCUMENT_ID)) {
				continue;
			}

			const date = programacao.data;
			const jsDate = convertFromDateObject(date);
			const label = getDateTitle(jsDate, "weekday_day_month");
			options += `<option value="${jsDateToInputDate(jsDate)}">${label}</option>`;
		}
	}

	function addSelectListener() {
		dataSelect.onchange = (e) => {
			turnoSelect.style.display = e.target.value ? "" : "none";
		};
	}
}

async function setPlannedDestination(id, j) {
	const newData = getID(`editar-planejado-select-data-${j}`).value;
	const newTurno = getID(`editar-planejado-select-turno-${j}`).value;

	const currentSize = ACTIVE_PLANNED_DESTINATION.length;

	if ((currentSize === 0 && !newData) || newData === "multi") {
		return false;
	}

	const currentData = ACTIVE_PLANNED_DESTINATION[0]?.data;
	const currentInputDate = currentData
		? dateObjectToInputDate(currentData)
		: null;
	const currentTurno = ACTIVE_PLANNED_DESTINATION[0]?.turno;

	if (
		currentSize === 1 &&
		newData === currentInputDate &&
		newTurno === currentTurno
	) {
		return false;
	}

	const updatedProgramacoes = getUpdatedProgramacoes();
	await update(`viagens/${TRIP_ID}`, {
		programacoes: updatedProgramacoes,
	});

	return true;

	function getUpdatedProgramacoes() {
		if (!newData && currentData) {
			return removeDestinationReferences();
		}

		if (newData && !currentData) {
			return addToLastPosition();
		}

		if (newData !== currentInputDate || newTurno !== currentTurno) {
			return changeOrder();
		}

		return FIRESTORE_DATA.programacoes;
	}

	// ---------- helpers ----------

	function removeDestinationReferences() {
		const programacoes = cloneObject(FIRESTORE_DATA.programacoes);

		for (const day of programacoes) {
			for (const period of ["manha", "tarde", "noite", "madrugada"]) {
				day[period] = day[period].filter((p) => {
					const item = p?.item;
					return !(
						item &&
						item.tipo === "destinos" &&
						item.local === DOCUMENT_ID &&
						item.id === id
					);
				});
			}
		}

		return programacoes;
	}

	function addToLastPosition() {
		const programacoes = cloneObject(FIRESTORE_DATA.programacoes);

		const targetDay = programacoes.find(
			(p) => dateObjectToInputDate(p.data) === newData,
		);

		if (!targetDay) {
			return programacoes;
		}

		targetDay[newTurno].push(buildPlannedDestination());

		return programacoes;
	}

	function changeOrder() {
		let programacoes = removeDestinationReferences();

		const targetDay = programacoes.find(
			(p) => dateObjectToInputDate(p.data) === newData,
		);

		if (!targetDay) {
			return programacoes;
		}

		targetDay[newTurno].push(buildPlannedDestination());

		return programacoes;
	}

	function buildPlannedDestination() {
		const pessoas = cloneObject(FIRESTORE_DATA.pessoas);
		for (const pessoa of pessoas) {
			pessoa.isPresent = true;
		}
		return {
			programacao: getID(`editar-nome-${j}`).value,
			item: {
				tipo: "destinos",
				categoria: ACTIVE_CATEGORY,
				local: DOCUMENT_ID,
				id: id,
			},
			fim: "",
			pessoas: pessoas || [],
			inicio: "",
		};
	}
}
