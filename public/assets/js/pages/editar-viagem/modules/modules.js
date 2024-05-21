INNER_PROGRAMACAO = {};

// Destinos
function _buildDestinosSelect() {
    const childs = _getChildIDs('com-destinos');

    let used = [];

    for (const child of childs) {
        const i = child.split('-')[2];
        const selectDiv = getID(`select-destinos-${i}`);
        const value = selectDiv.value;
        if (value) {
            used.push(value);
        }
    }

    for (const child of childs) {
        const i = child.split('-')[2];
        const selectDiv = getID(`select-destinos-${i}`);
        const value = selectDiv.value;

        let options = '<option value="">Selecione um Destino</option>';
        for (let j = 0; j < DESTINOS.length; j++) {
            const code = DESTINOS[j].code;
            if (value == code || !used.includes(code)) {
                const selected = value === code ? ' selected' : '';
                options += `<option value="${code}"${selected}>${DESTINOS[j].titulo}</option>`;
            }
        }

        if (options === '<option value="">Selecione um Destino</option>') {
            _deleteDestino(i);
            getID('todos-destinos-utilizados').style.display = 'block';
        } else {
            selectDiv.innerHTML = options;
            getID('todos-destinos-utilizados').style.display = 'none';
        }
    }
}

function _deleteDestino(i) {
    _removeChildDestinosWithValidation(i);
    _buildDestinosSelect();
}

// Transportes
function _updateTransporteTitle(i) {
    const condensar = getID('condensar').checked;
    const partida = getID(`ponto-partida-${i}`).value;
    const chegada = getID(`ponto-chegada-${i}`).value;

    if (partida && chegada) {
        const texto = condensar ? `${partida} → ${chegada}` : `${_getTransporteTipo(i)}: ${partida} → ${chegada}`;
        getID(`transporte-title-${i}`).innerText = texto;
    };
}

function _getTransporteTipo(i) {
    const ida = getID(`ida-${i}`).checked ? 'Ida' : '';
    const durante = getID(`durante-${i}`).checked ? 'Durante' : '';
    const volta = getID(`volta-${i}`).checked ? 'Volta' : '';

    return ida || durante || volta;
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
        <option value="">Nenhuma</option>
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
    <option value="selecione">Selecione</option>
    ${selectOptions}
    <option value="outra">Outra</option>
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

function _applyIdaVoltaVisibility(i) {
    const visibility = getID('condensar').checked == true ? 'none' : 'block';

    if (!i) {
        for (const child of _getChildIDs('transporte-box')) {
            const j = child.split('-')[1];
            _updateTransporteTitle(j);
            getID(`idaVolta-box-${j}`).style.display = visibility;
        }
    } else {
        _updateTransporteTitle(i);
        getID(`idaVolta-box-${i}`).style.display = visibility;
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

// Hospedagens
async function _uploadHospedagem(uploadItens) {
    return await _uploadViagemItens(uploadItens, 'hospedagens');
}

// Programação
function _updateProgramacaoTitle(j) {
    const div = getID(`programacao-title-${j}`);
    const titulo = getID(`programacao-inner-title-${j}`).value;
    const data = DATAS[j - 1]
    const dataFormatada = _jsDateToDayOfTheWeekAndDateTitle(data);
    div.innerText = _getProgramacaoTitle(dataFormatada, titulo);
}

function _getProgramacaoTitle(dataFormatada, titulo = '') {
    if (titulo) return `${titulo}: ${dataFormatada}`;
    else return dataFormatada;
}

function _openInnerProgramacao(j, k) {
    const title = `Adicionar Programação`;
    const content = `<div class="inner-programacao" id="inner-programacao-box-${j}-${k}">
                      <div class="nice-form-group">
                        <label>Atividade</label>
                        <input required class="nice-form-group" id="inner-programacao-${j}-${k}" type="text" placeholder="Ir para..." />
                      </div>
                      <div class="side-by-side-box-fixed">
                        <div class="nice-form-group side-by-side-fixed">
                          <label>
                            Início<br>
                            <span class="opcional">(Opcional)</span>
                          </label>
                          <input class="flex-input-50-50" id="inicio-${j}-${k}" type="time">
                        </div>
                        <div class="nice-form-group side-by-side-fixed">
                          <label>
                            Fim<br>
                            <span class="opcional">(Opcional)</span>
                          </label>
                          <input class="flex-input-50-50" id="fim-${j}-${k}" type="time">
                        </div>
                      </div>
                      <div class="nice-form-group">
                        <label>Passeio Associado <span class="opcional"> (Opcional)</span></label>
                        <button id="passeio-inner-programacao-${j}-${k}" class="btn inner-programacao-botao-input">
                        Selecionar Passeio
                        </button>
                      </div>
                    </div>`;

    const deleteAction = `_deleteInnerProgramacao(${j}, ${k})`
    const confirmAction = `_addInnerProgramacao(${j}, ${k})`;

    _displayInputModal(title, content, deleteAction, confirmAction);

    const id = `inner-programacao-box-${j}-${k}`;
    if (INNER_PROGRAMACAO[id]) {
        getID(`inner-programacao-${j}-${k}`).value = INNER_PROGRAMACAO[id].programacao;
        getID(`inicio-${j}-${k}`).value = INNER_PROGRAMACAO[id].inicio;
        getID(`fim-${j}-${k}`).value = INNER_PROGRAMACAO[id].fim;
    }
}

function _addInnerProgramacao(j, k) {
    const id = `inner-programacao-box-${j}-${k}`;
    const programacao = getID(`inner-programacao-${j}-${k}`).value;
    const inicio = getID(`inicio-${j}-${k}`).value;
    const fim = getID(`fim-${j}-${k}`).value;

    INNER_PROGRAMACAO[id] = {
        programacao: programacao,
        inicio: inicio,
        fim: fim
    };

    _updateInnerProgramacaoBotaoText(j, k);
}

function _addInnerProgramacaoButton(j, k) {
    const id = `inner-programacao-${j}`;

    if (!k) {
        const childs = _getChildIDs(id);
        const lastChild = childs[childs.length - 1];
        k = lastChild ? parseInt(lastChild.split('-')[lastChild.split('-').length - 1]) + 1 : 1;
    }

    const innerHTML = `<button id="inner-programacao-botao-${j}-${k}" class="btn inner-programacao-botao" onclick="_openInnerProgramacao(${j}, ${k})">
                        Adicionar Programação
                       </button>`
    getID(`inner-programacao-${j}`).innerHTML += innerHTML;
}

function _updateInnerProgramacaoBotaoText(j, k) {
    const botao = getID(`inner-programacao-botao-${j}-${k}`);
    const chave = `inner-programacao-box-${j}-${k}`;
    if (INNER_PROGRAMACAO[chave] && INNER_PROGRAMACAO[chave].programacao) {
        botao.innerText = INNER_PROGRAMACAO[chave].programacao;
    }
}

function _deleteInnerProgramacao(j, k) {
    const id = `inner-programacao-box-${j}-${k}`;
    delete INNER_PROGRAMACAO[id];

    const buttonContainerID = `inner-programacao-botao-${j}-${k}`;
    const ids = _getChildIDs(`inner-programacao-${j}`);

    if (ids.includes(buttonContainerID)) {
        getID(buttonContainerID).parentNode.removeChild(getID(buttonContainerID));
    }

    _closeDisplayMessage();
}

// Lineup
function _buildLineupSelects() {
    const lineupChilds = _getChildIDs('lineup-box');
    let lineupSelectBoxes = [];
    let lineupSelects = [];

    for (const child of lineupChilds) {
        const i = child.split('-')[1];
        lineupSelectBoxes.push(`lineup-local-box-${i}`);
        lineupSelects.push(`lineup-local-${i}`);
    }

    if (getID('habilitado-destinos').checked && getID('habilitado-lineup').checked) {

        const destinoChilds = _getChildIDs('com-destinos');
        let options = '<option value="generico">Destino Não Especificado</option>';

        for (const child of destinoChilds) {
            const i = child.split('-')[2];
            const selectDiv = getID(`select-destinos-${i}`);
            const text = selectDiv.options[selectDiv.selectedIndex].text;
            const value = selectDiv[selectDiv.selectedIndex].value;
            if (value) {
                options += `<option value="${value}">${text}</option>`;
            }
        }

        for (const selectDiv of lineupSelects) {
            const div = getID(selectDiv);
            const value = div.value;
            div.innerHTML = options;
            div.value = value;
        }

    } else {
        for (const box of lineupSelectBoxes) {
            getID(box).style.display = 'none';
        }
    }
}

function _setDestinoSelectValue(i, value) {
    getID(`select-destinos-${i}`).value = value;
    _buildDestinosSelect();
}

function _lineupGeneroSelectAction(init = false, updateLast = false) {
    let copy = LINEUP_GENEROS;
    LINEUP_GENEROS = _getUpdatedDynamicSelectArray('lineup', 'genero');
    _loadDynamicSelect('lineup', 'genero', copy, LINEUP_GENEROS, init, updateLast);
}

function _lineupPalcoSelectAction(init = false, updateLast = false) {
    let copy = LINEUP_PALCOS;
    LINEUP_PALCOS = _getUpdatedDynamicSelectArray('lineup', 'palco');
    _loadDynamicSelect('lineup', 'palco', copy, LINEUP_PALCOS, init, updateLast);
}

function _loadNewLineupSelects() {
    _lineupGeneroSelectAction(false, true);
    _lineupPalcoSelectAction(false, true);
}

// Galeria
function _galeriaSelectAction(init = false, updateLast = false) {
    let copy = GALERIA_CATEGORIAS;
    GALERIA_CATEGORIAS = _getUpdatedDynamicSelectArray('galeria', 'categoria');
    _loadDynamicSelect('galeria', 'categoria', copy, GALERIA_CATEGORIAS, init, updateLast);
}

function _loadNewGaleriaSelect() {
    _galeriaSelectAction(false, true);
}

async function _uploadGaleria(uploadItens) {
    return await _uploadViagemItens(uploadItens, 'galeria');
}

function _deleteGaleria(i) {
    const id = `galeria-${i}`;
    _removeImageSelectorListeners(id);
    const div = getID(id);
    div.parentNode.removeChild(div);
}