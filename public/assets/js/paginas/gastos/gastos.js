var GASTOS;
var GASTOS_ID;
var GASTOS_QUANTIDADE = 0;

document.addEventListener('DOMContentLoaded', function () {
    const gastos = localStorage.getItem('gastos') ? JSON.parse(localStorage.getItem('gastos')) : null;
    GASTOS_ID = gastos?.id;

    if (!gastos || !GASTOS_ID) {
        const url = GASTOS_ID ? `viagem.html?v=${GASTOS_ID}` : 'index.html';
        _displayForbidden('Nenhum documento de gastos foi encontrado. Certifique-se de que você está acessando a página por meio do botão "Gastos" na página de Viagem', url);
        return;
    }

    if (!gastos.ativo) {
        _displayForbidden('O módulo de gastos não está ativo para essa viagem', `viagem.html?v=${GASTOS_ID}`);
        return;
    }

    if (!gastos.pin) {
        _loadGastos();
    } else {
        _stopLoadingScreen();
        _requestPin();
    }
});

function _requestPin() {
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
        acao: '_loadGastos()'
    }];
    _displayFullMessage(propriedades);
}

async function _loadGastos() {
    const documentID = GASTOS_ID;
    const pin = getID('pin-code')?.innerText || '';
    try {
        GASTOS = await _postCloudFunction('getGastos', { documentID, pin });
        if (GASTOS) {
            _startLoadingScreen();
            await _loadMoedas();
            // _applyGastos();
            // _closeMessage();
            // _stopLoadingScreen();
        }
    } catch (error) {
        const msg = error?.responseJSON?.error;
        if (msg) {
            _displayError(msg, true);
            throw new Error(msg);
        } else {
            _displayError('Erro ao carregar os dados de gastos', true);
            throw error;
        }
    }
}

function _applyGastos() {
    if (GASTOS.gastosPrevios.length > 0 || GASTOS.gastosDurante.length > 0) {
        getID('tab-gastos').style.display = 'block';
        getID('radio-resumo').style.display = 'block';
        _aplicarResumo();

        if (GASTOS.gastosPrevios.length > 0) {
            getID('radio-gastosPrevios').style.display = 'block';
            _aplicarGastosPrevios();
        }

        if (GASTOS.gastosDurante.length > 0) {
            getID('radio-gastosDurante').style.display = 'block';
            _aplicarGastosDurante();
        }
    }
}

function _aplicarResumo() {
    getID('resumo-gastosPrevios').style.display = 'block';
    _gerarTabelaRecibo('resumo', 'gastosPrevios')

    getID('resumo-gastosDurante').style.display = 'block';
    _gerarTabelaRecibo('resumo', 'gastosDurante')
}

function _aplicarGastosPrevios() {

}

function _aplicarGastosDurante() {

}

function _gerarTabelaRecibo(tipo, subtipo, moeda) {
    const tabela = getID(`${tipo}-${subtipo}-tabela`);
    // const multiMoedas = 

    const tbody = document.createElement('tbody');
    for (const gasto of GASTOS[subtipo]) {
        let valor = '';









        const tr = document.createElement('tr');

        const td1 = document.createElement('td');
        td1.className = `tabela-texto-esquerda`;
        td1.innerText = gasto.tipo;
        tr.appendChild(td1);

        const td2 = document.createElement('td');
        td2.className = `tabela-texto-esquerda`;
        td2.innerText = gasto.moeda;
        td2.style.display = 'none';
        t2.appendChild(td1);

        const td3 = document.createElement('td');
        td3.className = `tabela-texto-direita`;
        td3.innerText = gasto.valor;
        tr.appendChild(td3);

        tbody.appendChild(tr);
    }
    tabela.appendChild(tbody);

    const tFoot = document.createElement('tfoot');
    tFoot.id = `${tipo}-${subtipo}-total`;

    const tr = document.createElement('tr');
    const td1 = document.createElement('td');
    td1.className = 'tabela-texto-esquerda';
    td1.innerText = 'Total';
    tr.appendChild(td1);

    const td2 = document.createElement('td');
    td2.className = 'tabela-texto-direita';
    td2.innerText = '';
    tr.appendChild(td2);

    tFoot.appendChild(tr);
    tabela.appendChild(tFoot);
}