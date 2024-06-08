var TRANSPORTE_ICONES = [];

function _loadTransporte() {
  getID('transporte-subtitulo').innerText = _loadTransporteSubtitulo();
  const swiperData = {
    ida: [],
    durante: [],
    volta: [],
  }

  for (let i = 0; i < FIRESTORE_DATA.transportes.dados.length; i++) {
    const idaVolta = FIRESTORE_DATA.transportes.dados[i].idaVolta;
    const htmlContent = _getTransporteHTML(i + 1, idaVolta);
    swiperData[idaVolta].push(htmlContent);
  }

  _buildTransporteSwiper(swiperData);
}

function _getTransporteHTML(j, idaVolta) {
  return `<div class="swiper-slide" id="transporte-slide-${j}">
            <div class="testimonial-item">
                ${_getFlightBoxHTML(j, idaVolta)}
              </div>
            </div>`
}

function _getFlightBoxHTML(j, identifier, innerProgramacao=false) {
  const empresa = _getEmpresaObj(j);
  return `<div class="flight-box${innerProgramacao? " inner-programacao-item" : ''}" id="transporte-${identifier}-box-${j}">
            <div class="flight-diagram">
              <div class="flight-title">
                ${_getImagemHTML(j, empresa)}
                ${_getReservaHTML(j, empresa)}
              </div>
              <div class="flight-text">
                <div class="left-text">
                  ${_getPartidaChegadaHTML(j, "partida")}
                </div>
                <div class="center-text">
                  <i class="flight-line" ${_adjustFlightLine(j)}">_________</i>
                  <i class="iconify flight-icon" data-icon="${_getTransporteIcon(j)}"></i>
                  ${_getDuracaoHTML(j)}
                </div>
                <div class="right-text">
                  ${_getPartidaChegadaHTML(j, "chegada")}
                </div>
              </div>
            </div>
          </div>`
}

function _getEmpresaObj(j) {
  const transporte = FIRESTORE_DATA.transportes.dados[j-1];
  const tipo = transporte.transporte;
  const titulo = transporte.empresa;

  const tituloConfig = _getIfExists(`CONFIG.transportes.empresas.${tipo}.${titulo}`);
  const siteConfig = _getIfExists(`CONFIG.transportes.sites.${tipo}.${titulo}`);
  const imagemConfig = _getIfExists(`CONFIG.transportes.imagens.${tipo}.${titulo}`);

  return {
    titulo: tituloConfig || titulo,
    imagens: imagemConfig || {},
    site: siteConfig || "",
    isCustom: !tituloConfig
  }
}

function _getImagemHTML(j, empresa) {
  const transporte = FIRESTORE_DATA.transportes.dados[j-1];
  if (!empresa.isCustom) {
    return `<a href="${empresa.site}">
              <img class="flight-img" id="flight-img-claro-${j}" src="${empresa.imagens.claro}"
                style="display: ${_isOnDarkMode() ? 'none' : 'block'};">
              <img class="flight-img" id="flight-img-escuro-${j}" src="${empresa.imagens.escuro}"
                style="display: ${_isOnDarkMode() ? 'block' : 'none'};">
            </a>`;
  } else if (empresa.titulo) {
    return `<div class="flight-title-text">${empresa.titulo}</div>`
  } else {
    return `<div class="flight-title-text">${transporte.pontos.partida} → ${transporte.pontos.chegada}</div>`
  }
}

function _getReservaHTML(j, empresa) {
  const transporte = FIRESTORE_DATA.transportes.dados[j-1];
  let reserva = transporte.reserva;
  let link = empresa.site || "";

  if (transporte.link) {
    link = transporte.link;
  }

  if (!reserva) return ""
  reserva = reserva[0] === "#" ? reserva.slice(1) : reserva;

  if (link) return `<a class="flight-code" href="${link}" target="_blank">#${reserva}</a>`;
  else return `<div class="flight-code">#${reserva}</div>`
}

function _getPartidaChegadaHTML(j, tipo) {
  const transporte = FIRESTORE_DATA.transportes.dados[j-1];
  const data = _convertFromFirestoreDate(transporte.datas[tipo]);
  const local = transporte.pontos[tipo];

  let result = `<div class="flight-date">${_jsDateToDate(data, 'dd/mm')}</div>
                <div class="flight-time">${_jsDateToTime(data)}</div>`;

  if (local) result += `<div class="flight-location">${local}</div>`;
  return result;
}

function _getTransporteIcon(j) {
  const tipo = FIRESTORE_DATA.transportes.dados[j-1].transporte;
  const icone = CONFIG.transportes.icones[tipo] || CONFIG.transportes.icones.outro;
  TRANSPORTE_ICONES.push(icone);
  return icone;
}

function _getDuracaoHTML(j) {
  const duracao = FIRESTORE_DATA.transportes.dados[j-1].duracao;
  if (!duracao) return ""
  else return `<div class="flight-duration">${_jsTimeToVisualTime(duracao)}</div>`;
}

function _adjustFlightLine(j) {
  const duracao = FIRESTORE_DATA.transportes.dados[j-1].duracao;
  if (!duracao) return "style='transform: translateY(-33.75%);'";
  else return "";
}

function _buildTransporteSwiper(swiperData) {
  let keys, data;

  if (FIRESTORE_DATA.transportes.visualizacaoSimplificada == true) {
    keys = ['ida'];
    data = swiperData['ida'].join("") + swiperData['durante'].join("") + swiperData['volta'].join("");
    getID('transporte-ida-titulo').style.display = "none";
  }
  else {
    keys = Object.keys(swiperData)
  }

  for (const key of keys) {
    const div = getID(`transporte-${key}`);
    const cnt = getID(`transporte-${key}-content`)
    if (swiperData[key].length > 0 || data) {
      div.style.display = "block";
      cnt.innerHTML = `<div id="transporte-${key}-swiper" class="testimonials-slider swiper aos-init aos-animate" data-aos="fade-up" data-aos-delay="100">
                        <div class="swiper-wrapper" id="transporte-${key}-wrapper">
                          ${data || swiperData[key].join("")}
                        </div>
                        <div class="swiper-pagination transporte-${key}-pagination"></div>
                      </div>`;

                      ADJUST_HEIGHT_CARDS.push(`transporte-${key}`);
                      _initSwiper(`transporte-${key}`)
    }
  }
}

function _loadTransporteSubtitulo() {
  const reservas = FIRESTORE_DATA.transportes.dados.map(reserva => reserva.reserva);
  const unique = [...new Set(reservas)];
  const filtered = unique.filter(reserva => reserva);
  const size = filtered.length;

  if (size == 0) return "";
  else return size == 1 ? `Reserva ${filtered[0]}` : `Reservas ${_getReadableArray(filtered)}`;
}

function _loadTransporteImagens() {
  let j = 1;
  while (getID(`transporte-slide-${j}`)) {
    const claro = getID(`flight-img-claro-${j}`);
    const escuro = getID(`flight-img-escuro-${j}`);

    if (claro && escuro) {
      claro.style.display = _isOnDarkMode() ? "none" : "block";
      escuro.style.display = _isOnDarkMode() ? "block" : "none";
    }

    j++;
  }
}

function _loadIconeGeralTransporte() {
  const unique = [...new Set(TRANSPORTE_ICONES)];
  if (unique.length == 1) {
    getID('transporte-nav').setAttribute('data-icon', unique[0]);
  }
}