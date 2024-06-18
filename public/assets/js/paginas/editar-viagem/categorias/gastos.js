var INNER_GASTOS = {
    gastosPrevios: [],
    gastosDurante: [],
};

function _switchPinVisibility() {
    if (getID('pin-disable').checked) {
        getID('pin-container').style.display = 'none';
    } else {
        getID('pin-container').style.display = 'block';
    }
}

function _requestPinEditarGastos(invalido = false) {
    const confirmAction = '_reconfirmPin()';
    const precontent = 'Insira um PIN de acesso de 4 dígitos.';
    _requestPin({ confirmAction, precontent, invalido });
}

function _reconfirmPin() {
    const atual = getID('pin-code').innerText;
    if (!atual || atual.length < 4) {
        _requestPinEditarGastos(true)
    } else {
        const confirmAction = `_validatePin('${atual}')`;
        const precontent = 'Digite novamento o PIN de acesso.';
        _requestPin({ confirmAction, precontent });
    }
}

function _validatePin(pin) {
    if (getID('pin-code').innerText === pin) {
        alert('PIN correto!')
    } else {
        _invalidPin();
    }
}

function _invalidPin() {
    const confirmAction = '_reconfirmPin()';
    const precontent = 'PIN Incorreto. Tente novamente.';
    const invalido = true;
    _requestPin({ confirmAction, precontent, invalido });
}

function _setPinButtonText(newPin = true) {
    getID('request-pin').innerText = newPin ? 'Definir PIN de Acesso' : 'Alterar PIN de Acesso';
}

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

function _openInnerGasto(categoria, tipo, index=-1) {
    const propriedades = _cloneObject(MENSAGEM_PROPRIEDADES);
    propriedades.titulo = tipo ? 'Editar Gasto' : 'Adicionar Gasto';
    propriedades.conteudo = _getInnerGastoContent(categoria);
    propriedades.icones = [{ tipo: 'voltar', acao: '' }];
    propriedades.containers = _getContainersInput();
    propriedades.botoes = [{
        tipo: 'cancelar',
      }, {
        tipo: 'confirmar',
        acao: `_saveInnerGasto('${categoria}', '${tipo || ''}', ${index || -1})`
      }];
      _displayFullMessage(propriedades);

      if (tipo && index >= 0) {
        const gasto = INNER_GASTOS[categoria].find(tipoObj => tipoObj.tipo === tipo).gastos[index];
        getID('gasto-nome').value = gasto.nome;
        getID('gasto-tipo-select').value = gasto.tipo;
        getID('gasto-moeda').value = gasto.moeda;
        getID('gasto-valor').value = gasto.valor;
      }

      getID('gasto-tipo-select').addEventListener('change', (e) => {
        getID('gasto-tipo-input').style.display = e.target.value === 'outro' ? 'block' : 'none';
      });
}

function _getInnerGastoContent(categoria) {
    const gastoTipoSelect = _getGastoTipoSelect(categoria);
    return `<div id='inner-gasto-box'>
                <div class="nice-form-group">
                    <label>Nome</label>
                    <input required id="gasto-nome" type="text" placeholder="Passagens de Avião" />
                </div>
                <div class="nice-form-group">
                    <label>Tipo</label>
                    ${gastoTipoSelect.innerHTML}
                    <input required id="gasto-tipo-input" type="text" placeholder="Transporte" style="margin-top: 8px; display: ${gastoTipoSelect.inputVisibility};"/>
                </div>
                <div class="nice-form-group">
                    <label>Moeda</label>
                        <select id="gasto-moeda" class="editar-select" name="currency">
                        <option value="BRL">Real (R$)</option>
                        <option value="USD">Dólar Americano ($)</option>
                        <option value="EUR">Euro (€)</option>
                        <option value="GBP">Libra Esterlina (£)</option>
                        <option value="JPY">Iene / Yuan (¥)</option>
                        <option value="INR">Rúpia Indiana (₹)</option>
                        <option value="RUB">Rublo Russo (₽)</option>
                        <option value="CAD">Dólar Canadense (C$)</option>
                        <option value="AUD">Dólar Australiano (A$)</option>
                        <option value="CHF">Franco Suíço (CHF)</option>
                        <option value="SEK">Coroa Sueca (SEK)</option>
                        <option value="NOK">Coroa Norueguesa (NOK)</option>
                        <option value="DKK">Coroa Dinamarquesa (DKK)</option>
                        <option value="NZD">Dólar Neozelandês (NZ$)</option>
                        <option value="MXN">Peso Mexicano (MX$)</option>
                        <option value="ZAR">Rand Sul-Africano (ZAR)</option>
                        <option value="KRW">Won Sul-Coreano (₩)</option>
                        <option value="SGD">Dólar de Singapura (SGD)</option>
                        <option value="HKD">Dólar de Hong Kong (HK$)</option>
                        <option value="ILS">Novo Shekel Israelense (₪)</option>
                        <option value="PLN">Złoty Polonês (PLN)</option>
                        <option value="HUF">Forint Húngaro (HUF)</option>
                        <option value="TWD">Dólar de Taiwan (NT$)</option>
                        <option value="THB">Baht Tailandês (฿)</option>
                    </select>
                </div>
                <div class="nice-form-group">
                    <label>Valor</label>
                    <input required class="flex-input" id="gasto-valor" type="number" placeholder="0.00" step="0.01">
                </div>
            </div>`
}

function _getGastoTipoSelect(categoria) {
    const tipos = INNER_GASTOS[categoria].map(tipo => tipo.tipo);
    const innerHTL = `<select id="gasto-tipo-select" clas="editar-select" style="display: ${tipos.length > 0 ? 'block' : 'none'}">
                        ${tipos.map(tipo => `<option value="${tipo}">${tipo}</option>`).join('')}
                        <option value="outro">Outro</option>
                    </select>`;
    return {
        innerHTML: innerHTL,
        inputVisibility: tipos.length > 0 ? 'none' : 'block'
    }
}

function _saveInnerGasto(categoria, tipo, index=-1) {

}

