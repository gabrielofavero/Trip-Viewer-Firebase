var TRANSPORTE_ICONES = [];
var TRANSPORTE_ATIVO = 'ida'

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
  const flightCode = link ? `<a class="flight-code" href="${link}" target="_blank">#${reserva}</a>` : `<div class="flight-code">#${reserva}</div>`;
  const copyIcon = `<i class="iconify copy-icon" data-icon="mdi:content-copy" onclick="_copyToClipboard('${reserva}')"></i>`;
  return `${flightCode} ${copyIcon}`;
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
  }
  else {
    keys = Object.keys(swiperData)
    _loadAbasTransportes();
  }

  for (const key of keys) {
    const cnt = getID(`transporte-${key}-content`)
    if (swiperData[key].length > 0 || data) {
      cnt.innerHTML = `<div id="transporte-${key}-swiper" class="testimonials-slider swiper aos-init aos-animate" data-aos="fade-up" data-aos-delay="100">
                        <div class="swiper-wrapper" id="transporte-${key}-wrapper">
                          ${data || swiperData[key].join("")}
                        </div>
                        <div class="swiper-controls">
                          <div class="swiper-button-prev transporte-${key}-prev"></div>
                          <div class="swiper-pagination transporte-${key}-pagination"></div>
                          <div class="swiper-button-next transporte-${key}-next"></div>
                        </div>
                      </div>`;

      ADJUST_HEIGHT_CARDS.push(`transporte-${key}`);
      _initSwiper(`transporte-${key}`);
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

function _copyToClipboard(text) {
  navigator.clipboard.writeText(text);
  _openToast("Texto copiado para a área de transferência");
}

function _loadAbasTransportes() {
  const marginTop = '2em'

  const ida = getID('transporte-ida');
  const durante = getID('transporte-durante');
  const volta = getID('transporte-volta');

  getID('tabs-container-transportes').style.display = '';
  ida.style.display = 'block';
  durante.style.display = 'none';
  volta.style.display = 'none';

  ida.style.marginTop = marginTop;
  durante.style.marginTop = marginTop;
  volta.style.marginTop = marginTop;
  
  _setTransporteAbasListeners();
}

function _setTransporteAbasListeners() {
  const radios = ['radio-ida', 'radio-durante', 'radio-volta'];
  radios.forEach(radio => {
      getID(radio).addEventListener('click', function () {
          const transporte = radio.replace('radio-', '');
          if (TRANSPORTE_ATIVO === transporte) return;

          const transporteAnterior = TRANSPORTE_ATIVO;
          TRANSPORTE_ATIVO = transporte;

          const anterior = `transporte-${transporteAnterior}`;
          const atual = `transporte-${TRANSPORTE_ATIVO}`;

          _fadeOut([anterior]); 

          setTimeout(() => {
            _teste123(atual);
          }, 200);

      });
  });
}

function _teste123(tipo) {
  const elemento = getID(tipo);
  elemento.style.display = 'block';
  elemento.style.opacity = 0;

  // Animação de fade-in
  let opacidade = 0;
  const fadeIn = setInterval(() => {
      if (opacidade >= 1) {
          clearInterval(fadeIn);
      } else {
          opacidade += 0.1;
          elemento.style.opacity = opacidade;
      }
  }, 50); // Tempo entre os frames do fade-in

  let innerID = 'box';
  const sliders = _getChildIDs(`${tipo}-wrapper`);
  let maxHeight = 0;

  for (const slider of sliders) {
      const j = _getJ(slider);
      const box = getID(`${tipo}-${innerID}-${j}`);

      if (box) {
          box.style.height = 'auto';
          const height = box.offsetHeight;
          if (height > maxHeight) {
              maxHeight = height;
          }
      }
  }

  for (const slider of sliders) {
      const j = _getJ(slider);
      const div = getID(`${tipo}-${innerID}-${j}`);
      if (div) {
          div.style.height = `${maxHeight}px`;
      }
  }
}

