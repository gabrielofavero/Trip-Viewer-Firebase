// ======= Date JS =======

var DATE_REGIONAL_FORMAT;

// ======= GETTERS =======
function _getCurrentHour() {
    let now = new Date();
    return now.getHours();
}

// ======= CONVERTERS =======
function _getDateTitle(date, format = "day_month") {
    let replacements = {};

    if (format == 'mini') {
        const regionalFormat = _getDateRegionalFormat();
        return `${_getWeekday(date.getDay())}, ${_getDateString(date, regionalFormat)}`;
    }

    if (format.includes('day')) {
        replacements.day = date.getDate().toString().padStart(2, '0');
    }

    if (format.includes('month')) {
        replacements.month = _getMonth(date.getMonth());
    }

    if (format.includes('weekday')) {
        replacements.weekday = _getWeekday(date.getDay());
    }

    return translate(`datetime.titles.${format}`, replacements);
}

function _getWeekday(day) {
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

function _getDateNoTime(date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function _convertFromDateObject(dateObject) {
    const date = new Date();
    date.setFullYear(dateObject.year);
    date.setMonth(dateObject.month - 1);
    date.setDate(dateObject.day);
    date.setHours(dateObject.hour);
    date.setMinutes(dateObject.minute);
    date.setSeconds(dateObject.second || 0)
    
    return date;
}

function _convertToDateObject(date) {
    return {
        year: date.getFullYear(),
        month: date.getMonth() + 1,
        day: date.getDate(),
        hour: date.getHours(),
        minute: date.getMinutes(),
        second: date.getSeconds()
    }
}

function _getDateString(date, format = "dd/mm/yyyy") {
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

function _changeFormat(formattedDate, newFormat) {
    return _getDateString(_formattedDateToDate(formattedDate), newFormat);
}

function _getTodayFormatted(format = 'yyyy-mm-dd') {
    return _getDateString(new Date(), format);
}

function _getTomorrowFormatted(format = 'yyyy-mm-dd') {
    return _getDateString(new Date(new Date().getTime() + 24 * 60 * 60 * 1000), format);
}

function _getAdjustedInputDate(inputDate, days) {
    const currentDate = _inputDateToJsDate(inputDate);
    const adjustedDate = new Date(currentDate.getTime() + days * 24 * 60 * 60 * 1000);
    return _jsDateToInputDate(adjustedDate);
}

function _getNextInputDay(inputDate) {
    return _getAdjustedInputDate(inputDate, 1);
}

function _getPreviousInputDay(inputDate) {
    return _getAdjustedInputDate(inputDate, -1);
}

function _getArrayOfDates(start, end) {
    const dates = [];
    let currentDate = start;
    while (currentDate <= end) {
        dates.push(currentDate);
        currentDate = new Date(currentDate.getTime() + 24 * 60 * 60 * 1000);
    }
    return dates;
}

function _formattedDateToDate(formattedDate, time) {
    const parts = formattedDate.split("-");
    if (!time) {
        return new Date(parts[0], parts[1] - 1, parts[2]);
    } else {
        const timeParts = time.split(":");
        return new Date(parts[0], parts[1] - 1, parts[2], timeParts[0], timeParts[1]);
    }
}

function _formattedDateToDateObject(formattedDate, time) {
    const date = _formattedDateToDate(formattedDate, time);
    return _convertToDateObject(date);
}

function _getTimeString(date, localize = false) {
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

function _removeSlashesFromDate(date) {
    return date.replace(/\//g, "");
}

function _jsTimeToVisualTime(time) {
    let result = [];
    const parts = time.split(":");
    const units = ['h', 'm', 's']
    const searchSize = parts.length <= 3 ? parts.length : 3;

    for (let i = 0; i < searchSize; i++) {
        result.push(`${parts[i]}${units[i]}`);
    }

    return result.join(" ");
}

function _getTimeBetweenDates(startDate, endDate) {
    const diff = endDate.getTime() - startDate.getTime();
    const hours = Math.floor(diff / 1000 / 60 / 60);
    const minutes = Math.floor(diff / 1000 / 60) - (hours * 60);

    const formattedHours = hours < 10 ? `0${hours}` : hours;
    const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes;

    return `${formattedHours}:${formattedMinutes}`;
}

function _getMonth(month) {
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

function _dateObjectToKey(dateObject) {
    const jsDate = _convertFromDateObject(dateObject);
    return _jsDateToKey(jsDate);
}

function _dateObjectToInputDate(dateObject) {
    const jsDate = _convertFromDateObject(dateObject);
    return _jsDateToInputDate(jsDate);
}

function _jsDateToKey(jsDate) {
    const inputDate = _getDateString(jsDate, 'yyyy-mm-dd');
    return _inputDateToKey(inputDate);
}

function _inputDateToKey(inputDate) {
    return inputDate.split("-").join("");
}

function _keyToInputDate(key) {
    return `${key.substr(0, 4)}-${key.substr(4, 2)}-${key.substr(6, 2)}`;
}

function _keyToDateObject(key) {
    const inputDate = _keyToInputDate(key);
    return _formattedDateToDateObject(inputDate);
}

function _inputDateToJsDate(inputDate) {
    const parts = inputDate.split("-");
    return new Date(parts[0], parts[1] - 1, parts[2]);
}

function _jsDateToInputDate(jsDate) {
    return _getDateString(jsDate, 'yyyy-mm-dd');
}

function _getNextCategoriaInicioFim(tipo, lastEndStructure) {
    let inicio = getID('inicio').value;
    let fim = getID('fim').value;

    const js = _getJs(`${tipo}-box`);

    if (js.length != 0) {
        const lastJ = _getLastJ(`${tipo}-box`);
        inicio = getID(`${lastEndStructure}-${lastJ}`).value;
    }

    return { inicio, fim };
}

function _getTimestamp() {
    const date = new Date();
    return `${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}${date.getHours().toString().padStart(2, '0')}${date.getMinutes().toString().padStart(2, '0')}${date.getSeconds().toString().padStart(2, '0')}`;
}

function _getDateRegionalFormat() {
    if (!DATE_REGIONAL_FORMAT) {
        DATE_REGIONAL_FORMAT = (_getLanguagePackName() === "en") ? "mm/dd/yyyy" : "dd/mm/yyyy"
    }
    return DATE_REGIONAL_FORMAT;
}