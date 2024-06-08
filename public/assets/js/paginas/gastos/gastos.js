var GASTOS;
var CURRENT_GASTO = 'resumo';
var GASTOS_ID;

document.addEventListener('DOMContentLoaded', async function () {
    const gastos = localStorage.getItem('gastos') ? JSON.parse(localStorage.getItem('gastos')) : null;
    GASTOS_ID = gastos?.id;

    if (!gastos || !GASTOS_ID) {
        const url = GASTOS_ID ? `viagem.html?v=${GASTOS_ID}` : 'index.html';
        _displayAcessoNegado('Nenhum documento de gastos foi encontrado. Certifique-se de que você está acessando a página por meio do botão "Gastos" na página de Viagem', url);
        return;
    }

    if (!gastos.ativo) {
        _displayAcessoNegado('O módulo de gastos não está ativo para essa viagem', `viagem.html?v=${GASTOS_ID}`);
        return;
    }

    if (!gastos.pin) {
        GASTOS = await _loadGastosData();
    } else {
        _stopLoadingScreen();
        _displayPinInput();
    }

    if (GASTOS) {
        _loadAbas();
        _loadGastosResumo();
    }
});

async function _loadGastosData() {
    const documentID = GASTOS_ID;
    const pin = getID('pin-code')?.innerText || '';
    try {
        return await _postCloudFunction('getGastos', { documentID, pin });
    } catch (error) {
        _displayErro(error?.responseJSON?.error || "Erro ao carregar os dados de gastos", true);
        throw error;
    }
}

function _displayPinInput() {
    const propriedades = MENSAGEM_PROPRIEDADES;
    propriedades.titulo = 'Digite o Pin de Acesso';
    propriedades.conteudo = `<div class="pin-wrapper">
                                <input type="text" data-role="pin" maxlength="1" class="pin-input">
                                <input type="text" data-role="pin" maxlength="1" class="pin-input">
                                <input type="text" data-role="pin" maxlength="1" class="pin-input">
                                <input type="text" data-role="pin" maxlength="1" class="pin-input">
                              </div>
                              <div id="pin-code" class="pin"></div>`;
    propriedades.critico = true;
    propriedades.containers = _getContainersInput();
    propriedades.botoes = [{
        tipo: 'cancelar',
        acao: `window.location.href = "viagem.html?v=${GASTOS_ID}"`
      }, {
        tipo: 'confirmar',
        acao: '_loadGastosData()'
      }];
      _displayMensagemFull(propriedades);
}

function _loadAbas() {
    getID('tab-gastos').style.display = 'block';

    // TO-DO: Implementar a lógica de carregamento de abas
    let i = 0;
    const moedas = _getChildIDs('tab-moedas');
    if (moedas && moedas.length > 0) {
        getID('tab-moedas').style.display = 'block';
        for (const moeda of _getChildIDs('tab-moedas')) {
            _setCSSRule(`input[id="${moeda}"]:checked~.glider-mini`, 'transform', `translateX(${i * 100}%)`);
            i++;
        }
    }
}

function _loadGastosResumo() {
    const div = document.getElementById("budgetChart");
    const dados = {
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
