function _setDoughnutChart(id, labels, valores) {
    const div = document.getElementById(id);
    const dados = {
        labels: labels,
        datasets: [
            {
                label: "Resumo",
                data: valores,
                backgroundColor: ["rgba(60, 191, 174, 0.5)", "rgba(239, 68, 68, 0.5)"],
                borderColor: ["rgba(60, 191, 174, 1)", "rgba(239, 68, 68, 1)"],
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
    new Chart(div, config);
}