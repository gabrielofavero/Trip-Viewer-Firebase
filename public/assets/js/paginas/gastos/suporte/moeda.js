var MOEDA_PADRAO;
var MOEDA_CONVERSAO = {};
var MOEDA_ATUAL;

var MOEDAS = {
    resumo: [],
    gastosPrevios: [],
    gastosDurante: []
};

async function _loadMoedas() {
    MOEDA_PADRAO = GASTOS.moeda;

    _loadMoedasObject();

    switch (MOEDAS.resumo.length) {
        case 0:
            MOEDA_ATUAL = MOEDAS.resumo.includes(MOEDA_PADRAO) ? MOEDA_PADRAO : MOEDAS.resumo[0];
            getID('tab-moedas').style.display = 'none';
            break
        case 1:
            MOEDA_ATUAL = MOEDAS.resumo[0];
        default:
            MOEDA_ATUAL = MOEDAS.resumo.includes(MOEDA_PADRAO) ? MOEDA_PADRAO : MOEDAS.resumo[0];
            await _loadMoedaConversao();
            _loadMoedasTab();
    }
}

function _loadMoedasObject() {
    if (GASTOS.gastosPrevios.length > 0 || GASTOS.gastosDurante.length > 0) {
        let moedasPrevias = [];
        let moedasDurante = [];

        if (GASTOS.gastosPrevios.length > 0) {
            moedasPrevias = _filterMoedas(GASTOS.gastosPrevios.map(gasto => gasto.moeda));
            MOEDAS.gastosPrevios = moedasPrevias;
        }

        if (GASTOS.gastosDurante.length > 0) {
            moedasDurante = _filterMoedas(GASTOS.gastosDurante.map(gasto => gasto.moeda));
            MOEDAS.gastosDurante = moedasDurante;
        }

        MOEDAS.resumo = [...new Set([...moedasPrevias, ...moedasDurante])];

        MOEDAS.resumo = _sortMoedas(MOEDAS.resumo);
        MOEDAS.gastosPrevios = _sortMoedas(MOEDAS.gastosPrevios);
        MOEDAS.gastosDurante = _sortMoedas(MOEDAS.gastosDurante);
    }
}

async function _loadMoedaConversao() {
    const comparacoes = [];
    const chaves = [];
    for (const moeda of MOEDAS.resumo) {
        if (moeda !== MOEDA_PADRAO) {
            comparacoes.push(`${moeda}-${MOEDA_PADRAO}`);
            chaves.push(moeda + MOEDA_PADRAO);
        }
    }
    if (comparacoes.length === 0) {
        return;
    }
    const url = `https://economia.awesomeapi.com.br/last/${comparacoes.join(',')}`;
    const data = await _fetchConversoes(url);
    if (data) {
        for (const chave of chaves) {
            MOEDA_CONVERSAO[chave] = data[chave].bid;
        }
    }

}

async function _fetchConversoes(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            console.error(`Network issue while trying to fetch currency information:`);
            console.error(response);
            console.warn(`Using default currency ${MOEDA_PADRAO}`);
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error(error);
        console.warn(`Using default currency ${MOEDA_PADRAO}`);
    }
}

function _loadMoedasTab() {
    const moedasTab = getID('tab-moedas');
    moedasTab.innerHTML = '';
    moedasTab.style.display = MOEDAS.resumo.length > 1 ? '' : 'none';

    for (let j = 1; j <= MOEDAS.resumo.length; j++) {
        const checked = MOEDAS.resumo[j-1] === MOEDA_ATUAL ? 'checked' : '';
        moedasTab.innerHTML += `<input type="radio" id="radio-moeda-${j}" name="tabs-moedas" ${checked} />`
        moedasTab.innerHTML += `<label class="tab-mini" for="radio-moeda-${j}">${MOEDAS.resumo[j-1]}</label>`
    }

    moedasTab.innerHTML += '<span class="glider-mini"></span>';

    const childs = _getChildIDs('tab-moedas');
    for (let i = 0; i < childs.length; i++) {
        _setCSSRule(`input[id="${childs[i]}"]:checked~.glider-mini`, 'transform', `translateX(${i * 100}%)`);

        const radio = getID(`radio-moeda-${i+1}`);
        radio.addEventListener('change', () => {
            if (radio.checked) {
                MOEDA_ATUAL = MOEDAS.resumo[i];
                _applyGastos();
                _setTabListeners();
            }
        });
    }
}

function _filterMoedas(arr) {
    return arr.filter((moeda, index, self) => self.indexOf(moeda) === index && moeda)
}

function _sortMoedas(arr) {
    return arr.sort((a, b) => {
        if (a === MOEDA_PADRAO) {
            return -1;
        } else if (b === MOEDA_PADRAO) {
            return 1;
        } else {
            return 0;
        }
    });
}

function _convertMoeda(from, to, valor) {
    if (from === to) {
        return valor;
    }

    if (MOEDA_CONVERSAO[from + to]) {
        return valor * MOEDA_CONVERSAO[from + to];
    }

    if (MOEDA_CONVERSAO[to + from]) {
        return valor / MOEDA_CONVERSAO[to + from];
    } else {
        console.error(`Conversion error: from ${valor} ${from} to ? ${to}`)
        _displayError(translate('messages.errors.unknown'));
    }
}

function _getMoedaSymbol(moeda) {
    if (CONFIG.moedas.simbolos[moeda]) {
        return CONFIG.moedas.simbolos[moeda];
    } else {
        return moeda;
    }
}

function _canConvert(moedas) {
    if (moedas.length == 1) {
        return true;
    }

    const keys = Object.keys(MOEDA_CONVERSAO);
    if (keys.length === 0) {
        return false;
    }

    for (const moeda of moedas) {
        if (!keys.some(key => key.includes(moeda))) {
            return false;
        }
    }
    return true;
}

function _formatMoeda(moedaFloat, includeSymbol=false) {
    const result =  new Intl.NumberFormat('pt-BR', {
        style: 'decimal',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(moedaFloat);

    return includeSymbol ? `${_getMoedaSymbol(MOEDA_ATUAL)} ${result}` : result;
}