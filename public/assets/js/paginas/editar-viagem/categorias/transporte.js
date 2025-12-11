function _getTransporteObject(protectedReservationCodes = false) {
    const result = {
        dados: [],
        visualizacao: getID('people-view').checked ? 'people-view' : getID('leg-view').checked ? 'leg-view' : 'simple-view'
    }
    for (const child of _getChildIDs('transporte-box')) {
        const j = _getJ(child);
        result.dados.push({
            datas: {
                chegada: _formattedDateToDateObject(getID(`chegada-${j}`).value, getID(`chegada-horario-${j}`).value),
                partida: _formattedDateToDateObject(getID(`partida-${j}`).value, getID(`partida-horario-${j}`).value)
            },
            duracao: getID(`transporte-duracao-${j}`).value,
            empresa: _getValueEmpresa(j),
            id: _getOrCreateCategoriaID('transporte', j),
            idaVolta: getID(`ida-${j}`).checked ? 'ida' : getID(`volta-${j}`).checked ? 'volta' : 'durante',
            link: protectedReservationCodes ? '' : getID(`transporte-link-${j}`).value,
            pontos: {
                chegada: getID(`ponto-chegada-${j}`).value,
                partida: getID(`ponto-partida-${j}`).value
            },
            reserva: protectedReservationCodes ? '' : getID(`reserva-transporte-${j}`).value,
            transporte: getID(`transporte-tipo-${j}`).value,
            pessoa: getID(`transporte-pessoa-select-${j}`).value,
        });
    }
    return result;
}

function _getProtectedTransporteObject() {
    const result = {}
    for (const childID of _getChildIDs('transporte-box')) {
        const j = _getJ(childID);
        const id = getID(`transporte-id-${j}`).value;
        const reserva = getID(`reserva-transporte-${j}`).value;
        const link = getID(`transporte-link-${j}`).value;
        result[id] = { reserva, link };
    }
    return result;
}

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
    const transportes = CONFIG.transportes.empresas;
    const select = getID(`empresa-select-${i}`);
    const value = select.value;
    const empresa = getID(`empresa-${i}`);
    const tipo = getID(`transporte-tipo-${i}`);

    let selectValid = false;
    let selectOptions = "";

    if (['voo', 'carro', 'onibus'].includes(tipo.value)) {
        selectValid = true;
        for (const value in transportes[tipo.value]) {
            const label = transportes[tipo.value][value];
            selectOptions += `<option value="${value}">${label}</option>`;
        }
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