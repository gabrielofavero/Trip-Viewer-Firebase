var PROGRAMACAO_ABERTA = false;
var PROGRAMACAO_ATUAL = {
    dia: 0,
    mes: 0,
    ano: 0
};

// ======= LOADERS =======
function _loadModalContentCalendar(programacao) {
    let titulo = programacao.titulo;
    const data = _dateToTitle(_convertFromFirestoreDate(programacao.data));

    if (FIRESTORE_DATA.modulos.destinos && DESTINOS && DESTINOS.length > 0) {
        const destinosIDs = DESTINOS.map(destino => destino.destinosID);
        const index = destinosIDs.indexOf(titulo);
        if (index >= 0) {
            titulo = DESTINOS[index].destinos.titulo;
        }
    }

    getID("programacao-titulo").innerText = titulo || "Programação";
    getID("programacao-data").innerText = data;

    _setModalCalendarInnerHTML(getID("programacao-itens-madrugada"), programacao.madrugada);
    _setModalCalendarInnerHTML(getID("programacao-itens-manha"), programacao.manha);
    _setModalCalendarInnerHTML(getID("programacao-itens-tarde"), programacao.tarde);
    _setModalCalendarInnerHTML(getID("programacao-itens-noite"), programacao.noite);

    _adaptModalCalendarInnerHTML();
}

// ======= MODAL =======
function _openModalCalendar(programacao) {
    _loadModalContentCalendar(programacao);
    $("#programacao-box").show()
    setTimeout(() => {
        getID("programacao-box").classList.toggle('show')
    }, 100);

}

function _closeModalCalendar() {
    PROGRAMACAO_ABERTA = false;
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

// ======= GETTERS =======
function _getScheduleCalendarByDate(dataString) {
    if (dataString) {
        const day = parseInt(dataString.split("/")[0]);
        const month = parseInt(dataString.split("/")[1]);
        const year = parseInt(dataString.split("/")[2]);

        if (day == PROGRAMACAO_ATUAL.dia && month == PROGRAMACAO_ATUAL.mes && year == PROGRAMACAO_ATUAL.ano) {
            PROGRAMACAO_ATUAL.dia = 0;
            PROGRAMACAO_ATUAL.mes = 0;
            PROGRAMACAO_ATUAL.ano = 0;
            if (day != 0) {
                _closeModalCalendar();
            }
        } else {
            PROGRAMACAO_ATUAL.dia = day;
            PROGRAMACAO_ATUAL.mes = month;
            PROGRAMACAO_ATUAL.ano = year;
            if (day != 0) {
                for (let i = 0; i < FIRESTORE_DATA.programacoes.length; i++) {
                    var currentDate = _convertFromFirestoreDate(FIRESTORE_DATA.programacoes[i].data);
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
        logger(WARN, "Sem dados para a data selecionada.")
    }
}

// ======= SETTERS =======
function _setModalCalendarInnerHTML(div, programacao) {
    div.innerHTML = "";
    for (let i = 0; i < programacao.length; i++) {
        if (programacao[i].programacao) {
            let horario = '';
            if (programacao[i].inicio && programacao[i].fim) {
                horario = `<strong>${programacao[i].inicio} - ${programacao[i].fim}: </strong>`;
            } else if (programacao[i].inicio) {
                horario = `<strong>${programacao[i].inicio}: </strong>`;
            }
            div.innerHTML += `<div>
                                <i class="bi bi-chevron-right color-icon"></i>
                                ${programacao[i].programacao} 
                              </div>`;
        }
    }
}

// ======= CONVERTERS =======
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