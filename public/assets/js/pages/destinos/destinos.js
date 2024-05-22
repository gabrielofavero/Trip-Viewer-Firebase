var DESTINO = JSON.parse(window.localStorage.getItem('DESTINO'));
var CONTENT = {};

// Métodos Principais
function _loadDestinosHTML() {
  _loadVisibilityPasseio();

  getID("closeButton").onclick = function () {
    window.parent._closeLightbox();
  };

  getID("logo-link").onclick = function () {
    window.parent._closeLightbox();
  };

  if (DESTINO && Object.keys(DESTINO).length > 0) {
    document.title = DESTINO.descricao.title;
    getID("titulo-destinos").innerHTML = "<h2>" + document.title + "</h2>";
    if (DESTINO.descricao.subtitle) {
      getID("subtitulo-destinos").innerHTML = "<h5>" + DESTINO.descricao.subtitle + "</h5>";
    }

    const isLineup = DESTINO.descricao.title == "Lineup";

    for (let j = 1; j <= DESTINO.data.length; j++) {
      const item = DESTINO.data[j-1];
      const data = isLineup ? _getLineupData(item) : "";
      const key = isLineup ? _getLineupKey(item) : "semData";

      const innerHTML = `<div class="accordion-group">
                          <div id="destinos-${j}" class="accordion-item"  data-drag-listener="true">
                              <h2 class="accordion-header" id="heading-destinos-${j}">
                                  <button id="destinos-titulo-${j}" class="accordion-button flex-button collapsed" type="button"
                                      data-bs-toggle="collapse" data-bs-target="#collapse-destinos-${j}" aria-expanded="false"
                                      aria-controls="collapse-destinos-${j}" onclick="_toggleMedia(${j})">
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
                                  <div class="accordion-body" id="accordion-body-${j}">
                                      <div class="destinos-titulo" style="display: ${_getDestinosTituloVisibility(item)}">
                                          <div class="notas-box">
                                              <i class="iconify nota-sem-margem ${_getNotaClass(item)}" data-icon="${_getNotaIcon(item)}"></i>
                                              <span class="nota-texto">${_getNotaText(item, isLineup)}</span>
                                          </div>
                                          <div class="links-container" style="display: ${_getLinksContainerVisibility(item, isLineup)}">
                                              <i class="iconify link" data-icon="f7:map" style="display: ${item.mapa ? 'block' : 'none'}"${_getLinkOnClick(item, 'mapa')}></i>
                                              <i class="iconify link" data-icon="ri:instagram-line" style="display: ${item.instagram ? 'block' : 'none'}"${_getLinkOnClick(item, 'instagram')}></i>
                                              <i class="iconify link" data-icon="tabler:world" style="display: ${item.website ? 'block' : 'none'}"${_getLinkOnClick(item, 'website')}></i>
                                          </div>
                                      </div>
                                      <div class="destinos-text">
                                          <div class="destinos-topicos-box" style="display: block">
                                              <div class="destinos-topico" style="display: ${_getHeadlinerVisibility(item, isLineup)}">
                                                  <i class="iconify color-icon" data-icon="ph:star-bold"></i>
                                                  Headliner
                                              </div>
                                              <div class="destinos-topico" style="display: ${_getDisplayHorario(item, isLineup)}">
                                                  <i class="iconify color-icon" data-icon="mingcute:time-line"></i>
                                                  ${isLineup ? item.horario : ""}
                                              </div>
                                              <div class="destinos-topico" style="display: ${_getPalcoRegiaoVisibility(item, isLineup)}">
                                                  <i class="iconify color-icon" data-icon="mingcute:location-line"></i>
                                                  ${_getPalcoRegiaoValue(item, isLineup)}
                                              </div>
                                              <div class="destinos-topico" style="display: ${_getValorVisibility(item, isLineup)}">
                                                  <i class="iconify color-icon" data-icon="bx:dollar"></i>
                                                  ${_getValorValue(item, isLineup)}
                                              </div>
                                              <div class="destinos-topico" style="display: ${_getGeneroVisibility(item, isLineup)}">
                                                  <i class="iconify color-icon" data-icon="mingcute:music-fill"></i>
                                                  ${isLineup ? item.genero : ""}
                                              </div>
                                          </div>
                                          <div class="destinos-descricao" style="display: ${_getDescricaoVisibility(item, isLineup)}">
                                              ${_getDescricaoValue(item, isLineup)}
                                          </div>
                                          <div id="midia-${j}" class="midia-container"></div>
                                      </div>
                                  </div>
                              </div>
                          </div>
                      </div>`;
      _loadEmbed(item?.midia, isLineup, j)
      _setInnerContent(item, key, data, innerHTML);
    }

    _applyContent();

    _applyDestinosMediaHeight();
    window.addEventListener("resize", _applyDestinosMediaHeight);

  } else {
    console.error("O Código não foi localizado na base de dados");
  }
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
      // Ordena por nota em ordem decrescente
      if (b.nota !== a.nota) {
          return b.nota - a.nota;
      }
      // Se as notas são iguais, ordena por título em ordem crescente
      return a.titulo.localeCompare(b.titulo);
  });
  return innerContents.map(item => item.innerHTML);
}


// Actions
function openLinkInNewTab(url) {
  var win = window.open(url, '_blank');
  win.focus();
}

function _toggleMedia(i) {
  const button = getID(`destinos-titulo-${i}`);
  const id = `midia-${i}`;
  if (button.classList.contains("collapsed")) {
    _unloadMedia(id);
  } else {
    _loadMedia(id);
    _applyDestinosMediaHeight();
  }
}