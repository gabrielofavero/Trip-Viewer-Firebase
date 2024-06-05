var PROGRAMACAO_DESTINOS = {};
var PILLS_ACTIONS = {};

function _loadProgramacao() {
    _loadProgramacaoDestinos();
    _loadCalendar();
    _loadProgramacaoPills();
}

function _loadProgramacaoDestinos() {
    for (const programacao of FIRESTORE_DATA.programacoes) {
        const key = _firestoreDateToKey(programacao.data);
        PROGRAMACAO_DESTINOS[key] = programacao.destinosIDs;
    }
}

function _getUniqueDestinosFromProgramacao() {
    const result = [];
    for (const key in PROGRAMACAO_DESTINOS) {
        const destinos = PROGRAMACAO_DESTINOS[key];
        for (const destino of destinos) {
            if (!result.includes(destino.destinosID)) {
                result.push(destino.destinosID);
            }
        }
    }
    return result;
}

// Pills
function _loadProgramacaoPills(multipleColors=true) {
    const destinos = _getUniqueDestinosFromProgramacao();
    if (destinos.length > 1) {
        const pillBox = getID('pill-box');
        pillBox.style.display = '';

        let innerHTML = '';

        for (let i = 0; i < destinos.length; i++) {
            const destinoID = destinos[i];
            const destino = DESTINOS.find(destino => destino.destinosID === destinoID);
            if (!destino) continue;

            const circleClass = multipleColors ? `pill-circle pill-circle-${_getColorNameFromOptions(i)}` : `pill-circle pill-circle-default`;
            innerHTML += `<div class="pill" id="pill-${destinoID}">
                            <span class="${circleClass}" id="pill-circle-${destinoID}"></span><span>${destino.destinos.titulo}</span>
                          </div>`
        }

        pillBox.innerHTML = innerHTML;

        for (let i = 0; i < destinos.length; i++) {
            const colorIndex = multipleColors ? i : -1;
            _addPillListeners(destinos[i], colorIndex);
        }
    }
}


function _loadPill(destinoID, action, colorIndex=-1) {
    const lastAction = PILLS_ACTIONS[destinoID];
    if (!lastAction) {
        if (action === 'click' || action === 'mouseenter') {
            PILLS_ACTIONS[destinoID] = action;
            _activatePill(destinoID, colorIndex);
        }
    } else if (lastAction === 'click') {
        if (action === 'click') {
            _deactivatePill(destinoID, colorIndex);
        }
    } else if (lastAction === 'mouseenter') {
        if (action === 'mouseleave') {
            _deactivatePill(destinoID, colorIndex);
        }
        if (action === 'click') {
            PILLS_ACTIONS[destinoID] = action;
        }
    } else if (lastAction === 'mouseleave') {
        if (action === 'click' || action === 'mouseenter') {
            PILLS_ACTIONS[destinoID] = action;
            _activatePill();
        }
    }
}

function _activatePill(destinoID, colorIndex=-1) {
    const pillClasses = _getPillClasses(colorIndex);
    getID(`pill-${destinoID}`).classList.add('active-pill');
    getID(`pill-circle-${destinoID}`).classList.add(pillClasses.activeCircle);
    for (const calendarDay of document.getElementsByClassName(`pill-${destinoID}`)) {
        calendarDay.classList.add(pillClasses.activeCalendar);
    }
}

function _deactivatePill(destinoID, colorIndex=-1) {
    const pillClasses = _getPillClasses(colorIndex);
    getID(`pill-${destinoID}`).classList.remove('active-pill');
    getID(`pill-circle-${destinoID}`).classList.remove(pillClasses.pillCircle);
    getID(`pill-circle-${destinoID}`).classList.remove(pillClasses.activeCircle);
    for (const calendarDay of document.getElementsByClassName(`pill-${destinoID}`)) {
        calendarDay.classList.remove(pillClasses.activeCalendar);
    }
    delete PILLS_ACTIONS[destinoID];
}

function _addPillListeners(destinoID, colorIndex) {
    getID(`pill-${destinoID}`).addEventListener('mouseenter', function () {
        _loadPill(destinoID, 'mouseenter', colorIndex);
    });

    getID(`pill-${destinoID}`).addEventListener('mouseleave', function () {
        _loadPill(destinoID, 'mouseleave', colorIndex);
    });

    getID(`pill-${destinoID}`).addEventListener('click', function () {
        _loadPill(destinoID, 'click', colorIndex);
    });
}

function _getPillClasses(colorIndex) {
    let activeCircle = 'active-circle';
    let activeCalendar = 'active-calendar';

    if (colorIndex >= 0) {
        const colorName = _getColorNameFromOptions(colorIndex);
        pillCircle = `pill-circle-${colorName}`;
        activeCircle = `active-circle-${colorName}`;
        activeCalendar = `active-calendar-${colorName}`;
    }
    return { pillCircle, activeCircle, activeCalendar }
}