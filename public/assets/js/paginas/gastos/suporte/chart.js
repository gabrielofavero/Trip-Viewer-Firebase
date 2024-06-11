var GASTOS_CHARTS = {};

function _setDoughnutChart(tipo, id, labels, valores) {
    const div = getID(id);

    if (GASTOS_CHARTS[tipo]) {
        GASTOS_CHARTS[tipo].data.labels = labels;
        GASTOS_CHARTS[tipo].data.datasets[0].data = valores;
        GASTOS_CHARTS[tipo].update();
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
                        color: "rgba(107, 114, 128, 1)",
                    },
                },
            },
        },
    };
    GASTOS_CHARTS[tipo] = new Chart(div, config);
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