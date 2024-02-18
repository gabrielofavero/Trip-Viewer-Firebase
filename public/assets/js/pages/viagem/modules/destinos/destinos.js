// ======= Places JS =======

var P_RESULT = {};
var PLACES_FILTERED_SIZE;
var CURRENT_PLACES_SIZE = 0;
var DESTINOS = [];

// ======= LOADERS =======
function _loadPlaces() {
  for (let i = 0; i < DESTINOS.length; i++) {
    P_RESULT[DESTINOS[i].destinos.sigla] = DESTINOS[i].destinos;
  }
  
  window.localStorage.setItem('P_RESULT', JSON.stringify(P_RESULT));
  window.localStorage.setItem('CURRENCY', FIRESTORE_DATA.moeda);
  window.localStorage.setItem('CURRENCY_JSON', JSON.stringify(CONFIG.destinos.currency));
  window.localStorage.setItem('PLACES_JSON', JSON.stringify(CONFIG.destinos.destinos));
  window.localStorage.setItem('PLACES_SETTINGS_JSON', JSON.stringify(CONFIG.destinos.settings));

  window.addEventListener("resize", function () {
    _adjustPlacesHTML();
  });
}

function _loadPlacesSelect() {
  let select = document.getElementById("destinos-select");
  let firstOption = document.createElement("option");
  _buildDestinosObject();

  const firstSigla = _getNewPlacesSigla(DESTINOS[0].destinos.titulo);
  DESTINOS[0].destinos.sigla = firstSigla;

  firstOption.value = firstSigla;
  firstOption.text = DESTINOS[0].destinos.titulo;
  select.add(firstOption);
  firstOption.selected = true;

  if (DESTINOS.length > 1) {
    for (let i = 1; i < DESTINOS.length; i++) {
      let newOption = document.createElement("option");
      let sigla = _getNewPlacesSigla(DESTINOS[i].destinos.titulo);
      DESTINOS[i].destinos.sigla = sigla;

      newOption.value = sigla;
      newOption.text = DESTINOS[i].destinos.titulo;
      select.add(newOption);
    };
  } else {
    select.style.display = "none";
  };

  select.addEventListener("change", function () {
    for (let i = 0; i < DESTINOS.length; i++) {
      const sigla = DESTINOS[i].destinos.sigla;
      if (sigla === select.value) {
        _loadPlacesHTML(FIRESTORE_DATA.destinos[i].destinos);
        _adjustPlacesHTML();
        break;
      }
    }
  });
}

function _loadPlacesHTML(destino) {
  let div = document.getElementById("destinosBox");
  let text = "";

  const headers = _getPlacesHeaders(destino.modulos);
  CURRENT_PLACES_SIZE = headers.length;

  let linktype = _getLinkType();

  for (let i = 0; i < headers.length; i++) {
    const j = i + 1;
    const box = CONFIG.destinos.boxes[_getPlacesBoxesIndex(i)];
    const title = CONFIG.destinos.destinos[headers[i]]["title"];
    const code = headers[i];
    const href = code === "mapa" ? destino.myMaps : "#";
    const lt = code === "mapa" ? linktype : "";
    const onclick = code === "mapa" ? "" : `onclick="_openLightbox('${_getPlacesHref(code, destino)}')"`;
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
  _adjustPlacesHTML();
}

function _getPlacesHeaders(module) {
  const headerBase = ['restaurantes', 'lanches', 'saidas', 'turismo', 'lojas', "lineup", 'mapa']
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

function getPlacesSelectValue() {
  let select = document.getElementById("destinos-select");
  return select.value || DESTINOS[0].destinos.sigla;
}

function _getPlacesBoxesIndex(i) {
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

function _getPlacesHref(code, destino) {
  if (code == "mapa") {
    return destino.myMaps;
  } else return `destinos.html?destino=${destino.sigla}&type=${code}`;
}

function _getNewPlacesSigla(name) {
  var original = _codifyText(name);
  var result = original;
  let j = 0;
  for (let i = 0; i < DESTINOS.length; i++) {
    const sigla = DESTINOS[i].destinos.sigla;
    if (result == sigla) {
      result += original + j;
      j++;
    }
  }
  return result;
}

function _mergeSetlistObjects(obj1, obj2) {
  let result = {
    descricao: [],
    head: [],
    horario: [],
    hyperlink: {
      name: []
    },
    nome: [],
    nota: [],
    palco: [],
    site: [],
  };

  // Iterate over the keys of the result object
  Object.keys(result).forEach(key => {
    if (key === 'hyperlink') {
      // Special handling for the 'hyperlink' object
      result[key].name = [...obj1[key].name, ...obj2[key].name];
    } else {
      // Merge arrays from both objects for this key
      result[key] = [...obj1[key], ...obj2[key]];
    }
  });

  return result;
}

function _buildDestinosObject() {
  DESTINOS = FIRESTORE_DATA.destinos;
  if (FIRESTORE_DATA.modulos.lineup && FIRESTORE_DATA.lineup) {
    const lineupKeys = Object.keys(FIRESTORE_DATA.lineup);
    for (let i = 0; i < DESTINOS.length; i++) {
      if (lineupKeys.includes(DESTINOS[i].destinosID) || lineupKeys.includes('generico')) {
        DESTINOS[i].destinos.modulos.lineup = true;
        const genericoLineup = FIRESTORE_DATA.lineup.generico;
        const destinoLineup = FIRESTORE_DATA.lineup[DESTINOS[i].destinosID];
  
        if (destinoLineup && genericoLineup) {
          const mergedSetlist = _mergeSetlistObjects(genericoLineup, destinoLineup);
          DESTINOS[i].destinos.lineup = mergedSetlist;
        } else {
          DESTINOS[i].destinos.lineup = destinoLineup || genericoLineup;
        }
      }
    }
  }
}

// ======= SETTERS =======
function _adjustPlacesHTML() {
  let heights = [];
  let maxHeight = 0;

  for (let i = 1; i <= CURRENT_PLACES_SIZE; i++) {
    let height = document.getElementById(`b${i}d`).offsetHeight;
    if (height > maxHeight) {
      maxHeight = height;
    }
    heights.push(height);
  }

  for (let i = 1; i <= CURRENT_PLACES_SIZE; i++) {
    document.getElementById(`b${i}d`).style.height = `${maxHeight}px`;
  }
}