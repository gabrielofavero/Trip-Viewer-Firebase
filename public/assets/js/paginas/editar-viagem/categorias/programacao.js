var INNER_PROGRAMACAO = {};
var DEFAULT_PROGRAMACAO_INNER_TITLE_SELECT_VALUES = ['', 'Ida', 'Volta', 'Deslocamento', 'outro'];

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
        if (!DEFAULT_PROGRAMACAO_INNER_TITLE_SELECT_VALUES.includes(value)) {
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
        if (localDiv.value && DESTINO_SELECT.length > 0) {
            destino = `<option value="${localDiv.value}">${_getCurrentSelectLabel(localDiv)}</option>`;
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
    const key = _jsDateToKey(DATAS[j - 1]);
    if (Object.keys(INNER_PROGRAMACAO).length == 0 || !INNER_PROGRAMACAO[key]) return;

    getID(`inner-programacao-madrugada-${j}`).innerHTML = '';
    getID(`programacao-madrugada-${j}`).style.display = 'none';

    getID(`inner-programacao-manha-${j}`).innerHTML = '';
    getID(`programacao-manha-${j}`).style.display = 'none';

    getID(`inner-programacao-tarde-${j}`).innerHTML = '';
    getID(`programacao-tarde-${j}`).style.display = 'none';

    getID(`inner-programacao-noite-${j}`).innerHTML = '';
    getID(`programacao-noite-${j}`).style.display = 'none';

    for (turno in INNER_PROGRAMACAO[key]) {
        const turnoDados = INNER_PROGRAMACAO[key][turno];
        for (let k = 1; k <= turnoDados.length; k++) {
            const dado = turnoDados[k - 1];
            const div = getID(`inner-programacao-${turno}-${j}`);

            if (dado.programacao) {
                let texto = dado.programacao;
                if (dado.inicio && dado.fim) {
                    texto = `<span class="time">${dado.inicio} - ${dado.fim}:</span> ${texto}`;
                } else if (dado.inicio) {
                    texto = `<span class="time">${dado.inicio}:</span> ${texto}`;
                }
                div.innerHTML += `<button id="inner-programacao-botao-${turno}-${j}-${k}" class="btn inner-programacao-botao" onclick="_openInnerProgramacao(${j}, ${k}, '${turno}')">
                                    ${texto}
                                  </button>`;
            }

            getID(`programacao-${turno}-${j}`).style.display = div.innerHTML ? 'block' : 'none';
        }
    }

}

function _openInnerProgramacao(j, k, turno) {
    const key = _jsDateToKey(DATAS[j - 1]);
    let isNew = (!k && !turno);

    const selects = _getInnerProgramacaoSelects(j);
    const title = `Adicionar Programação`;
    const content = `<div class="inner-programacao" id="inner-programacao-box">
                      <div id="inner-programacao-tela-principal">
                        <div class="nice-form-group">
                            <label>Atividade</label>
                            <input required class="nice-form-group" id="inner-programacao" type="text" placeholder="Ir para..." />
                        </div>
                        <div class="side-by-side-box-fixed">
                            <div class="nice-form-group side-by-side-fixed">
                            <label>
                                Início<br>
                                <span class="opcional">(Opcional)</span>
                            </label>
                            <input class="flex-input-50-50" id="inner-programacao-inicio" type="time">
                        </div>
                        <div class="nice-form-group side-by-side-fixed">
                            <label>
                            Fim<br>
                            <span class="opcional">(Opcional)</span>
                            </label>
                            <input class="flex-input-50-50" id="inner-programacao-fim" type="time">
                        </div>
                        </div>

                        <div class="nice-form-group">
                        <label>Turno</label>
                        <select class="editar-select" id="inner-programacao-select-turno">
                            <option value="madrugada">Madrugada</option>
                            <option value="manha">Manhã</option>
                            <option value="tarde">Tarde</option>
                            <option value="noite">Noite</option>
                        </select>
                        </div>

                        <div class="nice-form-group" style="display: ${selects.ativo ? 'block' : 'none'}">
                            <label style="margin-bottom: 0px;">Passeio Associado <span class="opcional">(Opcional)</span></label>
                            <button id="inner-programacao-passeio-associado" class="btn inner-programacao-botao")">
                                Adicionar Passeio
                            </button>
                        </div>  
                        
                        <div class="button-box-right" style="margin-top: 8px; margin-bottom: -18px; display: ${isNew ? 'none' : 'block'}">
                            <button onclick="_deleteInnerProgramacao(${j}, ${k}, '${turno}')" class="btn btn-basic btn-format">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
                                    <path fill="currentColor" fill-rule="evenodd" d="M8.106 2.553A1 1 0 0 1 9 2h6a1 1 0 0 1 .894.553L17.618 6H20a1 1 0 1 1 0 2h-1v11a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3V8H4a1 1 0 0 1 0-2h2.382l1.724-3.447ZM14.382 4l1 2H8.618l1-2h4.764ZM11 11a1 1 0 1 0-2 0v6a1 1 0 1 0 2 0v-6Zm4 0a1 1 0 1 0-2 0v6a1 1 0 1 0 2 0v-6Z" clip-rule="evenodd"></path>
                                </svg>
                            </button>
                        </div>
                      </div>
                      <div id="inner-programacao-tela-passeio-associado" style="display: none;">
                        <div class="nice-form-group"">
                            <label>Categoria <span class="opcional">(Opcional)</span></label>
                            <select class="editar-select" id="inner-programacao-select-categoria">
                                <option value="">Selecione</option>
                                ${selects.categoriaOptions}
                            </select>
                        </div>

                        <div class="nice-form-group" id="inner-programacao-select-passeio-box" style="margin-top: 16px; display: none">
                            <label>Passeio <span class="opcional">(Opcional)</span></label>
                            <select class="editar-select" id="inner-programacao-select-passeio">
                            </select>
                        </div>            
                      </div>
                    </div>`;

    const confirmAction = turno ? `_addInnerProgramacao(${j}, ${k}, '${turno}')` : `_addInnerProgramacao(${j})`;

    _displayInputModal(title, content, confirmAction);

    if (turno) {
        getID(`inner-programacao-select-turno`).value = turno;
    }

    if (!isNew && INNER_PROGRAMACAO && INNER_PROGRAMACAO[key] && INNER_PROGRAMACAO[key][turno] && INNER_PROGRAMACAO[key][turno][k - 1]) {
        const dados = INNER_PROGRAMACAO[key][turno][k - 1];

        getID(`inner-programacao`).value = dados.programacao;
        getID(`inner-programacao-inicio`).value = dados.inicio;
        getID(`inner-programacao-fim`).value = dados.fim;
        getID(`inner-programacao-select-categoria`).value = dados.passeio.categoria;
        getID(`inner-programacao-select-passeio`).value = dados.passeio.id;

        _loadInnerProgramacaoSelectPasseio(selects);
    }

    getID(`inner-programacao-inicio`).addEventListener('change', function (event) {
        const inicioValue = event.target.value;
        const hora = parseInt(inicioValue.split(':')[0]);
        const turnoValue = hora < 6 ? 'madrugada' : hora < 12 ? 'manha' : hora < 18 ? 'tarde' : 'noite';
        getID('inner-programacao-select-turno').value = turnoValue;
    });

    getID(`inner-programacao-fim`).addEventListener('change', function (event) {
        const fimValue = event.target.value;
        const fimHora = parseInt(fimValue.split(':')[0]);
        const fimMinuto = parseInt(fimValue.split(':')[1]);

        const inicioValue = getID(`inner-programacao-inicio`).value;
        const inicioHora = parseInt(inicioValue.split(':')[0]);
        const inicioMinuto = parseInt(inicioValue.split(':')[1]);

        if (fimHora < inicioHora || (fimHora == inicioHora && fimMinuto < inicioMinuto)) {
            getID(`inner-programacao-fim`).value = '';
            getID(`inner-programacao-fim`).reportValidity();
        }
    });

    getID(`inner-programacao-select-categoria`).addEventListener('change', () => _loadInnerProgramacaoSelectPasseio(selects));
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

function _loadInnerProgramacaoSelectPasseio(selects) {
    const categoriaValue = getID(`inner-programacao-select-categoria`).value;
    const passeio = getID(`inner-programacao-select-passeio-box`);
    const passeioSelect = getID(`inner-programacao-select-passeio`);

    if (categoriaValue && selects.passeioOptions[categoriaValue]) {
        passeioSelect.innerHTML = selects.passeioOptions[categoriaValue];
        passeio.style.display = 'block';
    } else {
        passeio.style.display = 'none';
    }
}

function _addInnerProgramacao(j, k, turno) {
    const key = _jsDateToKey(DATAS[j - 1]);
    const programacao = getID(`inner-programacao`);
    const isNew = (!k && !turno);

    if (!programacao.value) {
        programacao.reportValidity();
    } else {
        const result = {
            programacao: programacao.value,
            inicio: getID(`inner-programacao-inicio`).value,
            fim: getID(`inner-programacao-fim`).value,
            passeio: {
                categoria: getID(`inner-programacao-select-categoria`).value,
                id: getID(`inner-programacao-select-passeio`).value
            }
        };

        const inputTurno = getID(`inner-programacao-select-turno`).value;

        if (isNew) {
            INNER_PROGRAMACAO[key][inputTurno].push(result);
        } else if (turno == inputTurno) {
            INNER_PROGRAMACAO[key][turno][k - 1] = result;
        } else {
            INNER_PROGRAMACAO[key][inputTurno].push(result);
            INNER_PROGRAMACAO[key][turno].splice(k - 1, 1);
        }

        _loadInnerProgramacaoHTML(j);
        _closeDisplayMessage();
    }
}

function _deleteInnerProgramacao(j, k, turno) {
    const isNew = (!k && !turno);
    if (isNew) {
        _closeDisplayMessage();
        return;
    } else {
        const key = _jsDateToKey(DATAS[j - 1]);
        INNER_PROGRAMACAO[key][turno].splice(k - 1, 1);
        _loadInnerProgramacaoHTML(j);
        _closeDisplayMessage();
    }
}