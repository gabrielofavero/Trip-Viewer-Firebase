var FIRESTORE_PROGRAMACAO_DATA = {};

function _applyLoadedProgramacaoData(j, dados) {
    const jsDate = _convertFromDateObject(dados.data);

    const destinosIDsObject = dados.destinosIDs;
    let destinosIDs = [];
    if (destinosIDsObject && destinosIDsObject.length > 0) {
        destinosIDs = destinosIDsObject.map(destino => destino.destinosID);
        _addValuesForDestinosAtivosCheckbox('programacao', j, destinosIDs);
    }

    getID(`programacao-inner-title-select-${j}`).innerHTML = _getProgramacaoTitleSelectOptions(j);

    let titulo = dados.titulo?.valor ?? dados.titulo;
    if (titulo) {
        const selectValues = _getAllValuesFromSelect(getID(`programacao-inner-title-select-${j}`));
        if (destinosIDs && destinosIDs.includes(titulo)) {
            getID(`programacao-inner-title-${j}`).style.display = 'none';
        } else if (titulo.toLowerCase() == 'outro' || !selectValues.includes(titulo)) {
            getID(`programacao-inner-title-select-${j}`).value = 'outro';
            getID(`programacao-inner-title-${j}`).style.display = 'block';
            getID(`programacao-inner-title-${j}`).value = titulo;
        } else {
            getID(`programacao-inner-title-select-${j}`).value = titulo;
            getID(`programacao-inner-title-${j}`).style.display = 'none';
        }
    }

    INNER_PROGRAMACAO[_jsDateToKey(jsDate)] = {
        madrugada: dados.madrugada || [],
        manha: dados.manha || [],
        tarde: dados.tarde || [],
        noite: dados.noite || [],
    };

    _updateProgramacaoTitle(j);
    _loadInnerProgramacaoHTML(j);
    _initializeSortableForGroup(`programacao-${j}`, {onEnd: _afterDragInnerProgramacao})
}

function _updateProgramacaoTitle(j) {
    const div = getID(`programacao-title-${j}`);
    const tituloInput = getID(`programacao-inner-title-${j}`);
    const tituloSelect = getID(`programacao-inner-title-select-${j}`);
    let titulo;

    value = tituloSelect.value;
    switch (value) {
        case "":
            titulo = '';
            break;
        case 'outro':
            titulo = tituloInput.value;
            tituloInput.style.display = 'block';
            value = tituloInput.value;
            break;
        case 'departure':
        case 'return':
        case 'during':
            titulo = translate(`trip.transportation.${tituloSelect.value}`);
            tituloInput.style.display = 'none';
            break;
        default:
            titulo = _getDestinationProgramacaoTitle(value, j);

            
            tituloInput.style.display = 'none';
    }

    const data = DATAS[j - 1]
    const dataFormatada = _getDateTitle(data, 'weekday_day_month');
    div.innerText = _getProgramacaoTitle(dataFormatada, titulo);
}

function _getDestinationProgramacaoTitle(value, j) {
    const activeDestinations = _getActiveDestinations(j);
    const destinosTitulos = activeDestinations.map(destino => destino.label);
    const destinosIDs = activeDestinations.map(destino => destino.value);

    if (value === 'all_destinations') {
        return _getReadableArray(destinosTitulos);
    } 
    
    if (value.includes('_and_destinations')) {
        return _getAndDestinationTitle(value, destinosTitulos);
    } 
    
    if (destinosIDs.includes(value)) {
        const index = destinosIDs.indexOf(value);
        return destinosTitulos[index];
    } 

    return '';
}


function _getActiveDestinations(j) {
    const result = [];
    const fieldSet = getID(`programacao-local-${j}`);
    if (!fieldSet) return result;
    const children = fieldSet.children;
    for (const checkbox of children) {
        const input = checkbox.querySelector('input[type="checkbox"]');
        const label = checkbox.querySelector('label');
        if (input.checked) {
            result.push({label: label.innerText, value: input.value});
        }
    }
    return result;
}

function _getProgramacaoTitleSelectOptions(j = null) {
    const semTitulo = `<option value="">${translate('labels.no_title')}</option>`
    let destino = '';
    let idaVoltaDestino = '';

    if (j) {
        let labels = [];
        let values = [];

        for (const child of _getChildIDs(`programacao-local-${j}`)) {
            const ids = _getIDs(child);
            const checkbox = getID(`check-programacao-${ids}`);
            if (checkbox.checked) {
                labels.push(getID(`check-programacao-label-${ids}`).innerText);
                values.push(checkbox.value);
            }
        }

        if (values.length > 0 && DESTINOS_ATIVOS.length > 0) {
            for (let i = 0; i < values.length; i++) {
                destino += `<option value="${values[i]}">${labels[i]}</option>`;
            }
            if (labels.length > 1) {
                const text = _getReadableArray(labels);
                destino += `<option value="all_destinations">${text}</option>`;
            }
            const idaArray = [translate('trip.transportation.departure'), ...labels];
            const idaText = _getReadableArray(idaArray);
            idaVoltaDestino += `<option value="departure_and_destinations">${idaText}</option>`;

            const voltaArray = [...labels, translate('trip.transportation.return')];
            const voltaText = _getReadableArray(voltaArray);
            idaVoltaDestino += `<option value="return_and_destinations">${voltaText}</option>`;
        }
    }

    return `${destino}
            ${destino ? '' : semTitulo}
            <option value="departure">${translate('trip.transportation.departure')}</option>
            <option value="return">${translate('trip.transportation.return')}</option>
            <option value="during">${translate('trip.transportation.during')}</option>
            ${idaVoltaDestino}
            ${destino ? semTitulo : ''}
            <option value="outro">${translate('labels.other')}</option>`;
}

function _updateProgramacaoTitleSelect(j) {
    const select = getID(`programacao-inner-title-select-${j}`);
    const value = select.value;
    select.innerHTML = _getProgramacaoTitleSelectOptions(j);
    if (value) {
        _addValueToSelectIfExists(value, select);
    }
    _updateProgramacaoTitle(j);
}

function _getProgramacaoTitle(dataFormatada, titulo = '') {
    if (titulo) return `${titulo}: ${dataFormatada}`;
    else return dataFormatada;
}

function _reloadProgramacao() {
    if (!getID('habilitado-programacao').checked) return;
    const originalData = _buildProgramacaoObject();
    const originalDataInputs = originalData.map(data => _dateObjectToKey(data.data));

    _loadProgramacao();
    let j = 1;
    for (const data of DATAS.map(data => _jsDateToKey(data))) {
        if (originalDataInputs.includes(data)) {
            const index = originalDataInputs.indexOf(data);
            const dados = originalData[index];
            _applyLoadedProgramacaoData(j, dados);
        }
        j++;
    }
    _loadDestinosOrdenados();
    _updateDestinosAtivosCheckboxHTML('programacao');
}

// Listeners
function _loadProgramacaoListeners(j) {
    // Checkbox Local
    const fieldsetID = `programacao-local-${j}`;
    for (const containerID of _getChildIDs(fieldsetID)) {
        const ids = _getIDs(containerID);
        getID(`check-programacao-${ids}`).addEventListener('change', () => _updateProgramacaoTitleSelect(j));
    }
}