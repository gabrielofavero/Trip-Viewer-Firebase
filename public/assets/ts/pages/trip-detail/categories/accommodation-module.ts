import { getState } from '../../../data/state.js';
import { convertFromDateObject, getDateNoTime, getTodayDateObject } from '../../../utils/dates.js';
import { getID } from '../../../utils/dom.js';
import { loadImageLightbox } from "../support/embed.js";
import { getSensitiveReservationHTML } from "../support/sensitive-reservation.js";
import { initSwiper } from "../support/swiper.js";
import { translate } from "../../../i18n/translation.js";
import { getDateString } from "../../../utils/dates.js";
import { getTimeStringFromDate } from "../../../utils/dates.js";
import { ADJUST_HEIGHT_CARDS } from "../support/visibility.js";
import { END_DATE } from "../view.js";
import { START_DATE } from "../view.js";

export function loadAccommodations() {
	let swiperData = [];

	for (let i = 0; i < getState().hospedagens.length; i++) {
		const htmlContent = getAccommodationsHTML(i);
		swiperData.push(htmlContent);
	}

	if (swiperData.length === 0) return;

	buildHospedagensSwiper(swiperData);

	for (let j = 1; j <= getState().hospedagens.length; j++) {
		loadImageLightbox(`accommodations-gallery-${j}`);
	}

	autoNavigateHospedagens();
}

function getAccommodationsHTML(i, innerItinerary = false) {
	const original = getState().hospedagens[i];
	const hospedagem = {
		id: original.id,
		cafe: original.cafe,
		checkIn: getHospedagensData(original.datas.checkin),
		checkOut: getHospedagensData(original.datas.checkout),
		reserva: original.reserva,
		descricao: original.descricao,
		endereco: original.endereco,
		imagens: original.imagens,
		link: original.link,
		nome: original.nome,
	};

	if (innerItinerary) {
		return getHotelBoxHTML(hospedagem, "inner-itinerary", true);
	}

	const j = i + 1;
	return `<div class="swiper-slide" id="hospedagens-slide-${j}">
            <div class="testimonial-item">
              ${getHotelBoxHTML(hospedagem, j)}
            </div>
          </div>`;
}

export function getHotelBoxHTML(hospedagem, j, innerItinerary = false) {
	const imagens = hospedagem.imagens;
	const checkIn = hospedagem.checkIn;
	const checkOut = hospedagem.checkOut;
	const galeriaId = innerItinerary
		? "programacao-galeria"
		: `accommodations-gallery-${j}`;
	const isSensitive = getState().pin === "sensitive-only";
	const reservationClass = isSensitive
		? "hotel-reservation sensitive"
		: "hotel-reservation";
	const reservationVisibility =
		isSensitive || hospedagem.reserva ? "block" : "none";

	let galeriaItems = "";

	for (let i = 0; i < imagens.length; i++) {
		const imagem = imagens[i];
		galeriaItems += `<a href="${imagem.link}" data-gallery="portfolioGallery" class="portfolio-lightbox ${galeriaId}" title="${imagem.descricao}">${i == 0 ? '<i class="bx bx-zoom-in"></i>' : ""}</a>`;
	}

	return `<div class="hotel-box${innerItinerary ? "-inner inner-itinerary-item" : ""}" id="accommodations-box-${j}${innerItinerary ? "-inner" : ""}">
            <div class="portfolio-wrap" style="display: ${imagens.length > 0 ? "block" : "none"};">
              <div class="hotel-img" style="background-image: url('${imagens?.[0]?.link}');">
                <div class="portfolio-info">
                  <div class="portfolio-links">
                    ${galeriaItems}
                  </div>
                </div>
                <div class="hotel-img-text-container">
                  <div class="hotel-img-text" style="display: ${hospedagem.cafe ? "block" : "none"};">
                    <i class="bx bx-coffee-togo"></i> ${translate("trip.accommodation.breakfast")}
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
                      <i style="display: ${hospedagem.link ? "block" : "none"}" class="iconify external-link" 
                      data-icon="tabler:external-link" data-action="open-link" data-url="${hospedagem.link}"></i>
                    </div> 
                  </div>
                  <div class="hotel-address" style="display: ${hospedagem.endereco ? "block" : "none"}">
                    <i class="bx bxs-map color-icon"></i> 
                    ${hospedagem.endereco}
                  </div>
                </div>
              </div>
              <div class="hotel-text">
              <div class="${reservationClass}" style="display: ${reservationVisibility}">
                <i class="bx bxs-file color-icon"></i>
                ${getAccommodationReservationHTML(hospedagem)} 
              </div>
                <div class="hotel-description" style="display: ${hospedagem.descricao ? "block" : "none"}">
                  <i class="bx bxs-hotel color-icon"></i> 
                  ${hospedagem.descricao}
                </div>
                  <div class="hotel-description">
                    <div>
                      <i class="bi bi-chevron-right color-icon"></i><strong>${translate("trip.accommodation.checkin")}:</strong> <span>${checkIn}</span> 
                    </div>
                    <div>
                      <i class="bi bi-chevron-right color-icon"></i><strong>${translate("trip.accommodation.checkout")}:</strong> <span>${checkOut}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>`;
}

export function getHospedagensData(dataFirestore) {
	const date = convertFromDateObject(dataFirestore);
	return `${getDateString(date)}, ${getTimeStringFromDate(date)}`;
}

function getAccommodationReservationHTML(hospedagem) {
	if (getState().pin === "sensitive-only") {
		return getSensitiveReservationHTML("accommodations", hospedagem.id);
	}
	// remove # if first char is #
	if (hospedagem.reserva && hospedagem.reserva.charAt(0) === "#") {
		return `${translate("labels.reservation.title")} ${hospedagem.reserva}`;
	}

	if (!hospedagem.reserva) {
		return "";
	}

	return `${translate("labels.reservation.title")} #${hospedagem.reserva}`;
}

function buildHospedagensSwiper(swiperData) {
	const swiperButtonStyle =
		swiperData.length > 1 ? "" : `style="display: none"`;
	getID(`accommodations-box`).innerHTML =
		`<div id="hospedagens-swiper" class="testimonials-slider swiper aos-init aos-animate" data-aos="fade-up" data-aos-delay="100">
                                          <div class="swiper-wrapper" id="hospedagens-wrapper">
                                            ${swiperData.join("")}
                                          </div>
                                          <div class="swiper-controls">
                                            <div class="swiper-button-prev hospedagens-prev" ${swiperButtonStyle}></div>
                                            <div class="swiper-pagination hospedagens-pagination"></div>
                                            <div class="swiper-button-next hospedagens-next" ${swiperButtonStyle}></div>
                                          </div>
                                        </div>`;
	ADJUST_HEIGHT_CARDS.push("accommodations");
	initSwiper("accommodations");
}

function autoNavigateHospedagens() {
	const hoje = getDateNoTime(convertFromDateObject(getTodayDateObject()));
	const dados = getState().hospedagens;
	if (!dados || dados.length === 0) return;

	let targetIndex;

	// Outside trip dates → show first element
	if (START_DATE?.date && END_DATE?.date) {
		if (
			hoje < getDateNoTime(START_DATE.date) ||
			hoje > getDateNoTime(END_DATE.date)
		) {
			targetIndex = 0;
		}
	}

	// Inside trip → find which accommodation covers now
	if (targetIndex === undefined) {
		const now = new Date();
		let found = false;

		for (let i = 0; i < dados.length; i++) {
			const checkin = convertFromDateObject(dados[i].datas.checkin);
			const checkout = convertFromDateObject(dados[i].datas.checkout);

			if (now >= checkin && now <= checkout) {
				targetIndex = i;
				found = true;
				break;
			}
		}

		if (!found) {
			// Uncovered period → find closest future checkin
			let closestDiff = Infinity;
			for (let i = 0; i < dados.length; i++) {
				const checkin = convertFromDateObject(dados[i].datas.checkin);
				const diff = checkin.getTime() - now.getTime();
				if (diff > 0 && diff < closestDiff) {
					closestDiff = diff;
					targetIndex = i;
				}
			}

			// All in the past → show first element
			if (targetIndex === undefined) {
				targetIndex = 0;
			}
		}
	}

	if (targetIndex === undefined || targetIndex < 0) return;

	const swiperEl = getID("hospedagens-swiper");
	if (swiperEl?.swiper) {
		swiperEl.swiper.slideTo(targetIndex, 600);
	}
}
