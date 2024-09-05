const DESTINOS_TITULOS = {
    restaurantes: 'Restaurantes',
    lanches: 'Lanches',
    saidas: 'Saídas',
    turismo: 'Pontos Turísticos',
    lojas: 'Lojas'
};
var DESTINOS_ATIVOS = [];
var DESTINOS_ORDENADOS = [];

// Destinos Ativos
function _loadDestinosAtivos() {
    DESTINOS_ATIVOS = [];
    const habilidadoDestinos = getID('habilitado-destinos');
    if (habilidadoDestinos && !habilidadoDestinos.checked) return;

    const childIDs = _getChildIDs('destinos-checkboxes');
    let result = [];

    for (const child of childIDs) {
        const j = _getJ(child);
        const checkbox = getID(`check-destinos-${j}`);
        if (checkbox.checked) {
            result.push({
                titulo: getID(`check-destinos-label-${j}`).innerText,
                destinosID: checkbox.value,
            });
        }
    }

    DESTINOS_ATIVOS = result;
}

function _updateDestinosAtivosHTMLs() {
    _loadDestinosAtivos();

    if (_getHTMLpage() === 'editar-viagem') {
        _updateDestinosAtivosCheckboxHTML('programacao');
        _updateDestinosAtivosSelectHTML('lineup');
    }
}

function _loadDestinosOrdenados() {
    const destinos = getID('habilitado-destinos');
    const programacao = getID('habilitado-programacao');
    if (destinos && destinos.checked && programacao && programacao.checked && DESTINOS_ATIVOS.length > 0) {
        const order = [];
        for (const fieldsetJ of _getJs('programacao-box')) {
            for (const child of _getChildIDs(`programacao-local-${fieldsetJ}`)) {
                const checkbox = getID(`check-programacao-${_getIDs(child)}`);
                if (checkbox.checked) {
                    if (!order.includes(checkbox.value)) {
                        order.push(checkbox.value);
                    }
                }
            }
        }

        DESTINOS_ORDENADOS = DESTINOS_ATIVOS.sort((a, b) => {
            if (a.destinosID === '') return -1;
            if (b.destinosID === '') return 1;
            if (order.includes(a.destinosID) && order.includes(b.destinosID)) {
                return order.indexOf(a.destinosID) - order.indexOf(b.destinosID);
            }
            if (order.includes(a.destinosID)) return -1;
            if (order.includes(b.destinosID)) return 1;
            return 0;
        });
    }
}

// Destinos Ativos Select (Para Lineup)
function _updateDestinosAtivosSelectHTML(tipo, j) {
    const visibility = DESTINOS_ATIVOS.length > 0 ? 'block' : 'none';
    _loadDestinosOrdenados();

    const values = DESTINOS_ORDENADOS.map(destino => destino.destinosID);
    const options = _getDestinosAtivosSelectOptions(DESTINOS_ORDENADOS);

    function _write(tipo, j) {
        const originalValue = getID(`${tipo}-local-${j}`).value;
        getID(`${tipo}-local-${j}`).innerHTML = options;
        getID(`${tipo}-local-box-${j}`).style.display = visibility;

        if (values.includes(originalValue)) {
            getID(`${tipo}-local-${j}`).value = originalValue;
        }
    }

    if (j) {
        _write(tipo, j);
    } else {
        const childs = _getChildIDs(`${tipo}-box`);
        for (const child of childs) {
            const j = _getJ(child);
            _write(tipo, j);
        }
    }
}

function _getDestinosAtivosSelectOptions(destinosAtivos = DESTINOS_ATIVOS) {
    let result = '<option value="">Destino Não Especificado</option>';
    for (const destino of destinosAtivos) {
        result += `<option value="${destino.destinosID}">${destino.titulo}</option>`;
    }
    return result;
}

function _getDestinosAtivosSelectVisibility() {
    return DESTINOS_ATIVOS.length > 0 ? 'block' : 'none';
}

// Destinos Checkbox (Para Destinos e Programação)
function _updateDestinosAtivosCheckboxHTML(tipo, j) {
    const visibility = DESTINOS_ATIVOS.length > 0 ? 'block' : 'none';
    const values = DESTINOS_ATIVOS.map(destino => destino.destinosID);

    function _write(tipo, j) {
        const id = `${tipo}-local-${j}`;
        const childs = _getChildIDs(id);
        const div = getID(id);

        div.style.display = visibility;
        const originalValues = [];

        for (const child of childs) {
            const k = child.split('-')[2];
            const checkbox = getID(`check-${tipo}-${j}-${k}`);
            if (values.includes(checkbox.value) && checkbox.checked) {
                originalValues.push(checkbox.value);
            }
        }

        div.innerHTML = _getDestinosAtivosCheckboxOptions(tipo, j);

        if (originalValues.length > 0) {
            for (const child of childs) {
                const k = child.split('-')[2];
                const checkbox = getID(`check-${tipo}-${j}-${k}`);
                if (checkbox && originalValues.includes(checkbox.value)) {
                    checkbox.checked = true;
                }
            }
        }
        _loadDestinosCheckboxListeners(tipo, j);
    }

    if (j) {
        _write(tipo, j);
    } else {
        const childs = _getChildIDs(`${tipo}-box`);
        for (const child of childs) {
            const innerJ = _getJ(child);
            _write(tipo, innerJ);
        }
    }
}

function _getDestinosAtivosCheckboxOptions(tipo, j, destinosAtivos = DESTINOS_ATIVOS) {
    let items = [];
    for (let k = 1; k <= destinosAtivos.length; k++) {
        const destino = destinosAtivos[k - 1];
        items.push(_getDestinosItemCheckbox(j, destino.destinosID, destino.titulo, tipo, k));
    }
    return items.join('');
}

function _getDestinosAtivosCheckboxOptionWithID(checkboxOption, tipo) {
    return checkboxOption.replace(/check-destinos/g, `check-${tipo}`);
}

function _addValuesForDestinosAtivosCheckbox(tipo, j, values) {
    const fieldsetID = `${tipo}-local-${j}`;
    for (const containerID of _getChildIDs(fieldsetID)) {
        const ids = _getIDs(containerID);
        const checkbox = getID(`check-${tipo}-${ids}`);
        if (values.includes(checkbox.value)) {
            checkbox.checked = true;
        }
    }
}

function _getDestinosItemCheckbox(j, destinosID, titulo, tipo = 'destinos', k) {
    if (!j) {
        console.error('Erro ao tentar criar um item de checkbox de destinos. O valor de j não foi fornecido.')
    }
    const ids = k ? `${j}-${k}` : j;
    return `<div class="nice-form-group" id="checkbox-${ids}">
                <input type="checkbox" id="check-${tipo}-${ids}" value="${destinosID}">
                <label id=check-${tipo}-label-${ids} for="check-${tipo}-${ids}">${titulo}</label>
            </div>`
}

function _loadDestinosCheckboxListeners(tipo, j) {
    switch (tipo) {
        case 'programacao':
            _loadProgramacaoListeners(j);
    }
}

function _getDestinosFromCheckbox(tipo, j) {
    result = [];
    for (const child of _getChildIDs(`${tipo}-local-${j}`)) {
        const k = child.split('-')[2];
        const checkbox = getID(`check-${tipo}-${j}-${k}`);
        if (checkbox.checked) {
            result.push({
                titulo: getID(`check-${tipo}-label-${j}-${k}`).innerText,
                destinosID: checkbox.value,
            });
        }
    }
    return result;
}

// Outros (Genérico)
function _getDestinoTitle(destinoID) {
    if (!destinoID) return '';
    for (const destino of DESTINOS) {
        if (destino.code === destinoID) {
            return destino.titulo;
        }
    }
}