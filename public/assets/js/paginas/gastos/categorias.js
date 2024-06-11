// Resumo
function _loadResumo() {
    _loadChartResumo();

    const gastosPrevios = GASTOS_CONVERTIDOS[MOEDA_ATUAL]['gastosPrevios'].resumo;
    _loadTable('Gastos Prévios', 'resumo-gastosPrevios', gastosPrevios.itens, gastosPrevios.total);

    const gastosDurante = GASTOS_CONVERTIDOS[MOEDA_ATUAL]['gastosDurante'].resumo;
    _loadTable('Gastos na Viagem', 'resumo-gastosDurante', gastosDurante.itens, gastosDurante.total);
}

function _loadChartResumo() {
    const labels = ['Gastos Prévios', 'Gastos na Viagem'];
    const valores = [GASTOS_CONVERTIDOS[MOEDA_ATUAL].gastosPrevios.resumo.total, GASTOS_CONVERTIDOS[MOEDA_ATUAL].gastosDurante.resumo.total];
    
    getID('resumo-titulo').innerText = `Resumo dos Gastos (${MOEDA_ATUAL})`;
    getID('resumo-total').innerText = `Total: ${_formatMoeda(valores[0] + valores[1], true)}`;
    
    _setDoughnutChart('resumo', 'resumo-grafico', labels, valores)
}