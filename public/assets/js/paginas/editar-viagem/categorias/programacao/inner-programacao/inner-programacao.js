var INNER_PROGRAMACAO = {};

// Carregamento Principal
function _loadInnerProgramacaoHTML(j) {
    const key = _jsDateToKey(DATAS[j - 1]);
    if (Object.keys(INNER_PROGRAMACAO).length == 0 || !INNER_PROGRAMACAO[key]) return;

    getID(`inner-programacao-madrugada-${j}`).innerHTML = '';
    getID(`inner-programacao-manha-${j}`).innerHTML = '';
    getID(`inner-programacao-tarde-${j}`).innerHTML = '';
    getID(`inner-programacao-noite-${j}`).innerHTML = '';

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
                div.innerHTML += `<div class="input-botao-container">
                                    <button id="input-botao-${turno}-${j}-${k}" class="btn input-botao draggable" onclick="_openInnerProgramacao(${j}, ${k}, '${turno}')">
                                        ${texto}
                                    </button>
                                    <i class="iconify drag-icon" data-icon="mdi:drag"></i>
                                </div>`;
            }

            getID(`programacao-${turno}-${j}`).style.display = div.innerHTML ? 'block' : 'none';
        }
    }

}

// Carregamento Interno (Modal)
function _openInnerProgramacao(j, k, turno) {
    const selects = _getInnerProgramacaoSelects(j);
    const isNew = (!k && !turno);

    const propriedades = _cloneObject(MENSAGEM_PROPRIEDADES);
    propriedades.titulo = _getInnerProgramacaoTitle(j);
    propriedades.containers = _getContainersInput();
    propriedades.conteudo = _getInnerProgramacaoContent(j, k, turno, selects, isNew);
    propriedades.icones = [{ tipo: 'voltar', acao: `_closeInnerProgramacao(${j})` }];
    propriedades.botoes = [{
        tipo: 'cancelar',
    }, {
        tipo: 'confirmar',
        acao: turno ? `_addInnerProgramacao(${j}, ${k}, '${turno}')` : `_addInnerProgramacao(${j})`
    }];

    _displayFullMessage(propriedades);

    if (selects?.destinos?.locais && Object.keys(selects.destinos.locais).length === 1) {
        getID('inner-programacao-item-destinos-local').style.display = 'none';
        getID('inner-programacao-item-destinos-radio-label').innerText = _getSelectCurrentLabel(getID(`inner-programacao-select-local`));
    }

    _loadInnerProgramacaoListeners(selects);
    _loadInnerProgramacaoCurrentData(j, k, turno, selects, isNew);
    _loadInnerProgramacaoEventListeners();
}

// Selects
function _getInnerProgramacaoSelects(j) {
    return {
        transporte: _getInnerProgramacaoSelect('transporte'),
        hospedagens: _getInnerProgramacaoSelect('hospedagens'),
        destinos: _getInnerProgramacaoSelectsDestinos(j),
    }
}

function _getInnerProgramacaoSelect(tipo) {
    let ativo = false;
    let options = '';

    if (getID(`habilitado-${tipo}`).checked === true) {
        for (const j of _getJs(`${tipo}-box`)) {
            const label = getID(`${tipo}-title-${j}`).innerText;
            const id = getID(`${tipo}-id-${j}`).value;
            if (id && label) {
                ativo = true;
                options += `<option value="${id}">${label}</option>`;
            }
        }
    }

    return {
        ativo: ativo,
        options: options
    };
}

function _getInnerProgramacaoSelectsDestinos(j) {
    const destinoFromCheckbox = _getDestinosFromCheckbox('programacao', j);
    const idsAtivos = DESTINOS_ATIVOS.map(destino => destino.destinosID);
    const todosIds = DESTINOS.map(destino => destino.code);
    if (getID('habilitado-destinos').checked === false || DESTINOS_ATIVOS.length === 0 || destinoFromCheckbox.length === 0) {
        return {
            ativo: false,
        };
    };

    let result = {
        ativo: true,
        localOptions: '',
        locais: {}
    };

    let localOptions = '';
    let ativo = false;

    for (const destino of destinoFromCheckbox) {
        const currentID = destino.destinosID;
        if (!idsAtivos.includes(currentID)) continue;

        const index = todosIds.findIndex(destino => destino == currentID);
        if (index > -1) {
            ativo = true;
            localOptions += `<option value="${currentID}">${destino.titulo}</option>`;
            let innerResult = {};

            const currentDestinoData = DESTINOS[index].data;
            const passeios = CONFIG.destinos.categorias.passeios;

            let categorias = Object.keys(currentDestinoData).filter(key => passeios.includes(key) && currentDestinoData[key].length > 1);
            categorias = categorias.sort((a, b) => passeios.indexOf(a) - passeios.indexOf(b));
            const categoriaOptions = categorias.map(categoria => `<option value="${categoria}">${DESTINOS_TITULOS[categoria]}</option>`).join('');
            innerResult.categoriaOptions = categoriaOptions;

            let passeioOptions = {};
            for (const categoria of categorias) {
                const passeios = currentDestinoData[categoria].sort((a, b) => a.nome.localeCompare(b.nome));
                passeioOptions[categoria] = passeios.map(passeio => `<option value="${passeio.id}">${passeio.nome}</option>`).join('');
            }
            innerResult.passeioOptions = passeioOptions;

            result.locais[currentID] = innerResult;
        }
    }

    result.localOptions = localOptions;
    result.ativo = ativo;
    return result;
}

// Carrega dados atuais no Modal
function _loadInnerProgramacaoCurrentData(j, k, turno, selects, isNew) {
    if (turno) {
        getID(`inner-programacao-select-turno`).value = turno;
    }

    const key = _jsDateToKey(DATAS[j - 1]);
    if (!isNew && INNER_PROGRAMACAO && INNER_PROGRAMACAO[key] && INNER_PROGRAMACAO[key][turno] && INNER_PROGRAMACAO[key][turno][k - 1]) {
        const dados = INNER_PROGRAMACAO[key][turno][k - 1];
        const itemAssociado = getID('inner-programacao-item-associado');

        getID(`inner-programacao`).value = dados.programacao;
        getID(`inner-programacao-inicio`).value = dados.inicio;
        getID(`inner-programacao-fim`).value = dados.fim;

        switch (dados?.item?.tipo) {
            case 'transporte':
                getID(`inner-programacao-item-transporte-radio`).checked = true;
                getID(`inner-programacao-item-transporte`).style.display = 'block';
                getID(`inner-programacao-select-transporte`).value = dados.item.id;
                itemAssociado.innerText = _getSelectCurrentLabel(getID(`inner-programacao-select-transporte`));
                break;
            case 'hospedagens':
                getID(`inner-programacao-item-hospedagens-radio`).checked = true;
                getID(`inner-programacao-item-hospedagens`).style.display = 'block';
                getID(`inner-programacao-select-hospedagens`).value = dados.item.id;
                itemAssociado.innerText = _getSelectCurrentLabel(getID(`inner-programacao-select-hospedagens`));
                break;
            case 'destinos':
                getID(`inner-programacao-item-destinos-radio`).checked = true;
                getID('inner-programacao-item-destinos').style.display = 'block';

                getID(`inner-programacao-select-local`).value = dados.item.local
                getID(`inner-programacao-select-categoria`).value = dados.item.categoria;
                _innerProgramacaoSelectCategoriaAction(selects);

                const passeio = getID(`inner-programacao-select-passeio`);
                passeio.value = dados.item.id;
                if (passeio.value) {
                    itemAssociado.innerText = _getSelectCurrentLabel(getID(`inner-programacao-select-passeio`));
                }
                break;
            default:
                getID(`inner-programacao-item-nenhum-radio`).checked = true;
        }
    }
}

// Navegação do Modal
function _openInnerProgramacaoItem() {
    const height = getID('inner-programacao-tela-principal').offsetHeight;
    const itemSelecionar = getID('inner-programacao-item-selecionar');
    itemSelecionar.style.minHeight = `${height}px`;

    if (getID('inner-programacao').value) {
        getID('message-title').innerText = 'Associar Item';
    }

    _animate(['inner-programacao-item-selecionar'], ['inner-programacao-tela-principal'])
    getID('back-icon').style.visibility = 'visible';
}

function _openInnerProgramacaoTroca(j) {
    const height = getID('inner-programacao-tela-principal').offsetHeight;
    const itemTrocar = getID('inner-programacao-item-trocar');
    itemTrocar.style.minHeight = `${height}px`;

    getID('message-title').innerText = "Trocar Programação";
    _animate(['inner-programacao-item-trocar'], ['inner-programacao-tela-principal'])
    getID('back-icon').style.visibility = 'visible';
}

function _closeInnerProgramacao(j) {
    if (getID('inner-programacao-item-selecionar').style.display === 'block') {
        const itemAssociado = getID('inner-programacao-item-associado');
        if (getID('inner-programacao-item-transporte-radio').checked) {
            itemAssociado.innerText = _getSelectCurrentLabel(getID(`inner-programacao-select-transporte`));
        } else if (getID('inner-programacao-item-hospedagens-radio').checked) {
            itemAssociado.innerText = _getSelectCurrentLabel(getID(`inner-programacao-select-hospedagens`));
        } else if (getID('inner-programacao-item-destinos-radio').checked) {
            itemAssociado.innerText = _getSelectCurrentLabel(getID(`inner-programacao-select-passeio`));
        } else {
            itemAssociado.innerText = 'Associar Item';
        }

        getID('message-title').innerText = _getInnerProgramacaoTitle(j);
        getID('back-icon').style.visibility = 'hidden';

        _replaceTitleIfEnabled();

        _animate(['inner-programacao-tela-principal'], ['inner-programacao-item-selecionar'])

    } else if (getID('inner-programacao-item-trocar').style.display === 'block') {
        getID('message-title').innerText = _getInnerProgramacaoTitle(j);
        getID('back-icon').style.visibility = 'hidden';
        _animate(['inner-programacao-tela-principal'], ['inner-programacao-item-trocar'])
    }
}

function _getInnerProgramacaoTitle(j) {
    const data = DATAS[j - 1];
    return `${_dateToDayOfTheWeek(data)}, ${_jsDateToDate(data)}`;
}

// Salvar / Deletar dados do Modal
function _addInnerProgramacao(j, k, turno) {
    const key = _jsDateToKey(DATAS[j - 1]);
    const programacao = getID(`inner-programacao`);
    const isNew = (!k && !turno);

    if (!programacao.value) {
        programacao.reportValidity();
    } else {
        _replaceTitleIfEnabled();
        let item = {
            tipo: '',
            id: '',
            local: '',
            categoria: ''
        };

        if (getID('inner-programacao-item-transporte-radio').checked && getID(`inner-programacao-select-transporte`).value) {
            item.tipo = 'transporte';
            item.id = getID(`inner-programacao-select-transporte`).value;
        } else if (getID('inner-programacao-item-hospedagens-radio').checked && getID(`inner-programacao-select-hospedagens`).value) {
            item.tipo = 'hospedagens';
            item.id = getID(`inner-programacao-select-hospedagens`).value;
        } else if (getID('inner-programacao-item-destinos-radio').checked && getID(`inner-programacao-select-passeio`).value) {
            item.tipo = 'destinos';
            item.local = getID(`inner-programacao-select-local`).value;
            item.id = getID(`inner-programacao-select-passeio`).value;
            item.categoria = getID(`inner-programacao-select-categoria`).value;
        }

        const result = {
            programacao: programacao.value,
            inicio: getID(`inner-programacao-inicio`).value,
            fim: getID(`inner-programacao-fim`).value,
            item: item
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
        _closeMessage();
    }
}

function _deleteInnerProgramacao(j, k, turno) {
    const isNew = (!k && !turno);
    if (isNew) {
        _closeMessage();
        return;
    } else {
        const key = _jsDateToKey(DATAS[j - 1]);
        INNER_PROGRAMACAO[key][turno].splice(k - 1, 1);
        _loadInnerProgramacaoHTML(j);
        _closeMessage();
    }
}

// Listeners
function _loadInnerProgramacaoListeners(selects) {
    const itemTransporte = getID(`inner-programacao-item-transporte`);
    const itemHospedagens = getID(`inner-programacao-item-hospedagens`);
    const itemDestinos = getID(`inner-programacao-item-destinos`);

    getID(`inner-programacao-item-transporte-radio`).addEventListener('change', () => {
        itemTransporte.style.display = 'block';
        itemHospedagens.style.display = 'none';
        itemDestinos.style.display = 'none';
    });

    getID(`inner-programacao-item-hospedagens-radio`).addEventListener('change', () => {
        itemTransporte.style.display = 'none';
        itemHospedagens.style.display = 'block';
        itemDestinos.style.display = 'none';
    });

    getID(`inner-programacao-item-destinos-radio`).addEventListener('change', () => {
        itemTransporte.style.display = 'none';
        itemHospedagens.style.display = 'none';
        itemDestinos.style.display = 'block';
    });

    getID(`inner-programacao-item-nenhum-radio`).addEventListener('change', () => {
        itemTransporte.style.display = 'none';
        itemHospedagens.style.display = 'none';
        itemDestinos.style.display = 'none';
    });

    getID(`inner-programacao-select-local`).addEventListener('change', () => {
        _innerProgramacaoSelectLocalAction(selects);
    });

    getID(`inner-programacao-select-categoria`).addEventListener('change', () => {
        _innerProgramacaoSelectCategoriaAction(selects);
    });

    _innerProgramacaoSelectLocalAction(selects);
}

function _innerProgramacaoSelectLocalAction(selects) {
    const selectLocal = getID('inner-programacao-select-local');
    const selectCategoria = getID('inner-programacao-select-categoria');
    const selectPasseio = getID('inner-programacao-select-passeio');

    if (selectLocal.value && selects.destinos.locais[selectLocal.value]) {
        selectCategoria.innerHTML = '<option value="">Selecione</option>' + selects.destinos.locais[selectLocal.value].categoriaOptions;
    } else {
        selectCategoria.innerHTML = '<option value="">Selecione um Local</option>';
        selectPasseio.innerHTML = '<option value="">Selecione uma Categoria</option>';
    }

    selectCategoria.addEventListener('change', () => {
        _innerProgramacaoSelectCategoriaAction(selects);
    });
}

function _innerProgramacaoSelectCategoriaAction(selects) {
    const selectLocal = getID('inner-programacao-select-local');
    const selectCategoria = getID('inner-programacao-select-categoria');
    const selectPasseio = getID('inner-programacao-select-passeio');

    if (selectLocal.value && selectCategoria.value && selects.destinos.locais[selectLocal.value].passeioOptions[selectCategoria.value]) {
        selectPasseio.innerHTML = '<option value="">Selecione</option>' + selects.destinos.locais[selectLocal.value].passeioOptions[selectCategoria.value];
    } else {
        selectPasseio.innerHTML = '<option value="">Selecione uma Categoria</option>';
    }
}

function _loadInnerProgramacaoEventListeners() {
    getID('inner-programacao-inicio').addEventListener('change', function (event) {
        const inicioValue = event.target.value;
        const inicioHora = parseInt(inicioValue.split(':')[0]);
        getID('inner-programacao-select-turno').value = inicioHora < 6 ? 'madrugada' : inicioHora < 12 ? 'manha' : inicioHora < 18 ? 'tarde' : 'noite';
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
}