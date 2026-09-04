// ======= Destination Entry Photos =======
// Carousel-based photo editor for destination entries (restaurants, snacks,
// nightlife, tourism, shopping). Each entry can hold up to 5 photos; the
// carousel shows one card per photo (logo-picker-card proportions) plus a
// single "add photo" card while slots remain. Clicking a card opens the shared
// image-slot dialog (link/upload + a label/description field).
//
// Data is staged in DESTINATION_IMAGES["{category}-{j}"] and written to
// Firestore as `images: { description, link }[]` on the entry.

import { translate } from '../../../i18n/translation.js';
import { renderImageSlotCarousel } from '../../../ui/image-slot-picker.js';
import type { ImageSlot } from '../../../ui/image-slot-picker.js';
import { markStagedChanges } from '../../../ui/fields.js';

export var DESTINATION_IMAGES: Record<string, ImageSlot[]> = {};

/** Serialized photos for the given entry. */
export function getDestinationImages(category: string, j: number) {
	return (DESTINATION_IMAGES[`${category}-${j}`] || []).map((image) => ({
		description: image.description || '',
		link: image.link || '',
	}));
}

/** Render (or re-render) the photo carousel for an entry. */
export function renderDestinationImageCarousel(category: string, j: number) {
	const images = DESTINATION_IMAGES[`${category}-${j}`] || [];
	renderImageSlotCarousel({
		containerId: `${category}-images-carousel-${j}`,
		images,
		maxSlots: 5,
		addLabel: translate('labels.image.add_photo'),
		extraFields: 'label',
		onChanged: () => markStagedChanges(),
		dialogTitle: (index) =>
			index === images.length
				? translate('labels.image.add_photo')
				: translate('labels.image.photo_n', { n: index + 1 }),
	});
}

/** Clear the photos of an entry (used when the entry itself is removed). */
export function removeDestinationImages(category: string, j: number) {
	DESTINATION_IMAGES[`${category}-${j}`] = [];
	markStagedChanges();
}



