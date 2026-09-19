// ======= Destination Card Renderer (index-like) =======
// Card shell modeled on the index `.dest-card`: image area + overlaid badges
// (planned check, then the score circle) + title. Clicking the card opens the
// detail dialog (support/dialog.ts) — cards never expand inline.

import { getRatingTranslation } from '../../../models/destination.model.js';
import { getDestinationTitle } from '../../../utils/dom.js';
import { getRatingClass } from '../categories.js';
import { getCardImageHTML } from './card-media.js';

const RATINGS = ['1', '2', '3', '4', '5'];

export function getDestinationCardHTML({ j, id, item, planned = '' }) {
	return `
        <div class="dest-card" id="destinations-card-${j}" data-id="${id}" data-index="${j}" data-action="open-destination-dialog">
            ${getCardImageHTML(item)}
            ${getCardBadgesHTML({ item, planned })}
            <div class="dest-card-body">
                <div class="dest-card-title">${getDestinationTitle(item)}</div>
            </div>
        </div>`;
}

/**
 * Card badges, overlaid on the image (top-right): the planned check comes
 * first, then the priority circle. `planned` is the planned label of the
 * destination (empty when it is not part of any trip day).
 */
export function getCardBadgesHTML({ item, planned = '' }) {
	const badges = `${getPlannedBadgeHTML(planned)}${getScoreBadgeHTML(item)}`;
	if (!badges) return '';

	return `<div class="dest-card-badges">${badges}</div>`;
}

/** Planned badge: check inside a circle, with the planned date as tooltip. */
export function getPlannedBadgeHTML(planned) {
	if (!planned) return '';

	const label = escapeAttr(planned);
	return `<span class="dest-card-planned" title="${label}" aria-label="${label}"><i class="iconify" data-icon="fa-solid:check"></i></span>`;
}

function escapeAttr(value: string): string {
	return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
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

