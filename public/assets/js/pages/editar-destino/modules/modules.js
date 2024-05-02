const VALORES_KEYS = ['-', '$', '$$', '$$$', '$$$$', 'default'];
var MOEDA_OPTIONS = '';

// Moeda
function _loadCurrencySelects() {
    _loadMoedaOptions();
    const categorias = ['restaurantes', 'lanches', 'saidas', 'turismo', 'lojas'];
    
    for (const categoria of categorias) {
        const childs = _getChildIDs(`${categoria}-box`);
        for (const child of childs) {
            const i = child.split('-').pop();
            if (MOEDA_OPTIONS) {
                const select = getID(`${categoria}-valor-${i}`);
                const value = select.value;
                select.innerHTML = MOEDA_OPTIONS;
                select.value = value;
            } else {
                getID(`${categoria}-valor-${i}`).style.display = 'none';
                getID(`${categoria}-outro-valor-${i}`).style.display = 'none';
            }
        }
    }
}

function _loadMoedaOptions() {
    const moeda = getID('moeda').value;
    MOEDA_OPTIONS = '';

    if (moeda != 'outra' && CONFIG.destinos.currency[moeda]) {  
        for (const categoria of VALORES_KEYS) {
            MOEDA_OPTIONS += `<option value="${categoria}">${CONFIG.destinos.currency[moeda][categoria]}</option>`;
        }
        if (MOEDA_OPTIONS) {
            MOEDA_OPTIONS += '<option value="outro">Outro</option>';
        }
    }
}

function _getValorVisibility() {
    if (MOEDA_OPTIONS) return 'block';
    else return 'none';
}

function _getOutroValorVisibility() {
    if (MOEDA_OPTIONS) return 'none';
    else return 'block';
}

function _getValorDivAndLoadVisibility(valor, categoria, i) {
    const valorDiv = getID(`${categoria}-valor-${i}`);
    const outroValorDiv = getID(`${categoria}-outro-valor-${i}`);
    
    if (MOEDA_OPTIONS && VALORES_KEYS.includes(valor)) {
        return valorDiv;
    } else {
        valorDiv.value = 'outro';
        outroValorDiv.style.display = 'block';
        return outroValorDiv;
    }
}
