var PIN_GASTOS = {
    current: '',
    new: '',
};

var INNER_GASTOS = {
    gastosPrevios: [],
    gastosDurante: [],
};

var LAST_INNER_GASTO_TIPO = '';

async function _getGastosObject() {
    return {
        compartilhamento: await _getCompartilhamentoObject(),
        gastosDurante: _getGastos('gastosDurante'),
        gastosPrevios: _getGastos('gastosPrevios'),
        moeda: getID(`moeda`).value,
        versao: {
            ultimaAtualizacao: new Date().toISOString()
        }
    }

    function _getGastos(categoria) {
        let result = [];
        for (const tipoObj of INNER_GASTOS[categoria]) {
            result = [...result, ...tipoObj.gastos];
        }
        return result;
    }
}

function _getGastosProtectedObject() {
    return {
        compartilhamento: FIRESTORE_GASTOS_NEW_DATA.compartilhamento
    }
}

// Pin
function _switchPin() {
    if (getID('pin-disable').checked) {
        PIN_GASTOS.new = '';
        getID('pin-container').style.display = 'none';
    } else {
        PIN_GASTOS.new = PIN_GASTOS.current;
        getID('pin-container').style.display = 'block';
    }
}

function _requestPinEditarGastos(invalido = false) {
    const confirmAction = '_reconfirmPin()';
    const precontent = translate('trip.expenses.pin.insert');
    _requestPin({ confirmAction, precontent, invalido });
}

function _reconfirmPin() {
    const atual = getID('pin-code').innerText;
    if (!atual || atual.length < 4) {
        _requestPinEditarGastos(true)
    } else {
        const confirmAction = `_validatePin('${atual}')`;
        const precontent = translate('trip.expenses.pin.again');
        _requestPin({ confirmAction, precontent });
    }
}

function _validatePin(pin) {
    if (getID('pin-code').innerText === pin) {
        PIN_GASTOS.new = pin;
        _closeMessage();
    } else {
        _invalidPin();
    }
}

function _invalidPin() {
    const confirmAction = '_reconfirmPin()';
    const precontent = translate('trip.expenses.pin.invalid');
    const invalido = true;
    _requestPin({ confirmAction, precontent, invalido });
}

function _setPinButtonText(newPin = true) {
    getID('request-pin').innerText = newPin ? translate('trip.expenses.pin.new') : translate('trip.expenses.pin.change');
}

function _validateSavedPIN() {
    if (getID('pin-enable').checked && !PIN_GASTOS.new) {
        return [translate('trip.expenses.pin.title')];
    }
}

// Gastos e Inner Gastos
function _loadGastosHTML() {
    for (const categoria in INNER_GASTOS) {
        getID(categoria).innerHTML = '';
        for (const tipoObj of INNER_GASTOS[categoria]) {
            _buildTipo(categoria, tipoObj)
        }
    }

    function _buildTipo(categoria, tipoObj) {
        const div = document.createElement('div');
        div.className = 'gastos-item';

        const label = document.createElement('label');
        label.innerText = tipoObj.tipo;
        div.appendChild(label);

        for (let i = 0; i < tipoObj.gastos.length; i++) {
            const button = document.createElement('button');
            button.className = 'btn input-botao';
            button.innerText = tipoObj.gastos[i].nome;
            button.onclick = () => _openInnerGasto(categoria, tipoObj.tipo, i);
            div.appendChild(button);
        }

        getID(categoria).appendChild(div);
    }
}

function _openInnerGasto(categoria, tipo = '', index = -1) {
    const propriedades = _cloneObject(MENSAGEM_PROPRIEDADES);
    propriedades.titulo = tipo ? translate('labels.edit') : translate('labels.add');
    propriedades.conteudo = _getInnerGastoContent(categoria, tipo, index);
    propriedades.icones = [{ tipo: 'voltar', acao: '' }];
    propriedades.containers = _getContainersInput();
    propriedades.botoes = [{
        tipo: 'cancelar',
    }, {
        tipo: 'confirmar',
        acao: `_saveInnerGasto('${categoria}', '${tipo}', ${index})`
    }];
    _displayFullMessage(propriedades);

    if (tipo && index >= 0) {
        const gasto = INNER_GASTOS[categoria].find(tipoObj => tipoObj.tipo === tipo).gastos[index];
        getID('gasto-nome').value = gasto.nome;
        getID('gasto-moeda').value = gasto.moeda;
        getID('gasto-valor').value = gasto.valor;
        _applyGastoInnerTipo(gasto.tipo);
    } else {
        getID('gasto-deletar').style.display = 'none';
        getID('gasto-moeda').value = getID('moeda').value
        if (LAST_INNER_GASTO_TIPO) {
            _applyGastoInnerTipo(LAST_INNER_GASTO_TIPO);
        }
    }

    getID('gasto-tipo-select').addEventListener('change', (e) => {
        getID('gasto-tipo-input').style.display = e.target.value === 'custom' ? 'block' : 'none';
    });

    getID('gasto-valor').addEventListener('input', (e) => {
        const value = e.target.value;
        if (value && !isNaN(value)) {
            const floatValue = parseFloat(e.target.value);
            const decimals = floatValue.toString().split('.')[1];
            if (decimals && decimals.length > 2) {
                e.target.value = floatValue.toFixed(2);
            }
        }
    });
}

function _applyGastoInnerTipo(tipo) {
    const values = Array.from(getID('gasto-tipo-select').options).map(option => option.value);
    if (values.includes(tipo)) {
        getID('gasto-tipo-select').value = tipo;
    } else {
        getID('gasto-tipo-select').value = 'custom';
        getID('gasto-tipo-input').value = tipo;
        getID('gasto-tipo-input').style.display = 'block';
    }
}

function _getInnerGastoContent(categoria, tipo, index) {
    return `<div id='inner-gasto-box'>
                <div class="nice-form-group">
                    <label>${translate('labels.name')}</label>
                    <input required id="gasto-nome" type="text" placeholder="${translate('trip.transportation.type.flight')}" />
                </div>
                <div class="nice-form-group">
                    <label>${translate('labels.type')}</label>
                    <select id="gasto-tipo-select" clas="editar-select"">
                        <option value="trip.transportation.type.flights">${translate('trip.transportation.type.flights')}</option>
                        <option value="trip.accomodation.title">${translate('trip.accomodation.title')}</option>
                        <option value="labels.entretainment">${translate('labels.entretainment')}</option>
                        <option value="trip.expenses.daily">${translate('trip.expenses.daily')}</option>
                        <option value="labels.people">${translate('labels.people')}</option>
                        <option value="trip.transportation.type.car">${translate('trip.transportation.type.car')}</option>
                        <option value="labels.other">${translate('labels.other')}</option>
                        <option value="custom">${translate('labels.custom')}</option>
                    </select>
                    <input required id="gasto-tipo-input" type="text" placeholder="${translate('trip.transportation.title')}" style="margin-top: 8px; display: none"/>
                </div>
                <div class="nice-form-group">
                    <label>Moeda</label>
                        <select id="gasto-moeda" class="editar-select" name="currency">
                        <option value="BRL">${translate('currency.type.BRL')}</option>
                        <option value="USD">${translate('currency.type.USD')}</option>
                        <option value="EUR">${translate('currency.type.EUR')}</option>
                        <option value="GBP">${translate('currency.type.GBP')}</option>
                        <option value="JPY">${translate('currency.type.JPY')}</option>
                        <option value="INR">${translate('currency.type.INR')}</option>
                        <option value="RUB">${translate('currency.type.RUB')}</option>
                        <option value="CAD">${translate('currency.type.CAD')}</option>
                        <option value="AUD">${translate('currency.type.AUD')}</option>
                        <option value="CHF">${translate('currency.type.CHF')}</option>
                        <option value="SEK">${translate('currency.type.SEK')}</option>
                        <option value="NOK">${translate('currency.type.NOK')}</option>
                        <option value="DKK">${translate('currency.type.DKK')}</option>
                        <option value="NZD">${translate('currency.type.NZD')}</option>
                        <option value="MXN">${translate('currency.type.MXN')}</option>
                        <option value="ZAR">${translate('currency.type.ZAR')}</option>
                        <option value="KRW">${translate('currency.type.KRW')}</option>
                        <option value="SGD">${translate('currency.type.SGD')}</option>
                        <option value="HKD">${translate('currency.type.HKD')}</option>
                        <option value="ILS">${translate('currency.type.ILS')}</option>
                        <option value="PLN">${translate('currency.type.PLN')}</option>
                        <option value="HUF">${translate('currency.type.HUF')}</option>
                        <option value="TWD">${translate('currency.type.TWD')}</option>
                        <option value="THB">${translate('currency.type.THB')}</option>
                    </select>
                </div>
                <div class="nice-form-group">
                    <label>${translate('labels.cost')}</label>
                    <input required class="input-full" id="gasto-valor" type="number" placeholder="0.00" step="0.01">
                </div>
                <div class="button-box-right" id="gasto-deletar" style="margin-top: 8px; margin-bottom: 8px;">
                        <button onclick="_deleteInnerGasto('${categoria}', '${tipo}', ${index})" class="btn btn-basic btn-format">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
                                <path fill="currentColor" fill-rule="evenodd" d="M8.106 2.553A1 1 0 0 1 9 2h6a1 1 0 0 1 .894.553L17.618 6H20a1 1 0 1 1 0 2h-1v11a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3V8H4a1 1 0 0 1 0-2h2.382l1.724-3.447ZM14.382 4l1 2H8.618l1-2h4.764ZM11 11a1 1 0 1 0-2 0v6a1 1 0 1 0 2 0v-6Zm4 0a1 1 0 1 0-2 0v6a1 1 0 1 0 2 0v-6Z" clip-rule="evenodd"></path>
                            </svg>
                        </button>
                    </div>
            </div>`
}

function _saveInnerGasto(categoria, tipo, index = -1) {
    const valor = _getFieldValueOrNotify('gasto-valor');
    const newGasto = {
        nome: _getFieldValueOrNotify('gasto-nome'),
        tipo: getID('gasto-tipo-select').value === 'custom' ? _getFieldValueOrNotify('gasto-tipo-input') : getID('gasto-tipo-select').value,
        moeda: _getFieldValueOrNotify('gasto-moeda'),
        valor: valor ? parseFloat(parseFloat(valor).toFixed(2)) : null,
    }

    if (!newGasto.nome || !newGasto.tipo || !newGasto.moeda || !newGasto.valor) return;

    LAST_INNER_GASTO_TIPO = newGasto.tipo;

    if (tipo && index >= 0) {
        if (tipo == newGasto.tipo) {
            INNER_GASTOS[categoria].find(tipoObj => tipoObj.tipo === tipo).gastos[index] = newGasto;
        } else {
            INNER_GASTOS[categoria].find(tipoObj => tipoObj.tipo === tipo).gastos.splice(index, 1);
            let tipoObj = INNER_GASTOS[categoria].find(tipoObj => tipoObj.tipo === newGasto.tipo);
            if (tipoObj) {
                tipoObj.gastos.push(newGasto);
            } else {
                INNER_GASTOS[categoria].push({ tipo: newGasto.tipo, gastos: [newGasto] });
            }
        }
    } else {
        const tipos = INNER_GASTOS[categoria].map(tipoObj => tipoObj.tipo);
        if (tipos.includes(newGasto.tipo)) {
            INNER_GASTOS[categoria].find(tipoObj => tipoObj.tipo === newGasto.tipo).gastos.push(newGasto);
        } else {
            INNER_GASTOS[categoria].push({ tipo: newGasto.tipo, gastos: [newGasto] });
        }
    }
    _updateInnerGastos();
    _loadGastosHTML();
    _closeMessage();
}

function _updateInnerGastos() {
    for (const categoria in INNER_GASTOS) {
        for (let i = 0; i < INNER_GASTOS[categoria].length; i++) {
            const tipoObj = INNER_GASTOS[categoria][i];
            if (tipoObj.gastos.length === 0) {
                INNER_GASTOS[categoria].splice(i, 1);
            }
        }
    }
}

function _deleteInnerGasto(categoria, tipo, index) {
    INNER_GASTOS[categoria].find(tipoObj => tipoObj.tipo === tipo).gastos.splice(index, 1);
    _loadGastosHTML();
    _closeMessage();
}