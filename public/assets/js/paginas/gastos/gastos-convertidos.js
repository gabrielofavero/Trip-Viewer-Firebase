
var GASTOS_CONVERTIDOS = {};

function _loadGastosConvertidos() {
    _processGastosConvertidos('gastosDurante');
    _processGastosConvertidos('gastosPrevios');
    getID('conversao').innerText = GASTOS_CONVERTIDOS[MOEDA_ATUAL].conversao || _getEmptyChar();
}

function _processGastosConvertidos(tipoGasto) {
    for (const moeda of MOEDAS.resumo) {
        if (!GASTOS_CONVERTIDOS[moeda]) {
            const conversao = _getConversaoText(moeda);
            GASTOS_CONVERTIDOS[moeda] = { conversao };
        }
        GASTOS_CONVERTIDOS[moeda][tipoGasto] = _calculateGastosConvertidos(tipoGasto, moeda);
    }
}

function _calculateGastosConvertidos(tipo, moeda) {

    function _updateResumo(resumo, tipoGasto, valor) {
        const resumoNomes = resumo.itens.map(item => item.nome);
        const resumoIndex = resumoNomes.indexOf(tipoGasto);
        if (resumoIndex >= 0) {
            resumo.itens[resumoIndex].valor += valor;
        } else {
            resumo.itens.push({
                nome: tipoGasto,
                valor
            });
        }
    }

    function _updateItens(itens, tipoGasto, nomeGasto, valor) {
        const itemNomes = itens.map(item => item.nome);
        const itemIndex = itemNomes.indexOf(tipoGasto);
        if (itemIndex >= 0) {
            itens[itemIndex].total += valor;
            itens[itemIndex].itens.push({
                nome: nomeGasto,
                valor
            });
        } else {
            itens.push({
                nome: tipoGasto,
                total: valor,
                itens: [{
                    nome: nomeGasto,
                    valor
                }]
            });
        }
    }

    const gastos = GASTOS[tipo];
    const resumo = {
        total: 0,
        itens: []
    };
    const itens = [];

    for (const gasto of gastos) {
        let valor = gasto.valor;
        let include = true;
        
        if (gasto.moeda != moeda) {
            if (_canConvert([gasto.moeda, moeda])) {
                valor = _convertMoeda(gasto.moeda, moeda, gasto.valor);
            } else {
                include = false;
            }
        }
        
        if (include) {
            resumo.total += valor;
            valor = parseFloat(valor.toFixed(2));

            _updateResumo(resumo, gasto.tipo, valor);
            _updateItens(itens, gasto.tipo, gasto.nome, valor);
        }
    }

    resumo.total = parseFloat(resumo.total.toFixed(2));
    return { resumo, itens };
}

function _getConversaoText(moeda) {
    if (MOEDA_PADRAO === moeda || !_canConvert([MOEDA_PADRAO, moeda])) {
        return '';
    }
    const conversao = _convertMoeda(moeda, MOEDA_PADRAO, 1);
    return `1 ${moeda} = ${_formatMoeda(conversao)} ${MOEDA_PADRAO}`
}