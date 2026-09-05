// ======= Destination Card + Dialog Media =======
// Two renderers share this module:
//   - getCardImageHTML: static card image (first image or theme icon) — the
//     card itself is not interactive beyond opening the dialog.
//   - getDialogMediaHTML: full media for the detail dialog (single image /
//     Swiper carousel / theme icon fallback) with lightbox + hover.
//
// Media lifecycle hooks `openDialogMedia(j)` / `closeDialogMedia(j)` are
// invoked by the dialog open/close mechanics (support/dialog.ts). They
// initialize/destroy the Swiper instance and register the per-card GLightbox
// gallery. Swiper and GLightbox are vendor globals — never imported.

import { getDestinations } from '../../../app/config.js';
import { getID } from '../../../utils/dom.js';
import { loadImageLightbox } from '../../../ui/lightbox.js';
import { ACTIVE_CATEGORY } from '../categories.js';

/** Live Swiper instances keyed by card index — destroyed on dialog close. */
const SWIPERS: Record<number, any> = {};

/** Card image: first entry image (static background) or category icon+color. */
export function getCardImageHTML(item) {
	const images = (Array.isArray(item?.images) ? item.images : []).filter((img) => img?.link);

	if (images.length === 0) {
		return getCategoryIconHTML();
	}

	const link = images[0].link || '';
	return `<div class="dest-card-image" style="background-image: url('${link}')"></div>`;
}

/** Dialog media: full carousel/single-image/fallback for the detail dialog. */
export function getDialogMediaHTML(item, j) {
	return getDialogMediaHTMLWithFallback(item, j, getCategoryIconHTML('dialog-media'));
}

/**
 * Dialog media with a caller-provided no-image fallback. Reused by the
 * view.html item dialogs so accommodations can fall back to a hotel icon
 * while destination entries keep the category icon on a neutral placeholder.
 */
export function getDialogMediaHTMLWithFallback(item, j, fallbackHTML) {
	const images = (Array.isArray(item?.images) ? item.images : []).filter((img) => img?.link);

	if (images.length === 0) {
		return fallbackHTML;
	}
	if (images.length === 1) {
		return getSingleImageHTML(images[0], j);
	}
	return getCarouselHTML(images, j);
}

// ======= Media lifecycle hooks (called by support/dialog.ts) =======

export function openDialogMedia(j: number): void {
	// (Re)register the per-card gallery so clicking any image opens the lightbox
	// and navigates across that entry's images only (data-gallery per card).
	// While the lightbox is open, pause the carousel so it doesn't keep
	// switching underneath the overlay; resume it when the lightbox closes.
	loadImageLightbox(`dest-gallery-${j}`, {
		onOpen: () => pauseAutoplay(j),
		onClose: () => resumeAutoplay(j),
	});

	const swiperEl = getID(`dest-dialog-media-${j}-swiper`);
	if (!swiperEl || SWIPERS[j]) return;

	SWIPERS[j] = new Swiper(swiperEl, {
		speed: 600,
		loop: true,
		autoplay: {
			delay: 5000,
			disableOnInteraction: false,
			pauseOnMouseEnter: true,
		},
		observer: true,
		observeParents: true,
		pagination: {
			el: `.dest-dialog-media-${j}-pagination`,
			type: 'bullets',
			clickable: true,
		},
	});
	wireHoverPause(j);
}

function pauseAutoplay(j: number): void {
	SWIPERS[j]?.autoplay?.stop();
}

function resumeAutoplay(j: number): void {
	SWIPERS[j]?.autoplay?.start();
}

/**
 * Freeze the carousel while the pointer sits on the image. Swiper's own
 * `pauseOnMouseEnter` is unreliable here (Swiper 7), so pause/resume explicitly
 * on the swiper host — otherwise the photo can rotate out from under the cursor
 * while the user is aiming at the zoom button. If the pointer is already over
 * the media when the dialog opens (e.g. the user just clicked the card), freeze
 * it right away instead of waiting for a `mouseenter`.
 */
function wireHoverPause(j: number): void {
	const swiperEl = getID(`dest-dialog-media-${j}-swiper`);
	if (!swiperEl) return;

	swiperEl.addEventListener('mouseenter', () => pauseAutoplay(j));
	swiperEl.addEventListener('mouseleave', () => resumeAutoplay(j));
	if (swiperEl.matches(':hover')) pauseAutoplay(j);
}

export function closeDialogMedia(j: number): void {
	const swiper = SWIPERS[j];
	if (swiper) {
		// Stop autoplay before destroying: Swiper 7's destroy() deletes
		// `swiper.params`, and a still-pending autoplay timeout then throws
		// ("can't access property autoplay, e.params is undefined").
		try {
			swiper.autoplay?.stop();
		} catch {
			// noop — autoplay may not be initialized on this instance
		}
		swiper.destroy(true, true);
		delete SWIPERS[j];
	}
}

// ======= Markup builders =======

function getSingleImageHTML(image, j) {
	return `
        <div class="dialog-media" id="dest-dialog-media-${j}">
            ${getPortfolioWrapHTML(image, j)}
        </div>`;
}

function getCarouselHTML(images, j) {
	const slides = images.map((image) => getSwiperSlideHTML(image, j)).join('');

	return `
        <div class="dialog-media" id="dest-dialog-media-${j}">
            <div class="swiper dialog-media-swiper" id="dest-dialog-media-${j}-swiper">
                <div class="swiper-wrapper">${slides}</div>
                <div class="swiper-pagination dest-dialog-media-${j}-pagination"></div>
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
        <div class="portfolio-wrap dialog-media-frame" style="background-image: url('${link}'); background-size: cover; background-position: center;">
            <div class="portfolio-info">
                <div class="portfolio-links">
                    <a href="${link}" data-gallery="dest-gallery-${j}" class="portfolio-lightbox gallery dest-gallery-${j}" title="${description}"><i class="bx bx-zoom-in"></i></a>
                </div>
            </div>
        </div>`;
}

/** Category icon on the neutral no-image placeholder background. */
function getCategoryIconHTML(extraClass = '') {
	const config = getDestinations();
	const type = ACTIVE_CATEGORY === 'myMaps' ? 'map' : ACTIVE_CATEGORY;
	const icon = config.icons[type] || config.icons['map'] || 'bx bx-map-alt';
	const extra = extraClass ? ` ${extraClass}` : '';

	return `
        <div class="dest-card-image no-image${extra}">
            <i class="${icon}"></i>
        </div>`;
}
