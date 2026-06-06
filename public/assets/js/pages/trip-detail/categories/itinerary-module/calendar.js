import { getState } from '../../../../data/state.js';
import { convertFromDateObject, getDateNoTime, getMonth } from '../../../../utils/dates.js';
import { getID } from '../../../../utils/dom.js';
import { translate } from '../../../../i18n/translation.js';

// ======= Calendar JS =======
// Original: niinpatel (https://www.cssscript.com/minimal-calendar-ui-generator/)

var IS_CALENDAR_MULTI_MONTH = false;
var CURRENT_CALENDAR = {
	month: null,
	year: null,
};

var CALENDAR = {
	start: null,
	end: null,
	startMonth: null,
	startYear: null,
	endMonth: null,
	endYear: null,
	calendarTitle: null,
};

function loadCalendar() {
	CALENDAR.start = convertFromDateObject(getState().inicio);
	CALENDAR.end = convertFromDateObject(getState().fim);

	CALENDAR.startMonth = CALENDAR.start.getUTCMonth();
	CALENDAR.startYear = CALENDAR.start.getUTCFullYear();
	CALENDAR.endMonth = CALENDAR.end.getUTCMonth();
	CALENDAR.endYear = CALENDAR.end.getUTCFullYear();

	CALENDAR.calendarTitle = getID("calendarTitle");
	CURRENT_CALENDAR.month = CALENDAR.startMonth;
	CURRENT_CALENDAR.year = CALENDAR.startYear;
	showCalendar(CALENDAR.startMonth, CALENDAR.startYear);
}

function changeCalendarMonth(direction) {
	const result = { month: CURRENT_CALENDAR.month, year: CURRENT_CALENDAR.year };

	if (direction === "next") {
		if (result.month === 11) {
			result.month = 0;
			result.year += 1;
		} else {
			result.month += 1;
		}

		if (result.month > CALENDAR.endMonth && result.year >= CALENDAR.endYear) {
			return;
		}
	} else if (direction === "previous") {
		if (result.month === 0) {
			result.month = 11;
			result.year -= 1;
		} else {
			result.month -= 1;
		}

		if (
			result.month < CALENDAR.startMonth &&
			result.year <= CALENDAR.startYear
		) {
			return;
		}
	}

	CURRENT_CALENDAR.month = result.month;
	CURRENT_CALENDAR.year = result.year;
	showCalendar(CURRENT_CALENDAR.month, CURRENT_CALENDAR.year);
	loadMonthNavigatorVisibility();
}

function calendarNext() {
	changeCalendarMonth("next");
	refreshPills();
}

function calendarPrevious() {
	changeCalendarMonth("previous");
	refreshPills();
}

function showCalendar(month, year) {
	let firstDay = new Date(Date.UTC(year, month, 1)).getUTCDay();
	let daysInMonth = 32 - new Date(Date.UTC(year, month, 32)).getUTCDate();

	let tbl = getID("calendar-body");

	tbl.innerHTML = "";
	CALENDAR.calendarTitle.innerHTML = translate("datetime.titles.month_year", {
		month: getMonth(month),
		year,
	});

	let day = 1;
	for (let i = 0; i < 6; i++) {
		let row = document.createElement("tr");

		for (let j = 0; j < 7; j++) {
			if (i === 0 && j < firstDay) {
				let cell = document.createElement("td");
				let cellText = document.createTextNode("");
				cell.appendChild(cellText);
				row.appendChild(cell);
			} else if (day > daysInMonth) {
				break;
			} else {
				const currentDate = new Date(Date.UTC(year, month, day));
				let cell = document.createElement("td");
				let cellText = document.createTextNode(day);

				const currentNoTime = getDateNoTime(currentDate);
				const startNoTime = getDateNoTime(CALENDAR.start);
				const endNoTime = getDateNoTime(CALENDAR.end);

				if (currentNoTime >= startNoTime && currentNoTime <= endNoTime) {
					cell.classList.add("calendarTrip");
					cell.id = `calendarTrip-${day}-${month + 1}-${year}`;
					cell.setAttribute(
						"onclick",
						`loadCalendarItem(${day}, ${month + 1}, ${year})`,
					);

					const formattedMonth = String(month + 1).padStart(2, "0");
					const formattedDay = String(day).padStart(2, "0");
					const key = `${year}${formattedMonth}${formattedDay}`;
					const destinos = SCHEDULE_DESTINATIONS[key];
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
	}

	if (isCalendarMultiMonth()) {
		loadMonthSelector();
	}
}

function loadMonthSelector() {
	loadMonthNavigatorVisibility();
	getID("calendarMonthSelector").style.display = "block";
}

function loadMonthNavigatorVisibility() {
	const previous = getID("previous");
	const next = getID("next");

	if (
		CURRENT_CALENDAR.month === CALENDAR.startMonth &&
		CURRENT_CALENDAR.year === CALENDAR.startYear
	) {
		previous.classList.add("disabled");
	} else {
		previous.classList.remove("disabled");
	}

	if (
		CURRENT_CALENDAR.month === CALENDAR.endMonth &&
		CURRENT_CALENDAR.year === CALENDAR.endYear
	) {
		next.classList.add("disabled");
	} else {
		next.classList.remove("disabled");
	}
}

function isCalendarMultiMonth() {
	if (!IS_CALENDAR_MULTI_MONTH) {
		IS_CALENDAR_MULTI_MONTH =
			CALENDAR.startMonth != CALENDAR.endMonth ||
			CALENDAR.startYear != CALENDAR.endYear;
	}
	return IS_CALENDAR_MULTI_MONTH;
}
