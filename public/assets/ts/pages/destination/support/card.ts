// ======= Destination Card Renderer (index-like) =======
// Card shell modeled on the index `.dest-card`: image area + score badge
// (circle only) + title. Clicking the card opens the detail dialog
// (support/dialog.ts) — cards never expand inline.

import { getRatingTranslation } from '../../../models/destination.model.js';
import { getDestinationTitle } from '../../../utils/dom.js';
import { getRatingClass } from '../categories.js';
import { getCardImageHTML } from './card-media.js';

const RATINGS = ['1', '2', '3', '4', '5'];

export function getDestinationCardHTML({ j, id, item }) {
	return `
        <div class="dest-card" id="destinations-card-${j}" data-id="${id}" data-index="${j}" data-action="open-destination-dialog">
            ${getCardImageHTML(item)}
            ${getScoreBadgeHTML(item)}
            <div class="dest-card-body">
                <div class="dest-card-title">${getDestinationTitle(item)}</div>
            </div>
        </div>`;
}

/** Card score: circle with the rating digit only (no text). */
export function getScoreBadgeHTML(item) {
	if (!RATINGS.includes(item?.rating)) return '';

	return `<span class="dest-card-score ${getRatingClass(item.rating)}">${item.rating}</span>`;
}

/** Dialog score: circle (digit) + text label, e.g. "4  High priority". */
export function getDialogScoreBadgeHTML(item) {
	if (!RATINGS.includes(item?.rating)) return '';

	return `
        <span class="dest-card-score ${getRatingClass(item.rating)}">${item.rating}</span>
        <span class="dest-card-score-text">${getRatingTranslation(item.rating)}</span>`;
}

