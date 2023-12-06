// ======= Date JS =======

// ======= GETTERS =======
function _getCurrentHour() {
    let now = new Date();
    return now.getHours();
}

// ======= CONVERTERS =======
function _dateToTitle(date) {
    const day = date.getDate();
    const month = _numberToMonth(date.getMonth() + 1);
    const year = date.getFullYear();
    return `${day} de ${month} de ${year}`;
}

function _numberToMonth(number) {
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

function _getDateNoTime(date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function _convertFirestoreDate(timestamp) {
    return new Date(timestamp._seconds * 1000 + timestamp._nanoseconds / 1000000);
}

function _jsDateToDate(date, format = "dd/mm/yyyy") {
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
                _logger(WARN, "Formato de data não encontrado: " + formatParts[i] + ".");
        }
        if (i < formatParts.length - 1) {
            result += separator;
        }
    }

    return result;
}

function _changeFormat(formattedDate, newFormat) {
    return _jsDateToDate(_formattedDateToDate(formattedDate), newFormat);
}

function _getTodayFormatted (format='yyyy-mm-dd') {
    return _jsDateToDate(new Date(), format);
}

function _getTomorrowFormatted (format='yyyy-mm-dd') {
    return _jsDateToDate(new Date(new Date().getTime() + 24 * 60 * 60 * 1000), format);
}

function _getArrayOfFormattedDates(formattedStart, formattedEnd, format='yyyy-mm-dd') {
    const start = _formattedDateToDate(formattedStart);
    const end = _formattedDateToDate(formattedEnd);
    
    const dates = [];
    let currentDate = start;
    while (currentDate <= end) {
        dates.push(_jsDateToDate(currentDate, format));
        currentDate = new Date(currentDate.getTime() + 24 * 60 * 60 * 1000);
    }
    return dates;
}

function _formattedDateToDate (formattedDate) {
    const parts = formattedDate.split("-");
    return new Date(parts[0], parts[1] - 1, parts[2]);
}

function _formatFirestoreDate (date, format) {
    const jsDate = _convertFirestoreDate(date);
    return _jsDateToDate(jsDate, format);
}

function _jsDateToTime(date) {
    let hours = date.getHours();
    let minutes = date.getMinutes();

    if (hours < 10) {
        hours = `0${hours}`;
    }

    if (minutes < 10) {
        minutes = `0${minutes}`;
    }

    return `${hours}:${minutes}`;
}

function _removeSlashesFromDate(date) {
    return date.replace(/\//g, "");
}