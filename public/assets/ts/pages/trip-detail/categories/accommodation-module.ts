import { getState } from '../../../data/state.js';
import { convertFromDateObject, getDateNoTime, getTodayDateObject } from '../../../utils/dates.js';
import { getID } from '../../../utils/dom.js';
import { loadImageLightbox } from '../support/embed.js';
import { getSensitiveReservationHTML } from '../support/sensitive-reservation.js';
import { initSwiper } from '../support/swiper.js';
import { translate } from '../../../i18n/translation.js';
import { getDateString } from '../../../utils/dates.js';
import { getTimeStringFromDate } from '../../../utils/dates.js';
import { ADJUST_HEIGHT_CARDS } from '../support/visibility.js';
import { END_DATE } from '../view.js';
import { START_DATE } from '../view.js';

export function loadAccommodations() {
	let swiperData = [];

	for (let i = 0; i < getState().accommodations.length; i++) {
		const htmlContent = getAccommodationsHTML(i);
		swiperData.push(htmlContent);
	}

	if (swiperData.length === 0) return;

	buildHospedagensSwiper(swiperData);

	for (let j = 1; j <= getState().accommodations.length; j++) {
		loadImageLightbox(`accommodations-gallery-${j}`);
	}

	autoNavigateHospedagens();
}

function getAccommodationsHTML(i, innerItinerary = false) {
	const original = getState().accommodations[i];
	const hospedagem = {
		id: original.id,
		breakfast: original.breakfast,
		checkIn: getHospedagensData(original.dates.checkIn),
		checkOut: getHospedagensData(original.dates.checkOut),
		reservation: original.reservation,
		description: original.description,
		address: original.address,
		images: original.images,
		link: original.link,
		paymentStatus: original.paymentStatus,
		name: original.name,
	};

	if (innerItinerary) {
		return getHotelBoxHTML(hospedagem, 'inner-itinerary', true);
	}

	const j = i + 1;
	return `<div class="swiper-slide" id="accommodations-slide-${j}">
            <div class="testimonial-item">
              ${getHotelBoxHTML(hospedagem, j)}
            </div>
          </div>`;
}

export function getHotelBoxHTML(hospedagem, j, innerItinerary = false) {
	const images = hospedagem.images;
	const checkIn = hospedagem.checkIn;
	const checkOut = hospedagem.checkOut;
	const galeriaId = innerItinerary ? 'itinerary-gallery' : `accommodations-gallery-${j}`;
	const isSensitive = getState().pin === 'sensitive-only';
	const reservationClass = isSensitive ? 'hotel-reservation sensitive' : 'hotel-reservation';
	const reservationVisibility = isSensitive || hospedagem.reservation ? 'block' : 'none';

	let galeriaItems = '';

	for (let i = 0; i < images.length; i++) {
		const image = images[i];
		galeriaItems += `<a href="${image.link}" data-gallery="portfolioGallery" class="portfolio-lightbox ${galeriaId}" title="${image.description}">${i == 0 ? '<i class="bx bx-zoom-in"></i>' : ''}</a>`;
	}

	return `<div class="hotel-box${innerItinerary ? '-inner inner-itinerary-item' : ''}" id="accommodations-box-${j}${innerItinerary ? '-inner' : ''}">
            <div class="portfolio-wrap" style="display: ${images.length > 0 ? 'block' : 'none'};">
              <div class="hotel-img" style="background-image: url('${images?.[0]?.link}');">
                <div class="portfolio-info">
                  <div class="portfolio-links">
                    ${galeriaItems}
                  </div>
                </div>
                <div class="hotel-img-text-container">
                  <div class="hotel-img-text" style="display: ${hospedagem.breakfast ? 'block' : 'none'};">
                    <i class="bx bx-coffee-togo"></i> ${translate('trip.accommodation.breakfast')}
                  </div>
                </div>
              </div>
            </div>
            <div class="hotel-content">
              <div class="hotel-title">
                <div class="left-title">
                  <div class="hotel-name" id="accommodations-name-${j}">
                    ${hospedagem.name}
                    <div>
                      <i style="display: ${hospedagem.link ? 'block' : 'none'}" class="iconify external-link" 
                      data-icon="tabler:external-link" data-action="open-link" data-url="${hospedagem.link}"></i>
                    </div> 
                  </div>
                  <div class="hotel-address" style="display: ${hospedagem.address ? 'block' : 'none'}">
                    <i class="bx bxs-map color-icon"></i> 
                    ${hospedagem.address}
                  </div>
                </div>
              </div>
              <div class="hotel-text">
              <div class="${reservationClass}" style="display: ${reservationVisibility}">
                <i class="bx bxs-file color-icon"></i>
                ${getAccommodationReservationHTML(hospedagem)} 
              </div>
                <div class="hotel-description" style="display: ${hospedagem.description ? 'block' : 'none'}">
                  <i class="bx bxs-hotel color-icon"></i> 
                  ${hospedagem.description}
                </div>
                  <div class="hotel-description">
                    <div>
                      <i class="bi bi-chevron-right color-icon"></i><strong>${translate('trip.accommodation.checkin')}:</strong> <span>${checkIn}</span> 
                    </div>
                    <div>
                      <i class="bi bi-chevron-right color-icon"></i><strong>${translate('trip.accommodation.checkout')}:</strong> <span>${checkOut}</span>
                    </div>
                  </div>
                ${getAccommodationPaymentStatusHTML(hospedagem)}
                </div>
              </div>
            </div>`;
}

export function getHospedagensData(dataFirestore) {
	const date = convertFromDateObject(dataFirestore);
	return `${getDateString(date)}, ${getTimeStringFromDate(date)}`;
}

function getAccommodationReservationHTML(hospedagem) {
	if (getState().pin === 'sensitive-only') {
		return getSensitiveReservationHTML('accommodations', hospedagem.id);
	}
	// remove # if first char is #
	if (hospedagem.reservation && hospedagem.reservation.charAt(0) === '#') {
		return `${translate('labels.reservation.title')} ${hospedagem.reservation}`;
	}

	if (!hospedagem.reservation) {
		return '';
	}

	return `${translate('labels.reservation.title')} #${hospedagem.reservation}`;
}

/**
 * Payment status indicator (F065). Returns '' when the status is unset
 * (or "don't show") — legacy docs without the field render nothing.
 */
function getAccommodationPaymentStatusHTML(hospedagem) {
	const status = hospedagem.paymentStatus;
	if (status === 'prepaid') {
		return `<div class="hotel-payment-status prepaid">
                <i class="bx bxs-check-circle color-icon"></i>
                ${translate('trip.accommodation.payment_status_options.prepaid')}
              </div>`;
	}
	if (status === 'partial_prepaid') {
		return `<div class="hotel-payment-status partial-prepaid">
                <i class="bx bxs-adjust-alt color-icon"></i>
                ${translate('trip.accommodation.payment_status_options.partial_prepaid')}
              </div>`;
	}
	if (status === 'pay_on_site') {
		return `<div class="hotel-payment-status pay-on-site">
                <i class="bx bxs-wallet-alt color-icon"></i>
                ${translate('trip.accommodation.payment_status_options.pay_on_site')}
              </div>`;
	}
	return '';
}

function buildHospedagensSwiper(swiperData) {
	const swiperButtonStyle = swiperData.length > 1 ? '' : `style="display: none"`;
	getID(`accommodations-box`).innerHTML =
		`<div id="accommodations-swiper" class="testimonials-slider swiper aos-init aos-animate" data-aos="fade-up" data-aos-delay="100">
                                          <div class="swiper-wrapper" id="accommodations-wrapper">
                                            ${swiperData.join('')}
                                          </div>
                                          <div class="swiper-controls">
                                            <div class="swiper-button-prev accommodations-prev" ${swiperButtonStyle}></div>
                                            <div class="swiper-pagination accommodations-pagination"></div>
                                            <div class="swiper-button-next accommodations-next" ${swiperButtonStyle}></div>
                                          </div>
                                        </div>`;
	ADJUST_HEIGHT_CARDS.push('accommodations');
	initSwiper('accommodations');
}

function autoNavigateHospedagens() {
	const hoje = getDateNoTime(convertFromDateObject(getTodayDateObject()));
	const data = getState().accommodations;
	if (!data || data.length === 0) return;

	let targetIndex;

	// Outside trip dates → show first element
	if (START_DATE?.date && END_DATE?.date) {
		if (hoje < getDateNoTime(START_DATE.date) || hoje > getDateNoTime(END_DATE.date)) {
			targetIndex = 0;
		}
	}

	// Inside trip → find which accommodation covers now
	if (targetIndex === undefined) {
		const now = new Date();
		let found = false;

		for (let i = 0; i < data.length; i++) {
			const checkIn = convertFromDateObject(data[i].dates.checkIn);
			const checkOut = convertFromDateObject(data[i].dates.checkOut);

			if (now >= checkIn && now <= checkOut) {
				targetIndex = i;
				found = true;
				break;
			}
		}

		if (!found) {
			// Uncovered period → find closest future checkIn
			let closestDiff = Infinity;
			for (let i = 0; i < data.length; i++) {
				const checkIn = convertFromDateObject(data[i].dates.checkIn);
				const diff = checkIn.getTime() - now.getTime();
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

	const swiperEl = getID('accommodations-swiper');
	if (swiperEl?.swiper) {
		swiperEl.swiper.slideTo(targetIndex, 600);
	}
}
