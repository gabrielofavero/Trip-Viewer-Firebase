var P_RESULT = {};
var PLACES_FILTERED_SIZE;
var CURRENT_PLACES_SIZE = 0;
var DESTINOS = [];
var DESTINO_EXPORT = {};

// ======= LOADERS =======
function _loadDestinos() {
  for (let i = 0; i < DESTINOS.length; i++) {
    P_RESULT[DESTINOS[i].destinos.destinosID] = DESTINOS[i].destinos;
  }

  if (DESTINOS.length % 2 === 1) { // Ímpar
    getID('destinosBox').classList.add('centered-destino-box');
  }

  if (DESTINOS.length === 1 && getID("destinos-select").style.display === 'none'
    && _getChildIDs('destinosBox').length <= 1) {
    getID('destinosTitleContainer').style.display = 'none';
  }

  window.addEventListener("resize", function () {
    _adjustDestinationsHTML();
  });
}

function _loadDestinationsSelect() {
  DESTINOS = FIRESTORE_DATA.destinos;
  const select = getID("destinos-select");

  if (DESTINOS.length > 1) {
    for (let i = 0; i < DESTINOS.length; i++) {
      const option = document.createElement("option");
      option.value = DESTINOS[i].destinosID;
      option.text = DESTINOS[i].destinos.titulo;
      option.selected = i === 0;
      select.add(option);
    }

    select.addEventListener("change", function () {
      for (let i = 0; i < DESTINOS.length; i++) {
        if (DESTINOS[i].destinosID === select.value) {
          _loadDestinationsHTML(FIRESTORE_DATA.destinos[i]);
          _adjustDestinationsHTML();
          break;
        }
      }
    });

  } else {
    select.style.display = "none";
  }
}

function _loadDestinationsHTML(destino) {
  let div = getID("destinosBox");
  let text = "";

  const headers = _getDestinationsHeaders(destino.destinos.modulos);
  CURRENT_PLACES_SIZE = headers.length;

  let linktype = _getLinkType();

  for (let i = 0; i < headers.length; i++) {
    const code = headers[i];
    _buildDestinoExport(destino, code)

    const j = i + 1;
    const box = CONFIG.destinos.boxes[_getDestinationsBoxesIndex(i)];
    const title = CONFIG.destinos.destinos[headers[i]]["title"];
    const href = code === "mapa" ? destino.destinos.myMaps : "#";
    const lt = code === "mapa" ? linktype : "";
    const onclick = code === "mapa" ? "" : `onclick="_loadAndOpenDestino('${code}')"`;
    const icon = CONFIG.destinos.destinos[headers[i]]["icon"];
    const description = CONFIG.destinos.destinos[headers[i]]["description"];

    text += `
    <div class="col-lg-4 col-md-6 d-flex align-items-stretch" data-aos="zoom-in" data-aos-delay="100" id="b${j}">
    <a href="${href}" ${lt} ${onclick} id="ba${j}">
        <div class="icon-box iconbox-${box.color}" id="ib${j}">
          <div class="icon">
            <svg width="100" height="100" viewBox="0 0 600 600" xmlns="http://www.w3.org/2000/svg">
              <path stroke="none" stroke-width="0" fill="#f5f5f5" d="${box.d}"></path>
            </svg>
            <i class="${icon}"></i>
          </div>
          <div id="b${j}t"><h4>${title}</h4></div>
          <div id="b${j}d"><p>${description}</p></div>
        </div>
      </a>
    </div>`;
  }

  div.innerHTML = text;
  _adjustDestinationsHTML();
}

function _buildDestinoExport(destino, code) {
  DESTINO_EXPORT[code] = {
    data: destino.destinos[code],
    moeda: destino.destinos.moeda,
    valores: _getDestinoValores(destino),
    notas: CONFIG.destinos.notas,
    categoria: code,
    descricao: CONFIG.destinos.destinos[code],
  }
}

function _getDestinoValores(destino) {
  return CONFIG.moedas.escala[destino.destinos.moeda] || CONFIG.moedas.escala["BRL"];
}

function _loadAndOpenDestino(code) {
  window.localStorage.setItem('DESTINO', JSON.stringify(DESTINO_EXPORT[code]));
  _openLightbox('destinos.html')
}

function _getDestinationsHeaders(module) {
  const headerBase = CONFIG.destinos.categorias.geral;
  const headerMap = new Map(headerBase.map((element, index) => [element, index]));

  let result = [];
  const keys = Object.keys(module);

  for (const key of keys) {
    if (module[key] === true) {
      result.push(key)
    }
  }

  return result.sort((a, b) => headerMap.get(a) - headerMap.get(b));
}

function getDestinationsSelectValue() {
  let select = getID("destinos-select");
  return select.value || DESTINOS[0].destinosID;
}

function _getDestinationsBoxesIndex(i) {
  if (i > CONFIG.destinos.boxes.length - 1) {
    return i % CONFIG.destinos.boxes.length;
  } else return i
}

function _getLinkType() {
  if (_isIOSDevice()) {
    return "";
  } else {
    return "target='_blank'";
  }
}

function _adjustDestinationsHTML() {
  let heights = [];
  let maxHeight = 0;

  for (let i = 1; i <= CURRENT_PLACES_SIZE; i++) {
    let height = getID(`b${i}d`).offsetHeight;
    if (height > maxHeight) {
      maxHeight = height;
    }
    heights.push(height);
  }

  for (let i = 1; i <= CURRENT_PLACES_SIZE; i++) {
    getID(`b${i}d`).style.height = `${maxHeight}px`;
  }
}