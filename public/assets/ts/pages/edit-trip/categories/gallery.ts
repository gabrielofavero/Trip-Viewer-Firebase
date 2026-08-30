// ======= Trip Gallery (carousel + dialog) =======
// The gallery is a carousel of photo cards — one per gallery photo — plus a
// trailing "add photo" card (no limit). Clicking a card opens the shared
// image-slot dialog with the gallery fields (title, type/category,
// description) alongside the link/upload. Data is staged in GALLERY_ITEMS and
// saved as the trip's parallel arrays (titles/categories/descriptions/images).

import { getID } from '../../../utils/dom.js';
import { translate } from '../../../i18n/translation.js';
import { renderImageSlotCarousel } from '../../../ui/image-slot-picker.js';
import type { ImageSlot } from '../../../ui/image-slot-picker.js';
import { markStagedChanges } from '../../../ui/fields.js';

export const GALLERY_ITEMS: ImageSlot[] = [];

export function getGalleryObject() {
	const result = { descriptions: [], categories: [], images: [], titles: [] };
	for (const item of GALLERY_ITEMS) {
		result.descriptions.push(item.description || '');
		result.categories.push(item.category || '');
		result.images.push(item.link || '');
		result.titles.push(item.title || '');
	}
	return result;
}

/** Render (or re-render) the gallery carousel. */
export function renderGalleryCarousel() {
	renderImageSlotCarousel({
		containerId: 'gallery-carousel',
		images: GALLERY_ITEMS,
		addLabel: translate('labels.image.add_photo'),
		extraFields: 'gallery',
		onChanged: () => markStagedChanges(),
		dialogTitle: (index) =>
			index === GALLERY_ITEMS.length
				? translate('labels.image.add_photo')
				: translate('labels.image.gallery_photo'),
	});
}

/**
 * Gallery module bootstrap: wires the enable checkbox to show/hide the
 * carousel. Called once on page load (replaces loadEditModule for the
 * carousel-based gallery — there are no accordion items to manage).
 */
export function initGalleryModule() {
	const checkbox = getID('gallery-enabled') as HTMLInputElement | null;
	const content = getID('gallery-enabled-content');
	if (!checkbox || !content) return;
	const update = () => {
		content.style.display = checkbox.checked ? 'block' : 'none';
		if (checkbox.checked) renderGalleryCarousel();
	};
	checkbox.addEventListener('change', update);
	update();
}

