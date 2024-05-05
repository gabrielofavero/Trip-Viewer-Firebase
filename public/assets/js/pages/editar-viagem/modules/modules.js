// Destinos
function _buildDestinosSelect() {
    const childs = _getChildIDs('com-destinos');

    let used = [];

    for (const child of childs) {
        const i = child.split('-')[2];
        const selectDiv = getID(`select-destinos-${i}`);
        const value = selectDiv.value;
        if (value) {
            used.push(value);
        }
    }

    for (const child of childs) {
        const i = child.split('-')[2];
        const selectDiv = getID(`select-destinos-${i}`);
        const value = selectDiv.value;

        let options = '<option value="">Selecione um Destino</option>';
        for (let j = 0; j < DESTINOS.length; j++) {
            const code = DESTINOS[j].code;
            if (value == code || !used.includes(code)) {
                const selected = value === code ? ' selected' : '';
                options += `<option value="${code}"${selected}>${DESTINOS[j].titulo}</option>`;
            }
        }

        if (options === '<option value="">Selecione um Destino</option>') {
            _deleteDestino(i);
            getID('todos-destinos-utilizados').style.display = 'block';
        } else {
            selectDiv.innerHTML = options;
            getID('todos-destinos-utilizados').style.display = 'none';
        }
    }
}

function _deleteDestino(i) {
    _removeChildDestinosWithValidation(i);
    _buildDestinosSelect();
}

// Transportes
function _updateTransporteTitle(i) {
    const condensar = getID('condensar').checked;
    const partida = getID(`ponto-partida-${i}`).value;
    const chegada = getID(`ponto-chegada-${i}`).value;

    if (partida && chegada) {
        const texto = condensar ? `${partida} → ${chegada}` : `${_getTransporteTipo(i)}: ${partida} → ${chegada}`;
        getID(`transporte-title-${i}`).innerText = texto;
    };
}

function _getTransporteTipo(i) {
    const ida = getID(`ida-${i}`).checked ? 'Ida' : '';
    const durante = getID(`durante-${i}`).checked ? 'Durante' : '';
    const volta = getID(`volta-${i}`).checked ? 'Volta' : '';

    return ida || durante || volta;
}

function _loadTransporteVisibility(i) {
    const select = getID(`empresa-select-${i}`);
    const value = select.value;
    const empresa = getID(`empresa-${i}`);
    const codigo = getID(`transporte-codigo-${i}`);

    let selectValid = false;
    let selectOptions = "";

    switch (codigo.value) {
        case "voo":
            selectOptions = `
        <option value="americanAirlines">American Airlines</option>
        <option value="avianca">Avianca</option>
        <option value="azul">Azul</option>
        <option value="copa">Copa Airlines</option>
        <option value="delta">Delta Airlines</option>
        <option value="gol">Gol</option>
        <option value="jetblue">JetBlue</option>
        <option value="latam">LATAM</option>
        <option value="tap">TAP Air Portugal</option>
        <option value="united">United Airlines</option>
        `
            selectValid = true;
            break;
        case "carro":
            selectOptions = `
        <option value="99">99</option>
        <option value="avis">Avis</option>
        <option value="cabify">Cabify</option>
        <option value="hertz">Hertz</option>
        <option value="localiza">Localiza</option>
        <option value="lyft">Lyft</option>
        <option value="movida">Movida</option>
        <option value="uber">Uber</option>
        <option value="unidas">Unidas</option>
        <option value="">Nenhuma</option>
        `
            selectValid = true;
            break;
        case "onibus":
            selectOptions = `
          <option value="aguiaBranca">Águia Branca</option>
          <option value="buser">Buser</option>
          <option value="cometa">Cometa</option>
          <option value="gontijo">Gontijo</option>
          `
            selectValid = true;
            break;
    }

    select.innerHTML = `
    <option value="selecione">Selecione</option>
    ${selectOptions}
    <option value="outra">Outra</option>
    `;

    if (value && select.innerHTML.includes(value)) {
        select.value = value;
    }

    if (selectValid) {
        select.style.display = 'block';
        empresa.style.display = select.value == 'outra' ? 'block' : 'none';
    } else {
        select.style.display = 'none';
        empresa.style.display = 'block';
    }
}

function _applyIdaVoltaVisibility() {
    const visibility = getID('condensar').checked == true ? 'none' : 'block';
    const childs = _getChildIDs('transporte-box');

    for (const child of childs) {
        const i = child.split('-')[1];
        _updateTransporteTitle(i);
        getID(`idaVolta-box-${i}`).style.display = visibility;
    }
}

// Hospedagens
async function _uploadHospedagem(uploadItens) {
    return await _uploadViagemItens(uploadItens, 'hospedagens');
}

// Programação
function _updateProgramacaoTitle(i, key) {
    if (!PROGRAMACAO) return;

    const title = getID(`programacao-title-${i}`);

    if (!title) return;

    if (!key) {
        const innerText = title.innerText;
        key = innerText.includes(': ') ? innerText.split(': ')[1].replace(/\//g, '') : innerText.replace(/\//g, '');
    }

    if (!PROGRAMACAO[key]) return;

    const data = PROGRAMACAO[key].data;
    const innerTitle = getID(`programacao-inner-title-${i}`).value;
    let titulo = PROGRAMACAO[key].titulo


    if (innerTitle && innerTitle != titulo) {
        titulo = innerTitle;
    }

    if (titulo && data) {
        title.innerText = `${titulo}: ${data}`;
    }
}

// Lineup
function _buildLineupSelects() {
    const lineupChilds = _getChildIDs('lineup-box');
    let lineupSelectBoxes = [];
    let lineupSelects = [];

    for (const child of lineupChilds) {
        const i = child.split('-')[1];
        lineupSelectBoxes.push(`lineup-local-box-${i}`);
        lineupSelects.push(`lineup-local-${i}`);
    }

    if (getID('habilitado-destinos').checked && getID('habilitado-lineup').checked) {

        const destinoChilds = _getChildIDs('com-destinos');
        let options = '<option value="generico">Destino Não Especificado</option>';

        for (const child of destinoChilds) {
            const i = child.split('-')[2];
            const selectDiv = getID(`select-destinos-${i}`);
            const text = selectDiv.options[selectDiv.selectedIndex].text;
            const value = selectDiv[selectDiv.selectedIndex].value;
            if (value) {
                options += `<option value="${value}">${text}</option>`;
            }
        }

        for (const selectDiv of lineupSelects) {
            const div = getID(selectDiv);
            const value = div.value;
            div.innerHTML = options;
            div.value = value;
        }

    } else {
        for (const box of lineupSelectBoxes) {
            getID(box).style.display = 'none';
        }
    }
}

function _setDestinoSelectValue(i, value) {
    getID(`select-destinos-${i}`).value = value;
    _buildDestinosSelect();
}

function _lineupGeneroSelectAction(tipo, subtipo, init = false) {
    let copy = LINEUP_GENEROS;
    LINEUP_GENEROS = _getUpdatedDynamicSelectArray(tipo, subtipo);
    _loadDynamicSelect(tipo, subtipo, copy, LINEUP_GENEROS, init);
}

function _lineupPalcoSelectAction(tipo, subtipo, init = false) {
    let copy = LINEUP_PALCOS;
    LINEUP_PALCOS = _getUpdatedDynamicSelectArray(tipo, subtipo);
    _loadDynamicSelect(tipo, subtipo, copy, LINEUP_PALCOS, init);
}

// Galeria
function _galeriaSelectAction(tipo, subtipo, init = false) {
    let copy = GALERIA_CATEGORIAS;
    GALERIA_CATEGORIAS = _getUpdatedDynamicSelectArray(tipo, subtipo);
    _loadDynamicSelect(tipo, subtipo, copy, GALERIA_CATEGORIAS, init);
}

async function _uploadGaleria(uploadItens) {
    return await _uploadViagemItens(uploadItens, 'galeria');
}

function _deleteGaleria(i) {
    const id = `galeria-${i}`;
    _removeImageSelectorListeners(id);
    const div = getID(id);
    div.parentNode.removeChild(div);
}