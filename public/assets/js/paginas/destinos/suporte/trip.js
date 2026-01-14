var FIRESTORE_DATA;
var PLANNED_DESTINATION = {};

async function _getTripData(tripID) {
	if (!tripID) return;
	return await _get(`viagens/${tripID}`);
}

function _getTripColors() {
	if (
		!FIRESTORE_DATA ||
		!FIRESTORE_DATA?.cores?.claro ||
		!FIRESTORE_DATA?.cores?.escuro
	) {
		return {};
	}
	return {
		claro: FIRESTORE_DATA.cores.claro,
		escuro: FIRESTORE_DATA.cores.escuro,
	};
}

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
		PLANNED_DESTINATION[item.categoria][item.id] = { data, turno };
	}
}
