var DYNAMIC_SELECT = {};

function _newDynamicSelect(type, outroFeminino=true) {
    DYNAMIC_SELECT[type] = {
        selectors: {},
        values: {},
        selectInnerHTML: '',
        outroFeminino: outroFeminino,
    }
}

function _addSelectorDS(type, selectID, inputID) {
    DYNAMIC_SELECT[type].selectors[selectID] = {
        inputID: inputID,
        value: '',
    }
    _addEventListenersDS(type, selectID, inputID);
}

function _removeValueDS(type, value) {
    if (value) {
        DYNAMIC_SELECT[type].values[value]--;
        if (DYNAMIC_SELECT[type].values[value] === 0) {
            delete DYNAMIC_SELECT[type].values[value];
        }
    }
}

function _updateValueDS(type, value, selectID) {
    const lastValue = DYNAMIC_SELECT[type].selectors[selectID].value;
    _removeValueDS(type, lastValue);
    DYNAMIC_SELECT[type].selectors[selectID].value = '';

    if (value) {
        DYNAMIC_SELECT[type].selectors[selectID].value = value;

        _addValueDS(type, value);

        getID(DYNAMIC_SELECT[type].selectors[selectID].inputID).value = '';
        getID(selectID).value = value;
    }

    // Função Privada
    function _addValueDS(type, value) {
        if (!DYNAMIC_SELECT[type].values[value]) {
            DYNAMIC_SELECT[type].values[value] = 1
        } else {
            DYNAMIC_SELECT[type].values[value]++;
        }
    }
}

function _buildDS(type) {
    _buildSelectDS(type);
    _applySelectDS(type);

    function _buildSelectDS(type) {
        let selectInnerHTML = `<option value="">Selecione</option>`;
        const values = Object.keys(DYNAMIC_SELECT[type].values).sort();

        for (const value of values) {
            selectInnerHTML += `<option value="${value}">${value}</option>`;
        }

        selectInnerHTML += `<option value="outra">${DYNAMIC_SELECT[type].outroFeminino ? 'Outra' : 'Outro'}</option>`;
        DYNAMIC_SELECT[type].selectInnerHTML = selectInnerHTML;
    }

    function _applySelectDS(type) {
        for (const selectID in DYNAMIC_SELECT[type].selectors) {
            const select = getID(selectID);
            const input = getID(DYNAMIC_SELECT[type].selectors[selectID].inputID);

            const value = select.value || DYNAMIC_SELECT[type].selectors[selectID].value;

            select.innerHTML = DYNAMIC_SELECT[type].selectInnerHTML;
            if (DYNAMIC_SELECT[type].values[value]) {
                select.value = value;
            }
            select.style.display = 'block';
            input.style.display = select.value === 'outra' ? 'block' : 'none';
        }
    }
}

function _addEventListenersDS(type, selectID, inputID) {
    const select = getID(selectID);
    const input = getID(inputID);

    select.addEventListener('change', () => {
        const value = select.value;
        if (value === 'outra') {
            input.style.display = 'block';
        } else {
            input.style.display = 'none';
            _updateValueDS(type, value, selectID);
        }
    });

    input.addEventListener('change', () => {
        _updateValueDS(type, input.value, selectID);
    });
}

function _addRemoveChildListenerDS(categoria, j, dynamicSelects=[]) {
    getID(`remove-${categoria}-${j}`).addEventListener('click', function () {
        
        for (const dynamicSelect of dynamicSelects) {
            _removeSelectorDS(dynamicSelect.type, dynamicSelect.selectID);
        }
        
        _removeChildWithValidation(categoria, j);

        for (const dynamicSelect of dynamicSelects) {
            _buildDS(dynamicSelect.type);
        }
        
    });
}

function _removeSelectorDS(type, selectID) {
    const value = DYNAMIC_SELECT[type].selectors[selectID].value;
    _removeValueDS(type, value);
    delete DYNAMIC_SELECT[type].selectors[selectID];
}

function _getSelectorsByValueDS(type, value) {
    const selectors = {};
    for (const selectID in DYNAMIC_SELECT[type].selectors) {
        const selector = DYNAMIC_SELECT[type].selectors[selectID];
        if (selector.value === value) {
            selectors[selectID] = selector;
        }
    }
    return selectors;
}

function _replaceSelectorsValueDS(type, oldValue, newValue) {
    const selectors = _getSelectorsByValueDS(type, oldValue);
    for (const selectID in selectors) {
        _updateValueDS(type, newValue, selectID);
    }
    _buildDS(type);
}