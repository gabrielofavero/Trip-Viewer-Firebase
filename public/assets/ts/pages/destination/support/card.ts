// ======= Destination Card Renderer (P2) =======
// Card shell modeled on the index `.dest-card`: image area + score badge +
// body (title + shared detail body + action/edit stubs).
//
// Module ownership: P2 creates; P3 enhances card-media; P4 fills card-actions;
// P5 fills card-edit.

import { getRatingTranslation } from '../../../models/destination.model.js';
import { getDestinationTitle } from '../../../utils/dom.js';
import { getPlanned, getRatingClass, getRatingIcon } from '../categories.js';
import { getDestinationsAccordionBodyHTML } from './content.js';
import { getCardActionsHTML } from './card-actions.js';
import { getCardEditHTML } from './card-edit.js';
import { getCardImageHTML } from './card-media.js';

export function getDestinationCardHTML({ j, id, item, closeAction = 'processCard' }) {
	return `
        <div class="dest-card destination-card" id="destinations-card-${j}" data-id="${id}" data-index="${j}" data-action="${closeAction}">
            ${getCardImageHTML(item, j)}
            ${getScoreBadgeHTML(item)}
            <div class="dest-card-body destination-card-body">
                <div class="dest-card-title destination-card-title">${getDestinationTitle(item)}</div>
                ${getCardBodyHTML({ j, id, item })}
            </div>
        </div>`;
}

/** The swappable detail region (shared detail body + actions + edit button).
 *  P5 swaps it for the edit form (`edit`) and rebuilds it (`restoreCardBody`). */
export function getCardBodyHTML({ j, id, item }) {
	const planned = getPlanned(id);

	return `
        <div class="dest-card-detail" id="card-body-${j}" data-stop-propagation>
            ${getDestinationsAccordionBodyHTML({ j, item, planned, editBtn: false, values: undefined as any, currency: undefined as any })}
            ${getCardActionsHTML(item)}
            ${getCardEditHTML(item, j)}
        </div>`;
}

function getScoreBadgeHTML(item) {
	const display = item.rating ? 'block' : 'none';
	return `
        <span class="dest-card-score ${getRatingClass(item.rating)}" style="display: ${display}">
            <i class="iconify" data-icon="${getRatingIcon(item.rating)}"></i>
            <span class="dest-card-score-text">${getRatingTranslation(item.rating)}</span>
        </span>`;
}
