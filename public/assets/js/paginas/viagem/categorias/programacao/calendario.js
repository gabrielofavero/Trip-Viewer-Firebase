// ======= Calendar JS =======
// Original: niinpatel (https://www.cssscript.com/minimal-calendar-ui-generator/)

CALENDAR = {
    start: null,
    end: null,
    startMonth: null,
    startYear: null,
    endMonth: null,
    endYear: null,
    calendarTitle: null,
}

function _loadCalendar() {
    CALENDAR.start = _convertFromDateObject(FIRESTORE_DATA.inicio);
    CALENDAR.end = _convertFromDateObject(FIRESTORE_DATA.fim);

    CALENDAR.startMonth = CALENDAR.start.getMonth();
    CALENDAR.startYear = CALENDAR.start.getFullYear();
    CALENDAR.endMonth = CALENDAR.end.getMonth();
    CALENDAR.endYear = CALENDAR.end.getFullYear();

    CALENDAR.calendarTitle = getID("calendarTitle");
    _showCalendar(CALENDAR.startMonth, CALENDAR.startYear);
}

function _calendarNext() {
    CALENDAR.startYear = (CALENDAR.startMonth === 11) ? CALENDAR.startYear + 1 : CALENDAR.startYear;
    CALENDAR.startMonth = (CALENDAR.startMonth + 1) % 12;
    _showCalendar(CALENDAR.startMonth, CALENDAR.startYear);
}

function _calendarPrevious() {
    CALENDAR.startYear = (CALENDAR.startMonth === 0) ? CALENDAR.startYear - 1 : CALENDAR.startYear;
    CALENDAR.startMonth = (CALENDAR.startMonth === 0) ? 11 : CALENDAR.startMonth - 1;
    _showCalendar(CALENDAR.startMonth, CALENDAR.startYear);
}

function _showCalendar(month, year) {
    let firstDay = (new Date(year, month)).getDay();
    let daysInMonth = 32 - new Date(year, month, 32).getDate();

    let tbl = getID("calendar-body");

    tbl.innerHTML = "";
    CALENDAR.calendarTitle.innerHTML = translate('datetime.titles.month_year', {month: _getMonth(month), year});

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
                const startNoTime = _getDateNoTime(CALENDAR.start);
                const endNoTime = _getDateNoTime(CALENDAR.end);

                if (currentNoTime >= startNoTime && currentNoTime <= endNoTime) {
                    cell.classList.add("calendarTrip");
                    cell.setAttribute("onclick", "_loadCalendarItem('" + day + "/" + (month + 1) + "/" + year + "')");

                    const formattedMonth = String(month + 1).padStart(2, '0');
                    const formattedDay = String(day).padStart(2, '0');
                    const key = `${year}${formattedMonth}${formattedDay}`;
                    const destinos = PROGRAMACAO_DESTINOS[key];
                    if (destinos && destinos.length > 0) {
                        for (const destino of destinos) {
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
    return CALENDAR.startMonth != CALENDAR.endMonth || CALENDAR.startYear != CALENDAR.endYear;
}