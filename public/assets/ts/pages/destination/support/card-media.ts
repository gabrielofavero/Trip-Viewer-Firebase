// ======= Destination Card Media (P3) =======
// Renders the card image area:
//   - 0 images   → category icon + box-color blob (same visual as the view grid)
//   - 1 image    → static image wrapped in .portfolio-wrap (hover + lightbox)
//   - ≥2 images  → Swiper carousel (autoplay) with .portfolio-wrap slides
//
// Media lifecycle hooks `onCardOpen(j)` / `onCardClose(j)` are exported here and
// invoked by P5 from the card open/close mechanics. They initialize/destroy the
// Swiper instance and (re)register the per-card GLightbox gallery.
//
// Swiper and GLightbox are vendor globals — accessed directly, never imported.

import { getDestinations } from '../../../app/config.js';
import { getID } from '../../../utils/dom.js';
import { loadImageLightbox } from '../../../ui/lightbox.js';
import { ACTIVE_CATEGORY } from '../categories.js';

/** Live Swiper instances keyed by card index — destroyed on card close. */
const SWIPERS: Record<number, any> = {};

export function getCardImageHTML(item, j) {
	const images = (Array.isArray(item?.images) ? item.images : []).filter((img) => img?.link);

	if (images.length === 0) {
		return getCategoryIconBlobHTML();
	}
	if (images.length === 1) {
		return getSingleImageHTML(images[0], j);
	}
	return getCarouselHTML(images, j);
}

// ======= Media lifecycle hooks (called by P5 card open/close) =======

export function onCardOpen(j: number): void {
	// (Re)register the per-card gallery so clicking any image opens the lightbox
	// and navigates across that entry's images only (data-gallery per card).
	loadImageLightbox(`dest-gallery-${j}`);

	const swiperEl = getID(`dest-card-media-${j}-swiper`);
	if (!swiperEl || SWIPERS[j]) return;

	SWIPERS[j] = new Swiper(swiperEl, {
		speed: 600,
		loop: true,
		autoplay: {
			delay: 3500,
			disableOnInteraction: false,
		},
		observer: true,
		observeParents: true,
		pagination: {
			el: `.dest-card-media-${j}-pagination`,
			type: 'bullets',
			clickable: true,
		},
		navigation: {
			nextEl: `.dest-card-media-${j}-next`,
			prevEl: `.dest-card-media-${j}-prev`,
		},
	});
}

export function onCardClose(j: number): void {
	const swiper = SWIPERS[j];
	if (swiper) {
		swiper.destroy(true, true);
		delete SWIPERS[j];
	}
}

// ======= Markup builders =======

function getSingleImageHTML(image, j) {
	return `
        <div class="dest-card-media" id="dest-card-media-${j}">
            ${getPortfolioWrapHTML(image, j)}
        </div>`;
}

function getCarouselHTML(images, j) {
	const slides = images.map((image) => getSwiperSlideHTML(image, j)).join('');

	return `
        <div class="dest-card-media" id="dest-card-media-${j}">
            <div class="swiper dest-card-media-swiper" id="dest-card-media-${j}-swiper">
                <div class="swiper-wrapper">${slides}</div>
                <div class="swiper-pagination dest-card-media-${j}-pagination"></div>
                <div class="swiper-button-next dest-card-media-${j}-next"></div>
                <div class="swiper-button-prev dest-card-media-${j}-prev"></div>
            </div>
        </div>`;
}

function getSwiperSlideHTML(image, j) {
	return `
        <div class="swiper-slide">
            ${getPortfolioWrapHTML(image, j)}
        </div>`;
}

/** One image wrapped like view's `.portfolio-wrap` (image + hover overlay + zoom). */
function getPortfolioWrapHTML(image, j) {
	const link = image.link || '';
	const description = image.description || '';

	return `
        <div class="portfolio-wrap dest-card-media-frame">
            <img src="${link}" class="img-fluid dest-card-media-img" alt="${description}">
            <div class="portfolio-info">
                <div class="portfolio-links">
                    <a href="${link}" data-gallery="dest-gallery-${j}" class="portfolio-lightbox gallery dest-gallery-${j}" title="${description}"><i class="bx bx-zoom-in"></i></a>
                </div>
            </div>
        </div>`;
}

function getCategoryIconBlobHTML() {
	const config = getDestinations();
	const type = ACTIVE_CATEGORY === 'myMaps' ? 'map' : ACTIVE_CATEGORY;
	const icon = config.icons[type] || config.icons['map'] || 'bx bx-map-alt';
	const ids = config.categories.ids || [];
	const index = Math.max(0, ids.indexOf(ACTIVE_CATEGORY));
	const box = config.boxes[index % config.boxes.length];

	return `
        <div class="dest-card-image no-image iconbox-${box.color}">
            <div class="icon">
                <svg width="100" height="100" viewBox="0 0 600 600" xmlns="http://www.w3.org/2000/svg">
                    <path stroke="none" stroke-width="0" fill="#f5f5f5" d="${box.d}"></path>
                </svg>
                <i class="${icon}"></i>
            </div>
        </div>`;
}
