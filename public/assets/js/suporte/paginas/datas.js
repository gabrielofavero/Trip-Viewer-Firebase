// ======= Date JS =======

// ======= GETTERS =======
function _getCurrentHour() {
    let now = new Date();
    return now.getHours();
}

// ======= CONVERTERS =======
function _dateToTitle(date, showDayOfWeek = true, showYear = false) {
    const dayOfWeek = showDayOfWeek ? `${_dayToDayOfWeekText(date.getDay())}, ` : '';
    const dayMonth = `${date.getDate()} de ${_monthToText(date.getMonth())}`;
    const year = showYear ? ` de ${date.getFullYear()}` : '';
    return dayOfWeek + dayMonth + year;
}

function _dayToDayOfWeekText(day) {
    return ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'][day];
}

function _dateToDayOfTheWeek(date) {
    return _dayToDayOfWeekText(date.getDay());
}

function _getDateNoTime(date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function _convertFromFirestoreDate(timestamp) {
    if (timestamp.seconds) {
        return new Date(timestamp.seconds * 1000 + timestamp.nanoseconds / 1000000);
    } else {
        return new Date(timestamp._seconds * 1000 + timestamp._nanoseconds / 1000000);
    }
}

function _firestoneDateToInputDate(timestamp) {
    const date = _convertFromFirestoreDate(timestamp);
    return _jsDateToInputDate(date);
}

function _convertToFirestoreDate(date) {
    const seconds = Math.floor(date.getTime() / 1000);
    const nanoseconds = (date.getTime() % 1000) * 1000000;
    return {
        _seconds: seconds,
        _nanoseconds: nanoseconds,
    };
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
                console.warn("Formato de data não encontrado: " + formatParts[i] + ".");
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

function _getTodayFormatted(format = 'yyyy-mm-dd') {
    return _jsDateToDate(new Date(), format);
}

function _getTomorrowFormatted(format = 'yyyy-mm-dd') {
    return _jsDateToDate(new Date(new Date().getTime() + 24 * 60 * 60 * 1000), format);
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

function _formattedDateToFirestoreDate(formattedDate, time) {
    const date = _formattedDateToDate(formattedDate, time);
    return _convertToFirestoreDate(date);
}

function _formatFirestoreDate(date, format) {
    const jsDate = _convertFromFirestoreDate(date);
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

function _monthToText(month) {
    return ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto',
        'Setembro', 'Outubro', 'Novembro', 'Dezembro'][month];
}

function _jsDateToDayOfTheWeekAndDateTitle(jsDate, showYear = false) {
    const dia = jsDate.getDate();
    const mes = jsDate.getMonth();
    const ano = showYear ? ` de ${jsDate.getFullYear()}` : '';
    const diaDaSemana = _dayToDayOfWeekText(jsDate.getDay());
    return `${diaDaSemana}, ${dia} de ${_monthToText(mes)}${ano}`;
}

function _jsDateToMiniTitle(jsDate) {
    return `${_dateToDayOfTheWeek(jsDate)}, ${_jsDateToDate(jsDate)}`
}

function _firestoreDateToKey(firestoreDate) {
    const jsDate = _convertFromFirestoreDate(firestoreDate);
    return _jsDateToKey(jsDate);
}

function _firestoreDateToInputDate(firestoreDate) {
    const jsDate = _convertFromFirestoreDate(firestoreDate);
    return _jsDateToInputDate(jsDate);
}

function _jsDateToKey(jsDate) {
    const inputDate = _jsDateToDate(jsDate, 'yyyy-mm-dd');
    return _inputDateToKey(inputDate);
}

function _inputDateToKey(inputDate) {
    return inputDate.split("-").join("");
}

function _inputDateToJsDate(inputDate) {
    const parts = inputDate.split("-");
    return new Date(parts[0], parts[1] - 1, parts[2]);
}

function _jsDateToInputDate(jsDate) {
    return _jsDateToDate(jsDate, 'yyyy-mm-dd');
}

function _getNextCategoriaDate(tipo, lastEndStructure) {
    const js = _getJs(`${tipo}-box`);
    if (js.length === 0) {
        return getID('inicio').value;
    } else {
        const lastJ = _getLastJ(`${tipo}-box`);
        const dateInput = getID(`${lastEndStructure}-${lastJ}`).value;
        const date = _inputDateToJsDate(dateInput);

        const fimInput = getID('fim').value;
        const fim = _inputDateToJsDate(fimInput);

        if (date.getTime() < fim.getTime()) {
            return _getNextInputDay(dateInput);
        } else {
            return fimInput;
        }
    }
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