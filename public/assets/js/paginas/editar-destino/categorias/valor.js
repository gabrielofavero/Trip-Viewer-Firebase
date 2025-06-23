const VALORES_KEYS = ['-', '$', '$$', '$$$', '$$$$', 'default'];
var VALOR_OPTIONS = '';

function _loadCurrencySelects() {
    _loadMoedaOptions();

    for (const categoria of CONFIG.destinos.categorias.passeios) {
        const childs = _getChildIDs(`${categoria}-box`);
        for (const child of childs) {
            const i = child.split('-').pop();
            if (VALOR_OPTIONS) {
                const select = getID(`${categoria}-valor-${i}`);
                const value = select.value;
                select.innerHTML = VALOR_OPTIONS;
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
    VALOR_OPTIONS = '';

    if (moeda != 'outra' && CONFIG.moedas.escala[moeda]) {
        for (const categoria of VALORES_KEYS) {
            VALOR_OPTIONS += `<option value="${categoria}">${CONFIG.moedas.escala[moeda][categoria]}</option>`;
        }
        if (VALOR_OPTIONS) {
            VALOR_OPTIONS += `<option value="outro">${translate('labels.other')}</option>`;
        }
    }
}

function _getOutroValorVisibility() {
    if (VALOR_OPTIONS) return 'none';
    else return 'block';
}

function _loadMoedaValorAndVisibility(valor, categoria, i) {
    const valorSelect = getID(`${categoria}-valor-${i}`);
    const outroValorDiv = getID(`${categoria}-outro-valor-${i}`);

    const texts = Array.from(valorSelect.options).map(option => option.text);
    const values = Array.from(valorSelect.options).map(option => option.value);

    if (VALOR_OPTIONS && values.includes(valor)) {
        valorSelect.value = valor;
        outroValorDiv.style.display = 'none';
    } else if (VALOR_OPTIONS && texts.includes(valor)) {
        valorSelect.value = values[texts.indexOf(valor)];
        outroValorDiv.style.display = 'none';
    } else {
        valorSelect.value = 'outro';
        outroValorDiv.style.display = 'block';
        outroValorDiv.value = valor;
    }
}