var INNER_PROGRAMACAO = {};

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
        if (value == 'destino') {
            value = _getCurrentSelectLabel(tituloSelect);
        }
    }

    const data = DATAS[j - 1]
    const dataFormatada = _jsDateToDayOfTheWeekAndDateTitle(data);

    div.innerText = _getProgramacaoTitle(dataFormatada, value);
}

function _getProgramacaoTitleSelectOptions(j = null) {
    const semTitulo = '<option value="">Sem Título</option>'
    let destino = '';

    if (j) {
        const localDiv = getID(`programacao-local-${j}`);
        if (localDiv.value != 'generico' && DESTINO_SELECT.length > 0) {
            destino = `<option value="destino">${_getCurrentSelectLabel(localDiv)}</option>`;
        }
    }

    return `${destino}
            ${destino ? '' : semTitulo}
            <option value="Ida">Ida</option>
            <option value="Volta">Volta</option>
            <option value="Deslocamento">Deslocamento</option>
            ${destino ? semTitulo : ''}
            <option value="outro">Outro</option>`;
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

function _getInnerProgramacaoPasseioSelects(j, k) {
    const destinosAtivos = _getDestinosAtivos();
    const currentID = getID(`programacao-local-${j}`).value;
    const idsAtivos = destinosAtivos.map(destino => destino.destinosID);
    const todosIds = DESTINOS.map(destino => destino.code);


    if (destinosAtivos.length < 0 || !currentID || !idsAtivos.includes(currentID)
        || !todosIds.includes(currentID)) {
        return {
            ativo: false
        }
    };

    const index = todosIds.findIndex(destino => destino == currentID);
    const currentDestinoData = DESTINOS[index].data;
    const categorias = Object.keys(currentDestinoData).filter(key => DESTINOS_CATEGORIAS.includes(key));

    const categoriaOptions = categorias.map(categoria => `<option value="${categoria}">${DESTINOS_TITULOS[categoria]}</option>`).join('');
    const passeioOptions = categorias.map(categoria => {
        const passeios = currentDestinoData[categoria];
        return passeios.map(passeio => `<option value="${passeio.id}">${passeio.nome}</option>`).join('');
    }).join('');

    return {
        ativo: true,
        categoriaOptions: categoriaOptions,
        passeioOptions: passeioOptions
    }
}

function _programacaoLocalSelectAction(categoria, init = false, updateLast = false) {
    let copy = SELECT_DESTINO_SELECT[categoria];
    SELECT_DESTINO_SELECT[categoria] = _getUpdatedDynamicSelectArray(categoria, 'local');
    _loadDynamicSelect(categoria, 'local', copy, SELECT_DESTINO_SELECT[categoria], init, updateLast);
}


// Inner Programação
function _openInnerProgramacao(j, k) {
    const selects = _getInnerProgramacaoPasseioSelects(j, k);
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
                          <input class="flex-input-50-50" id="inner-programacao-inicio-${j}-${k}" type="time">
                        </div>
                        <div class="nice-form-group side-by-side-fixed">
                          <label>
                            Fim<br>
                            <span class="opcional">(Opcional)</span>
                          </label>
                          <input class="flex-input-50-50" id="inner-programacao-fim-${j}-${k}" type="time">
                        </div>
                      </div>

                      <div class="nice-form-group">
                        <label>Turno</label>
                        <select class="editar-select" id="inner-programacao-select-turno-${j}-${k}">
                            <option value="madrugada">Madrugada</option>
                            <option value="manha">Manhã</option>
                            <option value="tarde">Tarde</option>
                            <option value="noite">Noite</option>
                        </select>
                      </div>

                      <div class="nice-form-group">
                        <label>Passeio Associado <span class="opcional">(Opcional)</span></label>
                        <select class="editar-select" id="inner-programacao-select-categoria-${j}-${k}">
                        </select>
                      </div>

                      <div class="nice-form-group" style="margin-top: 16px">
                        <select class="editar-select" id="inner-programacao-select-passeio-${j}-${k}">
                        </select>
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
    const inicio = getID(`inner-programacao-inicio-${j}-${k}`);
    const turno = getID(`inner-programacao-select-turno-${j}-${k}`);

    if (INNER_PROGRAMACAO[id]) {
        getID(`inner-programacao-${j}-${k}`).value = INNER_PROGRAMACAO[id].programacao;
        inicio.value = INNER_PROGRAMACAO[id].inicio;
        getID(`inner-programacao-fim-${j}-${k}`).value = INNER_PROGRAMACAO[id].fim;
        turno.value = INNER_PROGRAMACAO[id].turno;
        getID(`inner-programacao-select-categoria-${j}-${k}`).value = INNER_PROGRAMACAO[id].categoria;
        getID(`inner-programacao-select-passeio-${j}-${k}`).value = INNER_PROGRAMACAO[id].passeio;
    }

    const lastTurno = getID(`inner-programacao-select-turno-${j}-${k - 1}`)
    if (!turno.value && lastTurno && lastTurno.value) {
        turno.value = lastTurno.value;
    }

    inicio.addEventListener('change', function (event) {
        const inicioValue = event.target.value;
        const hora = parseInt(inicioValue.split(':')[0]);
        const turnoValue = hora < 6 ? 'madrugada' : hora < 12 ? 'manha' : hora < 18 ? 'tarde' : 'noite';
        turno.value = turnoValue;
    });
}

function _addInnerProgramacao(j, k) {
    const id = `inner-programacao-box-${j}-${k}`;
    const programacao = getID(`inner-programacao-${j}-${k}`).value;
    const inicio = getID(`inner-programacao-inicio-${j}-${k}`).value;
    const fim = getID(`inner-programacao-fim-${j}-${k}`).value;
    const turno = getID(`inner-programacao-select-turno-${j}-${k}`).value;
    const categoria = getID(`inner-programacao-select-categoria-${j}-${k}`).value;
    const passeio = getID(`inner-programacao-select-passeio-${j}-${k}`).value;

    INNER_PROGRAMACAO[id] = {
        programacao: programacao,
        inicio: inicio,
        fim: fim,
        turno: turno,
        categoria: categoria,
        passeio: passeio
    };

    _updateInnerProgramacaoBotaoText(j, k);
}

function _addInnerProgramacaoButton(j, k, open = true) {
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