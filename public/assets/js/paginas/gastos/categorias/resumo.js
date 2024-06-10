function _loadResumo() {
    _loadChartResumo();
    _loadTableResumo('gastosPrevios', 'Gastos Prévios')
    _loadTableResumo('gastosDurante', 'Gastos na Viagem')
}

function _loadTableResumo(tipo, titulo) {
    const gastos = GASTOS_CONVERTIDOS[MOEDA_ATUAL][tipo].resumo
    
    if (gastos.itens.length === 0) {
        return;
    }

    getID(`resumo-${tipo}-titulo`).innerText = `${titulo} (${MOEDA_ATUAL})`;

    const tabela = getID(`resumo-${tipo}-tabela`);
    tabela.innerHTML = '';
    tabela.appendChild(tbody(gastos.itens));
    tabela.appendChild(tfoot(gastos.total));
    getID(`resumo-${tipo}`).style.display = '';

    function tbody(itens) {
        const tbody = document.createElement('tbody');
        for (const item of itens) {
            tbody.appendChild(tr(item));
        }
        return tbody;
    }

    function tr(item) {
        const tr = document.createElement('tr');

        const td1 = document.createElement('td');
        td1.className = `tabela-texto-esquerda`;
        td1.innerText = item.nome;
        tr.appendChild(td1);

        const td2 = document.createElement('td');
        td2.className = `tabela-texto-direita`;
        td2.innerText = _formatMoeda(item.valor);
        tr.appendChild(td2);

        return tr;
    }

    function tfoot(total) {
        const tFoot = document.createElement('tfoot');

        const tr = document.createElement('tr');
        const td1 = document.createElement('td');
        td1.className = 'tabela-texto-esquerda total';
        td1.innerText = 'Total';
        tr.appendChild(td1);

        const td2 = document.createElement('td');
        td2.className = 'tabela-texto-direita total';
        td2.innerText = _formatMoeda(total, true);
        tr.appendChild(td2);

        tFoot.appendChild(tr);
        return tFoot;
    }
}

function _loadChartResumo() {
    const labels = ['Gastos Prévios', 'Gastos na Viagem'];
    const valores = [GASTOS_CONVERTIDOS[MOEDA_ATUAL].gastosPrevios.resumo.total, GASTOS_CONVERTIDOS[MOEDA_ATUAL].gastosDurante.resumo.total];
    
    getID('resumo-titulo').innerText = `Resumo dos Gastos (${MOEDA_ATUAL})`;
    getID('resumo-total').innerText = `Total: ${_formatMoeda(valores[0] + valores[1], true)}`;
    
    _setDoughnutChart('resumo', 'resumo-grafico', labels, valores)
}