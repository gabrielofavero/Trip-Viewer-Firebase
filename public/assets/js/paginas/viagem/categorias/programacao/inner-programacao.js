var PROGRAMACAO_ABERTA = false;
var PROGRAMACAO_ATUAL_DATA = {
    dia: 0,
    mes: 0,
    ano: 0
};
var PROGRAMACAO_ATUAL = null;
var INNER_PROGRAMACAO_ATUAL = [];

function _loadModalContentCalendar() {
    let titulo = PROGRAMACAO_ATUAL.titulo;
    const data = _getDateTitle(_convertFromDateObject(PROGRAMACAO_ATUAL.data));
    let programacaoDestinos = [];

    if (FIRESTORE_DATA.modulos.destinos && DESTINOS && DESTINOS.length > 0) {
        const destinosIDs = DESTINOS.map(destino => destino.destinosID);
        for (const destinoID of PROGRAMACAO_ATUAL.destinosIDs) {
            programacaoDestinos.push(destinoID.titulo);
        }

        const index = destinosIDs.indexOf(titulo?.valor || titulo);
        if (index >= 0) {
            titulo = DESTINOS[index].destinos.titulo;
        }
    }

    getID("programacao-titulo").querySelector('.titulo').innerText = _getProgramacaoTitulo(titulo, programacaoDestinos);
    getID("programacao-data").innerText = data;

    INNER_PROGRAMACAO_ATUAL = [];

    _loadInnerProgramacaoHTML();

    // Helpers
    function _getProgramacaoTitulo(titulo, destinos) {
        if (!titulo?.valor) {
            return titulo || translate('trip.itinerary.title')
        }

        if (titulo.destinos) {
            return _getAndDestinationTitle(titulo.valor, destinos);
        }

        if (titulo.traduzir) {
            return translate(`trip.transportation.${titulo.valor}`);
        }

        return translate('trip.itinerary.title');
    }

    function _loadInnerProgramacaoHTML() {
        const shouldShowCheckbox = _shouldShowCheckbox();
        getID("innner-programacao-travelers-checkboxes").style.display = shouldShowCheckbox ? '': 'none';

        if (shouldShowCheckbox) {
            _loadProgramacaoTravelersCheckboxes();
            _loadProgramacaoTravelersCheckboxAction();
            return;
        }

        _setModalCalendarInnerHTML(getID("programacao-itens-madrugada"), PROGRAMACAO_ATUAL.madrugada);
        _setModalCalendarInnerHTML(getID("programacao-itens-manha"), PROGRAMACAO_ATUAL.manha);
        _setModalCalendarInnerHTML(getID("programacao-itens-tarde"), PROGRAMACAO_ATUAL.tarde);
        _setModalCalendarInnerHTML(getID("programacao-itens-noite"), PROGRAMACAO_ATUAL.noite);

        _adaptModalCalendarInnerHTML();
    }

    function _shouldShowCheckbox() {
        if (!PROGRAMACAO_ATUAL || !TRAVELERS?.length) return false;

        const periods = ['madrugada', 'manha', 'tarde', 'noite'];
        const combinations = new Set();

        for (const period of periods) {
            const items = PROGRAMACAO_ATUAL[period] || [];

            for (const item of items) {
                const presentes = (item.pessoas || [])
                    .filter(p => p.isPresent)
                    .map(p => p.id)
                    .sort();

                const key = presentes.join('|');

                combinations.add(key);
            }
        }

        if (combinations.size <= 1) {
            return false;
        }

        return true;
    }

}

function _openModalCalendar(programacao) {
    PROGRAMACAO_ATUAL = programacao;
    _loadModalContentCalendar();
    $("#programacao-box").show()
    setTimeout(() => {
        getID("programacao-box").classList.toggle('show')
    }, 100);

}

function _closeModalCalendar() {
    PROGRAMACAO_ABERTA = false;
    PROGRAMACAO_ATUAL = null;
    PROGRAMACAO_ATUAL_DATA.dia = 0;
    PROGRAMACAO_ATUAL_DATA.mes = 0;
    PROGRAMACAO_ATUAL_DATA.ano = 0;

    getID("programacao-box").classList.toggle('show')
    setTimeout(() => {
        $("#programacao-box").hide()
    }, 300);

}

function _reloadModalCalendar(programacao) {
    PROGRAMACAO_ATUAL = programacao;
    getID("programacao-modal").classList.toggle('show');
    setTimeout(() => {
        _loadModalContentCalendar();
        getID("programacao-modal").classList.toggle('show');
    }, 300);
}

function _displayInnerProgramacaoMessage(index, container = 'programacao-container') {
    const propriedades = _cloneObject(MENSAGEM_PROPRIEDADES);
    propriedades.titulo = INNER_PROGRAMACAO_ATUAL[index].titulo;
    propriedades.conteudo = INNER_PROGRAMACAO_ATUAL[index].content;
    propriedades.botoes = [];
    propriedades.containers.principal = container;

    _displayFullMessage(propriedades);

    switch (INNER_PROGRAMACAO_ATUAL[index].tipo) {
        case 'hospedagens':
            _loadImageLightbox('programacao-galeria');
            break;
        case 'destinos':
            if (INNER_PROGRAMACAO_ATUAL[index].midia) {
                _loadInnerProgramacaoMidia(INNER_PROGRAMACAO_ATUAL[index].midia);
            }
    }
}

function _loadInnerProgramacaoMidia(midia) {
    getID('midia-1').innerHTML = _getLinkMediaButton(midia);
}

// Getters
function _loadCalendarItem(dataString) {
    if (dataString) {
        const day = parseInt(dataString.split("/")[0]);
        const month = parseInt(dataString.split("/")[1]);
        const year = parseInt(dataString.split("/")[2]);

        if (day != 0 && day == PROGRAMACAO_ATUAL_DATA.dia && month == PROGRAMACAO_ATUAL_DATA.mes && year == PROGRAMACAO_ATUAL_DATA.ano) {
            _closeModalCalendar();
        } else {
            PROGRAMACAO_ATUAL_DATA.dia = day;
            PROGRAMACAO_ATUAL_DATA.mes = month;
            PROGRAMACAO_ATUAL_DATA.ano = year;
            if (day != 0) {
                for (let i = 0; i < FIRESTORE_DATA.programacoes.length; i++) {
                    var currentDate = _convertFromDateObject(FIRESTORE_DATA.programacoes[i].data);
                    if (currentDate.getDate() == day && currentDate.getMonth() == month - 1 && currentDate.getFullYear() == year) {
                        if (!PROGRAMACAO_ABERTA) {
                            PROGRAMACAO_ABERTA = true;
                            _openModalCalendar(FIRESTORE_DATA.programacoes[i]);
                        } else {
                            _reloadModalCalendar(FIRESTORE_DATA.programacoes[i]);
                        }
                        break;
                    }
                }
            }
        }

    } else {
        console.warn("No data string provided to load calendar item.");
    }
}

function _getInnerProgramacaoHTML(item) {
    const innerProgramacao = {
        tipo: item?.tipo,
        titulo: '',
        content: '',
        midia: ''
    }
    let container = 'programacao-container'
    let index = -1;
    switch (item?.tipo) {
        case 'transporte':
            if (FIRESTORE_DATA.modulos.transportes === true && item.id) {
                index = FIRESTORE_DATA.transportes.dados.map(programacao => programacao.id).indexOf(item.id);
                if (index >= 0) {
                    const transporte = FIRESTORE_DATA.transportes.dados[index];
                    innerProgramacao.titulo = `${transporte.pontos.partida} → ${transporte.pontos.chegada}`;
                    innerProgramacao.content = _getFlightBoxHTML(index + 1, 'inner-programacao', true);
                }
            }
            break;
        case 'hospedagens':
            if (FIRESTORE_DATA.modulos.hospedagens === true && item.id) {
                index = FIRESTORE_DATA.hospedagens.map(hospedagem => hospedagem.id).indexOf(item.id);
                if (index >= 0) {
                    innerProgramacao.titulo = "";
                    innerProgramacao.content = _getHospedagensHTML(index, true);
                }
            }
            break;
        case 'destinos':
            container = 'destinos-container';
            if (FIRESTORE_DATA.modulos.destinos === true && item.local && item.categoria && item.id) {
                const destinosIDs = DESTINOS.map(destino => destino.destinosID);
                index = destinosIDs.indexOf(item.local);
                if (index > -1) {
                    const destino = DESTINOS[index].destinos;
                    const destinoItens = destino[item.categoria];
                    if (destinoItens && Object.keys(destinoItens).length) {
                        const destinoItem = destinoItens[item.id];
                        if (destinoItem) {
                            innerProgramacao.titulo = _getTitulo(destinoItem);
                            innerProgramacao.content = _getDestinosBoxHTML({
                                j: 1,
                                id: item.id,
                                item: destinoItem,
                                innerProgramacao: true,
                                valores: _getDestinoValores(DESTINOS[index]),
                                moeda: destino.moeda
                            });
                            innerProgramacao.midia = destinoItem?.midia;
                        }
                    }
                }
            }
    }

    if (index >= 0) {
        INNER_PROGRAMACAO_ATUAL.push(innerProgramacao);
        return `<i class="iconify external-link" data-icon="tabler:external-link" onclick="_displayInnerProgramacaoMessage(${INNER_PROGRAMACAO_ATUAL.length - 1}, '${container}')"></i>`
    }

    return '';
}

// Setters
function _setModalCalendarInnerHTML(div, programacao) {
    div.innerHTML = "";
    for (let i = 0; i < programacao.length; i++) {
        if (programacao[i].programacao) {
            div.innerHTML += `<div>
                                <i class="bi bi-chevron-right color-icon"></i>
                                ${_getInnerProgramacaoTitleHTML(programacao[i], 'programacao-item')}
                                ${_getInnerProgramacaoHTML(programacao[i].item)}
                              </div>`;
        }
    }
}

// Converters
function _adaptModalCalendarInnerHTML() {
    const madrugada = getID("programacao-itens-madrugada");
    const manha = getID("programacao-itens-manha");
    const tarde = getID("programacao-itens-tarde");
    const noite = getID("programacao-itens-noite");

    getID("programacao-madrugada").style.display = madrugada.innerHTML ? "block" : "none";
    getID("programacao-manha").style.display = manha.innerHTML ? "block" : "none";
    getID("programacao-tarde").style.display = tarde.innerHTML ? "block" : "none";
    getID("programacao-noite").style.display = noite.innerHTML ? "block" : "none";
    getID("sem-programacao").style.display = (madrugada.innerHTML || manha.innerHTML || tarde.innerHTML || noite.innerHTML) ? "none" : "block";
}

// Custom Checkboxes
function _loadProgramacaoTravelersCheckboxes() {
    const container = getID("innner-programacao-travelers-checkboxes");
    container.innerHTML = "";

    if (!TRAVELERS?.length) {
        return;
    }

    for (const traveler of TRAVELERS) {
        const id = `trav-${traveler.id}`;

        container.innerHTML += `
            <label class="checkbox-item">
                <input 
                    type="checkbox" 
                    id="${id}" 
                    value="${traveler.id}" 
                    checked
                >
                ${traveler.nome}
            </label>
        `;
    }

    // Listen for any checkbox toggle
    container.addEventListener("change", _loadProgramacaoTravelersCheckboxAction);
}

function _filterInnerProgramacoesByTravelers(list, selectedIds) {
    if (!selectedIds.length || selectedIds.length === TRAVELERS.length) {
        return list;
    }

    return list.filter(item => {
        const presentes = item.pessoas
            .filter(p => p.isPresent)
            .map(p => p.id);

        return selectedIds.some(id => presentes.includes(id));
    });
}

function _loadProgramacaoTravelersCheckboxAction() {
    const container = getID("innner-programacao-travelers-checkboxes");
    const selectedIds = [...container.querySelectorAll("input[type='checkbox']:checked")].map(i => i.value);

    const madrugada = _filterInnerProgramacoesByTravelers(PROGRAMACAO_ATUAL.madrugada, selectedIds);
    const manha = _filterInnerProgramacoesByTravelers(PROGRAMACAO_ATUAL.manha, selectedIds);
    const tarde = _filterInnerProgramacoesByTravelers(PROGRAMACAO_ATUAL.tarde, selectedIds);
    const noite = _filterInnerProgramacoesByTravelers(PROGRAMACAO_ATUAL.noite, selectedIds);

    _setModalCalendarInnerHTML(getID("programacao-itens-madrugada"), madrugada);
    _setModalCalendarInnerHTML(getID("programacao-itens-manha"), manha);
    _setModalCalendarInnerHTML(getID("programacao-itens-tarde"), tarde);
    _setModalCalendarInnerHTML(getID("programacao-itens-noite"), noite);

    _adaptModalCalendarInnerHTML();
}
