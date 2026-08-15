// ======= Destination Card Actions (P4) =======
// Clickable link-button row: website / map / instagram / video. No iframe
// embeds — every affordance opens in a new tab via data-action="open-link".

import { getLinkOnClick } from '../categories.js';
import { getLinkMediaButton } from '../../../utils/dom.js';
import { translate } from '../../../i18n/translation.js';

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

/** Index-style labeled link buttons shown at the bottom of the detail dialog. */
export function getDialogActionsHTML(item) {
	if (!item) return '';

	const buttons: string[] = [];
	if (item.website) {
		buttons.push(getDialogLinkButton('tabler:world', translate('labels.social.website'), item.website));
	}
	if (item.map) {
		buttons.push(getDialogLinkButton('f7:map', translate('labels.customization.links.map'), item.map));
	}
	if (item.instagram) {
		buttons.push(getDialogLinkButton('ri:instagram-line', translate('labels.social.instagram'), item.instagram));
	}
	if (item.media) {
		buttons.push(getDialogMediaButton(item.media));
	}

	if (buttons.length === 0) return '';
	return `<div class="dialog-actions">${buttons.join('')}</div>`;
}

function getDialogLinkButton(icon, label, url) {
	return `
        <button class="btn btn-outline-theme dialog-action-btn" type="button" data-action="open-link" data-url="${url}">
            <i class="iconify" data-icon="${icon}"></i>
            <span>${label}</span>
        </button>`;
}

function getDialogMediaButton(media) {
	const video = translate('labels.video');
	const playlist = translate('trip.itinerary.media_button.playlist');
	let icon = 'lets-icons:video-fill';
	let label = video;

	if (media.includes('youtube') || media.includes('youtu.be')) {
		icon = 'mdi:youtube';
	} else if (media.includes('tiktok')) {
		icon = 'ic:baseline-tiktok';
	} else if (media.includes('spotify')) {
		icon = 'mdi:spotify';
		label = playlist;
	} else if (media.includes('instagram')) {
		icon = 'mdi:instagram';
	}

	return getDialogLinkButton(icon, label, media);
}
