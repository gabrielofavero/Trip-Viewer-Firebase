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

function _programacaoLocalSelectAction(categoria, init = false, updateLast = false) {
    let copy = SELECT_DESTINO_SELECT[categoria];
    SELECT_DESTINO_SELECT[categoria] = _getUpdatedDynamicSelectArray(categoria, 'local');
    _loadDynamicSelect(categoria, 'local', copy, SELECT_DESTINO_SELECT[categoria], init, updateLast);
}


// Inner Programação
function _loadInnerProgramacaoHTML(j) {
    if (Object.keys(INNER_PROGRAMACAO).length == 0) return;

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

function _openInnerProgramacao(j, k) {
    const key = _jsDateToKey(DATAS[j - 1]);
    let isNew = false;

    if (!k) {
        k = INNER_PROGRAMACAO[key].length + 1;
        isNew = true;
    }

    const selects = _getInnerProgramacaoSelects(j);
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

                      <div class="nice-form-group" style="display: ${selects.ativo ? 'block' : 'none'}">
                        <label>Passeio Associado <span class="opcional">(Opcional)</span></label>
                        <select class="editar-select" id="inner-programacao-select-categoria-${j}-${k}">
                            <option value="">Selecione</option>
                            ${selects.categoriaOptions}
                        </select>
                      </div>

                      <div class="nice-form-group" id="inner-programacao-select-passeio-box-${j}-${k}" style="margin-top: 16px; display: none">
                        <select class="editar-select" id="inner-programacao-select-passeio-${j}-${k}">
                        </select>
                      </div>

                      <div class="button-box-right" style="margin-top: 8px; margin-bottom: -18px; display: ${isNew ? 'none' : 'block'}">
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

    const inicio = getID(`inner-programacao-inicio-${j}-${k}`);
    const turno = getID(`inner-programacao-select-turno-${j}-${k}`);

    if (INNER_PROGRAMACAO[key] && INNER_PROGRAMACAO[key][k - 1]) {
        const dados = INNER_PROGRAMACAO[key][k - 1];

        getID(`inner-programacao-${j}-${k}`).value = dados.programacao;
        getID(`inner-programacao-fim-${j}-${k}`).value = dados.fim;
        getID(`inner-programacao-select-categoria-${j}-${k}`).value = dados.passeio.categoria;
        getID(`inner-programacao-select-passeio-${j}-${k}`).value = dados.passeio.id;

        inicio.value = dados.inicio;
        turno.value = dados.turno;

        _loadInnerProgramacaoSelectPasseio(selects, j, k);
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

    getID(`inner-programacao-select-categoria-${j}-${k}`).addEventListener('change', () => _loadInnerProgramacaoSelectPasseio(selects, j, k));
}

function _getInnerProgramacaoSelects(j) {
    const destinosAtivos = _getDestinosAtivos();
    const currentID = getID(`programacao-local-${j}`).value;
    const idsAtivos = destinosAtivos.map(destino => destino.destinosID);
    const todosIds = DESTINOS.map(destino => destino.code);

    if (destinosAtivos.length < 0 || !currentID || !idsAtivos.includes(currentID)
        || !todosIds.includes(currentID)) {
        return {
            ativo: false,
            categoriaOptions: '',
            passeioOptions: {}
        }
    };

    const index = todosIds.findIndex(destino => destino == currentID);
    const currentDestinoData = DESTINOS[index].data;

    let categorias = Object.keys(currentDestinoData).filter(key => DESTINOS_CATEGORIAS.includes(key));
    categorias = categorias.sort((a, b) => DESTINOS_CATEGORIAS.indexOf(a) - DESTINOS_CATEGORIAS.indexOf(b));
    const categoriaOptions = categorias.map(categoria => `<option value="${categoria}">${DESTINOS_TITULOS[categoria]}</option>`).join('');

    let passeioOptions = {};
    for (const categoria of categorias) {
        const passeios = currentDestinoData[categoria];
        passeioOptions[categoria] = passeios.map(passeio => `<option value="${passeio.id}">${passeio.nome}</option>`).join('');
    }

    return {
        ativo: true,
        categoriaOptions: categoriaOptions,
        passeioOptions: passeioOptions
    }
}

function _loadInnerProgramacaoSelectPasseio(selects, j, k) {
    const categoriaValue = getID(`inner-programacao-select-categoria-${j}-${k}`).value;
    const passeio = getID(`inner-programacao-select-passeio-box-${j}-${k}`);
    const passeioSelect = getID(`inner-programacao-select-passeio-${j}-${k}`);

    if (categoriaValue && selects.passeioOptions[categoriaValue]) {
        passeioSelect.innerHTML = selects.passeioOptions[categoriaValue];
        passeio.style.display = 'block';
    } else {
        passeio.style.display = 'none';
    }
}

function _addInnerProgramacao(j, k) {
    const key = _jsDateToKey(DATAS[j - 1]);
    const programacao = getID(`inner-programacao-${j}-${k}`);

    if (!programacao.value) {
        programacao.reportValidity();
    } else {
        const result = {
            programacao: programacao.value,
            inicio: getID(`inner-programacao-inicio-${j}-${k}`).value,
            fim: getID(`inner-programacao-fim-${j}-${k}`).value,
            turno: getID(`inner-programacao-select-turno-${j}-${k}`).value,
            passeio: {
                categoria: getID(`inner-programacao-select-categoria-${j}-${k}`).value,
                id: getID(`inner-programacao-select-passeio-${j}-${k}`).value
            }
        };

        if (!INNER_PROGRAMACAO[key]) {
            INNER_PROGRAMACAO[key] = [];
        }

        INNER_PROGRAMACAO[key][k - 1] = result;
    }
}

function _setInnerProgramacAO(j, k) {

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