function _viagensEditar(code) {
  window.open(`edit/trip.html?v=${code}`, '_blank');
}

function _viagensVisualizar(code) {
  window.open(`view.html?v=${code}`, '_blank');
}

function _viagensNovo() {
  window.open(`edit/trip.html`, '_blank');
}

function _destinosNovo() {
  window.open(`edit/destination.html`, '_blank');
}

function _destinosEditar(code) {
  window.open(`edit/destination.html?d=${code}`, '_blank');
}

function _destinosVisualizar(code) {
  window.open(`view.html?d=${code}`, '_blank');
}

function _listagensEditar(code) {
  window.open(`edit/listing.html?l=${code}`, '_blank');
}

function _listagensVisualizar(code) {
  window.open(`view.html?l=${code}`, '_blank');
}

function _listagensNovo() {
  window.open(`edit/listing.html`, '_blank');
}

function goToCurrentTrip() {
  if (VIAGENS.viagensEmAndamento.length == 1) {
    _viagensVisualizar(VIAGENS.viagensEmAndamento[0].code);
  }
}