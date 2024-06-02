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
function _loadProgramacaoPills() {
    const destinos = _getUniqueDestinosFromProgramacao();
    if (destinos.length > 1) {
        const pillBox = getID('pill-box');
        pillBox.style.display = '';

        let innerHTML = '';

        for (const destinoID of destinos) {
            const destino = DESTINOS.find(destino => destino.destinosID === destinoID);
            if (!destino) continue;
            innerHTML += `<div class="pill" id="pill-${destinoID}">
                            <span class="pill-circle" id="pill-circle-${destinoID}"></span><span>${destino.destinos.titulo}</span>
                          </div>`
        }

        pillBox.innerHTML = innerHTML;

        for (const destinoID of destinos) {
            _addPillListeners(destinoID);
        }
    }
}


function _loadPill(destinoID, action) {
    const lastAction = PILLS_ACTIONS[destinoID];
    if (!lastAction) {
        if (action === 'click' || action === 'mouseenter') {
            PILLS_ACTIONS[destinoID] = action;
            _activatePill(destinoID);
        }
    } else if (lastAction === 'click') {
        if (action === 'click') {
            _deactivatePill(destinoID);
        }
    } else if (lastAction === 'mouseenter') {
        if (action === 'mouseleave') {
            _deactivatePill(destinoID);
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

function _activatePill(destinoID) {
    getID(`pill-${destinoID}`).classList.add('active-pill');
    getID(`pill-circle-${destinoID}`).classList.add('active-circle');
    for (const calendarDay of document.getElementsByClassName(`pill-${destinoID}`)) {
        calendarDay.classList.add('active-calendar');
    }
}

function _deactivatePill(destinoID) {
    getID(`pill-${destinoID}`).classList.remove('active-pill');
    getID(`pill-circle-${destinoID}`).classList.remove('active-circle');
    for (const calendarDay of document.getElementsByClassName(`pill-${destinoID}`)) {
        let toDelete = true;
        const classes = calendarDay.classList;
        for (const className of classes) {
            if (className.startsWith('pill-') && className !== `pill-${destinoID}`) {
                const otherDestino = className.split('-')[1];
                if (PILLS_ACTIONS[otherDestino]) {
                    toDelete = false;
                }
            }
        }
        if (toDelete) {
            calendarDay.classList.remove('active-calendar');
        }
    }
    delete PILLS_ACTIONS[destinoID];
}

function _addPillListeners(destinoID) {
    getID(`pill-${destinoID}`).addEventListener('mouseenter', function () {
        _loadPill(destinoID, 'mouseenter');
    });

    getID(`pill-${destinoID}`).addEventListener('mouseleave', function () {
        _loadPill(destinoID, 'mouseleave');
    });

    getID(`pill-${destinoID}`).addEventListener('click', function () {
        _loadPill(destinoID, 'click');
    });
}