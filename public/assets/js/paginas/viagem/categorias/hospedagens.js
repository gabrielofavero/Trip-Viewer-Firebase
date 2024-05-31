function _loadHospedagens() {
  let swiperData = []

  for (let i = 0; i < FIRESTORE_DATA.hospedagens.length; i++) {
    const htmlContent = _getHospedagensHTML(i);
    swiperData.push(htmlContent);
  }

  if (swiperData.length === 0) return;

  _buildHospedagensSwiper(swiperData);
  _loadImageLightbox('hospedagens-galeria')
}

function _getHospedagensHTML(i) {
  const j = i + 1;
  const original = FIRESTORE_DATA.hospedagens[i];
  const hospedagem = {
    cafe: original.cafe,
    checkIn: _getHospedagensData(original.datas.checkin),
    checkOut: _getHospedagensData(original.datas.checkout),
    descricao: original.descricao,
    endereco: original.endereco,
    imagem: _getImageLink(original.imagem),
    link: original.link,
    nome: original.nome
  }

  return `<div class="swiper-slide" id="hospedagens-slide-${j}">
            <div class="testimonial-item">
              <div class="hotel-box" id="hospedagens-box-${j}">

                <div class="portfolio-wrap" style="display: ${hospedagem.imagem ? 'block' : 'none'};">
                  <div class="hotel-img" style="background-image: url('${hospedagem.imagem}');">
                    <div class="portfolio-info">
                      <div class="portfolio-links">
                        <a href="${hospedagem.imagem}" data-gallery="portfolioGallery" class="portfolio-lightbox hospedagens-galeria" title="${_getHospedagemImagemTitle(hospedagem)}"><i class="bx bx-zoom-in"></i></a>
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
                    <div class="hotel-description" style="display: ${hospedagem.descricao ? 'block' : 'none'}">
                      <i class="bx bxs-hotel color-icon"></i> 
                      ${hospedagem.descricao}
                    </div>
                      <div class="hotel-description">
                        <div>
                          <i class="bi bi-chevron-right color-icon"></i><strong>Check-in:</strong> <span>${hospedagem.checkIn}</span> 
                        </div>
                        <div>
                          <i class="bi bi-chevron-right color-icon"></i><strong>Check-out:</strong> <span>${hospedagem.checkOut}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
            </div>
          </div>`
}

function _getHospedagemImagemTitle(hospedagem) {
  if (hospedagem.hospedagem && hospedagem.descricao) {
    return `${hospedagem.hospedagem} - ${hospedagem.descricao}`;
  } else return hospedagem.hospedagem || "";
}

function _getHospedagensData(dataFirestore) {
  const date = _convertFromFirestoreDate(dataFirestore);
  return `${_jsDateToDate(date)}, ${_jsDateToTime(date)}`;
}

function _buildHospedagensSwiper(swiperData) {
  getID(`hospedagens-box`).innerHTML = `<div id="hospedagens-swiper" class="testimonials-slider swiper aos-init aos-animate" data-aos="fade-up" data-aos-delay="100">
                                          <div class="swiper-wrapper" id="hospedagens-wrapper">
                                            ${swiperData.join("")}
                                          </div>
                                          <div class="swiper-pagination hospedagens-pagination"></div>
                                        </div>`;
  ADJUST_HEIGHT_CARDS.push('hospedagens')
  _initSwiper('hospedagens');
}
