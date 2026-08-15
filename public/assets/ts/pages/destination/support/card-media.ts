// ======= Destination Card Media (P2 base) =======
// Renders the card image area: the first entry image when available, otherwise
// a category icon + box-color blob (same visual as the view destinations grid).
// P3 extends this module with the carousel + lightbox.

import { getDestinations } from '../../../app/config.js';
import { ACTIVE_CATEGORY } from '../categories.js';

export function getCardImageHTML(item, j) {
	const images = Array.isArray(item?.images) ? item.images : [];
	const first = images.find((img) => img?.link);

	if (first?.link) {
		return `<div class="dest-card-image" style="background-image: url('${first.link}')"></div>`;
	}

	return getCategoryIconBlobHTML();
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
