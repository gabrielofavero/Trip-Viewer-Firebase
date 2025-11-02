var DESTINO = JSON.parse(window.localStorage.getItem('DESTINO'));
var CONTENT = {};

// Métodos Principais
function _loadDestinosHTML() {
  _loadVisibilityExternal();

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

  if (DESTINO?.activeCategory && Object.keys(DESTINO[DESTINO.activeCategory]).length > 0) {
    _loadDropdown();
    _loadDropdownAction(DESTINO.activeCategory);

    window.addEventListener("resize", () => {
      _applyDestinosMediaHeight();
      _adjustInstagramMedia();
    });

  } else {
    console.error("O Código não foi localizado na base de dados");
  }
}

function _loadDestinoByType(activeCategory) {
  const content = getID('content');
  content.innerHTML = "";
  CONTENT = {};

  if (activeCategory === 'myMaps') {
    content.classList = "map-content";
    _loadMapDestino(DESTINO[activeCategory].link);
    return
  } else {
    content.classList = "";
  }

  const destino = DESTINO[activeCategory];
  const isLineup = false;

  for (let j = 1; j <= destino.data.length; j++) {
    const item = destino.data[j - 1];
    const data = isLineup ? _getLineupData(item) : "";
    const key = isLineup ? _getLineupKey(item) : "semData";
    const params = {
      j: j,
      item: item,
      isLineup: isLineup,
      innerProgramacao: false,
      notas: destino.notas,
      valores: destino.valores,
      moeda: destino.moeda
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
    _loadEmbed(item?.midia, isLineup, j)
    _setInnerContent(item, key, data, innerHTML);
  }

  _applyContent();
  _applyDestinosMediaHeight();
  _adjustInstagramMedia();
}

function _loadMapDestino(link) {
  if (!link || !link.includes("mid=")) {
    console.error("Link do My Maps inválido.");
    return;
  }
  const mid = link.split("mid=")[1].split("&")[0];
  getID('content').innerHTML = `<iframe class="map-iframe" src="https://www.google.com/maps/d/embed?mid=${mid}&ehbc=2E312F" width="640" height="480"></iframe>`
}

// Getters
function _getLineupData(item) {
  if (item.data) {
    const dataSplit = item.data.split("-");
    if (dataSplit.length === 3) {
      const dia = dataSplit[0].length === 1 ? "0" + dataSplit[0] : dataSplit[0];
      const mes = dataSplit[1].length === 1 ? "0" + dataSplit[1] : dataSplit[1];
      const ano = dataSplit[2];
      return `${dia}/${mes}/${ano}`;
    }
  }
  return "";
}

function _getLineupKey(item) {
  if (item.data) {
    const filteredData = item.data.split("-").join("");
    if (filteredData && !isNaN(filteredData)) return filteredData;
  }
  return 'semData';
}


// Setters
function _setInnerContent(item, key, data, innerHTML) {
  const innerContent = {
    titulo: item.nome,
    nota: item.nota || "?",
    innerHTML: innerHTML
  }

  if (!CONTENT[key]) {
    CONTENT[key] = {
      titulo: data,
      innerContents: [innerContent]
    };
  } else {
    CONTENT[key].innerContents.push(innerContent);
  }
}

function _applyContent() {
  const div = getID("content");
  const keys = Object.keys(CONTENT).sort((a, b) => a - b); // Ordem Crescente

  div.innerHTML = "";
  for (const key of keys) {
    const titulo = CONTENT[key].titulo ? `<div class="data-lineup">${CONTENT[key].titulo}</div>` : "";
    const innerHTMLs = _orderInnerHTMLs(CONTENT[key].innerContents);
    div.innerHTML += titulo + innerHTMLs.join("")
  }
}

function _orderInnerHTMLs(innerContents) {
  innerContents.sort((a, b) => {
    // Verifica se uma das notas é '?', para priorizar as outras notas
    if (a.nota === '?') return 1;
    if (b.nota === '?') return -1;

    // Ordena por nota em ordem decrescente (5, 4, 3, 2, 1)
    if (b.nota !== a.nota) {
      return b.nota - a.nota;
    }

    // Se as notas são iguais, ordena por título em ordem crescente
    return a.titulo.localeCompare(b.titulo);
  });

  return innerContents.map(item => item.innerHTML);
}



// Actions
function _processAccordion(j) {
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