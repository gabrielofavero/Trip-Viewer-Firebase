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

/**
 * Self-managed rotation timers per card. We deliberately do NOT use Swiper's
 * autoplay module: Swiper 7's destroy() wipes `swiper.params`, and a pending
 * autoplay timeout then throws ("can't access property autoplay, e.params is
 * undefined"). Driving `slideNext` from our own interval gives full control, so
 * the timer is always cleared before the instance is destroyed.
 */
const AUTOPLAY_DELAY = 5000;
const AUTOPLAY_SPEED = 600;
const AUTOPLAY_TIMERS: Record<number, number> = {};

/** Card image: first entry image or the category icon when the entry has none.
 *  Backed by a real <img> so the browser reports load/error — the card shows the
 *  shimmer skeleton until then (see bindCardImageHandlers). */
export function getCardImageHTML(item) {
	const images = (Array.isArray(item?.images) ? item.images : []).filter((img) => img?.link);

	if (images.length === 0) {
		return getCategoryIconHTML();
	}

	const link = images[0].link || '';
	return `
        <div class="dest-card-image is-loading">
            <img class="card-image-img" src="${link}" alt="" loading="lazy" decoding="async">
            ${getCategoryIconMarkup()}
        </div>`;
}

/** Containers already wired for card image load/error events. */
const CARD_IMAGE_BOUND = new WeakSet<HTMLElement>();

/** img load/error events don't bubble, so listen on the capture phase from the
 *  grid container — this also covers re-renders and lazy-loaded batches. */
export function bindCardImageHandlers(container: HTMLElement | null): void {
	if (!container || CARD_IMAGE_BOUND.has(container)) return;
	CARD_IMAGE_BOUND.add(container);
	container.addEventListener('load', (e) => handleCardImageEvent(e, false), true);
	container.addEventListener('error', (e) => handleCardImageEvent(e, true), true);
}

function handleCardImageEvent(e: Event, failed: boolean): void {
	const target = e.target as HTMLElement | null;
	if (!(target instanceof HTMLImageElement)) return;
	if (!target.classList.contains('card-image-img')) return;
	const box = target.closest<HTMLElement>('.dest-card-image');
	if (!box) return;

	box.classList.remove('is-loading');
	if (failed) {
		// Broken/unavailable external link: fall back to the category icon
		// instead of showing a broken image.
		box.classList.add('no-image');
		target.remove();
	} else {
		box.classList.add('is-loaded');
	}
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
		speed: AUTOPLAY_SPEED,
		loop: true,
		observer: true,
		observeParents: true,
		pagination: {
			el: `.dest-dialog-media-${j}-pagination`,
			type: 'bullets',
			clickable: true,
		},
	});

	wireHoverPause(j);
	// Rotate from the start, unless the pointer is already over the media
	// (e.g. the user just clicked the card and the cursor lands on the image).
	if (!swiperEl.matches(':hover')) resumeAutoplay(j);
}

/** Stop the card's rotation timer (hover, lightbox open, dialog close). */
function pauseAutoplay(j: number): void {
	const timer = AUTOPLAY_TIMERS[j];
	if (timer != null) {
		window.clearInterval(timer);
		delete AUTOPLAY_TIMERS[j];
	}
}

/** (Re)start the card's rotation timer, unless one is already running. */
function resumeAutoplay(j: number): void {
	if (AUTOPLAY_TIMERS[j] != null) return;
	const swiper = SWIPERS[j];
	if (!swiper) return;
	AUTOPLAY_TIMERS[j] = window.setInterval(
		() => swiper.slideNext(AUTOPLAY_SPEED),
		AUTOPLAY_DELAY,
	);
}

/**
 * Freeze the carousel while the pointer sits on the image — otherwise the photo
 * can rotate out from under the cursor while the user is aiming at the zoom
 * button. Rotation pauses on `mouseenter` and resumes on `mouseleave` of the
 * swiper host.
 */
function wireHoverPause(j: number): void {
	const swiperEl = getID(`dest-dialog-media-${j}-swiper`);
	if (!swiperEl) return;

	swiperEl.addEventListener('mouseenter', () => pauseAutoplay(j));
	swiperEl.addEventListener('mouseleave', () => resumeAutoplay(j));
}

export function closeDialogMedia(j: number): void {
	// Clear our rotation timer first so no tick can ever fire on a destroyed
	// Swiper (the reason the vendor autoplay module is not used).
	pauseAutoplay(j);
	const swiper = SWIPERS[j];
	if (swiper) {
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
                    <a href="${link}" data-type="image" data-gallery="dest-gallery-${j}" class="portfolio-lightbox gallery dest-gallery-${j}" title="${description}"><i class="bx bx-zoom-in"></i></a>
                </div>
            </div>
        </div>`;
}

/** Category icon on the neutral no-image placeholder background. */
function getCategoryIconHTML(extraClass = '') {
	const extra = extraClass ? ` ${extraClass}` : '';

	return `
        <div class="dest-card-image no-image${extra}">
            ${getCategoryIconMarkup()}
        </div>`;
}

/** Font-icon markup for the active category (also the card image error fallback). */
function getCategoryIconMarkup(): string {
	const config = getDestinations();
	const type = ACTIVE_CATEGORY === 'myMaps' ? 'map' : ACTIVE_CATEGORY;
	const icon = config.icons[type] || config.icons['map'] || 'bx bx-map-alt';

	return `<i class="${icon}"></i>`;
}
