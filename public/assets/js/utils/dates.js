// ======= Date JS (Timezone-Agnostic / UTC) =======

let DATE_REGIONAL_FORMAT;

// ======= GETTERS =======

export function getCurrentHour() {
	return new Date().getUTCHours();
}

export function getTodayDateObject() {
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

export function convertFromDateObject(dateObject) {
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

export function convertToDateObject(date) {
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

export function getDateNoTime(date) {
	return new Date(
		Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
	);
}

// ======= ADD / SUBTRACT DAYS (timezone-proof) =======

export function addDaysUTC(date, days) {
	return new Date(date.getTime() + days * 86400000);
}

// ======= CONVERTERS =======

export function formattedDateToDate(formattedDate, time) {
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

export function formattedDateToDateObject(formattedDate, time) {
	const date = formattedDateToDate(formattedDate, time);
	return convertToDateObject(date);
}

export function inputDateToJsDate(inputDate) {
	const [y, m, d] = inputDate.split("-").map(Number);
	return new Date(Date.UTC(y, m - 1, d));
}

export function jsDateToInputDate(jsDate) {
	return getDateString(jsDate, "yyyy-mm-dd");
}

// ======= DATE OBJECT ROUND TRIPS =======

export function dateObjectToKey(dateObject) {
	const jsDate = convertFromDateObject(dateObject);
	return jsDateToKey(jsDate);
}

export function dateObjectToInputDate(dateObject) {
	const jsDate = convertFromDateObject(dateObject);
	return jsDateToInputDate(jsDate);
}

export function dateObjectToString(dateObject) {
	const jsDate = convertFromDateObject(dateObject);
	return getDateString(jsDate);
}

// ======= KEY <-> DATE CONVERSIONS =======

export function jsDateToKey(jsDate) {
	const inputDate = getDateString(jsDate, "yyyy-mm-dd");
	return inputDateToKey(inputDate);
}

export function inputDateToKey(inputDate) {
	return inputDate.split("-").join("");
}

export function keyToInputDate(key) {
	return `${key.substr(0, 4)}-${key.substr(4, 2)}-${key.substr(6, 2)}`;
}

export function keyToDateObject(key) {
	const inputDate = keyToInputDate(key);
	return formattedDateToDateObject(inputDate);
}

// ======= DATE ARRAY HELPERS (UTC-stable) =======

export function getArrayOfDates(start, end) {
	const dates = [];
	let currentDate = start;

	while (currentDate <= end) {
		dates.push(currentDate);
		currentDate = addDaysUTC(currentDate, 1);
	}

	return dates;
}

// ======= INPUT DATE NAVIGATION =======

export function getAdjustedInputDate(inputDate, days) {
	const currentDate = inputDateToJsDate(inputDate);
	const adjustedDate = addDaysUTC(currentDate, days);
	return jsDateToInputDate(adjustedDate);
}

export function getNextInputDay(inputDate) {
	return getAdjustedInputDate(inputDate, 1);
}

export function getPreviousInputDay(inputDate) {
	return getAdjustedInputDate(inputDate, -1);
}

// ======= DATE STRING FORMATTING (UTC) =======

export function getDateString(date, format = "dd/mm/yyyy") {
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

export function changeFormat(formattedDate, newFormat) {
	return getDateString(formattedDateToDate(formattedDate), newFormat);
}

// ======= TODAY / TOMORROW (UTC) =======

export function getTodayFormatted(format = "yyyy-mm-dd") {
	return getDateString(getDateNoTime(new Date()), format);
}

export function getTomorrowFormatted(format = "yyyy-mm-dd") {
	const tomorrow = addDaysUTC(getDateNoTime(new Date()), 1);
	return getDateString(tomorrow, format);
}

// ======= HUMAN FRIENDLY DATE TITLES =======

export function getDateTitle(date, format = "day_month") {
	let replacements = {};

	if (format == "mini") {
		const regionalFormat = getDateRegionalFormat();
		return `${getWeekday(date.getUTCDay())}, ${getDateString(date, regionalFormat)}`;
	}

	if (format.includes("day")) {
		replacements.day = date.getUTCDate().toString().padStart(2, "0");
	}

	if (format.includes("month")) {
		replacements.month = getMonth(date.getUTCMonth());
	}

	if (format.includes("weekday")) {
		replacements.weekday = getWeekday(date.getUTCDay());
	}

	return translate(`datetime.titles.${format}`, replacements);
}

export function getWeekday(day) {
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

export function getTimeString(hours, minutes, localize = false) {
	let period = "";

	if (localize && getLanguagePackName() == "en") {
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

export function getTimeStringFromDate(date, localize = false) {
	let hours = date.getUTCHours();
	let minutes = date.getUTCMinutes();
	return getTimeString(hours, minutes, localize);
}

export function getTimeStringFromDateObj(dateObj, localize = false) {
	return getTimeString(dateObj.hour, dateObj.minute, localize);
}

// ======= TIME HELPERS =======

export function jsTimeToVisualTime(time) {
	let result = [];
	const parts = time.split(":");
	const units = ["h", "m", "s"];
	const searchSize = Math.min(parts.length, 3);

	for (let i = 0; i < searchSize; i++) {
		result.push(`${parts[i]}${units[i]}`);
	}

	return result.join(" ");
}

export function getTimeBetweenDates(startDate, endDate) {
	const diff = endDate.getTime() - startDate.getTime();

	const hours = Math.floor(diff / 3600000);
	const minutes = Math.floor((diff / 60000) % 60);

	const formattedHours = hours < 10 ? `0${hours}` : hours;
	const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes;

	return `${formattedHours}:${formattedMinutes}`;
}

// ======= MISC =======

export function removeSlashesFromDate(date) {
	return date.replace(/\//g, "");
}

export function getMonth(month) {
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

export function getNextCategoryStartEnd(tipo, lastEndStructure) {
	let inicio = getID("inicio").value;
	let fim = getID("fim").value;

	const js = getJs(`${tipo}-box`);

	if (js.length != 0) {
		const lastJ = getLastJ(`${tipo}-box`);
		inicio = getID(`${lastEndStructure}-${lastJ}`).value;
	}

	return { inicio, fim };
}

export function getTimestamp() {
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

export function getDateRegionalFormat() {
	if (!DATE_REGIONAL_FORMAT) {
		DATE_REGIONAL_FORMAT =
			getLanguagePackName() === "en" ? "mm/dd/yyyy" : "dd/mm/yyyy";
	}
	return DATE_REGIONAL_FORMAT;
}
