function _loadHospedagens() {
  let swiperData = []

  for (let i = 0; i < FIRESTORE_DATA.hospedagens.length; i++) {
    const htmlContent = _getHospedagensHTML(i);
    swiperData.push(htmlContent);
  }

  if (swiperData.length === 0) return;

  _buildHospedagensSwiper(swiperData);

  for (let j = 1; j <= FIRESTORE_DATA.hospedagens.length; j++) {
    _loadImageLightbox(`hospedagens-galeria-${j}`);
  }
  
}

function _getHospedagensHTML(i) {
  const j = i + 1;
  const original = FIRESTORE_DATA.hospedagens[i];
  const hospedagem = {
    cafe: original.cafe,
    checkIn: _getHospedagensData(original.datas.checkin),
    checkOut: _getHospedagensData(original.datas.checkout),
    reserva: original.reserva,
    descricao: original.descricao,
    endereco: original.endereco,
    imagens: original.imagens,
    link: original.link,
    nome: original.nome
  }

  return `<div class="swiper-slide" id="hospedagens-slide-${j}">
            <div class="testimonial-item">
              ${_getHotelBoxHTML(hospedagem, j)}
            </div>
          </div>`
}

function _getHotelBoxHTML(hospedagem, j, innerProgramacao=false) {
  const imagens = hospedagem.imagens;
  const checkIn = innerProgramacao ? _getHospedagensData(hospedagem.datas.checkin) : hospedagem.checkIn;
  const checkOut = innerProgramacao ? _getHospedagensData(hospedagem.datas.checkout) : hospedagem.checkOut
  const galeriaId = innerProgramacao ? 'programacao-galeria' : `hospedagens-galeria-${j}`;
  let galeriaItems = '';

  for (let i = 0; i < imagens.length; i++) {
    const imagem = imagens[i];
    galeriaItems += `<a href="${imagem.link}" data-gallery="portfolioGallery" class="portfolio-lightbox ${galeriaId}" title="${imagem.descricao}">${i == 0 ? '<i class="bx bx-zoom-in"></i>' : ''}</a>`;
  }

  return `<div class="hotel-box${innerProgramacao? "-inner inner-programacao-item" : ''}" id="hospedagens-box-${j}">
            <div class="portfolio-wrap" style="display: ${imagens.length > 0 ? 'block' : 'none'};">
              <div class="hotel-img" style="background-image: url('${imagens[0].link}');">
                <div class="portfolio-info">
                  <div class="portfolio-links">
                    ${galeriaItems}
                  </div>
                </div>
                <div class="hotel-img-text-container">
                  <div class="hotel-img-text" style="display: ${hospedagem.cafe ? 'block' : 'none'};">
                    <i class="bx bx-coffee-togo"></i> Café da Manhã
                  </div>
                </div>
              </div>
            </div>
            <div class="hotel-content">
              <div class="hotel-title">
                <div class="left-title">
                  <div class="hotel-name" id="hospedagens-nome-${j}">
                    ${hospedagem.nome}
                    <div>
                      <i style="display: ${hospedagem.link ? 'block' : 'none'}" class="iconify external-link" 
                      data-icon="tabler:external-link" onclick="window.open('${hospedagem.link}', '_blank')"></i>
                    </div> 
                  </div>
                  <div class="hotel-address" style="display: ${hospedagem.endereco ? 'block' : 'none'}">
                    <i class="bx bxs-map color-icon"></i> 
                    ${hospedagem.endereco}
                  </div>
                </div>
              </div>
              <div class="hotel-text">
              <div class="hotel-reservation" style="display: ${hospedagem.reserva ? 'block' : 'none'}">
                <i class="bx bxs-file color-icon"></i> 
                Reserva #${hospedagem.reserva}
              </div>
                <div class="hotel-description" style="display: ${hospedagem.descricao ? 'block' : 'none'}">
                  <i class="bx bxs-hotel color-icon"></i> 
                  ${hospedagem.descricao}
                </div>
                  <div class="hotel-description">
                    <div>
                      <i class="bi bi-chevron-right color-icon"></i><strong>Check-in:</strong> <span>${checkIn}</span> 
                    </div>
                    <div>
                      <i class="bi bi-chevron-right color-icon"></i><strong>Check-out:</strong> <span>${checkOut}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>`
}

function _getHospedagensData(dataFirestore) {
  const date = _convertFromFirestoreDate(dataFirestore);
  return `${_jsDateToDate(date)}, ${_jsDateToTime(date)}`;
}

function _buildHospedagensSwiper(swiperData) {
  const swiperButtonStyle = swiperData.length > 1 ? '' : `style="display: none"`
  getID(`hospedagens-box`).innerHTML = `<div id="hospedagens-swiper" class="testimonials-slider swiper aos-init aos-animate" data-aos="fade-up" data-aos-delay="100">
                                          <div class="swiper-wrapper" id="hospedagens-wrapper">
                                            ${swiperData.join("")}
                                          </div>
                                          <div class="swiper-controls">
                                            <div class="swiper-button-prev hospedagens-prev" ${swiperButtonStyle}></div>
                                            <div class="swiper-pagination hospedagens-pagination"></div>
                                            <div class="swiper-button-next hospedagens-next" ${swiperButtonStyle}></div>
                                          </div>
                                        </div>`;
  ADJUST_HEIGHT_CARDS.push('hospedagens')
  _initSwiper('hospedagens');
}
