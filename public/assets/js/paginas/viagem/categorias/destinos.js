var P_RESULT = {};
var PLACES_FILTERED_SIZE;
var DESTINOS = [];
var DESTINO_ATIVO;
var DESTINO_EXPORT = {};
var DESTINO_TRANSLATIONS = {};
var PLANNED_DESTINATIONS = {}

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

  if (FIRESTORE_DATA.modulos.programacao) {
    _loadPlannedDestinations();
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

  const options = _getDestinationsCustomSelectOptions();

  const customSelect = {
    id: "destinos-select",
    options,
    activeOption: options[0].value,
    action: _loadDestionationCustomSelectAction
  }

  _loadCustomSelect(customSelect);

  function _getDestinationsCustomSelectOptions() {
    const options = [];
    const itineraryOrder = new Set(FIRESTORE_DATA.programacoes
      .flatMap(item => (item.destinosIDs || []).map(d => d.destinosID))
      .filter(Boolean));

    for (const destino of DESTINOS) {
      options.push({
        value: destino.destinosID,
        label: destino.destinos.titulo
      });
    }

    if (itineraryOrder.size > 0) {
      const ordered = [];
      const remaining = [];

      for (const option of options) {
        if (itineraryOrder.has(option.value)) {
          ordered.push(option);
        } else {
          remaining.push(option);
        }
      }

      options.length = 0;
      for (const id of itineraryOrder) {
        const match = ordered.find(opt => opt.value === id);
        if (match) options.push(match);
      }

      options.push(...remaining);
    }

    return options
  }

  function _loadDestionationCustomSelectAction(value) {
    for (let i = 0; i < DESTINOS.length; i++) {
      if (DESTINOS[i].destinosID === value) {
        DESTINO_ATIVO = DESTINOS[i].destinosID;
        _loadDestinationsHTML(FIRESTORE_DATA.destinos[i]);
        _adjustDestinationsHTML();
        break;
      }
    }
  }
}

function _loadDestinationsHTML(destino) {
  let text = "";
  const types = CONFIG.destinos.categorias.geral;

  for (let i = 0; i < types.length; i++) {
    const type = types[i];

    if (type != 'mapa' && Object.keys(destino.destinos[type]).length === 0) {
      continue;
    }

    const translatedType = CONFIG.destinos.translation[type] || type;
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
          <div class="bd" id="b${j}d"><p>${description}</p></div>
        </div>
      </a>
    </div>`;
  }

  getID("destinosBox").innerHTML = text;
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
  window.localStorage.setItem('PLANNED_DESTINATIONS', JSON.stringify(PLANNED_DESTINATIONS));
  _openLightbox(`destination?type=${code}d=${DESTINO_ATIVO}`);
}

function _getDestinationsBoxesIndex(i) {
  if (i > CONFIG.destinos.boxes.length - 1) {
    return i % CONFIG.destinos.boxes.length;
  } else return i
}

function _adjustDestinationsHTML() {
  const elements = Array.from(document.querySelectorAll('.bd'));

  for (const el of elements) {
    el.style.height = "auto";
  }

  const maxHeight = Math.max(...elements.map(el => el.offsetHeight));

  for (const el of elements) {
    el.style.height = `${maxHeight}px`;
  }
}

function _loadPlannedDestinations() {
  for (const dia of FIRESTORE_DATA.programacoes) {
    for (const turno of ['madrugada', 'manha', 'tarde', 'noite']) {
      const programacoes = dia[turno];
      if (!programacoes) continue;

      for (const programacao of programacoes) {
        const item = programacao?.item;
        if (!item || item.tipo !== 'destinos') continue;

        _addPlannedDestination(item);
      }
    }
  }

  function _addPlannedDestination(item) {
    const destino = DESTINOS.find(d => d.destinosID === item.local);
    if (!destino) return;
    
    if (!PLANNED_DESTINATIONS[destino.destinosID]) {
      PLANNED_DESTINATIONS[destino.destinosID] = {};
    }
    PLANNED_DESTINATIONS[destino.destinosID][item.id] = true;


  }
}

function _getDestinosTranslations() {
  if (Object.keys(DESTINO_TRANSLATIONS) == 0) {
    DESTINO_TRANSLATIONS = {
      filter: CONFIG.language.destination.filter,
      sort: CONFIG.language.destination.sort
    }
  }
  return DESTINO_TRANSLATIONS;
}