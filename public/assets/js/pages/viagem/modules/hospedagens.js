function _loadHospedagens() {
  let swiperData = []

  for (let i = 0; i < FIRESTORE_DATA.hospedagens.hospedagem.length; i++) {
    const htmlContent = _getHospedagensHTML(i);
    swiperData.push(htmlContent);
  }

  _buildHospedagensSwiper(swiperData);
}

function _getHospedagensHTML(i) {
  const j = i + 1;

  const hospedagem = {
    cafe: FIRESTORE_DATA.hospedagens.cafe ? FIRESTORE_DATA.hospedagens.cafe[i] : false,
    checkIn: _getHospedagensData(FIRESTORE_DATA.hospedagens.datas[i].checkin),
    checkOut: _getHospedagensData(FIRESTORE_DATA.hospedagens.datas[i].checkout),
    descricao: FIRESTORE_DATA.hospedagens.descricao ? FIRESTORE_DATA.hospedagens.descricao[i] : "",
    endereco: FIRESTORE_DATA.hospedagens.enderecos ? FIRESTORE_DATA.hospedagens.enderecos[i] : "",
    hospedagem: FIRESTORE_DATA.hospedagens.hospedagem ? FIRESTORE_DATA.hospedagens.hospedagem[i] : "",
    imagem: FIRESTORE_DATA.hospedagens.imagens ? _getImageLink(FIRESTORE_DATA.hospedagens.imagens[i]) : "",
    link: FIRESTORE_DATA.hospedagens.links ? FIRESTORE_DATA.hospedagens.links[i] : "",
  }

  return `<div class="swiper-slide" id="hospedagens-slide-${j}">
            <div class="testimonial-item">
              <div class="hotel-box" id="hospedagens-box-${j}">
              <div class="hotel-img" ${_getHospedagemImagem(hospedagem.imagem)}>
                <div class="hotel-img-text-container">
                  <div class="hotel-img-text" style="display: ${hospedagem.cafe ? 'block' : 'none'}">
                    <i class="bx bx-coffee-togo"></i> Café da Manhã
                  </div>
                </div>
              </div>
              <div class="hotel-content">
                <div class="hotel-title">
                  <div class="left-title">
                    <div class="hotel-name" id="hospedagens-nome-${j}">
                      ${hospedagem.hospedagem}
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

function _getHospedagemImagem(imagem) {
  return imagem ? `style="background-image: url('${imagem}');"` : `style="display: none;"`;
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
