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
    MOEDA_ATUAL = MOEDA_PADRAO;

    _loadMoedasObject();

    if (MOEDAS.resumo.length > 1) {
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
            console.error('Erro de rede ao tentar obter dados de conversão: ' + response.statusText);
            console.warn('Falha ao carregar conversão de moedas. Usando valores padrão.');
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error(error);
        console.warn('Falha ao carregar conversão de moedas. Usando valores padrão.');
    }
}

function _loadMoedasTab() {
    const moedasTab = getID('tab-moedas');
    moedasTab.style.display = 'block';

    for (let j = 1; j <= MOEDAS.length; j++) {
        moedasTab.innerHTML += `<input type="radio" id="radio-moeda-${j}" name="tabs-moedas" ${j === 1 ? 'checked' : ''} />`
        moedasTab.innerHTML += `<label class="tab-mini" for="radio-moeda-${j}">${MOEDAS[j - 1]}</label>`
    }

    moedasTab.innerHTML += '<span class="glider-mini"></span>';

    const childs = _getChildIDs('tab-moedas');
    for (let i = 1; i < childs.length; i++) {
        _setCSSRule(`input[id="${childs[i]}"]:checked~.glider-mini`, 'transform', `translateX(${i * 100}%)`);
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