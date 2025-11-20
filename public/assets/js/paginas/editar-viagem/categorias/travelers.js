var TRAVELERS = [];
const INCLUDE_LATE_TRAVELERS = false; // Flag to include late travelers in the fieldset

function _openTravelersInfo() {
    const propriedades = _cloneObject(MENSAGEM_PROPRIEDADES);
    propriedades.titulo = translate('trip.travelers.info')
    propriedades.containers = _getContainersInput();
    propriedades.conteudo = _getTravelersInfoContent();
    propriedades.botoes = [{
        tipo: 'cancelar',
    }, {
        tipo: 'confirmar',
        acao: `_saveTravelersInfo()`
    }];

    _displayFullMessage(propriedades);
    getID('quantidadePessoas').addEventListener('change', function () {
        getID('travelers-names-container').innerHTML = _getTravelersNameContent(parseInt(this.value));
    });
}

function _getTravelersInfoContent() {
    const value = TRAVELERS.length || 1;
    return `
    <div class="nice-form-group">
        <label>${translate('trip.travelers.quantity')}</label>
        <input required class="flex-input" id="quantidadePessoas" type="number" placeholder="0" min="1" max="10" value="${value}" />
    </div>
    <div id="travelers-names-container">
        ${_getTravelersNameContent(value)}
    </div>
    <div class="nice-form-group" id="travelers-names-unique" style="display: none">
        <span class="red">${translate('trip.travelers.unique')}</span>
    </div>

    `
}

function _getTravelersNameContent(quantity) {
    const properties = [];
    const nameLabel = translate('labels.name');
    for (let i = 0; i < quantity; i++) {
        const id = `traveler-name-${i + 1}`;
        const person = TRAVELERS[i]?.nome || '';
        const value = getID(id)?.value || person || '';

        properties.push(`
            <div class="nice-form-group">
                <label>${nameLabel} ${i + 1}</label>
                <input id="traveler-name-${i + 1}" type="text" maxlength="10" placeholder="${nameLabel}" ${value ? `value="${value}"` : ''}>
            </div>
        `);
    }
    return properties.join('');
}

function _saveTravelersInfo() {
    let j = 1;
    const nomes = []
    while (getID(`traveler-name-${j}`)) {
        nomes.push(getID(`traveler-name-${j}`).value.trim())
        j++;
    }

    const hasRepetitions = nomes.some((nome, index) => {
        return nomes.indexOf(nome) !== index && nome !== '';
    });

    if (hasRepetitions) {
        getID('travelers-names-unique').style.display = 'block';
        return;
    }

    TRAVELERS = [];
    for (const nome of nomes) {
        TRAVELERS.push({ nome: nome || '' });
    }

    _closeMessage();
    _updateTravelersButtonLabel();
}

function _getTravelersFieldset(id) {
    const result = document.createElement('div');
    result.className = 'nice-form-group';

    if (id) {
        result.id = id;
    }

    const mandatory = document.createElement('span');
    mandatory.id = `${id}-mandatory`;
    mandatory.className = 'red';
    mandatory.textContent = `(${translate('messages.select_one')})`
    mandatory.style.display = 'none';

    const titleLabel = document.createElement('label');
    titleLabel.appendChild(document.createTextNode(translate('trip.travelers.title') + ' ')); // texto + espaço
    titleLabel.appendChild(mandatory);
    result.appendChild(titleLabel);

    const fieldset = document.createElement('fieldset');
    fieldset.className = 'double-fieldset';
    let travelers = 0;

    for (let j = 1; j <= TRAVELERS.length; j++) {
        const nome = TRAVELERS[j - 1].nome;

        if (!nome) {
            continue; // Skip if no name is provided
        }

        const div = document.createElement('div');
        div.id = `checkbox-${j}`;
        div.className = 'nice-form-group';
        div.style.marginTop = '0px';

        const input = document.createElement('input');
        input.type = 'checkbox';
        input.id = `${id}-${j}`;
        input.value = nome || '';
        input.checked = true; // Default to checked

        const label = document.createElement('label');
        label.id = `${id}-label-${j}`;
        label.className = 'checkbox-label';
        label.setAttribute('for', input.id);
        label.textContent = nome;

        div.appendChild(input);
        div.appendChild(label);
        fieldset.appendChild(div);
        travelers++;
    }

    result.appendChild(fieldset);

    return travelers > 1 ? result.outerHTML : '';
}

function _enableAllTravelersFieldset(id) {
    const checkedData = []
    for (let j = 1; j <= TRAVELERS.length; j++) {
        const nome = TRAVELERS[j - 1].nome;
        const isPresent = true;
        checkedData.push({ nome, isPresent });
    }
    _updateTravelersFieldset(id, checkedData);
}

function _updateTravelersFieldset(id, checkedData = []) {
    let j = 1;
    while (getID(`${id}-${j}`)) {
        const checkbox = getID(`${id}-${j}`);
        const checkboxName = checkbox.value;
        const traveler = checkedData.find(t => t.nome === checkboxName);

        checkbox.checked = traveler?.isPresent === undefined ? INCLUDE_LATE_TRAVELERS : traveler.isPresent;
        j++;
    }
}

function _getCheckedTravelersIDs(id) {
    const result = [];
    let j = 1;
    while (getID(`${id}-${j}`)) {
        const checkbox = getID(`${id}-${j}`);
        result.push({
            nome: checkbox.value,
            isPresent: checkbox.checked,
        })
        j++;
    }

    const missingNames = TRAVELERS.filter(t => !result.some(r => r.nome === t.nome));
    for (const missing of missingNames) {
        result.push({
            nome: missing.nome,
            isPresent: INCLUDE_LATE_TRAVELERS,
        });
    }

    return result;
}

function _validateTravelersFieldset(id) {
    let isValid = false;
    let j = 1;
    while (getID(`${id}-${j}`)) {
        const checkbox = getID(`${id}-${j}`);
        if (checkbox.checked) {
            isValid = true;
            break;
        }
        j++;
    }
    if (!isValid) {
        getID(`${id}-mandatory`).style.display = 'inline';
    }

    return isValid;
}

function _updateTravelersButtonLabel() {
    const count = TRAVELERS.length || 1;
    getID('travelers-info').textContent = count > 1 ? translate('trip.travelers.multiple', { count }) : translate('trip.travelers.one');
}