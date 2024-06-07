const FIRESTORE_DATA_MOCK = {
    modules: {
        gastos: true
    }
} // Mock for this template

var CURRENT_GASTO = 'resumo';

document.addEventListener('DOMContentLoaded', function () {
    _loadGastosData();
    _loadTabGlidersVisibility('tab-moedas', true);
    _loadGastosResumo();
});

function _loadGastosData() {
    if (!FIRESTORE_DATA_MOCK.modules.gastos) {
        _displayUnauthorizedMessage('O módulo de gastos não está habilitado para essa viagem.');
    }
}

function _loadGastosResumo() {
    const budgetChart = document.getElementById("budgetChart");
    const budgetData = {
        labels: ["Gastos Prévios", "Gastos Na Viagem"],
        datasets: [
            {
                label: "Budget",
                data: [25000, 10000],
                backgroundColor: ["rgba(60, 191, 174, 0.5)", "rgba(239, 68, 68, 0.5)"],
                borderColor: ["rgba(60, 191, 174, 1)", "rgba(239, 68, 68, 1)"],
                borderWidth: 1,
            },
        ],
    };
    const budgetConfig = {
        type: "doughnut",
        data: budgetData,
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
    new Chart(budgetChart, budgetConfig);
}

function _loadTabGlidersVisibility(id, isMini=false) {
    let i = 0;
    for (const child of _getChildIDs(id)) {
        _setCSSRule(`input[id="${child}"]:checked~.glider${isMini?'-mini':''}`, 'transform', `translateX(${i * 100}%)`);
        i++;
    }
}





