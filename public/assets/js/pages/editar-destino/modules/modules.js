const VALORES_KEYS = ['-', '$', '$$', '$$$', '$$$$', 'default'];
const DESTINOS_CATEGORIAS = ['restaurantes', 'lanches', 'saidas', 'turismo', 'lojas'];

var VALOR_OPTIONS = '';
var SELECT_REGIOES = {
    'restaurantes': [],
    'lanches': [],
    'saidas': [],
    'turismo': [],
    'lojas': []
}

// Emoji

function _getTreatedEmoji(emoji) {
    return emoji.replace(/[a-zA-Z0-9\s!-\/:-@\[-`{-~]/g, '');
}

// Moeda
function _loadCurrencySelects() {
    _loadMoedaOptions();

    for (const categoria of DESTINOS_CATEGORIAS) {
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

    if (moeda != 'outra' && CONFIG.destinos.currency[moeda]) {
        for (const categoria of VALORES_KEYS) {
            VALOR_OPTIONS += `<option value="${categoria}">${CONFIG.destinos.currency[moeda][categoria]}</option>`;
        }
        if (VALOR_OPTIONS) {
            VALOR_OPTIONS += '<option value="outro">Outro</option>';
        }
    }
}

function _getValorVisibility() {
    if (VALOR_OPTIONS) return 'block';
    else return 'none';
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

// Região
function _regiaoSelectAction(categoria, init = false, updateLast = false) {
    let copy = SELECT_REGIOES[categoria];
    SELECT_REGIOES[categoria] = _getUpdatedDynamicSelectArray(categoria, 'regiao');
    _loadDynamicSelect(categoria, 'regiao', copy, SELECT_REGIOES[categoria], init, updateLast);
}

function _loadNewRegiaoSelect(categoria) {
    _regiaoSelectAction(categoria, false, true);
}

function _loadRegiaoListeners(i, categoria) {
    const select = getID(`${categoria}-regiao-select-${i}`);
    const input = getID(`${categoria}-regiao-${i}`);

    select.addEventListener('change', function () {
        _regiaoSelectAction(categoria);
        if (select.value === 'outra') {
            input.style.display = 'block';
        }
    });

    input.addEventListener('change', function () {
        _regiaoSelectAction(categoria);
    });
}