// ======= Date JS (Timezone-Agnostic / UTC) =======

let DATE_REGIONAL_FORMAT;

// ======= GETTERS =======

export function _getCurrentHour() {
	return new Date().getUTCHours();
}

export function _getTodayDateObject() {
	const now = new Date();
	return {
		year: now.getUTCFullYear(),
		month: now.getUTCMonth() + 1,
		day: now.getUTCDate(),
		hour: 0,
		minute: 0,
		second: 0,
	};
}

// ======= CORE UTC CONVERSION HELPERS =======

export function _convertFromDateObject(dateObject) {
	return new Date(
		Date.UTC(
			dateObject.year,
			dateObject.month - 1,
			dateObject.day,
			dateObject.hour,
			dateObject.minute,
			dateObject.second ?? 0,
		),
	);
}

export function _convertToDateObject(date) {
	return {
		year: date.getUTCFullYear(),
		month: date.getUTCMonth() + 1,
		day: date.getUTCDate(),
		hour: date.getUTCHours(),
		minute: date.getUTCMinutes(),
		second: date.getUTCSeconds(),
	};
}

// ======= SAFE UTC DATE NORMALIZATION =======

export function _getDateNoTime(date) {
	return new Date(
		Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
	);
}

// ======= ADD / SUBTRACT DAYS (timezone-proof) =======

export function _addDaysUTC(date, days) {
	return new Date(date.getTime() + days * 86400000);
}

// ======= CONVERTERS =======

export function _formattedDateToDate(formattedDate, time) {
	const parts = formattedDate.split("-");
	const y = Number(parts[0]);
	const m = Number(parts[1]);
	const d = Number(parts[2]);

	if (!time) {
		return new Date(Date.UTC(y, m - 1, d));
	}

	const [hh, mm] = time.split(":").map(Number);
	return new Date(Date.UTC(y, m - 1, d, hh, mm));
}

export function _formattedDateToDateObject(formattedDate, time) {
	const date = _formattedDateToDate(formattedDate, time);
	return _convertToDateObject(date);
}

export function _inputDateToJsDate(inputDate) {
	const [y, m, d] = inputDate.split("-").map(Number);
	return new Date(Date.UTC(y, m - 1, d));
}

export function _jsDateToInputDate(jsDate) {
	return _getDateString(jsDate, "yyyy-mm-dd");
}

// ======= DATE OBJECT ROUND TRIPS =======

export function _dateObjectToKey(dateObject) {
	const jsDate = _convertFromDateObject(dateObject);
	return _jsDateToKey(jsDate);
}

export function _dateObjectToInputDate(dateObject) {
	const jsDate = _convertFromDateObject(dateObject);
	return _jsDateToInputDate(jsDate);
}

export function _dateObjectToString(dateObject) {
	const jsDate = _convertFromDateObject(dateObject);
	return _getDateString(jsDate);
}

// ======= KEY <-> DATE CONVERSIONS =======

export function _jsDateToKey(jsDate) {
	const inputDate = _getDateString(jsDate, "yyyy-mm-dd");
	return _inputDateToKey(inputDate);
}

export function _inputDateToKey(inputDate) {
	return inputDate.split("-").join("");
}

export function _keyToInputDate(key) {
	return `${key.substr(0, 4)}-${key.substr(4, 2)}-${key.substr(6, 2)}`;
}

export function _keyToDateObject(key) {
	const inputDate = _keyToInputDate(key);
	return _formattedDateToDateObject(inputDate);
}

// ======= DATE ARRAY HELPERS (UTC-stable) =======

export function _getArrayOfDates(start, end) {
	const dates = [];
	let currentDate = start;

	while (currentDate <= end) {
		dates.push(currentDate);
		currentDate = _addDaysUTC(currentDate, 1);
	}

	return dates;
}

// ======= INPUT DATE NAVIGATION =======

export function _getAdjustedInputDate(inputDate, days) {
	const currentDate = _inputDateToJsDate(inputDate);
	const adjustedDate = _addDaysUTC(currentDate, days);
	return _jsDateToInputDate(adjustedDate);
}

export function _getNextInputDay(inputDate) {
	return _getAdjustedInputDate(inputDate, 1);
}

export function _getPreviousInputDay(inputDate) {
	return _getAdjustedInputDate(inputDate, -1);
}

// ======= DATE STRING FORMATTING (UTC) =======

export function _getDateString(date, format = "dd/mm/yyyy") {
	const day = date.getUTCDate();
	const month = date.getUTCMonth() + 1;
	const year = date.getUTCFullYear();

	const separator = format.includes("-") ? "-" : "/";

	let result = "";
	const formatParts = format.split(separator);

	for (let i = 0; i < formatParts.length; i++) {
		switch (formatParts[i]) {
			case "dd":
				result += day < 10 ? `0${day}` : day;
				break;
			case "d":
				result += day;
				break;
			case "mm":
				result += month < 10 ? `0${month}` : month;
				break;
			case "m":
				result += month;
				break;
			case "yyyy":
				result += year;
				break;
			case "yy":
				result += year.toString().substr(-2);
				break;
			default:
				console.warn("Date format not found: " + formatParts[i] + ".");
		}
		if (i < formatParts.length - 1) {
			result += separator;
		}
	}

	return result;
}

export function _changeFormat(formattedDate, newFormat) {
	return _getDateString(_formattedDateToDate(formattedDate), newFormat);
}

// ======= TODAY / TOMORROW (UTC) =======

export function _getTodayFormatted(format = "yyyy-mm-dd") {
	return _getDateString(_getDateNoTime(new Date()), format);
}

export function _getTomorrowFormatted(format = "yyyy-mm-dd") {
	const tomorrow = _addDaysUTC(_getDateNoTime(new Date()), 1);
	return _getDateString(tomorrow, format);
}

// ======= HUMAN FRIENDLY DATE TITLES =======

export function _getDateTitle(date, format = "day_month") {
	let replacements = {};

	if (format == "mini") {
		const regionalFormat = _getDateRegionalFormat();
		return `${_getWeekday(date.getUTCDay())}, ${_getDateString(date, regionalFormat)}`;
	}

	if (format.includes("day")) {
		replacements.day = date.getUTCDate().toString().padStart(2, "0");
	}

	if (format.includes("month")) {
		replacements.month = _getMonth(date.getUTCMonth());
	}

	if (format.includes("weekday")) {
		replacements.weekday = _getWeekday(date.getUTCDay());
	}

	return translate(`datetime.titles.${format}`, replacements);
}

export function _getWeekday(day) {
	const weekdays = [
		translate("datetime.weekdays.default.sunday"),
		translate("datetime.weekdays.default.monday"),
		translate("datetime.weekdays.default.tuesday"),
		translate("datetime.weekdays.default.wednesday"),
		translate("datetime.weekdays.default.thursday"),
		translate("datetime.weekdays.default.friday"),
		translate("datetime.weekdays.default.saturday"),
	];
	return weekdays[day];
}

// ======= TIME FORMATTING (UTC) =======

export function _getTimeString(hours, minutes, localize = false) {
	let period = "";

	if (localize && _getLanguagePackName() == "en") {
		if (hours > 12) {
			hours -= 12;
			period = "PM";
		} else if (hours == 0) {
			hours = 12;
			period = "AM";
		} else {
			period = "AM";
		}
	}

	hours = hours.toString().padStart(2, "0");
	minutes = minutes.toString().padStart(2, "0");

	return `${hours}:${minutes} ${period}`.trim();
}

export function _getTimeStringFromDate(date, localize = false) {
	let hours = date.getUTCHours();
	let minutes = date.getUTCMinutes();
	return _getTimeString(hours, minutes, localize);
}

export function _getTimeStringFromDateObj(dateObj, localize = false) {
	return _getTimeString(dateObj.hour, dateObj.minute, localize);
}

// ======= TIME HELPERS =======

export function _jsTimeToVisualTime(time) {
	let result = [];
	const parts = time.split(":");
	const units = ["h", "m", "s"];
	const searchSize = Math.min(parts.length, 3);

	for (let i = 0; i < searchSize; i++) {
		result.push(`${parts[i]}${units[i]}`);
	}

	return result.join(" ");
}

export function _getTimeBetweenDates(startDate, endDate) {
	const diff = endDate.getTime() - startDate.getTime();

	const hours = Math.floor(diff / 3600000);
	const minutes = Math.floor((diff / 60000) % 60);

	const formattedHours = hours < 10 ? `0${hours}` : hours;
	const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes;

	return `${formattedHours}:${formattedMinutes}`;
}

// ======= MISC =======

export function _removeSlashesFromDate(date) {
	return date.replace(/\//g, "");
}

export function _getMonth(month) {
	const months = [
		translate("datetime.months.january"),
		translate("datetime.months.february"),
		translate("datetime.months.march"),
		translate("datetime.months.april"),
		translate("datetime.months.may"),
		translate("datetime.months.june"),
		translate("datetime.months.july"),
		translate("datetime.months.august"),
		translate("datetime.months.september"),
		translate("datetime.months.october"),
		translate("datetime.months.november"),
		translate("datetime.months.december"),
	];
	return months[month];
}

export function _getNextCategoriaInicioFim(tipo, lastEndStructure) {
	let inicio = getID("inicio").value;
	let fim = getID("fim").value;

	const js = _getJs(`${tipo}-box`);

	if (js.length != 0) {
		const lastJ = _getLastJ(`${tipo}-box`);
		inicio = getID(`${lastEndStructure}-${lastJ}`).value;
	}

	return { inicio, fim };
}

export function _getTimestamp() {
	const date = new Date();

	return `${date.getUTCFullYear()}${(date.getUTCMonth() + 1)
		.toString()
		.padStart(2, "0")}${date.getUTCDate().toString().padStart(2, "0")}${date
		.getUTCHours()
		.toString()
		.padStart(2, "0")}${date.getUTCMinutes().toString().padStart(2, "0")}${date
		.getUTCSeconds()
		.toString()
		.padStart(2, "0")}`;
}

export function _getDateRegionalFormat() {
	if (!DATE_REGIONAL_FORMAT) {
		DATE_REGIONAL_FORMAT =
			_getLanguagePackName() === "en" ? "mm/dd/yyyy" : "dd/mm/yyyy";
	}
	return DATE_REGIONAL_FORMAT;
}

// BACKWARD COMPAT: attach to window during migration
window._getCurrentHour = _getCurrentHour;
window._getTodayDateObject = _getTodayDateObject;
window._convertFromDateObject = _convertFromDateObject;
window._convertToDateObject = _convertToDateObject;
window._getDateNoTime = _getDateNoTime;
window._addDaysUTC = _addDaysUTC;
window._formattedDateToDate = _formattedDateToDate;
window._formattedDateToDateObject = _formattedDateToDateObject;
window._inputDateToJsDate = _inputDateToJsDate;
window._jsDateToInputDate = _jsDateToInputDate;
window._dateObjectToKey = _dateObjectToKey;
window._dateObjectToInputDate = _dateObjectToInputDate;
window._dateObjectToString = _dateObjectToString;
window._jsDateToKey = _jsDateToKey;
window._inputDateToKey = _inputDateToKey;
window._keyToInputDate = _keyToInputDate;
window._keyToDateObject = _keyToDateObject;
window._getArrayOfDates = _getArrayOfDates;
window._getAdjustedInputDate = _getAdjustedInputDate;
window._getNextInputDay = _getNextInputDay;
window._getPreviousInputDay = _getPreviousInputDay;
window._getDateString = _getDateString;
window._changeFormat = _changeFormat;
window._getTodayFormatted = _getTodayFormatted;
window._getTomorrowFormatted = _getTomorrowFormatted;
window._getDateTitle = _getDateTitle;
window._getWeekday = _getWeekday;
window._getTimeString = _getTimeString;
window._getTimeStringFromDate = _getTimeStringFromDate;
window._getTimeStringFromDateObj = _getTimeStringFromDateObj;
window._jsTimeToVisualTime = _jsTimeToVisualTime;
window._getTimeBetweenDates = _getTimeBetweenDates;
window._removeSlashesFromDate = _removeSlashesFromDate;
window._getMonth = _getMonth;
window._getNextCategoriaInicioFim = _getNextCategoriaInicioFim;
window._getTimestamp = _getTimestamp;
window._getDateRegionalFormat = _getDateRegionalFormat;
window.DATE_REGIONAL_FORMAT = DATE_REGIONAL_FORMAT;
