var PLANNED_DESTINATION;
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
    const error = translate('messages.errors.missing_data');
    throw error;
  }

  PLANNED_DESTINATION = JSON.parse(window.localStorage.getItem('PLANNED_DESTINATIONS'))?.[DOCUMENT_ID] || {};
  FIRESTORE_DESTINOS_DATA = await _get(`destinos/${DOCUMENT_ID}`);
  _loadActiveCategory(urlParams);
}

async function _loadDestinosPage() {
  console.log(this.window.location.href);
  await _loadDestinosData();
  _loadVisibilityExternal();

  const title = FIRESTORE_DESTINOS_DATA.titulo || "TripViewer";
  document.title = title;
  getID('title').innerText = title;
  const closeButton = getID("closeButton");
  if (window.parent._closeViewEmbed) {
    closeButton.onclick = function () {
      _unloadMedias();
      window.parent._closeViewEmbed();
    };
  } else {
    closeButton.style.display = "none";
    getID('share').style.display = '';
  }

  getID("logo-link").onclick = function () {
    if (window.parent._closeViewEmbed) {
      window.parent._closeViewEmbed(true);
    } else {
      window.location.href = "index.html";
    }
  };

  if (ACTIVE_CATEGORY && (ACTIVE_CATEGORY === 'mapa' || Object.keys(FIRESTORE_DESTINOS_DATA[ACTIVE_CATEGORY]).length > 0)) {
    _loadDestinoCustomSelect()
    window.addEventListener("resize", () => {
      _applyDestinosMediaHeight();
      _adjustMediaEmbeds();
    });

  } else {
    const error = translate('messages.errors.missing_data');
    throw error;
  }
}

function _loadDestinoByType(activeCategory) {
  const content = getID('content');
  const filterSortContainer = getID('filter-sort-container');

  content.innerHTML = "";
  CONTENT = [];
  MEDIA_HYPERLINKS = {};

  if (activeCategory === 'myMaps') {
    content.classList = "map-content";
    _loadMapDestino(FIRESTORE_DESTINOS_DATA.myMaps);
    filterSortContainer.style.display = "none";
    document.querySelector('.add-container').style.display = 'none';
    return
  } else {
    content.classList = "";
    filterSortContainer.style.display = "";
  }

  const destino = FIRESTORE_DESTINOS_DATA[activeCategory];
  const keys = Object.keys(destino);
  for (let j = 1; j <= keys.length; j++) {
    const id = keys[j - 1];
    const item = destino[id];
    const innerHTML = _getDestinosHTML({ j, id, item });
    _loadEmbed(item?.midia, j)
    CONTENT.push({ id, innerHTML });
  }

  _loadSortAndFilter();
  _applyContent();
  _applyDestinosMediaHeight();
  _adjustInstagramMedia();
  _adjustEditVisibility();
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
function _applyContent() {
  const div = getID("content");
  div.innerHTML = '';
  for (const content of CONTENT) {
    if (content.filtered) {
      continue;
    }
    div.innerHTML += content.innerHTML;
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
  _restoreIfEditing(j);
  _adjustDrawer();
  _toggleMedia(j);
  _unloadMedias(j);
  _closeAccordions(j);
  _adjustEditVisibility(j);
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

      const key = CONFIG.destinos.translation[value];
      const label = translate(`destination.${key}.title`);
      result.push({ value, label });
    }
    return result;
  }

  function _loadDestinoCustomSelectAction(value) {
    _adjustDrawer();
    _updateActiveCategory(value);
    _loadDestinoByType(value);
  }
}

function _getDataSet(key) {
  const category = ACTIVE_CATEGORY;
  if (!category) return new Set();

  const data = FIRESTORE_DESTINOS_DATA?.[category] ?? {};
  return new Set(
    Object.values(data)
      .map(item => item?.[key])
      .filter(v => v !== undefined && v !== null)
  );
}

function _getDestinoID(j) {
  const destino = getID(`destinos-${j}`)
  return destino.getAttribute('data-id');
}

function _getItemFromJ(j) {
  const id = _getDestinoID(j);
  return _getItem(id);
}

function _getItem(id) {
  return FIRESTORE_DESTINOS_DATA[ACTIVE_CATEGORY][id];
}

function _getItemValue(id, key) {
  const item = _getItem(id);
  return item ? item[key] : null;
}

function _isPlanned(id) {
  const value = PLANNED_DESTINATION[ACTIVE_CATEGORY][id]
  return value && Object.keys(value).length > 0;
}

async function _refreshDestino() {
  FIRESTORE_DESTINOS_DATA = await _get(`destinos/${DOCUMENT_ID}`);
  _loadDestinoByType(ACTIVE_CATEGORY);
}

function _share() {
  const title = FIRESTORE_DESTINOS_DATA.titulo || document.title;
  const text = translate('destination.share', { name: FIRESTORE_DESTINOS_DATA.titulo });
  const url = _getPageURL();
  navigator.share({ title, text, url })
}