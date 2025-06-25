function _updateTransporteTitle(i) {
    const partida = getID(`ponto-partida-${i}`).value;
    const chegada = getID(`ponto-chegada-${i}`).value;

    if (!partida || !chegada) {
        return;
    }
    
    let texto = `${partida} → ${chegada}`;

    if (getID('leg-view').checked) {
        texto = `${_getTransporteTipo(i)}: ${texto}`;
    } else {
        const pessoa = _getPessoa(i);
        if (getID('people-view').checked && pessoa) {
        texto = `${pessoa}: ${texto}`;
        }
    }

    getID(`transporte-title-${i}`).innerText = texto;
}

function _getTransporteTipo(i) {
    const ida = getID(`ida-${i}`).checked ? translate('trip.transportation.departure') : '';
    const durante = getID(`durante-${i}`).checked ? translate('trip.transportation.during') : '';
    const volta = getID(`volta-${i}`).checked ? translate('trip.transportation.return') : '';

    return ida || durante || volta;
}

function _getPessoa(i) {
    const select = getID(`transporte-pessoa-select-${i}`).value;
    const input = getID(`transporte-pessoa-${i}`).value;

    if (select === 'outra' || select === 'selecione') {
        return input;
    }

    return select;
}

function _loadTransporteVisibility(i) {
    const select = getID(`empresa-select-${i}`);
    const value = select.value;
    const empresa = getID(`empresa-${i}`);
    const tipo = getID(`transporte-tipo-${i}`);

    let selectValid = false;
    let selectOptions = "";

    switch (tipo.value) {
        case "voo":
            selectOptions = `
        <option value="americanAirlines">American Airlines</option>
        <option value="avianca">Avianca</option>
        <option value="azul">Azul</option>
        <option value="copa">Copa Airlines</option>
        <option value="delta">Delta Airlines</option>
        <option value="gol">Gol</option>
        <option value="jetblue">JetBlue</option>
        <option value="latam">LATAM</option>
        <option value="tap">TAP Air Portugal</option>
        <option value="united">United Airlines</option>
        `
            selectValid = true;
            break;
        case "carro":
            selectOptions = `
        <option value="99">99</option>
        <option value="avis">Avis</option>
        <option value="cabify">Cabify</option>
        <option value="hertz">Hertz</option>
        <option value="localiza">Localiza</option>
        <option value="lyft">Lyft</option>
        <option value="movida">Movida</option>
        <option value="uber">Uber</option>
        <option value="unidas">Unidas</option>
        <option value="">${translate('labels.none')}</option>
        `
            selectValid = true;
            break;
        case "onibus":
            selectOptions = `
          <option value="aguiaBranca">Águia Branca</option>
          <option value="buser">Buser</option>
          <option value="cometa">Cometa</option>
          <option value="gontijo">Gontijo</option>
          `
            selectValid = true;
            break;
    }

    select.innerHTML = `
    <option value="selecione">${translate('labels.select')}</option>
    ${selectOptions}
    <option value="outra">${translate('labels.other')}</option>
    `;

    if (value && select.innerHTML.includes(value)) {
        select.value = value;
    }

    if (selectValid) {
        select.style.display = 'block';
        empresa.style.display = select.value == 'outra' ? 'block' : 'none';
    } else {
        select.style.display = 'none';
        empresa.style.display = 'block';
    }
}

function _applyTransportationTypeVisualization(i) {
    if (i) {
        _apply(i);
        return;
    }

    for (const child of _getChildIDs('transporte-box')) {
        _apply(_getJ(child))
    }

    function _apply(j) {
        _updateTransporteTitle(j);
        getID(`idaVolta-box-${j}`).style.display = getID('leg-view').checked ? 'block' : 'none';
        getID(`people-box-${j}`).style.display = getID('people-view').checked ? 'block' : 'none';

        if (getID('people-view').checked) {
            _setRequired(`transporte-pessoa-select-${j}`);
        } else {
            _removeRequired(`transporte-pessoa-select-${j}`);
        }
    }
}

function _loadAutoDuration(i) {
    const div = getID(`transporte-duracao-${i}`);

    const startDate = getID(`partida-${i}`).value;
    const startTime = getID(`partida-horario-${i}`).value;

    const endDate = getID(`chegada-${i}`).value;
    const endTime = getID(`chegada-horario-${i}`).value;

    if (startDate != "" && startTime != "" && endDate != "" && endTime != "") {
        const start = new Date(`${startDate}T${startTime}`);
        const end = new Date(`${endDate}T${endTime}`);
        div.value = _getTimeBetweenDates(start, end);
    }
}

// Set Viagem
function _getValueEmpresa(j) {
    const divSelect = getID(`empresa-select-${j}`);
    const divEmpresa = getID(`empresa-${j}`);

    if (divSelect && divEmpresa) {
        if (divSelect.value == 'outra' || divSelect.value == 'selecione') {
            return divEmpresa.value;
        } else {
            return divSelect.value;
        }
    }

    return "";
}

// Listeners
function _loadTransporteListeners(j) {
    // Selects Dinâmicos
    getID(`empresa-select-${j}`).addEventListener('change', () => _loadTransporteVisibility(j));
    getID(`transporte-tipo-${j}`).addEventListener('change', () => _loadTransporteVisibility(j));

    // Título Dinâmico
    getID(`ponto-partida-${j}`).addEventListener('change', () => _updateTransporteTitle(j));
    getID(`ponto-chegada-${j}`).addEventListener('change', () => _updateTransporteTitle(j));
    getID(`ida-${j}`).addEventListener('change', () => _updateTransporteTitle(j));
    getID(`durante-${j}`).addEventListener('change', () => _updateTransporteTitle(j));
    getID(`volta-${j}`).addEventListener('change', () => _updateTransporteTitle(j));

    // Cálculo Automático da Duração do Trajeto
    getID(`partida-${j}`).addEventListener('change', () => _loadAutoDuration(j));
    getID(`partida-horario-${j}`).addEventListener('change', () => _loadAutoDuration(j));
    getID(`chegada-${j}`).addEventListener('change', () => _loadAutoDuration(j));
    getID(`chegada-horario-${j}`).addEventListener('change', () => _loadAutoDuration(j));

    // Validação de Link
    getID(`transporte-link-${j}`).addEventListener('change', () => _validateLink(`transporte-link-${j}`));
}

function _transporteAdicionarListenerAction() {
    _closeAccordions('transporte');
    _addTransporte();
    _openLastAccordion('transporte');
    _buildDS('transporte-pessoa');
}