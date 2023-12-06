// ======= Places JS =======

var P_RESULT = {};
var PLACES_FILTERED_SIZE;
var CURRENT_PLACES_SIZE = 0;
var CIDADES = [];

// ======= LOADERS =======
function _loadPlaces() {
  for (let i = 0; i < CIDADES.length; i++) {
    P_RESULT[CIDADES[i].passeios.sigla] = CIDADES[i].passeios;
  }

  window.localStorage.setItem('P_RESULT', JSON.stringify(P_RESULT));
  window.localStorage.setItem('CURRENCY', FIRESTORE_DATA.moeda);
  window.localStorage.setItem('CURRENCY_JSON', JSON.stringify(CONFIG.places.currency));
  window.localStorage.setItem('PLACES_JSON', JSON.stringify(CONFIG.places.places));
  window.localStorage.setItem('PLACES_SETTINGS_JSON', JSON.stringify(CONFIG.places.settings));

  window.addEventListener("resize", function () {
    _adjustPlacesHTML();
  });
}

function _loadPlacesSelect() {
  let select = document.getElementById("places-select");
  let firstOption = document.createElement("option");
  CIDADES = FIRESTORE_DATA.cidades;

  const firstSigla = _getNewPlacesSigla(CIDADES[0].passeios.titulo);
  CIDADES[0].passeios.sigla = firstSigla;

  firstOption.value = firstSigla;
  firstOption.text = CIDADES[0].titulo;
  select.add(firstOption);
  firstOption.selected = true;

  if (CIDADES.length > 1) {
    for (let i = 1; i < CIDADES.length; i++) {
      let newOption = document.createElement("option");
      let sigla = _getNewPlacesSigla(CIDADES[i].passeios.titulo);
      CIDADES[i].passeios.sigla = sigla;

      newOption.value = sigla;
      newOption.text = CIDADES[i].titulo;
      select.add(newOption);
    };
  } else {
    select.style.display = "none";
  };

  select.addEventListener("change", function () {
    for (let i = 0; i < CIDADES.length; i++) {
      const sigla = CIDADES[i].passeios.sigla;
      if (sigla === select.value) {
        _loadPlacesHTML(FIRESTORE_DATA.cidades[i].passeios);
        _adjustPlacesHTML();
        break;
      }
    }
  });
}

function _loadPlacesHTML(passeio) {
  let div = document.getElementById("passeiosBox");
  let text = "";

  const headers = _getPlacesHeaders(passeio.modulos);
  CURRENT_PLACES_SIZE = headers.length;

  let linktype = _getLinkType();

  for (let i = 0; i < headers.length; i++) {
    const j = i + 1;
    const box = CONFIG.places.boxes[_getPlacesBoxesIndex(i)];
    const title = CONFIG.places.places[headers[i]]["title"];
    const code = headers[i];
    const href = code === "mapa" ? passeio.myMaps : "#";
    const lt = code === "mapa" ? linktype : "";
    const onclick = code === "mapa" ? "" : `onclick="_openLightbox('${_getPlacesHref(code, passeio)}')"`;
    const icon = CONFIG.places.places[headers[i]]["icon"];
    const description = CONFIG.places.places[headers[i]]["description"];
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
  const headerBase = ['restaurantes', 'lanches', 'saidas', 'turismo', 'lojas', 'mapa', 'lineup']
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
  let select = document.getElementById("places-select");
  return select.value || CIDADES[0].passeios.sigla;
}

function _getPlacesBoxesIndex(i) {
  if (i > CONFIG.places.boxes.length - 1) {
    return i % CONFIG.places.boxes.length;
  } else return i
}

function _getLinkType() {
  if (_isIOSDevice()) {
    return "";
  } else {
    return "target='_blank'";
  }
}

function _getPlacesHref(code, passeio) {
  if (code == "mapa") {
    return passeio.myMaps;
  } else return `passeios.html?passeio=${passeio.sigla}&type=${code}`;
}

function _getNewPlacesSigla(name) {
  var original = _codifyText(name);
  var result = original;
  let j = 0;
  for (let i = 0; i < CIDADES.length; i++) {
    const sigla = CIDADES[i].passeios.sigla;
    if (result == sigla) {
      result += original + j;
      j++;
    }
  }
  return result;
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