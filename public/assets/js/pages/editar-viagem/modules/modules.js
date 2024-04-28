const TODAY = _getTodayFormatted();
const TOMORROW = _getTomorrowFormatted();

const FIREBASE_IMAGE_ORIGIN = 'https://firebasestorage.googleapis.com/v0/b/trip-viewer-tcc.appspot.com/';

var PROGRAMACAO = {};
var DESTINOS = [];

var FIREBASE_IMAGES = {
  background: false,
  claro: false,
  escuro: false
}

var GALERIA_CATEGORIAS = [];
var LINEUP_GENEROS = [];
var LINEUP_PALCOS = [];


// Deletar
function _deleteType(tipo) {
  const div = document.getElementById(tipo);
  div.parentNode.removeChild(div);
}


// Geral: Dynamic Select
function _dynamicSelectAction(tipo, subtipo, copy, categorias, init = false) {
  if (copy.length !== categorias.length || !copy.every((value, index) => value === categorias[index])) {
    _loadDynamicSelect(tipo, subtipo, categorias, init);
  }
}

function _getUpdatedDynamicSelectArray(tipo, subtipo) {
  let categorias = [];
  const childs = _getChildIDs(`${tipo}-box`);

  for (let i = 1; i <= childs.length; i++) {
    _pushIfValidCategoria(document.getElementById(`${tipo}-${subtipo}-select-${i}`), categorias);
    _pushIfValidCategoria(document.getElementById(`${tipo}-${subtipo}-${i}`), categorias);
  }

  return categorias.filter((item, index) => categorias.indexOf(item) === index).sort();
}

function _pushIfValidCategoria(div, categorias) {
  if (div.value && div.value !== 'selecione' && div.value !== 'outra') {
    let value = _codifyText(div.value);
    if (!categorias.find(item => item.value === value)) {
      categorias.push({
        title: _firstCharsToUpperCase(div.value),
        value: _codifyText(div.value)
      });
    }
  }
}

function _loadDynamicSelect(tipo, subtipo, categorias, init = false) {
  const childs = _getChildIDs(`${tipo}-box`);
  const selectOptions = [];

  for (const categoria of categorias) {
    selectOptions.push(`<option value="${categoria.value}">${categoria.title}</option>`);
  }

  for (let i = 1; i <= childs.length; i++) {
    const select = document.getElementById(`${tipo}-${subtipo}-select-${i}`);
    const input = document.getElementById(`${tipo}-${subtipo}-${i}`);

    const selectValue = select.value;
    const inputValue = input.value;

    select.innerHTML = `
    <option value="selecione">Selecione</option>
    ${selectOptions}
    <option value="outra">Outra</option>`;

    if (inputValue) {
      select.value = _codifyText(inputValue);
    } else if (selectValue) {
      select.value = selectValue;
    }

    input.value = "";
    _loadDynamicSelectVisibility(select, input, init);
  }
}

function _loadDynamicSelectVisibility(select, input, init) {
  if (init && select.innerHTML === '') {
    select.style.display = 'none';
    input.style.display = 'block';

  } else if (init) {
    select.style.display = 'block';
    input.style.display = 'none';

  } else if (select.value === 'outra') {
    select.style.display = 'block';
    input.style.display = 'block';

  } else if (select.value === 'selecione') {
    select.style.display = 'block';
    input.style.display = 'none';

  } else {
    select.style.display = 'block';
    input.style.display = 'none';

  }
}

function _getDynamicSelectValue(tipo, subtipo, i) {
  const select = document.getElementById(`${tipo}-${subtipo}-select-${i}`);
  if (select && select.value && select.value !== 'selecione' && select.value !== 'outra') {
    return select.options[select.selectedIndex].text;
  } else return '';
}


// Destinos: Funções Genéricas
function _buildDestinosSelect() {
  const childs = _getChildIDs('com-destinos');

  let used = [];

  for (const child of childs) {
    const i = child.split('-')[2];
    const selectDiv = document.getElementById(`select-destinos-${i}`);
    const value = selectDiv.value;
    if (value) {
      used.push(value);
    }
  }

  for (const child of childs) {
    const i = child.split('-')[2];
    const selectDiv = document.getElementById(`select-destinos-${i}`);
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
      _deletePasseio(i);
      document.getElementById('todos-destinos-utilizados').style.display = 'block';
    } else {
      selectDiv.innerHTML = options;
      document.getElementById('todos-destinos-utilizados').style.display = 'none';
    }
  }
}


// Transportes: Funções Genéricas
function _loadTransporteVisibility(i) {
  const select = document.getElementById(`empresa-select-${i}`);
  const value = select.value;
  const empresa = document.getElementById(`empresa-${i}`);
  const codigo = document.getElementById(`transporte-codigo-${i}`);

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

  if (select.style.display == 'block' && empresa.style.display == 'block') {
    empresa.style.marginTop = '30px';
  } else {
    empresa.style.marginTop = '0';

  }
}

function _updateTransporteTitle(i) {
  const condensar = document.getElementById('condensar').checked;
  const partida = document.getElementById(`ponto-partida-${i}`).value;
  const chegada = document.getElementById(`ponto-chegada-${i}`).value;

  if (partida && chegada) {
    const texto = condensar ? `${partida} → ${chegada}` : `${_getTransporteTipo(i)}: ${partida} → ${chegada}`;
    document.getElementById(`transporte-title-${i}`).innerText = texto;
  };
}

function _getTransporteTipo(i) {
  const ida = document.getElementById(`ida-${i}`).checked ? 'Ida' : '';
  const durante = document.getElementById(`durante-${i}`).checked ? 'Durante' : '';
  const volta = document.getElementById(`volta-${i}`).checked ? 'Volta' : '';

  return ida || durante || volta;
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


function _addTransporteListeners(i) {
  const select = document.getElementById(`empresa-select-${i}`);
  const codigo = document.getElementById(`transporte-codigo-${i}`);

  select.addEventListener('change', function () {
    _loadTransporteVisibility(i);
  });

  codigo.addEventListener('change', function () {
    _loadTransporteVisibility(i);
  });

  const partida = document.getElementById(`ponto-partida-${i}`);
  const chegada = document.getElementById(`ponto-chegada-${i}`);
  const ida = document.getElementById(`ida-${i}`);
  const durante = document.getElementById(`durante-${i}`);
  const volta = document.getElementById(`volta-${i}`);

  partida.addEventListener('change', () => _updateTransporteTitle(i));
  chegada.addEventListener('change', () => _updateTransporteTitle(i));
  ida.addEventListener('change', () => _updateTransporteTitle(i));
  durante.addEventListener('change', () => _updateTransporteTitle(i));
  volta.addEventListener('change', () => _updateTransporteTitle(i));
}

// Programação: Funções Genéricas
function _updateProgramacaoTitle(i, key) {
  if (!PROGRAMACAO) return;

  const title = document.getElementById(`programacao-title-${i}`);

  if (!title) return;

  if (!key) {
    const innerText = title.innerText;
    key = innerText.includes(': ') ? innerText.split(': ')[1].replace(/\//g, '') : innerText.replace(/\//g, '');
  }

  if (!PROGRAMACAO[key]) return;

  const data = PROGRAMACAO[key].data;
  const innerTitle = document.getElementById(`programacao-inner-title-${i}`).value;
  let titulo = PROGRAMACAO[key].titulo


  if (innerTitle && innerTitle != titulo) {
    titulo = innerTitle;
  }

  if (titulo && data) {
    title.innerText = `${titulo}: ${data}`;
  }
}


// Lineup: Funções Genéricas
function _buildLineupSelects() {
  const lineupChilds = _getChildIDs('lineup-box');
  let lineupSelectBoxes = [];
  let lineupSelects = [];

  for (const child of lineupChilds) {
    const i = child.split('-')[1];
    lineupSelectBoxes.push(`lineup-local-box-${i}`);
    lineupSelects.push(`lineup-local-${i}`);
  }

  if (document.getElementById('habilitado-destinos').checked && document.getElementById('habilitado-lineup').checked) {

    const destinoChilds = _getChildIDs('com-destinos');
    let options = '<option value="generico">Destino Não Especificado</option>';

    for (const child of destinoChilds) {
      const i = child.split('-')[2];
      const selectDiv = document.getElementById(`select-destinos-${i}`);
      const text = selectDiv.options[selectDiv.selectedIndex].text;
      const value = selectDiv[selectDiv.selectedIndex].value;
      if (value) {
        options += `<option value="${value}">${text}</option>`;
      }
    }

    for (const selectDiv of lineupSelects) {
      const div = document.getElementById(selectDiv);
      const value = div.value;
      div.innerHTML = options;
      div.value = value;
    }

  } else {
    for (const box of lineupSelectBoxes) {
      document.getElementById(box).style.display = 'none';
    }
  }
}

function _setDestinoSelectValue(i, value) {
  document.getElementById(`select-destinos-${i}`).value = value;
  _buildDestinosSelect();
}

function _deletePasseio(i) {
  _deleteType(`com-destinos-${i}`);
  _buildDestinosSelect();
}

function _loadLineupListeners(i) {

  // Dynamic Select: Gênero
  document.getElementById(`lineup-genero-select-${i}`).addEventListener('change', function () {
    _lineupGeneroSelectAction('lineup', 'genero');
  });
  document.getElementById(`lineup-genero-${i}`).addEventListener('change', function () {
    _lineupGeneroSelectAction('lineup', 'genero');
  });

  // Dynamic Select: Palco
  document.getElementById(`lineup-palco-select-${i}`).addEventListener('change', function () {
    _lineupPalcoSelectAction('lineup', 'palco');
  });
  document.getElementById(`lineup-palco-${i}`).addEventListener('change', function () {
    _lineupPalcoSelectAction('lineup', 'palco');
  });

  // Dynamic Title
  const nome = document.getElementById(`lineup-nome-${i}`);
  const title = document.getElementById(`lineup-title-${i}`);
  const headliner = document.getElementById(`lineup-headliner-${i}`);
  nome.addEventListener('change', function () {
    title.innerText = nome.value;
    if (headliner.checked) {
      title.innerText += ' ⭐';
    }
  });
  headliner.addEventListener('change', function () {
    title.innerText = nome.value;
    if (headliner.checked) {
      title.innerText += ' ⭐';
    }
  });

  // Load Listener Actions
  _lineupGeneroSelectAction('lineup', 'genero', true);
  _lineupPalcoSelectAction('lineup', 'palco', true);
}

function _lineupGeneroSelectAction(tipo, subtipo, init=false) {
  let copy = LINEUP_GENEROS;
  LINEUP_GENEROS = _getUpdatedDynamicSelectArray(tipo, subtipo);
  _dynamicSelectAction(tipo, subtipo, copy, LINEUP_GENEROS, init);
}

function _lineupPalcoSelectAction(tipo, subtipo, init=false) {
  let copy = LINEUP_PALCOS;
  LINEUP_PALCOS = _getUpdatedDynamicSelectArray(tipo, subtipo);
  _dynamicSelectAction(tipo, subtipo, copy, LINEUP_PALCOS, init);
}


// Galeria: Funções Genéricas
function _loadGaleriaListeners(i) {

  // Dynamic Select: Categoria
  document.getElementById(`galeria-categoria-select-${i}`).addEventListener('change', function () {
    _galeriaSelectAction('galeria', 'categoria');
  });
  document.getElementById(`galeria-categoria-${i}`).addEventListener('change', function () {
    _galeriaSelectAction('galeria', 'categoria');
  });

  // Dynamic Title
  document.getElementById(`galeria-titulo-${i}`).addEventListener('change', function () {
    document.getElementById(`galeria-title-${i}`).innerText = document.getElementById(`galeria-titulo-${i}`).value;
  });

  // Load Listener Actions
  _galeriaSelectAction('galeria', 'categoria', true);
}

function _galeriaSelectAction(tipo, subtipo, init=false) {
  let copy = GALERIA_CATEGORIAS;
  GALERIA_CATEGORIAS = _getUpdatedDynamicSelectArray(tipo, subtipo);
  _dynamicSelectAction(tipo, subtipo, copy, GALERIA_CATEGORIAS, init);
}

function _deleteGaleria(i) {
  const id = `galeria-${i}`;
  _removeImageSelectorListeners(id);
  const div = document.getElementById(id);
  div.parentNode.removeChild(div);

}