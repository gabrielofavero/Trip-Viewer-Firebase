// ======= Destination Card Actions (P4) =======
// Clickable link-button row: website / map / instagram / video. No iframe
// embeds — every affordance opens in a new tab via data-action="open-link".

import { getLinkOnClick } from '../categories.js';
import { getLinkMediaButton } from '../../../utils/dom.js';

export function getCardActionsHTML(item) {
	if (!item) return '';

	let buttonsHTML = '';

	const links = [
		{ icon: 'tabler:world', key: 'website' },
		{ icon: 'f7:map', key: 'map' },
		{ icon: 'ri:instagram-line', key: 'instagram' },
	];

	for (const link of links) {
		if (!item[link.key]) continue;
		buttonsHTML += getActionButtonHTML(link.icon, item, link.key);
	}

	if (item.media) {
		buttonsHTML += getLinkMediaButton(item.media) || '';
	}

	if (!buttonsHTML) return '';

	return `<div class="dest-card-actions">${buttonsHTML}</div>`;
}

function getActionButtonHTML(icon, item, key) {
	return `
        <button class="dest-card-action" type="button"${getLinkOnClick(item, key)}>
            <i class="iconify" data-icon="${icon}"></i>
        </button>`;
}
