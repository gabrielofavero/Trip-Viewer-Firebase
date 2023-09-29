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
        const date = _convertFirestoreDate(FIRESTORE_DATA.programacoes.programacao[i].data)
        result[i].titulo = _dateToTitle(date);
    }

    SCHEDULE_CALENDAR = result;
}

function _loadModalContentCalendar(prog) {
    let title = document.getElementById("progTitle");
    let manha = document.getElementById("pc1");
    let tarde = document.getElementById("pc2");
    let noite = document.getElementById("pc3");

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
        document.getElementById("prog").classList.toggle('show')
    }, 100);

}

function _closeModalCalendar() {
    PROG_IS_HIDDEN = true;
    document.getElementById("prog").classList.toggle('show')
    setTimeout(() => {
        $("#prog").hide()
    }, 300);

}

function _reloadModalCalendar(prog) {
    document.getElementById("progContent").classList.toggle('show');
    setTimeout(() => {
        _loadModalContentCalendar(prog);
        document.getElementById("progContent").classList.toggle('show');
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
                    const title = _dateToTitle(date);
                    if (SCHEDULE_CALENDAR[i]["titulo"] == title) {
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

// ======= CHECKERS =======
function _isScheduleCalendarHeader(array) {
    let result = false;
    if (array.length == 1) {
        let value = array[0];
        let div1 = value.split(":");
        let div2 = [];
        try {
            div2 = div1[1].split(",");
        } catch (error) { }
        if (div1.length == 2 && div2.length == 2) {
            result = true;
        }
    }
    return result;
}

// ======= CONVERTERS =======
function _returnIfNotUndefined(value) {
    if (value != undefined) {
        return value;
    } else return "";
}

function _titleToDateObject(title) {
    let month;
    let result = {
        "day": 0,
        "month": 0
    };
    let div1 = title.split(", ")[1].split(" de ");

    switch (div1[1]) {
        case "Janeiro":
            month = 1;
            break;
        case "Fevereiro":
            month = 2;
            break;
        case "Março":
            month = 3;
            break;
        case "Abril":
            month = 4;
            break;
        case "Maio":
            month = 5;
            break;
        case "Junho":
            month = 6;
            break;
        case "Julho":
            month = 7;
            break;
        case "Agosto":
            month = 8;
            break;
        case "Setembro":
            month = 9;
            break;
        case "Outubro":
            month = 10;
            break;
        case "Novembro":
            month = 11;
            break;
        case "Dezembro":
            month = 12;
    }

    result["day"] = div1[0];
    result["month"] = month;

    return result;
}

function _dateToTitle(date) {
    const day = date.getDate();
    const month = numberToMonth(date.getMonth() + 1);
    const year = date.getFullYear();
    return `${day} de ${month} de ${year}`;
}

function numberToMonth(number) {
    switch (number) {
        case 1:
            return "Janeiro";
        case 2:
            return "Fevereiro";
        case 3:
            return "Março";
        case 4:
            return "Abril";
        case 5:
            return "Maio";
        case 6:
            return "Junho";
        case 7:
            return "Julho";
        case 8:
            return "Agosto";
        case 9:
            return "Setembro";
        case 10:
            return "Outubro";
        case 11:
            return "Novembro";
        case 12:
            return "Dezembro";
        default:
            _logger(WARN, "Mês não encontrado: " + number + ".")
            return "?";
    }
}

function _adaptModalCalendarInnerHTML(manha, tarde, noite) {
    let innerM = manha.innerHTML;
    let innerT = tarde.innerHTML;
    let innerN = noite.innerHTML;

    if (innerM && innerT && innerN) {
        document.getElementById("progHorarioM").style.display = "block";
        document.getElementById("progHorarioT").style.display = "block";
        document.getElementById("progHorarioN").style.display = "block";
        document.getElementById("progNoData").style.display = "none";
    } else {
        if (innerM) {
            document.getElementById("progHorarioM").style.display = "block";
            document.getElementById("progNoData").style.display = "none";
        } else {
            document.getElementById("progHorarioM").style.display = "none";
        }
        if (innerT) {
            document.getElementById("progHorarioT").style.display = "block";
            document.getElementById("progNoData").style.display = "none";
        } else {
            document.getElementById("progHorarioT").style.display = "none";
        }
        if (innerN) {
            document.getElementById("progHorarioN").style.display = "block";
            document.getElementById("progNoData").style.display = "none";
        } else {
            document.getElementById("progHorarioN").style.display = "none";
        }
        if (!innerM && !innerT && !innerN) {
            document.getElementById("progNoData").style.display = "block";
        }
    }
}