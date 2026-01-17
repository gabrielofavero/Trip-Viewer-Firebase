var FIRESTORE_DATA;
var TRIP_ID;
var PLANNED_DESTINATION = {};
var ACTIVE_PLANNED_DESTINATION = [];

async function _getTripData(tripID) {
	if (!tripID) return;
	TRIP_ID = tripID;
	return await _get(`viagens/${tripID}`);
}

async function _refreshTripData() {
	if (!TRIP_ID) return;
	ACTIVE_PLANNED_DESTINATION = [];
	PLANNED_DESTINATION = {};
	FIRESTORE_DATA = await _get(`viagens/${TRIP_ID}`);
	_loadPlannedDestination();
}

// Planned Destination
function _loadPlannedDestination() {
	for (const dia of FIRESTORE_DATA.programacoes) {
		const data = dia.data;
		for (const turno of ["madrugada", "manha", "tarde", "noite"]) {
			const programacoes = dia[turno];
			if (!programacoes) continue;

			for (const programacao of programacoes) {
				const item = programacao?.item;
				if (!item || item.tipo !== "destinos") continue;
				_addPlannedDestination(item, data, turno);
			}
		}
	}

	function _addPlannedDestination(item, data, turno) {
		const destino = FIRESTORE_DATA.destinos.find(
			(d) => d.destinosID === item.local,
		);
		if (!destino || destino.destinosID != DOCUMENT_ID) return;

		PLANNED_DESTINATION[item.categoria] ??= {};
		PLANNED_DESTINATION[item.categoria][item.id] ??= [];
		PLANNED_DESTINATION[item.categoria][item.id].push({ data, turno });
	}
}

function _getPlannedDestinations(id) {
	return PLANNED_DESTINATION[ACTIVE_CATEGORY]?.[id] || [];
}

function _populatePlannedDestinationEditField(id, j) {
	if (!TRIP_ID) {
		return;
	}
	ACTIVE_PLANNED_DESTINATION = _getPlannedDestinations(id);
	_loadPlannedDestinationEditFieldHTML(j);
}

function _loadPlannedDestinationEditFieldHTML(j) {
	const container = getID(`editar-planejado-container-${j}`);
	const dataSelect = getID(`editar-planejado-select-data-${j}`);
	const turnoSelect = getID(`editar-planejado-select-turno-${j}`);

	let options = `<option value="">${translate("labels.planned.not_planned")}</option>`;

	switch (ACTIVE_PLANNED_DESTINATION.length) {
		case 0:
			_loadNoPD();
			break;
		case 1:
			_loadSinglePD();
			break;
		default:
			_loadMultiPD();
	}

	container.style.display = "";

	function _loadNoPD() {
		_loadAllOptions();
		dataSelect.innerHTML = options;
		dataSelect.value = "";
		turnoSelect.style.display = "none";
		_addSelectListener();
	}

	function _loadSinglePD() {
		_loadAllOptions();
		const item = ACTIVE_PLANNED_DESTINATION[0];
		dataSelect.innerHTML = options;
		dataSelect.value = _dateObjectToInputDate(item.data);
		turnoSelect.value = item.turno;
		_addSelectListener();
	}

	function _loadMultiPD() {
		options += `<option value="multi">${translate("labels.planned.multiple")}</option>`;
		dataSelect.innerHTML = options;
		dataSelect.value = "multi";
		turnoSelect.style.display = "none";
	}

	function _loadAllOptions() {
		for (const programacao of FIRESTORE_DATA.programacoes) {
			const ids = programacao.destinosIDs.map((destino) => destino.destinosID);

			if (!ids.includes(DOCUMENT_ID)) {
				continue;
			}

			const date = programacao.data;
			const jsDate = _convertFromDateObject(date);
			const label = _getDateTitle(jsDate, "weekday_day_month");
			options += `<option value="${_jsDateToInputDate(jsDate)}">${label}</option>`;
		}
	}

	function _addSelectListener() {
		dataSelect.onchange = (e) => {
			turnoSelect.style.display = e.target.value ? "" : "none";
		};
	}
}

async function _setPlannedDestination(id, j) {
	const newData = getID(`editar-planejado-select-data-${j}`).value;
	const newTurno = getID(`editar-planejado-select-turno-${j}`).value;

	const currentSize = ACTIVE_PLANNED_DESTINATION.length;

	if ((currentSize === 0 && !newData) || newData === "multi") {
		return false;
	}

	const currentData = ACTIVE_PLANNED_DESTINATION[0]?.data;
	const currentInputDate = currentData
		? _dateObjectToInputDate(currentData)
		: null;
	const currentTurno = ACTIVE_PLANNED_DESTINATION[0]?.turno;

	if (
		currentSize === 1 &&
		newData === currentInputDate &&
		newTurno === currentTurno
	) {
		return false;
	}

	const updatedProgramacoes = _getUpdatedProgramacoes();
	await _update(`viagens/${TRIP_ID}`, {
		programacoes: updatedProgramacoes,
	});

	return true;

	function _getUpdatedProgramacoes() {
		if (!newData && currentData) {
			return _removeDestinationReferences();
		}

		if (newData && !currentData) {
			return _addToLastPosition();
		}

		if (newData !== currentInputDate || newTurno !== currentTurno) {
			return _changeOrder();
		}

		return FIRESTORE_DATA.programacoes;
	}

	// ---------- helpers ----------

	function _removeDestinationReferences() {
		const programacoes = _cloneObject(FIRESTORE_DATA.programacoes);

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

	function _addToLastPosition() {
		const programacoes = _cloneObject(FIRESTORE_DATA.programacoes);

		const targetDay = programacoes.find(
			(p) => _dateObjectToInputDate(p.data) === newData,
		);

		if (!targetDay) {
			return programacoes;
		}

		targetDay[newTurno].push(_buildPlannedDestination());

		return programacoes;
	}

	function _changeOrder() {
		let programacoes = _removeDestinationReferences();

		const targetDay = programacoes.find(
			(p) => _dateObjectToInputDate(p.data) === newData,
		);

		if (!targetDay) {
			return programacoes;
		}

		targetDay[newTurno].push(_buildPlannedDestination());

		return programacoes;
	}

	function _buildPlannedDestination() {
		const pessoas = _cloneObject(FIRESTORE_DATA.pessoas);
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
