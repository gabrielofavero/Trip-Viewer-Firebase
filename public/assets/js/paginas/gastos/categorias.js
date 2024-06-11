// Resumo
function _loadResumo() {
    _loadChartResumo();

    const gastosPrevios = GASTOS_CONVERTIDOS[MOEDA_ATUAL]['gastosPrevios'].resumo;
    getID(`resumo-gastosPrevios-titulo`).innerText = `Gastos Prévios (${MOEDA_ATUAL})`;
    _setTable('resumo-gastosPrevios', gastosPrevios.itens, gastosPrevios.total);

    const gastosDurante = GASTOS_CONVERTIDOS[MOEDA_ATUAL]['gastosDurante'].resumo;
    getID(`resumo-gastosDurante-titulo`).innerText = `Gastos na Viagem (${MOEDA_ATUAL})`;
    _setTable('resumo-gastosDurante', gastosDurante.itens, gastosDurante.total);
}

function _loadChartResumo() {
    const labels = ['Gastos Prévios', 'Gastos na Viagem'];
    const valores = [GASTOS_CONVERTIDOS[MOEDA_ATUAL].gastosPrevios.resumo.total, GASTOS_CONVERTIDOS[MOEDA_ATUAL].gastosDurante.resumo.total];

    getID('resumo-titulo').innerText = `Resumo dos Gastos (${MOEDA_ATUAL})`;
    getID('resumo-total').innerText = `Total: ${_formatMoeda(valores[0] + valores[1], true)}`;

    _setDoughnutChart('resumo-grafico', labels, valores)
}

// Gastos Prévios
function _loadGastosPrevios() {
    getID(`gastosPrevios-container`).innerHTML = '';
    _setDoughnutChartCategoria(`Gastos Prévios (${MOEDA_ATUAL})`, 'gastosPrevios');
    _setTableCategoria('gastosPrevios');
}

// Gastos na Viagem
function _loadGastosDurante() {
    getID(`gastosDurante-container`).innerHTML = '';
    _setDoughnutChartCategoria(`Gastos na Viagem (${MOEDA_ATUAL})`, 'gastosDurante');
    _setTableCategoria('gastosDurante');
}


function _setDoughnutChartCategoria(titulo, tipo) {
    const container = getID(`${tipo}-container`);
    const total = GASTOS_CONVERTIDOS[MOEDA_ATUAL][tipo].resumo.total;

    const div = document.createElement('div');
    div.className = 'gastos-card grafico-pizza';

    const h2 = document.createElement('h2');
    h2.className = 'gastos-titulo';
    h2.innerText = titulo;
    div.appendChild(h2);

    const subtitulo = document.createElement('div');
    subtitulo.className = 'gastos-subtitulo';
    subtitulo.id = `${tipo}-total`;
    subtitulo.innerText = `Total: ${_formatMoeda(total, true)}`;
    div.appendChild(subtitulo);

    const canvas = document.createElement('canvas');
    canvas.id = `${tipo}-grafico`;
    canvas.width = 300;
    canvas.height = 300;
    div.appendChild(canvas);

    container.appendChild(div);

    const itens = GASTOS_CONVERTIDOS[MOEDA_ATUAL][tipo].itens;
    const labels = itens.map(item => item.nome);
    const valores = itens.map(item => item.total);
    _setDoughnutChart(`${tipo}-grafico`, labels, valores);
}

function _setTableCategoria(tipo) {
    const container = getID(`${tipo}-container`);
    const itens = GASTOS_CONVERTIDOS[MOEDA_ATUAL][tipo].itens;

    for (let j = 1; j <= itens.length; j++) {
        const item = itens[j - 1];
        const id = `${tipo}-${j}`;

        const recibo = document.createElement('div');
        recibo.className = 'gastos-card gastos-recibo';

        const h2 = document.createElement('h2');
        h2.className = 'gastos-titulo';
        h2.innerText = `${item.nome} (${MOEDA_ATUAL})`;
        recibo.appendChild(h2);

        const table = document.createElement('table');
        table.className = 'card-full-size';
        table.id = `${id}-tabela`;
        recibo.appendChild(table);

        container.appendChild(recibo);

        _setTable(id, item.itens, item.total);
    }
}