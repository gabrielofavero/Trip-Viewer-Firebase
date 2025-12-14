var DESTINOS = [];
var DESTINOS_DATA = {};
var DESTINOS_ATIVOS = [];

function _getDestinosArray() {
    const result = [];
    for (const destinosID in DESTINOS_ATIVOS) {
        result.push({ destinosID })
    }
    return result;
}

// Destinos Ativos
async function _loadDestinosAtivos(firstBoot = true) {
    DESTINOS_ATIVOS = [];
    const habilidadoDestinos = getID('habilitado-destinos');
    if (habilidadoDestinos && !habilidadoDestinos.checked) return;

    let result = [];
    const checkboxes = getID('destinos-checkboxes');
    for (const checkbox of checkboxes.children) {
        const input = checkbox.querySelector('input');
        if (!input.checked) continue;

        const titulo = checkbox.querySelector('label').innerText;
        const destinosID = input.value;
        
        // if (!Object.keys(DESTINOS_DATA).includes(destinosID)) {
        //     DESTINOS_DATA[destinosID] = await _get(`destinos/${destinosID}`)
        // }
        result.push ({ titulo, destinosID})
    }

    DESTINOS_ATIVOS = result;
    if (firstBoot) {
        _reorganizeDestinosCheckbox();
        const offsetHeight = getID('destinos-checkboxes').offsetHeight;
        getID('destinos-checkboxes').style.height = `${offsetHeight}px`;
    }
}

async function _updateDestinosAtivosHTMLs() {
    await _loadDestinosAtivos(false);

    if (_getHTMLpage() === 'editar-viagem') {
        _updateDestinosAtivosCheckboxHTML('programacao');
    }
}

function _getDestinosAtivosSelectOptions(destinosAtivos = DESTINOS_ATIVOS) {
    let result = `<option value="">${translate('destination.undefined')}</option>`;
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

        getID(`${tipo}-local-box-${j}`).style.display = visibility;
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
        console.error('Error in _getDestinosItemCheckbox: j is undefined or null.');
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

function _reorganizeDestinosCheckbox() {
    const fieldset = document.getElementById('destinos-checkboxes');
    const checkboxes = Array.from(fieldset.querySelectorAll('.nice-form-group'));

    const ativos = [];
    const inativos = [];

    checkboxes.forEach(group => {
        const input = group.querySelector('input[type="checkbox"]');
        const label = group.querySelector('label');
        const labelText = label.textContent.trim();

        const data = {
            element: group,
            label: labelText.toLowerCase()
        };

        if (input.checked) {
            ativos.push(data);
        } else {
            inativos.push(data);
        }
    });

    ativos.sort((a, b) => a.label.localeCompare(b.label));
    inativos.sort((a, b) => a.label.localeCompare(b.label));

    [...ativos, ...inativos].forEach(item => {
        fieldset.appendChild(item.element);
    });
}

// Outros (Genérico)
function _getDestinoTitle(destinoID) {
    if (!destinoID) return '';
    for (const destino of DESTINOS) {
        if (destino.id === destinoID) {
            return destino.titulo;
        }
    }
}