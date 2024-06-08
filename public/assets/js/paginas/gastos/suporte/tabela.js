function _loadTable(tipo, subtipo) {
    const tabela = getID(`${tipo}-${subtipo}-tabela`);
    let somas = {};
    let total;

    const tbody = _getTbody(subtipo, somas);
    tabela.appendChild(tbody);

    if (_canConvert(subtipo)) {
        total = 0;
        for (const moeda of Object.keys(somas)) {
            if (moeda == MOEDA_PADRAO) {
                total += somas[moeda];
            } else {
                total += _convertMoeda(moeda, MOEDA_PADRAO, somas[moeda]);
            }
        }
        GASTOS_TOTAIS[tipo][subtipo] = total;
        total = `${_getMoedaSymbol(MOEDA_PADRAO)} ${total.toFixed(0)}`;
    } else {
        const totais = [];
        for (const moeda of Object.keys(somas)) {
            GASTOS_TOTAIS[tipo][subtipo][moeda] = somas[moeda].toFixed(0);
            totais.push(`${_getMoedaSymbol(moeda)} ${somas[moeda].toFixed(0)}`);
        }
        total = totais.join(' | ');
    }

    const tFoot = _getTfoot(tipo, subtipo, total);
    tFoot.appendChild(tr);
    tabela.appendChild(tFoot);
}

function _getTbody(subtipo, somas) {
    const tbody = document.createElement('tbody');
    for (const gasto of GASTOS[subtipo]) {
        tbody.appendChild(_getTr(gasto));
        somas[gasto.moeda] = somas[gasto.moeda] ? somas[gasto.moeda] + gasto.valor : gasto.valor;
    }
    return tbody;
}

function _getTr(gasto) {
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

    return tr;
}

function _getTfoot(tipo, subtipo, total) {
    const tFoot = document.createElement('tfoot');
    tFoot.id = `${tipo}-${subtipo}-total`;

    const tr = document.createElement('tr');
    const td1 = document.createElement('td');
    td1.className = 'tabela-texto-esquerda';
    td1.innerText = 'Total';
    tr.appendChild(td1);

    const td2 = document.createElement('td');
    td2.className = 'tabela-texto-direita';
    td2.innerText = total || '';
    tr.appendChild(td2);

    return tFoot;
}