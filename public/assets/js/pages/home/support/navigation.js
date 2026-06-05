function viagensEditar(code) {
	window.open(`edit/trip?v=${code}&visibility=${getVisibility()}`, "_blank");
}
function viagensVisualizar(code) {
	window.open(`view.html?v=${code}&visibility=${getVisibility()}`, "_blank");
}

function viagensNovo() {
	window.open(`edit/trip?visibility=${getVisibility()}`, "_blank");
}

function destinosNovo() {
	window.open(`edit/destination?visibility=${getVisibility()}`, "_blank");
}

function destinosEditar(code) {
	window.open(
		`edit/destination?d=${code}&visibility=${getVisibility()}`,
		"_blank",
	);
}

function destinosVisualizar(code) {
	window.open(`destination?d=${code}&visibility=${getVisibility()}`, "_blank");
}

function listagensEditar(code) {
	window.open(
		`edit/listing?l=${code}&visibility=${getVisibility()}`,
		"_blank",
	);
}

function listagensVisualizar(code) {
	window.open(`view?l=${code}&visibility=${getVisibility()}`, "_blank");
}

function listagensNovo() {
	window.open(`edit/listing?visibility=${getVisibility()}`, "_blank");
}

function goToCurrentTrip() {
	if (CURRENT_TRIPS?.length == 1) {
		viagensVisualizar(CURRENT_TRIPS[0].id);
	}
}
