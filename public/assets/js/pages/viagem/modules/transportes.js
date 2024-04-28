var TRANSPORTE_ICONES = [];

function _loadTransporte() {
  document.getElementById('transporte-subtitulo').innerText = _loadTransporteSubtitulo(FIRESTORE_DATA.transportes.reservas);
  const swiperData = {
    ida: [],
    durante: [],
    volta: [],
  }

  for (let i = 0; i < FIRESTORE_DATA.transportes.datas.length; i++) {
    const htmlContent = _getTransporteHTML(i+1);
    swiperData[FIRESTORE_DATA.transportes.idaVolta[i]].push(htmlContent);
  }

  _buildTransporteSwiper(swiperData);
  _initSwipers('testimonials-slider');
}


function _getTransporteHTML(j) {
  const empresa = _getEmpresaObj(j);
  return `<div class="swiper-slide" id="transporte-slide-${j}">
            <div class="testimonial-item">
                <div class="flight-box" id="fb${j}">
                  <div class="flight-diagram">
                    <div class="flight-title">
                      ${_getImagemHTML(j, empresa)}
                      ${_getReservaHTML(j, empresa)}
                    </div>
                    <div class="flight-text" id="ft${j}">
                      <div class="left-text" id="lt${j}">
                        ${_getPartidaChegadaHTML(j, "partida")}
                      </div>
                      <div class="center-text" id="ct${j}">
                        <i class="flight-line">_________</i>
                        <i class="iconify flight-icon" data-icon="${_getTransporteIcon(j)}"></i>
                        ${_getDuracaoHTML(j)}
                      </div>
                      <div class="right-text" id="rt${j}">
                        ${_getPartidaChegadaHTML(j, "chegada")}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>`
}

function _getEmpresaObj(j) {
  const tipo = FIRESTORE_DATA.transportes.transportes[j - 1];
  const titulo = FIRESTORE_DATA.transportes.empresas[j - 1];

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
    return `<div class="flight-title-text">Trajeto #${j}</div>`
  }
}

function _getReservaHTML(j, empresa) {
  let reserva = FIRESTORE_DATA.transportes.reservas[j - 1];
  const link = FIRESTORE_DATA.transportes.links[j - 1] || empresa.site;

  if (!reserva) return ""
  reserva = reserva[0] === "#" ? reserva.slice(1) : reserva;

  if (link) return `<a class="flight-code" href="${link}" target="_blank">#${reserva}</a>`;
  else return `<div class="flight-code">#${reserva}</div>`
}

function _getPartidaChegadaHTML(j, tipo) {
  const data = _convertFromFirestoreDate(FIRESTORE_DATA.transportes.datas[j - 1][tipo]);
  const local = FIRESTORE_DATA.transportes.pontos[j - 1][tipo];

  let result = `<div class="flight-date">${_jsDateToDate(data, 'dd/mm')}</div>
                <div class="flight-time">${_jsDateToTime(data)}</div>`;

  if (local) result += `<div class="flight-location">${local}</div>`;
  return result;
}

function _getTransporteIcon(j) {
  const tipo = FIRESTORE_DATA.transportes.transportes[j - 1];
  const icone = CONFIG.transportes.icones[tipo] || CONFIG.transportes.icones.outro;
  TRANSPORTE_ICONES.push(icone);
  return icone;
}

function _getDuracaoHTML(j) {
  const duracao = FIRESTORE_DATA.transportes.duracoes[j - 1];
  if (!duracao) return "";
  else return `<div class="flight-duration">${_jsTimeToVisualTime(duracao)}</div>`;
}

function _buildTransporteSwiper(swiperData) {
  for (const key of Object.keys(swiperData)) {
    const div = document.getElementById(`transporte-${key}`);
    const cnt = document.getElementById(`transporte-${key}-content`)
    if (swiperData[key].length > 0) {
      div.style.display = "block";
      cnt.innerHTML = `<div id="transporte-swiper-${key}" class="testimonials-slider swiper aos-init aos-animate" data-aos="fade-up" data-aos-delay="100">
                        <div class="swiper-wrapper">
                          ${swiperData[key].join("")}
                        </div>
                        <div class="swiper-pagination"></div>
                      </div>`;
    }
  }
}

function _loadTransporteSubtitulo(reservas) {
  if (!reservas) return "";
  const unique = [...new Set(reservas)];
  const filtered = unique.filter(reserva => reserva);
  const size = filtered.length;

  if (size == 0) return "";
  else return size == 1 ? `Reserva ${filtered[0]}` : `Reservas ${_getReadableArray(filtered)}`;
}

function _loadTransporteImagens() {
  let j = 1;
  while (document.getElementById(`transporte-slide-${j}`)) {
    const claro = document.getElementById(`flight-img-claro-${j}`);
    const escuro = document.getElementById(`flight-img-escuro-${j}`);

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
    document.getElementById('transporte-nav').setAttribute('data-icon', unique[0]);
  }
}