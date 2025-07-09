var TRAVELERS = [];

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
    getID('quantidadePessoas').addEventListener('change', function() {
        getID('travelers-names-container').innerHTML = _getTravelersNameContent(parseInt(this.value));
    });
}

function _getTravelersInfoContent() {
    const value = TRAVELERS.length || 1;
    return `
    <div class="nice-form-group">
        <label>${translate('trip.travelers.quantity')}</label>
        <input required class="flex-input" id="quantidadePessoas" type="number" placeholder="0" min="1" value="${value}" />
    </div>
        <div id="travelers-names-container">
            ${_getTravelersNameContent(value)}
        </div>
    `
}

function _getTravelersNameContent(quantity) {
    const properties = [];
    const nameLabel = translate('labels.name');
    for (let i = 0; i < quantity; i++) {
        const id = `traveler-name-${i+1}`;
        const person = TRAVELERS[i]?.nome || '';
        const value = getID(id)?.value || person || '';
        
        properties.push(`
            <div class="nice-form-group">
                <label>${nameLabel} ${i+1}</label>
                <input id="traveler-name-${i+1}" type="text" maxlength="10" placeholder="${nameLabel}" ${value ? `value="${value}"` : ''}>
            </div>
        `);
    }
    return properties.join('');
}

function _saveTravelersInfo() {
    let j = 1;
    while (getID(`traveler-name-${j}`)) {
        const nome = getID(`traveler-name-${j}`).value.trim();
        TRAVELERS[j - 1] = { nome };
        j++;
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
        const nome = TRAVELERS[j-1].nome;

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
        input.value = j || '';
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
    const checkedIds = []
    for (let j = 1; j <= TRAVELERS.length; j++) {
        checkedIds.push(j);
    }
    _updateTravelersFieldset(id, checkedIds);
}

function _updateTravelersFieldset(id, checkedIds=[]) {
    let j = 1;
    while (getID(`${id}-${j}`)) {
        const checkbox = getID(`${id}-${j}`);

        if (checkbox.checked) {
            checkbox.checked = false;
        }
        if (checkedIds.includes(j)) {
            checkbox.checked = true;
        }

        j++;
    }
}

function _getCheckedTravelersIDs(id) {
    const result = [];
    let j = 1;
    while (getID(`${id}-${j}`)) {
        const checkbox = getID(`${id}-${j}`);
        if (checkbox.checked) {
            result.push(checkbox.value);
        }
        j++;
    }

    return result;
}

function _getValidatedTravelersIDs(ids=[]) {
    result = [];
    for (const j of ids) {
        if (TRAVELERS[j - 1]) {
            result.push(j);
        }
    }
    return result;
}

function _validateTravelersFieldset(id) {
    let hasOptios = false;
    while (getID(`${id}-${j}`)) {
        const checkbox = getID(`${id}-${j}`);
        if (checkbox.checked) {
            hasOptios = true;
            break;
        }
        j++;
    }
    if (!hasOptios) {
        // mensagem
    }
}

function _updateTravelersButtonLabel() {
    const count = TRAVELERS.length || 1;
    getID('travelers-info').textContent = count > 1 ? translate('trip.travelers.multiple', { count }) : translate('trip.travelers.one');
}