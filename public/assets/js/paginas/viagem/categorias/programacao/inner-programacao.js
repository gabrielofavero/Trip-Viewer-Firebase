var PROGRAMACAO_ABERTA = false;
var PROGRAMACAO_ATUAL = {
    dia: 0,
    mes: 0,
    ano: 0
};
var INNER_PROGRAMACAO_ATUAL = [];

// ======= LOADERS =======
function _loadModalContentCalendar(programacao) {
    let titulo = programacao.titulo;
    const data = _getDateTitle(_convertFromDateObject(programacao.data));
    let programacaoDestinos = [];

    if (FIRESTORE_DATA.modulos.destinos && DESTINOS && DESTINOS.length > 0) {
        const destinosIDs = DESTINOS.map(destino => destino.destinosID);
        for (const destinoID of programacao.destinosIDs) {
            programacaoDestinos.push(destinoID.titulo);
        }

        const index = destinosIDs.indexOf(titulo?.valor || titulo);
        if (index >= 0) {
            titulo = DESTINOS[index].destinos.titulo;
        }
    }

    getID("programacao-titulo").innerText = _getProgramacaoTitulo(titulo, programacaoDestinos);
    getID("programacao-data").innerText = data;

    INNER_PROGRAMACAO_ATUAL = [];

    _setModalCalendarInnerHTML(getID("programacao-itens-madrugada"), programacao.madrugada);
    _setModalCalendarInnerHTML(getID("programacao-itens-manha"), programacao.manha);
    _setModalCalendarInnerHTML(getID("programacao-itens-tarde"), programacao.tarde);
    _setModalCalendarInnerHTML(getID("programacao-itens-noite"), programacao.noite);

    _adaptModalCalendarInnerHTML();

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
}

// Modal
function _openModalCalendar(programacao) {
    _loadModalContentCalendar(programacao);
    $("#programacao-box").show()
    setTimeout(() => {
        getID("programacao-box").classList.toggle('show')
    }, 100);

}

function _closeModalCalendar() {
    PROGRAMACAO_ABERTA = false;
    PROGRAMACAO_ATUAL.dia = 0;
    PROGRAMACAO_ATUAL.mes = 0;
    PROGRAMACAO_ATUAL.ano = 0;

    getID("programacao-box").classList.toggle('show')
    setTimeout(() => {
        $("#programacao-box").hide()
    }, 300);

}

function _reloadModalCalendar(programacao) {
    getID("programacao-modal").classList.toggle('show');
    setTimeout(() => {
        _loadModalContentCalendar(programacao);
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
    if (!midia) return;
    const video = translate('trip.itinerary.media_button.video');
    const playlist = translate('trip.itinerary.media_button.playlist');

    let buttonText = `<i class="iconify" data-icon="lets-icons:video-fill"></i>${video}`;

    if (midia.includes('youtube') || midia.includes('youtu.be')) {
        buttonText = `<i class="iconify" data-icon="mdi:youtube"></i>${video}`;
    } else if (midia.includes('tiktok')) {
        buttonText = `<i class="iconify" data-icon="ic:baseline-tiktok"></i>${video}`;
    } else if (midia.includes('spotify')) {
        buttonText = `<i class="iconify" data-icon="mdi:spotify"></i>${playlist}`;
    } else if (midia.includes('instagram')) {
        buttonText = `<i class="iconify" data-icon="mdi:instagram"></i> ${video}`;
    }

    getID('midia-1').innerHTML = `<div class="button-box">
                                    <button class="btn btn-secondary btn-format" type="submit" onclick="window.open('${midia}', '_blank');">${buttonText}</button>
                                  </div>`
}

// Getters
function _loadCalendarItem(dataString) {
    if (dataString) {
        const day = parseInt(dataString.split("/")[0]);
        const month = parseInt(dataString.split("/")[1]);
        const year = parseInt(dataString.split("/")[2]);

        if (day != 0 && day == PROGRAMACAO_ATUAL.dia && month == PROGRAMACAO_ATUAL.mes && year == PROGRAMACAO_ATUAL.ano) {
            _closeModalCalendar();
        } else {
            PROGRAMACAO_ATUAL.dia = day;
            PROGRAMACAO_ATUAL.mes = month;
            PROGRAMACAO_ATUAL.ano = year;
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

function _getHorarioHTML(inicio, fim) {
    if (inicio && fim) {
        return `<span class='programacao-item'>${inicio} - ${fim}: </span>`;
    } else if (inicio) {
        return `<span class='programacao-item'>${inicio}: </span>`;
    }
    return '';
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
                let ids = DESTINOS.map(destino => destino.destinosID);
                const i = ids.indexOf(item.local);
                if (i > -1) {
                    const destino = DESTINOS[i].destinos;
                    const categoria = destino[item.categoria];
                    if (categoria && Object.keys(categoria).length > 0) {
                        const j = categoria.map(destino => destino.id).indexOf(item.id);
                        if (j > -1) {
                            index = j;
                            innerProgramacao.titulo = _getTitulo(categoria[j]);
                            innerProgramacao.content = _getDestinosBoxHTML({
                                j: 1,
                                item: categoria[j],
                                isLineup: false,
                                innerProgramacao: true,
                                notas: CONFIG.language.destination.scores,
                                valores: _getDestinoValores(DESTINOS[i]),
                                moeda: destino.moeda
                            });
                            innerProgramacao.midia = categoria[j]?.midia;
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
                                ${_getHorarioHTML(programacao[i].inicio, programacao[i].fim)}
                                ${programacao[i].programacao}
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
