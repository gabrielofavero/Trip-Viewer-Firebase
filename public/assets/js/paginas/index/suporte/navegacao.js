function _viagensEditar(code) {
	window.open(`edit/trip?v=${code}&visibility=${_getVisibility()}`, "_blank");
}
function _viagensVisualizar(code) {
	window.open(`view.html?v=${code}&visibility=${_getVisibility()}`, "_blank");
}

function _viagensNovo() {
	window.open(`edit/trip?visibility=${_getVisibility()}`, "_blank");
}

function _destinosNovo() {
	window.open(`edit/destination?visibility=${_getVisibility()}`, "_blank");
}

function _destinosEditar(code) {
	window.open(
		`edit/destination?d=${code}&visibility=${_getVisibility()}`,
		"_blank",
	);
}

function _destinosVisualizar(code) {
	window.open(`destination?d=${code}&visibility=${_getVisibility()}`, "_blank");
}

function _listagensEditar(code) {
	window.open(
		`edit/listing?l=${code}&visibility=${_getVisibility()}`,
		"_blank",
	);
}

function _listagensVisualizar(code) {
	window.open(`view?l=${code}&visibility=${_getVisibility()}`, "_blank");
}

function _listagensNovo() {
	window.open(`edit/listing?visibility=${_getVisibility()}`, "_blank");
}

function goToCurrentTrip() {
	if (VIAGENS.viagensEmAndamento.length == 1) {
		_viagensVisualizar(VIAGENS.viagensEmAndamento[0].code);
	}
}
