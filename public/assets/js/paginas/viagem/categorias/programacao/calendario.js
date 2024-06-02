// ======= Calendar JS =======
// Autor Original: niinpatel (https://www.cssscript.com/minimal-calendar-ui-generator/)

const months = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

var start;
var end;
var startMonth;
var startYear;
var endMonth;
var endYear;
var calendarTitle;

function _loadCalendar() {
    start = _convertFromFirestoreDate(FIRESTORE_DATA.inicio);
    end = _convertFromFirestoreDate(FIRESTORE_DATA.fim);

    startMonth = start.getMonth();
    startYear = start.getFullYear();
    endMonth = end.getMonth();
    endYear = end.getFullYear();

    calendarTitle = getID("calendarTitle");
    _showCalendar(startMonth, startYear);
}

function _calendarNext() {
    startYear = (startMonth === 11) ? startYear + 1 : startYear;
    startMonth = (startMonth + 1) % 12;
    _showCalendar(startMonth, startYear);
}

function _calendarPrevious() {
    startYear = (startMonth === 0) ? startYear - 1 : startYear;
    startMonth = (startMonth === 0) ? 11 : startMonth - 1;
    _showCalendar(startMonth, startYear);
}

function _showCalendar(month, year) {
    let firstDay = (new Date(year, month)).getDay();
    let daysInMonth = 32 - new Date(year, month, 32).getDate();

    let tbl = getID("calendar-body");

    tbl.innerHTML = "";
    calendarTitle.innerHTML = months[month] + " de " + year;

    let day = 1;
    for (let i = 0; i < 6; i++) {
        let row = document.createElement("tr");

        for (let j = 0; j < 7; j++) {
            if (i === 0 && j < firstDay) {
                let cell = document.createElement("td");
                let cellText = document.createTextNode("");
                cell.appendChild(cellText);
                row.appendChild(cell);
            }
            else if (day > daysInMonth) {
                break;
            }

            else {
                const currentDate = new Date(`${year}/${month + 1}/${day}`);
                let cell = document.createElement("td");
                let cellText = document.createTextNode(day);

                const currentNoTime = _getDateNoTime(currentDate);
                const startNoTime = _getDateNoTime(start);
                const endNoTime = _getDateNoTime(end);

                if (currentNoTime >= startNoTime && currentNoTime <= endNoTime) {
                    cell.classList.add("calendarTrip");
                    cell.setAttribute("onclick", "_getScheduleCalendarByDate('" + day + "/" + (month + 1) + "/" + year + "')");

                    const key = `${year}${month + 1}${day}`;
                    const destinos = PROGRAMACAO_DESTINOS[key];
                    if (destinos && destinos.length > 0) {
                        for (const destino of destinos){
                            cell.classList.add(`pill-${destino.destinosID}`);
                        }
                    }

                } else {
                    cell.classList.add("calendarDisabled");
                }
                cell.appendChild(cellText);
                row.appendChild(cell);
                day++;
            }
        }

        tbl.appendChild(row);

        if (_isCalendarMultiMonth()) {
            _showMonthSelector();
        } else {
            _hideMonthSelector();
        }
    }

}

function _showMonthSelector() {
    getID('calendarMonthSelector').style.display = 'block'
}

function _hideMonthSelector() {
    getID('calendarMonthSelector').style.display = 'none'
}

function _isCalendarMultiMonth() {
    return startMonth != endMonth || startYear != endYear;
}