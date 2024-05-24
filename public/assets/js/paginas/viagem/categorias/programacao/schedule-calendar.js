// ======= Schedule Calendar JS =======

var PROG_IS_HIDDEN = true;
var PROG_CURRENT_DAY = 0;
var PROG_CURRENT_MONTH = 0;
var PROG_CURRENT_YEAR = 0;
var SCHEDULE_CALENDAR;
var SHEET_SCHEDULE = [];

// ======= LOADERS =======
function _loadScheduleCalendar() {
    let result = FIRESTORE_DATA.programacoes.programacao;

    for (let i = 0; i < result.length; i++) {
        const date = _convertFromFirestoreDate(FIRESTORE_DATA.programacoes.programacao[i].data)
        result[i].titulo = _getCalendarTitle(date) + _dateToTitle(date);
    }

    SCHEDULE_CALENDAR = result;
}

function _loadModalContentCalendar(prog) {
    let title = getID("progTitle");
    let manha = getID("pc1");
    let tarde = getID("pc2");
    let noite = getID("pc3");

    manha.innerHTML = "";
    tarde.innerHTML = "";
    noite.innerHTML = "";

    title.innerHTML = prog["titulo"];

    _setModalCalendarInnerHTML(manha, prog["manha"]);
    _setModalCalendarInnerHTML(tarde, prog["tarde"]);
    _setModalCalendarInnerHTML(noite, prog["noite"]);

    _adaptModalCalendarInnerHTML(manha, tarde, noite);
}

// ======= MODAL =======
function _openModalCalendar(prog) {
    _loadModalContentCalendar(prog);
    $("#prog").show()
    setTimeout(() => {
        getID("prog").classList.toggle('show')
    }, 100);

}

function _closeModalCalendar() {
    PROG_IS_HIDDEN = true;
    getID("prog").classList.toggle('show')
    setTimeout(() => {
        $("#prog").hide()
    }, 300);

}

function _reloadModalCalendar(prog) {
    getID("progContent").classList.toggle('show');
    setTimeout(() => {
        _loadModalContentCalendar(prog);
        getID("progContent").classList.toggle('show');
    }, 300);
}

// ======= GETTERS =======
function _getScheduleCalendarByDate(stringDayMonth) {
    if (stringDayMonth) {
        const day = parseInt(stringDayMonth.split("/")[0]);
        const month = parseInt(stringDayMonth.split("/")[1]);
        const year = parseInt(stringDayMonth.split("/")[2]);

        const date = new Date(year, month - 1, day);

        if (day == PROG_CURRENT_DAY && month == PROG_CURRENT_MONTH && year == PROG_CURRENT_YEAR) {
            PROG_CURRENT_DAY = 0;
            PROG_CURRENT_MONTH = 0;
            PROG_CURRENT_YEAR = 0;
            if (day != 0) {
                _closeModalCalendar();
            }
        } else {
            PROG_CURRENT_DAY = day;
            PROG_CURRENT_MONTH = month;
            PROG_CURRENT_YEAR = year;
            if (day != 0) {
                for (let i = 0; i < SCHEDULE_CALENDAR.length; i++) {
                    var currentDate = _convertFromFirestoreDate(SCHEDULE_CALENDAR[i].data);
                    if (currentDate.getDate() == day && currentDate.getMonth() == month - 1 && currentDate.getFullYear() == year){
                        if (PROG_IS_HIDDEN) {
                            PROG_IS_HIDDEN = false;
                            _openModalCalendar(SCHEDULE_CALENDAR[i]);
                        } else {
                            _reloadModalCalendar(SCHEDULE_CALENDAR[i]);
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
function _setModalCalendarInnerHTML(element, prog) {
    for (let i = 0; i < prog.length; i++) {
        if (prog[i] != "" && prog[i] != "-") {
            element.innerHTML += `<li>${prog[i]}</li>`;
        }
    }
}

// ======= CONVERTERS =======
function _adaptModalCalendarInnerHTML(manha, tarde, noite) {
    let innerM = manha.innerHTML;
    let innerT = tarde.innerHTML;
    let innerN = noite.innerHTML;

    if (innerM && innerT && innerN) {
        getID("progHorarioM").style.display = "block";
        getID("progHorarioT").style.display = "block";
        getID("progHorarioN").style.display = "block";
        getID("progNoData").style.display = "none";
    } else {
        if (innerM) {
            getID("progHorarioM").style.display = "block";
            getID("progNoData").style.display = "none";
        } else {
            getID("progHorarioM").style.display = "none";
        }
        if (innerT) {
            getID("progHorarioT").style.display = "block";
            getID("progNoData").style.display = "none";
        } else {
            getID("progHorarioT").style.display = "none";
        }
        if (innerN) {
            getID("progHorarioN").style.display = "block";
            getID("progNoData").style.display = "none";
        } else {
            getID("progHorarioN").style.display = "none";
        }
        if (!innerM && !innerT && !innerN) {
            getID("progNoData").style.display = "block";
        }
    }
}

function _getCalendarTitle(date) {
    const programacao = FIRESTORE_DATA.programacoes.programacao;
    for (let i = 0; i < programacao.length; i++) {
        const currentDate = _convertFromFirestoreDate(programacao[i].data);
        if (currentDate.getDate() == date.getDate() && currentDate.getMonth() == date.getMonth() && currentDate.getFullYear() == date.getFullYear()) {
            const titulo = programacao[i].titulo;
            const isDate = titulo.split(' de ').length === 3 && !isNaN(titulo.split(' de ')[0]) && !isNaN(titulo.split(' de ')[2]);
            if (!titulo || titulo[titulo.length - 1] == ":" || isDate) {
                return titulo;
            } else return `${titulo}: `;
        }
    }
    return "";
}