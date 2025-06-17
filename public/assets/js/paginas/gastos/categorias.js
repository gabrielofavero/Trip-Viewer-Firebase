// Resumo
function _loadResumo() {
    _loadChartResumo();

    if (GASTOS_CONVERTIDOS[MOEDA_ATUAL]['gastosPrevios'].length === 0 || GASTOS_CONVERTIDOS[MOEDA_ATUAL]['gastosDurante'].length === 0) {
        getID('radio-resumo').style.display = 'none';
        return;
    }

    const gastosPrevios = GASTOS_CONVERTIDOS[MOEDA_ATUAL]['gastosPrevios'].resumo;
    getID(`resumo-gastosPrevios-titulo`).innerHTML = _getTitleWithIcon(`Gastos Prévios`);
    _setTable('resumo-gastosPrevios', gastosPrevios.itens, gastosPrevios.total);

    const gastosDurante = GASTOS_CONVERTIDOS[MOEDA_ATUAL]['gastosDurante'].resumo;
    getID(`resumo-gastosDurante-titulo`).innerHTML = _getTitleWithIcon(`Gastos na Viagem`);
    _setTable('resumo-gastosDurante', gastosDurante.itens, gastosDurante.total);
}

function _loadChartResumo() {
    const labels = [translate('trip.expenses.pre_trip'), translate('trip.expenses.during_trip')];
    const valores = [GASTOS_CONVERTIDOS[MOEDA_ATUAL].gastosPrevios.resumo.total, GASTOS_CONVERTIDOS[MOEDA_ATUAL].gastosDurante.resumo.total];

    getID('resumo-titulo').innerHTML = _getTitleWithIcon(`Resumo dos Gastos`);
    getID('resumo-total').innerText = `Total: ${_formatMoeda(valores[0] + valores[1], true)}`;

    _setChart('doughnut', 'resumo-grafico', labels, valores)
}

// Gastos Prévios
function _loadGastosPrevios() {
    _setDoughnutChartCategoria(translate('trip.expenses.pre_trip'), 'gastosPrevios');
    _setTableCategoria('gastosPrevios');
}

// Gastos na Viagem
function _loadGastosDurante() {
    _setDoughnutChartCategoria(translate('trip.expenses.during_trip'), 'gastosDurante');
    _setTableCategoria('gastosDurante');
}

function _setDoughnutChartCategoria(titulo, tipo) {
    const itens = GASTOS_CONVERTIDOS[MOEDA_ATUAL][tipo].itens;
    const total = GASTOS_CONVERTIDOS[MOEDA_ATUAL][tipo].resumo.total;

    getID(`${tipo}-titulo`).innerHTML = _getTitleWithIcon(titulo);
    getID(`${tipo}-total`).innerText = `Total: ${_formatMoeda(total, true)}`;

    const labels = itens.map(item => item.nome);
    const valores = itens.map(item => item.total);

    _setChart('doughnut', `${tipo}-grafico`, labels, valores);
}

function _setTableCategoria(tipo) {
    _unsetTableCategoria(tipo);

    const itens = GASTOS_CONVERTIDOS[MOEDA_ATUAL][tipo].itens;
    const container = getID(`${tipo}-container`);

    for (let j = 1; j <= itens.length; j++) {
        const item = itens[j - 1];
        const id = `${tipo}-${j}`;

        const recibo = document.createElement('div');
        recibo.id = `${id}-recibo`;
        recibo.className = 'gastos-card gastos-recibo';

        const h2 = document.createElement('h2');
        h2.className = 'gastos-titulo';
        h2.innerHTML = _getTitleWithIcon(item.nome);
        recibo.appendChild(h2);

        const table = document.createElement('table');
        table.className = 'card-full-size';
        table.id = `${id}-tabela`;
        recibo.appendChild(table);

        container.appendChild(recibo);

        _setTable(id, item.itens, item.total);
    }
}

function _unsetTableCategoria(tipo) {
    let j = 1;
    while (getID(`${tipo}-${j}-recibo`)) {
        getID(`${tipo}-${j}-recibo`).remove();
        j++;
    }
}

function _getTitleWithIcon(titlePath, forceIcon = true) {
    const title = translate(titlePath, {}, false);
    const icon = CONFIG.icons[titlePath];
    
    if (!icon && !forceIcon) {
        return title;
    }

    return `<i class="iconify" data-icon="${icon || CONFIG.icons["trip.expenses.title"]}"></i> ${title}`;
}