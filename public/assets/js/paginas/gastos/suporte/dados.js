var GASTOS_CHARTS = {};

function _setTable(id, itens, total) {
    if (!itens || itens.length === 0) {
        return;
    }

    const tabela = getID(`${id}-tabela`);
    tabela.innerHTML = '';
    tabela.appendChild(tbody(itens));
    tabela.appendChild(tfoot(total));

    if (getID(id)) {
        getID(id).style.display = '';
    }

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

function _setDoughnutChart(id, labels, valores) {
    const div = getID(id);

    if (GASTOS_CHARTS[id]) {
        GASTOS_CHARTS[id].data.datasets[0].data = valores;
        GASTOS_CHARTS[id].update();
        return;
    }

    const coresRGB = _getChartColorsRGB(labels.length);

    const dados = {
        labels: labels,
        datasets: [
            {
                label: "Resumo",
                data: valores,
                backgroundColor: _getArrayRGBA(coresRGB, 0.5),
                borderColor: _getArrayRGBA(coresRGB, 1),
                borderWidth: 1,
            },
        ],
    };
    const config = {
        type: "doughnut",
        data: dados,
        options: {
            plugins: {
                legend: {
                    display: true,
                    position: "right",
                    labels: {
                        color: _isOnDarkMode() ? 'rgba(227, 236, 248, 1)' : 'rgba(75, 85, 99, 1)',
                    },
                },
            },
        },
    };
    GASTOS_CHARTS[id] = new Chart(div, config);
}

function _getChartColorsRGB(size) {
    const result = [];
    const coresHex = CONFIG.cores.opcoes.map((cor) => cor.hex);
    const coresRGB = coresHex.map((cor) => _hexToRgb(cor));

    for (let i = 0; i < size; i++) {
        const index = i % coresRGB.length;
        result.push(coresRGB[index]);
    }

    return result;
}

function _getArrayRGBA(coresRGB, a) {
    const result = [];

    for (const rgb of coresRGB) {
        result.push(_rgbToText(rgb[0], rgb[1], rgb[2], a));
    }

    return result;
}

function _changeChartsLabelsVisibility() {
    const cor = _isOnDarkMode() ? 'rgba(227, 236, 248, 1)' : 'rgba(75, 85, 99, 1)';
    for (const chart in GASTOS_CHARTS) {
        GASTOS_CHARTS[chart].options.plugins.legend.labels.color = cor;
        GASTOS_CHARTS[chart].update();
    }
}