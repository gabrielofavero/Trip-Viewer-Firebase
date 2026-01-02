var PLANNED_DESTINATIONS;
var FIRESTORE_DESTINOS_DATA;
var CONTENT = [];
var ACTIVE_CATEGORY;

window.addEventListener("load", async function () {
  try {
    _startLoadingScreen();
    _main();
    _stopLoadingScreen();
  } catch (error) {
    _displayError(error);
    console.error(error);
  }
});

async function _loadDestinosData() {
  const urlParams = _getURLParams();
  DOCUMENT_ID = urlParams['d'];

  if (!DOCUMENT_ID) {
    const error = translate('messages.error.missing_data');
    throw error;
  }

  PLANNED_DESTINATIONS = JSON.parse(window.localStorage.getItem('PLANNED_DESTINATIONS')) || {};
  FIRESTORE_DESTINOS_DATA = await _get(`destinos/${DOCUMENT_ID}`);
  ACTIVE_CATEGORY = urlParams['active'] || _getFirstCategory();
}

async function _loadDestinosPage() {
  await _loadDestinosData();
  _loadVisibilityExternal();

  document.title = FIRESTORE_DESTINOS_DATA.titulo || "TripViewer";
  const closeButton = getID("closeButton");
  if (window.parent._closeLightbox) {
    closeButton.onclick = function () {
      _unloadMedias();
      window.parent._closeLightbox();
    };
  } else {
    closeButton.style.display = "none";
  }

  getID("logo-link").onclick = function () {
    if (window.parent._closeLightbox) {
      window.parent._closeLightbox(true);
    } else {
      window.location.href = "index.html";
    }
  };

  if (ACTIVE_CATEGORY && (ACTIVE_CATEGORY === 'mapa' || Object.keys(FIRESTORE_DESTINOS_DATA[ACTIVE_CATEGORY]).length > 0)) {
    _loadDestinoCustomSelect()
    window.addEventListener("resize", () => {
      _applyDestinosMediaHeight();
      _adjustInstagramMedia();
    });

  } else {
    const error = translate('messages.error.missing_data');
    throw error;
  }
}

function _loadDestinoByType(activeCategory) {
  const content = getID('content');
  content.innerHTML = "";
  CONTENT = [];
  MEDIA_HYPERLINKS = {};

  if (activeCategory === 'myMaps') {
    content.classList = "map-content";
    _loadMapDestino(FIRESTORE_DESTINOS_DATA[activeCategory].myMaps);
    return
  } else {
    content.classList = "";
  }

  const destino = FIRESTORE_DESTINOS_DATA[activeCategory];

  const keys = Object.keys(destino);
  for (let j = 1; j <= keys.length; j++) {
    const key = keys[j - 1];
    const item = destino[key];
    const params = {
      j: j,
      item: item,
      valores: CONFIG.moedas.escala[FIRESTORE_DESTINOS_DATA.moeda],
    }

    const innerHTML = `<div class="accordion-group" id='destinos-box-${j}'>
                          <div id="destinos-${j}" class="accordion-item"  data-drag-listener="true">
                              <h2 class="accordion-header" id="heading-destinos-${j}">
                                  <button id="destinos-titulo-${j}" class="accordion-button flex-button collapsed" type="button"
                                      data-bs-toggle="collapse" data-bs-target="#collapse-destinos-${j}" aria-expanded="false"
                                      aria-controls="collapse-destinos-${j}" onclick="_processAccordion(${j})">
                                      <span class="title-text" id="destinos-titulo-text-${j}">${_getTitulo(item)}</span>
                                      <div class="icon-container new-box" style="display: ${item.novo ? 'block' : 'none'}">
                                          <svg class="new" version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg"
                                              xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 11.4 5.3"
                                              style="enable-background:new 0 0 11.4 5.3;" xml:space="preserve" height="1em">
                                              <style type="text/css">
                                                  .st0 {
                                                      fill: none;
                                                  }
                                              </style>
                                              <path
                                                  d="M11.4,4.8l-1.3-2.2l1.3-2.1c0.1-0.2,0-0.4-0.1-0.5c-0.1,0-0.1,0-0.2,0H0.7C0.3,0,0,0.3,0,0.7v4C0,5,0.3,5.3,0.7,5.3h10.4
                                          c0.2,0,0.3-0.1,0.3-0.3C11.4,4.9,11.4,4.9,11.4,4.8 M3.5,3.7H3.1L2,2.3v1.5H1.7V1.7H2l1.1,1.5V1.7h0.4L3.5,3.7z M5.6,2H4.4v0.5h1.1
                                          v0.3H4.4v0.5h1.2v0.3H4.1v-2h1.5L5.6,2z M8.4,3.7H8L7.5,2.2L7,3.7H6.6L5.9,1.7h0.4l0.4,1.5l0.5-1.5h0.4l0.5,1.5l0.4-1.5H9L8.4,3.7z" />
                                              <path class="st0" d="M0-3.3h12v12H0V-3.3z" />
                                          </svg>
                                      </div>
                                      ${_getPlannedHTML(_isPlanned(item.id))}
                                      <div class="icon-container" style="display: ${item.nota ? 'block' : 'none'}">
                                          <i class="iconify nota ${_getNotaClass(item)}" data-icon="${_getNotaIcon(item)}"></i>
                                      </div>
                                  </button>
                              </h2>
                              <div id="collapse-destinos-${j}" class="accordion-collapse collapse"
                                  aria-labelledby="heading-destinos-${j}" data-bs-parent="#destinos-box">
                                  ${_getDestinosBoxHTML(params)}
                              </div>
                          </div>
                      </div>`;
    _loadEmbed(item?.midia, j)
    _setInnerContent(item, innerHTML);
  }

  _loadSortAndFilter();
  _applyContent();
  _applyDestinosMediaHeight();
  _adjustInstagramMedia();
  _loadEditDestination();
}

function _loadMapDestino(link) {
  if (!link || !link.includes("mid=")) {
    console.error("Link do My Maps inválido.");
    return;
  }
  const mid = link.split("mid=")[1].split("&")[0];
  getID('content').innerHTML = `<iframe class="map-iframe" src="https://www.google.com/maps/d/embed?mid=${mid}&ehbc=2E312F" width="640" height="480"></iframe>`
}


// Setters
function _setInnerContent(item, innerHTML) {
  const innerContent = {
    titulo: item.nome,
    nota: item.nota || "default",
    valor: item.valor || "default",
    regiao: item.regiao,
    planejado: _isPlanned(item.id),
    innerHTML: innerHTML
  }

  CONTENT.push(innerContent);
}

function _applyContent() {
  const div = getID("content");
  div.innerHTML = '';
  for (const item of CONTENT) {
    if (item.filtered) {
      continue;
    }
    div.innerHTML += item.innerHTML;
  }
}

function _orderInnerHTMLs(innerContents) {
  innerContents.sort((a, b) => {
    if (a.nota === '?') return 1;
    if (b.nota === '?') return -1;

    if (b.nota !== a.nota) {
      return b.nota - a.nota;
    }

    return a.titulo.localeCompare(b.titulo);
  });

  return innerContents.map(item => item.innerHTML);
}


// Actions
function _processAccordion(j) {
  _adjustDrawer();
  _toggleMedia(j);
  _unloadMedias(j);
  _closeAccordions(j);
}

function _toggleMedia(j) {
  const button = getID(`destinos-titulo-${j}`);
  const midia = `midia-${j}`;
  if (button.classList.contains("collapsed")) {
    _unloadMedia(midia);
  } else {
    _loadMedia(midia);
    _applyDestinosMediaHeight();
  }
}

function _closeAccordions(exclude) {
  for (const j of _getJs('content')) {
    if (j !== exclude) {
      $(`#collapse-destinos-${j}`).collapse("hide");
    }
  }
}

function _loadDestinoCustomSelect() {
  const customSelect = {
    id: 'destinos-select',
    options: _getDestinoCustomSelectOptions(),
    activeOption: ACTIVE_CATEGORY === 'mapa' ? 'myMaps' : ACTIVE_CATEGORY,
    action: _loadDestinoCustomSelectAction
  }

  _loadCustomSelect(customSelect);
  _loadCloseCustomSelectListeners();

  function _getDestinoCustomSelectOptions() {
    const result = [];
    const values = CONFIG.destinos.categorias.ids;
    for (const value in FIRESTORE_DESTINOS_DATA) {
      if (!values.includes(value) ||
        (value !== 'myMaps' && Object.keys(FIRESTORE_DESTINOS_DATA[value]).length === 0)) {
        continue;
      }

      const label = CONFIG.destinos.translation[value];
      result.push({ value, label });
    }
    return result;
  }

  function _loadDestinoCustomSelectAction(value) {
    _adjustDrawer();
    _updateActiveCategory(value)
    _loadDestinoByType(value);
  }
}

function _getPlannedHTML(planejado) {
  if (!planejado) return '';
  return `<div class="icon-container">
            <i class="iconify planejado" data-icon="fa-solid:check"></i>
          </div>`
}

function _getDataValues() {
  return Object.values(FIRESTORE_DESTINOS_DATA[ACTIVE_CATEGORY]);
}

function _isPlanned(id) {
  return PLANNED_DESTINATIONS[id] === true;
}

function _updateActiveCategory(category) {
  ACTIVE_CATEGORY = category;
  const url = new URL(window.location);
  url.searchParams.set('active', category);
  window.history.replaceState({}, '', url);
}