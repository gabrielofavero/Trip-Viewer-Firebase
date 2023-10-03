// ======= Places JS =======

var P_RESULT = {};
var PLACES_FILTERED_SIZE;
var CURRENT_PLACES_SIZE = 0;

// ======= LOADERS =======
function _loadPlaces() {
  const cidades = FIRESTORE_DATA.cidades;

  for (const cidade of cidades) {
    P_RESULT[cidade.sigla] = cidade.passeios;
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
  const cities = FIRESTORE_DATA.cidades;

  firstOption.value = cities[0].sigla;
  firstOption.text = cities[0].nome;
  select.add(firstOption);
  firstOption.selected = true;

  if (cities.length > 1) {
    for (let i = 1; i < cities.length; i++) {
      let newOption = document.createElement("option");
      newOption.value = cities[i].sigla;
      newOption.text = cities[i].nome;
      select.add(newOption);
    };
  } else {
    select.style.display = "none";
  };

  select.addEventListener("change", function () {
    _loadPlacesHTML(select.value);
    _adjustPlacesHTML();
  });
}

function _loadPlacesHTML(city) {
  let div = document.getElementById("passeiosBox");
  let text = "";

  const headers = city.headers;
  CURRENT_PLACES_SIZE = headers.length;

  let linktype = _getLinkType();

  for (let i = 0; i < headers.length; i++) {
    const j = i + 1;
    const box = CONFIG.places.boxes[_getPlacesBoxesIndex(i)];
    const title = CONFIG.places.places[headers[i]]["title"];
    const code = headers[i];
    const href = code === "mapa" ? city.myMaps : "#";
    const lt = code === "mapa" ? linktype : "";
    const onclick = code === "mapa" ? "" : `onclick="_openLightbox('${_getPlacesHref(code, city)}')"`;
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

function getPlacesSelectValue() {
  let select = document.getElementById("places-select");
  return select.value || FIRESTORE_DATA.cidades[0].sigla;
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

function _getPlacesHref(code, city) {
  if (code == "mapa") {
    return FIREBASE_DATA.cidades[city].myMaps;
  } else return `places.html?city=${getPlacesSelectValue()}&type=${code}`;
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