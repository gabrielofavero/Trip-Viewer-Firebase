var INNER_PROGRAMACAO = {};
var DESTINO_SELECT = [];

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

// Destinos
function _getDestinosAtivos() {
    if (!getID('habilitado-destinos').checked) return;

    const childIds = _getChildIDs('destinos-checkboxes');
    let result = [];

    for (const child of childIds) {
        const j = child.split("-")[child.split("-").length - 1];
        const checkbox = getID(`check-${j}`);
        if (checkbox.checked) {
            result.push({
                titulo: getID(`check-label-${j}`).innerText,
                destinosID: checkbox.value
            })
        }
    }

    return result;
}

function _loadDestinosSelect() {
    const destinosAtivos = _getDestinosAtivos();
    DESTINO_SELECT = [];
    if (destinosAtivos && destinosAtivos.length > 0) {
        DESTINO_SELECT.push({
            value: 'generico',
            innerHTML: '<option value="generico">Destino Não Especificado</option>'
        });
        for (const destino of destinosAtivos) {
            DESTINO_SELECT.push({
                value: destino.destinosID,
                innerHTML: `<option value="${destino.destinosID}">${destino.titulo}</option>`
            });
        }
    }
}

function _getDestinosSelectOptions() {
    return DESTINO_SELECT.map(destino => destino.innerHTML).join('');
}

function _getDestinosSelectVisibility() {
    return DESTINO_SELECT.length > 0 ? 'block' : 'none';
}

function _writeDestinosSelects() {
    _loadDestinosSelect();
    _writeDestinosSelect('programacao');
    _writeDestinosSelect('lineup');
}

function _writeDestinosSelect(tipo) {
    const childs = _getChildIDs(`${tipo}-box`);
    const visibility = DESTINO_SELECT.length > 0 ? 'block' : 'none';
    const values = DESTINO_SELECT.map(destino => destino.value);
    const innerHTML = DESTINO_SELECT.map(destino => destino.innerHTML).join('');

    for (const child of childs) {
        const j = child.split('-')[1];
        const originalValue = getID(`${tipo}-local-${j}`).value;
        getID(`${tipo}-local-${j}`).innerHTML = innerHTML;
        getID(`${tipo}-local-box-${j}`).style.display = visibility;

        if (values.includes(originalValue)) {
            getID(`${tipo}-local-${j}`).value = originalValue;
        }
    }
}

// Programação
function _updateProgramacaoTitle(j) {
    const div = getID(`programacao-title-${j}`);
    const tituloInput = getID(`programacao-inner-title-${j}`);
    const tituloSelect = getID(`programacao-inner-title-select-${j}`);

    let titulo = '';

    if (tituloSelect.value == 'outro') {
        titulo = tituloInput.value;
        tituloInput.style.display = 'block';
    } else {
        titulo = tituloSelect.value;
        tituloInput.style.display = 'none';
    }

    const data = DATAS[j - 1]
    const dataFormatada = _jsDateToDayOfTheWeekAndDateTitle(data);
    
    div.innerText = _getProgramacaoTitle(dataFormatada, tituloInput);
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

                      <div class="button-box-right" style="margin-top: 8px; margin-bottom: -18px">
                        <button onclick="_deleteInnerProgramacao(${j}, ${k})" class="btn btn-basic btn-format">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
                                <path fill="currentColor" fill-rule="evenodd" d="M8.106 2.553A1 1 0 0 1 9 2h6a1 1 0 0 1 .894.553L17.618 6H20a1 1 0 1 1 0 2h-1v11a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3V8H4a1 1 0 0 1 0-2h2.382l1.724-3.447ZM14.382 4l1 2H8.618l1-2h4.764ZM11 11a1 1 0 1 0-2 0v6a1 1 0 1 0 2 0v-6Zm4 0a1 1 0 1 0-2 0v6a1 1 0 1 0 2 0v-6Z" clip-rule="evenodd"></path>
                            </svg>
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

function _addInnerProgramacaoButton(j, k, open=true) {
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

    if (open) _openInnerProgramacao(j, k);
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

function _programacaoLocalSelectAction(categoria, init = false, updateLast = false) {
    let copy = SELECT_DESTINO_SELECT[categoria];
    SELECT_DESTINO_SELECT[categoria] = _getUpdatedDynamicSelectArray(categoria, 'local');
    _loadDynamicSelect(categoria, 'local', copy, SELECT_DESTINO_SELECT[categoria], init, updateLast);
}

function _loadNewLocalSelect(categoria) {
    _programacaoLocalSelectAction(categoria, false, true);
}

function _loadProgramacaoListeners(j) {
    const select = getID(`programacao-local-select-${j}`);
    const input = getID(`programacao-local-${j}`);

    select.addEventListener('change', function () {
        _programacaoLocalSelectAction(categoria);
        if (select.value === 'outra') {
            input.style.display = 'block';
        }
    });

    input.addEventListener('change', function () {
        _programacaoLocalSelectAction(categoria);
    });
}

// Lineup
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