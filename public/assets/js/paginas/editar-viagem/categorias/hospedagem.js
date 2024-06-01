function _getHospedagemImage(tipo, j) {
    if (getID(`enable-upload-${tipo}-${j}`).checked) {
        TO_UPLOAD[tipo] = true;
        UPLOAD_FILES[tipo].push(j)
        return {};
    }
    UPLOAD_FILES[tipo].push({});
    return getID(`link-${tipo}-${j}`).value;
}

function _loadCheckIn(hospedagem, j) {
    _loadHospeagemCheck('checkin', 'in', hospedagem, j);
}

function _loadCheckOut(hospedagem, j) {
    _loadHospeagemCheck('checkout', 'out', hospedagem, j);
}

function _loadHospeagemCheck(chave, checkTipo, hospedagem, j) {
    const data = _convertFromFirestoreDate(hospedagem.datas[chave]);
    if (data) {
        getID(`check-${checkTipo}-${j}`).value = _jsDateToDate(data, 'yyyy-mm-dd');
        getID(`check-${checkTipo}-horario-${j}`).value = _jsDateToTime(data);
    }
}

// Listener
function _loadHospedagemListeners(j) {
    // Validação de Link
    getID(`reserva-hospedagens-link-${j}`).addEventListener('change', () => _validateLink(`reserva-hospedagens-link-${j}`));
    getID(`link-hospedagens-${j}`).addEventListener('change', () => _validateImageLink(`link-hospedagens-${j}`));

    // Nome
    getID(`hospedagens-nome-${j}`).addEventListener('change', function () {
        if (getID(`hospedagens-nome-${j}`).value) {
            getID(`hospedagens-title-${j}`).innerText = getID(`hospedagens-nome-${j}`).value;
        }
    });
}

function _hospedagensAdicionarListenerAction() {
    _closeAccordions('hospedagens');
    _addHospedagens();
    _openLastAccordion('hospedagens');
}

