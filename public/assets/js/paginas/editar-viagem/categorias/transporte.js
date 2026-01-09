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

function _loadTransporteVisibility(j) {
    const empresasPorTipo = CONFIG.transportes.empresas;

    const empresaSelect = getID(`empresa-select-${j}`);
    const empresaInput = getID(`empresa-${j}`);
    const tipo = getID(`transporte-tipo-${j}`).value;
    const previousValue = empresaSelect.value;

    const empresas = empresasPorTipo[tipo];

    if (!empresas) {
        _showOnlyEmpresaInput(empresaSelect, empresaInput);
        return;
    }

    _populateEmpresaSelect(empresaSelect, empresas);
    _restorePreviousSelection(empresaSelect, previousValue);

    empresaSelect.style.display = 'block';
    empresaInput.style.display =
        empresaSelect.value === 'outra' ? 'block' : 'none';

    function _populateEmpresaSelect(select, empresas) {
        let options = `<option value="selecione">${translate('labels.select')}</option>`;

        for (const [value, label] of Object.entries(empresas)) {
            options += `<option value="${value}">${label}</option>`;
        }

        options += `<option value="outra">${translate('labels.other')}</option>`;
        select.innerHTML = options;
    }

    function _restorePreviousSelection(select, value) {
        if (!value) return;

        const exists = Array.from(select.options)
            .some(option => option.value === value);

        if (exists) {
            select.value = value;
        }
    }

    function _showOnlyEmpresaInput(select, input) {
        select.style.display = 'none';
        input.style.display = 'block';
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