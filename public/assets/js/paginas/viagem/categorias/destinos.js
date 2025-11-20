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

function _loadDestinationsCustomSelect() {
  DESTINOS = FIRESTORE_DATA.destinos;

  if (DESTINOS.length <= 1) {
    getID("destinos-select").style.display = 'none';
    return;
  }

  const options = [];
  for (const destino of DESTINOS) {
    options.push({
      value: destino.destinosID,
      label: destino.destinos.titulo
    });
  }

  const customSelect = {
    id: "destinos-select",
    options, 
    activeOption: options[0].value,
    action: _loadDestionationCustomSelectAction
  }

  _loadCustomSelect(customSelect);

  function _loadDestionationCustomSelectAction(value) {
    for (let i = 0; i < DESTINOS.length; i++) {
      if (DESTINOS[i].destinosID === value) {
        _loadDestinationsHTML(FIRESTORE_DATA.destinos[i]);
        _adjustDestinationsHTML();
        break;
      }
    }
  }
}

function _loadDestinationsHTML(destino) {
  let div = getID("destinosBox");
  let text = "";

  const headers = _getDestinationsHeaders(destino.destinos.modulos);
  CURRENT_PLACES_SIZE = headers.length;

  for (let i = 0; i < headers.length; i++) {
    const type = headers[i];
    const translatedType = CONFIG.destinos.translation[type] || type;
    _buildDestinoExport(destino, type)

    const j = i + 1;
    const box = CONFIG.destinos.boxes[_getDestinationsBoxesIndex(i)];
    const title = translate(`destination.${translatedType}.title`);
    const description = translate(`destination.${translatedType}.description`);
    const icon = CONFIG.destinos.icons[type];

    text += `
    <div class="col-lg-4 col-md-6 d-flex align-items-stretch" data-aos="zoom-in" data-aos-delay="100" id="b${j}">
    <a href="#" onclick="_loadAndOpenDestino('${type}')" id="ba${j}">
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
  delete DESTINO_EXPORT.mapa;
  DESTINO_EXPORT.myMaps = { titulo: translate('destination.map.title'), link: destino.destinos.myMaps };
}

function _buildDestinoExport(destino, type) {
  const translatedType = CONFIG.destinos.translation[type] || type;
  DESTINO_EXPORT[type] = {
    data: destino.destinos[type],
    moeda: destino.destinos.moeda,
    valores: _getDestinoValores(destino),
    notas: CONFIG.language.destination.scores,
    categoria: type,
    titulo: translate(`destination.${translatedType}.title`)
  }
}

function _getDestinoValores(destino) {
  const moeda = _cloneObject(CONFIG.moedas.escala[destino.destinos.moeda]);
  const max = translate('destination.price.max', { value: moeda["$$$$"] });
  moeda["-"] = translate('destination.price.free');
  moeda["default"] = translate('destination.price.default');
  moeda["$$$$"] = max;
  return moeda;
}

function _loadAndOpenDestino(code) {
  const exportFile = _cloneObject(DESTINO_EXPORT);
  exportFile.activeCategory = code;
  window.localStorage.setItem('DESTINO', JSON.stringify(exportFile));
  _openLightbox('destination.html')
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

function _getDestinationsBoxesIndex(i) {
  if (i > CONFIG.destinos.boxes.length - 1) {
    return i % CONFIG.destinos.boxes.length;
  } else return i
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