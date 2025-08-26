import { getID, getSecondaryIDs, getLastSecondaryID } from "../pages/selectors.js";
import { translate } from "../../main/translate.js";

var DATE_REGIONAL_FORMAT;

export const TODAY = getTodayFormatted();
export const TOMORROW = getTomorrowFormatted();

// Getters
export function getCurrentHour() {
    let now = new Date();
    return now.getHours();
}

export function getDateTitle(date, format = "day_month") {
    let replacements = {};

    if (format == 'mini') {
        const regionalFormat = getDateRegionalFormat();
        return `${getWeekday(date.getDay())}, ${getDateString(date, regionalFormat)}`;
    }

    if (format.includes('day')) {
        replacements.day = date.getDate().toString().padStart(2, '0');
    }

    if (format.includes('month')) {
        replacements.month = getMonth(date.getMonth());
    }

    if (format.includes('weekday')) {
        replacements.weekday = getWeekday(date.getDay());
    }

    return translate(`datetime.titles.${format}`, replacements);
}

function getWeekday(day) {
    const weekdays = [
        translate('datetime.weekdays.default.sunday'),
        translate('datetime.weekdays.default.monday'),
        translate('datetime.weekdays.default.tuesday'),
        translate('datetime.weekdays.default.wednesday'),
        translate('datetime.weekdays.default.thursday'),
        translate('datetime.weekdays.default.friday'),
        translate('datetime.weekdays.default.saturday')
    ]
    return weekdays[day];
}

export function getDateNoTime(date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function getDateString(date, format = "dd/mm/yyyy") {
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();

    const separator = format.includes("-") ? "-" : "/";

    let result = '';
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

function getTodayFormatted(format = 'yyyy-mm-dd') {
    return getDateString(new Date(), format);
}

function getTomorrowFormatted(format = 'yyyy-mm-dd') {
    return getDateString(new Date(new Date().getTime() + 24 * 60 * 60 * 1000), format);
}

function getAdjustedInputDate(inputDate, days) {
    const currentDate = inputDateToJsDate(inputDate);
    const adjustedDate = new Date(currentDate.getTime() + days * 24 * 60 * 60 * 1000);
    return jsDateToInputDate(adjustedDate);
}

export function getNextInputDay(inputDate) {
    return getAdjustedInputDate(inputDate, 1);
}

export function getPreviousInputDay(inputDate) {
    return getAdjustedInputDate(inputDate, -1);
}

export function getArrayOfDates(start, end) {
    const dates = [];
    let currentDate = start;
    while (currentDate <= end) {
        dates.push(currentDate);
        currentDate = new Date(currentDate.getTime() + 24 * 60 * 60 * 1000);
    }
    return dates;
}

export function getTimeString(date, localize = false) {
    let hours = date.getHours();
    let minutes = date.getMinutes();
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
    hours = hours.toString().padStart(2, '0');
    minutes = minutes.toString().padStart(2, '0');
    return `${hours}:${minutes} ${period}`.trim();
}

export function getTimeBetweenDates(startDate, endDate) {
    const diff = endDate.getTime() - startDate.getTime();
    const hours = Math.floor(diff / 1000 / 60 / 60);
    const minutes = Math.floor(diff / 1000 / 60) - (hours * 60);

    const formattedHours = hours < 10 ? `0${hours}` : hours;
    const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes;

    return `${formattedHours}:${formattedMinutes}`;
}

export function getMonth(month) {
    const months = [
        translate('datetime.months.january'),
        translate('datetime.months.february'),
        translate('datetime.months.march'),
        translate('datetime.months.april'),
        translate('datetime.months.may'),
        translate('datetime.months.june'),
        translate('datetime.months.july'),
        translate('datetime.months.august'),
        translate('datetime.months.september'),
        translate('datetime.months.october'),
        translate('datetime.months.november'),
        translate('datetime.months.december')
    ];
    return months[month];
}

// Converters
export function convertFromDateObject(dateObject) {
    const date = new Date();
    date.setFullYear(dateObject.year);
    date.setMonth(dateObject.month - 1);
    date.setDate(dateObject.day);
    date.setHours(dateObject.hour);
    date.setMinutes(dateObject.minute);
    date.setSeconds(dateObject.second || 0)
    
    return date;
}

export function convertToDateObject(date) {
    return {
        year: date.getFullYear(),
        month: date.getMonth() + 1,
        day: date.getDate(),
        hour: date.getHours(),
        minute: date.getMinutes(),
        second: date.getSeconds()
    }
}

export function formattedDateToDate(formattedDate, time) {
    const parts = formattedDate.split("-");
    if (!time) {
        return new Date(parts[0], parts[1] - 1, parts[2]);
    } else {
        const timeParts = time.split(":");
        return new Date(parts[0], parts[1] - 1, parts[2], timeParts[0], timeParts[1]);
    }
}

export function formattedDateToDateObject(formattedDate, time) {
    const date = formattedDateToDate(formattedDate, time);
    return convertToDateObject(date);
}

export function jsTimeToVisualTime(time) {
    let result = [];
    const parts = time.split(":");
    const units = ['h', 'm', 's']
    const searchSize = parts.length <= 3 ? parts.length : 3;

    for (let i = 0; i < searchSize; i++) {
        result.push(`${parts[i]}${units[i]}`);
    }

    return result.join(" ");
}

export function dateObjectToKey(dateObject) {
    const jsDate = convertFromDateObject(dateObject);
    return jsDateToKey(jsDate);
}

export function jsDateToKey(jsDate) {
    const inputDate = getDateString(jsDate, 'yyyy-mm-dd');
    return inputDateToKey(inputDate);
}

export function inputDateToKey(inputDate) {
    return inputDate.split("-").join("");
}

function keyToInputDate(key) {
    return `${key.substr(0, 4)}-${key.substr(4, 2)}-${key.substr(6, 2)}`;
}

export function keyToDateObject(key) {
    const inputDate = keyToInputDate(key);
    return formattedDateToDateObject(inputDate);
}

export function inputDateToJsDate(inputDate) {
    const parts = inputDate.split("-");
    return new Date(parts[0], parts[1] - 1, parts[2]);
}

export function jsDateToInputDate(jsDate) {
    return getDateString(jsDate, 'yyyy-mm-dd');
}

export function getNextTypeStartAndEnd(type, lastEndStructure) {
    let start = getID('inicio').value;
    let end = getID('fim').value;

    const js = getSecondaryIDs(`${type}-box`);

    if (js.length != 0) {
        const lastJ = getLastSecondaryID(`${type}-box`);
        start = getID(`${lastEndStructure}-${lastJ}`).value;
    }

    return { inicio: start, fim: end };
}

export function getTimestamp() {
    const date = new Date();
    return `${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}${date.getHours().toString().padStart(2, '0')}${date.getMinutes().toString().padStart(2, '0')}${date.getSeconds().toString().padStart(2, '0')}`;
}

export function getDateRegionalFormat() {
    if (!DATE_REGIONAL_FORMAT) {
        DATE_REGIONAL_FORMAT = (_getLanguagePackName() === "en") ? "mm/dd/yyyy" : "dd/mm/yyyy"
    }
    return DATE_REGIONAL_FORMAT;
}