// ======= Destination Card Actions (P4) =======
// Clickable link-button row: website / map / instagram / video. No iframe
// embeds — every affordance opens in a new tab via data-action="open-link".

import { getLinkOnClick } from '../categories.js';
import { getLinkMediaButton } from '../../../utils/dom.js';
import { translate } from '../../../i18n/translation.js';
import { getEntryMapLinks } from '../../../models/destination.model.js';
import { getMapLinksMenuHTML, initMapLinksMenus } from '../../../ui/map-links-menu.js';

function escapeAttr(value: string): string {
	return String(value)
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

export function getCardActionsHTML(item) {
	if (!item) return '';

	let buttonsHTML = '';

	if (item.website) {
		buttonsHTML += getActionButtonHTML('tabler:world', item, 'website');
	}
	buttonsHTML += getMapActionHTML(item);
	if (item.instagram) {
		buttonsHTML += getActionButtonHTML('ri:instagram-line', item, 'instagram');
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
	const mapAction = getMapDialogActionHTML(item);
	if (mapAction) buttons.push(mapAction);
	if (item.instagram) {
		buttons.push(getDialogLinkButton('ri:instagram-line', translate('labels.social.instagram'), item.instagram));
	}
	if (item.media) {
		buttons.push(getDialogMediaButton(item.media));
	}

	if (buttons.length === 0) return '';
	const compact = buttons.length >= 4 ? ' dialog-actions-icons' : '';
	return `<div class="dialog-actions dialog-actions-links${compact}">${buttons.join('')}</div>`;
}

// ---- Map action (single link vs one-per-region picker, F204) ----

/** Icon-only map action used in the inner-itinerary / card action row. */
function getMapActionHTML(item) {
	const links = getEntryMapLinks(item);
	if (links.length === 0) return '';
	if (links.length === 1) {
		return `
        <button class="dest-card-action" type="button" data-action="open-link" data-url="${escapeAttr(links[0].url)}">
            <i class="iconify" data-icon="f7:map"></i>
        </button>`;
	}
	initMapLinksMenus();
	return `
        <span class="map-links">
            <button class="dest-card-action map-links-trigger" type="button" aria-haspopup="true" aria-label="${escapeAttr(translate('labels.customization.links.map'))}">
                <i class="iconify" data-icon="f7:map"></i>
            </button>
            ${getMapLinksMenuHTML(links)}
        </span>`;
}

/** Labeled map action shown in the detail dialog footer / view item popup. */
function getMapDialogActionHTML(item) {
	const links = getEntryMapLinks(item);
	if (links.length === 0) return '';
	if (links.length === 1) {
		return getDialogLinkButton('f7:map', translate('labels.customization.links.map'), links[0].url);
	}
	const label = translate('labels.customization.links.map');
	initMapLinksMenus();
	return `
        <span class="map-links">
            <button class="btn btn-outline-theme dialog-action-btn map-links-trigger" type="button" aria-haspopup="true">
                <i class="iconify" data-icon="f7:map"></i>
                <span>${label}</span>
                <i class="iconify map-links-chevron" data-icon="material-symbols:keyboard-arrow-down-rounded"></i>
            </button>
            ${getMapLinksMenuHTML(links)}
        </span>`;
}

function getDialogLinkButton(icon, label, url) {
	return `
        <button class="btn btn-outline-theme dialog-action-btn" type="button" data-action="open-link" data-url="${escapeAttr(url)}">
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
		label = 'YouTube';
	} else if (media.includes('tiktok')) {
		icon = 'ic:baseline-tiktok';
		label = 'TikTok';
	} else if (media.includes('spotify')) {
		icon = 'mdi:spotify';
		label = playlist;
	} else if (media.includes('instagram')) {
		icon = 'mdi:instagram';
		label = 'Instagram';
	}

	return getDialogLinkButton(icon, label, media);
}
