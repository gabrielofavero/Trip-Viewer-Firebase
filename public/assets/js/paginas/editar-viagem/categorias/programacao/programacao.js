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

    let titulo = dados.titulo;
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

    value = tituloSelect.value;

    if (value == 'outro') {
        titulo = tituloInput.value;
        tituloInput.style.display = 'block';
        value = tituloInput.value;
    } else {
        titulo = tituloSelect.value;
        tituloInput.style.display = 'none';
        if (!['', 'Ida', 'Volta', 'Deslocamento', 'outro'].includes(value)) { // Destino
            value = _getDestinoTitle(titulo);
            if (!value) { // Múltiplos Destinos
                value = titulo;
            }
        }
    }

    const data = DATAS[j - 1]
    const dataFormatada = _getDateTitle(data, 'weekday_day_month');
    div.innerText = _getProgramacaoTitle(dataFormatada, value);
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
                destino += `<option value="${text}">${text}</option>`;
            }
            const idaArray = [translate('trip.transportation.departure'), ...labels];
            const idaText = _getReadableArray(idaArray);
            idaVoltaDestino += `<option value="${idaText}">${idaText}</option>`;

            const voltaArray = [...labels, translate('trip.transportation.return')];
            const voltaText = _getReadableArray(voltaArray);
            idaVoltaDestino += `<option value="${voltaText}">${voltaText}</option>`;
        }
    }

    return `${destino}
            ${destino ? '' : semTitulo}
            <option value="Ida">${translate('trip.transportation.departure')}</option>
            <option value="Volta">${translate('trip.transportation.return')}</option>
            <option value="Deslocamento">${translate('trip.transportation.during')}</option>
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