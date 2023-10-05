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
    start = _convertFirestoreDate(FIRESTORE_DATA.inicio);
    end = _convertFirestoreDate(FIRESTORE_DATA.fim);
    
    startMonth = start.getMonth();
    startYear = start.getFullYear();
    endMonth = end.getMonth();
    endYear = end.getFullYear();
    
    calendarTitle = document.getElementById("calendarTitle");
    _showCalendar(startMonth, startYear);
}

function _next() {
    startYear = (startMonth === 11) ? startYear + 1 : startYear;
    startMonth = (startMonth + 1) % 12;
    _showCalendar(startMonth, startYear);
}

function _previous() {
    startYear = (startMonth === 0) ? startYear - 1 : startYear;
    startMonth = (startMonth === 0) ? 11 : startMonth - 1;
    _showCalendar(startMonth, startYear);
}

function _showCalendar(month, year) {
    let firstDay = (new Date(year, month)).getDay();
    let daysInMonth = 32 - new Date(year, month, 32).getDate();

    let tbl = document.getElementById("calendar-body");

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
                } else {
                    cell.classList.add("calendarDisabled");
                }
                cell.appendChild(cellText);
                row.appendChild(cell);
                day++;
            }
        }

        tbl.appendChild(row);

        if (_isTripMultiMonth()){
            _showMonthSelector();
        } else {
            _hideMonthSelector();
        }
    }

}

function _showMonthSelector(){
    document.getElementById('calendarMonthSelector').style.display = 'block'
}

function _hideMonthSelector(){
    document.getElementById('calendarMonthSelector').style.display = 'none'
}

function _isTripMultiMonth(){
    return startMonth != endMonth || startYear != endYear;
}