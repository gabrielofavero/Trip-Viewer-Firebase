import { firstCharToUpperCase, getID } from '../utils/dom.js';
import { stopLoadingScreen } from '../utils/loading.js';
import { translate } from '../i18n/translation.js';
import { openToast, displayMessage, closeMessage } from '../utils/messages.js';
import { DOCUMENT_ID, SUCCESSFUL_SAVE, setSuccessfulSaveFn } from '../data/state.js';

let ORIGINAL_STATE = new Map();
// True when a form module stages changes outside of tracked DOM fields
// (e.g. image editors that serialize into JS state before save).
let STAGED_CHANGES = false;

// Detect Changes
export function snapshotFormState(root = document) {
	if (!DOCUMENT_ID) return;

	ORIGINAL_STATE.clear();
	STAGED_CHANGES = false;

	const fields = root.querySelectorAll('input, textarea, select, .input-button');

	fields.forEach((el) => {
		ORIGINAL_STATE.set(el, {
			value: getElValue(el),
			position: getElPosition(el),
		});
	});
}

export function getElValue(el) {
	switch (el.type) {
		case 'checkbox':
		case 'radio':
			return el.checked;
		case 'submit':
			return el.innerText;
		default:
			return el.value;
	}
}

export function getElPosition(el) {
	const parent = el.parentNode;
	if (!parent) return null;

	const siblings = Array.from(parent.children).filter((child) =>
		(child as Element).matches?.('input, textarea, select, .input-button'),
	);

	return {
		parent,
		index: siblings.indexOf(el),
	};
}

export function hasUnsavedChanges(root = document) {
	if (!DOCUMENT_ID) return true;

	const currentFields = root.querySelectorAll('input, textarea, select, .input-button');

	for (const el of currentFields) {
		if (!ORIGINAL_STATE.has(el)) return true;
	}

	for (const [el, original] of ORIGINAL_STATE.entries()) {
		if (!root.contains(el)) return true;

		if (getElValue(el) !== original.value) return true;

		const currentPosition = getElPosition(el);
		if (
			!currentPosition ||
			!original.position ||
			currentPosition.parent !== original.position.parent ||
			currentPosition.index !== original.position.index
		) {
			return true;
		}
	}

	return false;
}

// Staged changes made outside of tracked DOM fields (e.g. image editors).
export function markStagedChanges(): void {
	STAGED_CHANGES = true;
}

export function hasStagedChanges(): boolean {
	return STAGED_CHANGES;
}

// Required Fields
export function validateRequiredFields() {
	var invalidFields = [];

	var inputs = document.querySelectorAll('input[required]');
	var selects = document.querySelectorAll('select[required]');
	var fields = Array.from(inputs).concat(Array.from(selects));

	fields.forEach(function (field) {
		const value = (field as HTMLInputElement | HTMLSelectElement).value.trim();
		if (value == '' || value == 'select' || value == 'other') {
			invalidFields.push(field.id);
		}
	});

	if (invalidFields.length > 0) {
		setSuccessfulSaveFn(false);
		stopLoadingScreen();
		displayMessage(null, getInvalidFieldsText(invalidFields));
	}
}

export function getInvalidFieldsText(invalidFields) {
	const basicFields = ['title', 'currency'];

	let intro = `${translate('messages.fields.invalid')}<br>`;
	let title = '';
	let normalText = '';

	if (invalidFields.length > 0) {
		if (basicFields.includes(invalidFields[0])) {
			title = translate('labels.basic_information');
			normalText += `<strong>${title}:</strong><br><ul>`;
		}

		for (const id of invalidFields) {
			const label = getID(id + '-label');
			const idSplit = id.split('-');

			let innerTitle = title;
			let innerText = '';

			if (label && label.innerText) {
				const lastChar = id[id.length - 1];

				innerTitle = firstCharToUpperCase(idSplit[0]);
				innerText = label.innerText;

				if (!isNaN(lastChar)) {
					let position = idSplit[idSplit.length - 1];
					const typeTitle = getID(`${innerTitle}-title-${position}`);
					if (typeTitle && typeTitle.innerText) {
						innerTitle = typeTitle.innerText;
					}
				}
			} else {
				innerTitle = firstCharToUpperCase(idSplit[0]);
				innerText = getInnerText(idSplit);
			}

			if (title == innerTitle || basicFields.includes(id)) {
				normalText += `
                <li>
                    ${innerText || innerTitle}
                </li>`;
			} else {
				if (innerTitle == 'Select') {
					innerTitle = innerText.replace(/[0-9]/g, '').trim();
				}

				title = innerTitle;
				normalText += `
                </ul><br>
                <strong>${title}:</strong><br>
                <ul>
                    <li>
                        ${innerText}
                    </li>`;
			}
		}

		normalText += '</ul>';
	}

	const result = [intro, normalText].join('<br>');
	return result;
}

export function reEdit(type, SUCCESSFUL_SAVE = true) {
	let param;
	let url;

	if (type == 'trips') {
		param = 't';
		url = 'trip.html';
	} else if (type == 'destinations') {
		param = 'd';
		url = 'destination.html';
	} else if (type == 'listings') {
		param = 'l';
		url = 'listing.html';
	}

	if (param && DOCUMENT_ID && SUCCESSFUL_SAVE) {
		window.location.href = `${url}?${param}=${DOCUMENT_ID}`;
	} else if (!SUCCESSFUL_SAVE) {
		closeMessage();
	} else {
		window.location.href = '../index.html';
	}
}

export function getInnerText(idSplit) {
	let innerText = '';
	for (let i = 1; i < idSplit.length; i++) {
		innerText += firstCharToUpperCase(idSplit[i]) + ' ';
	}
	return innerText.trim();
}

export function notifyFieldIfAbsent(id) {
	const field = getID(id);
	if (!field.value) {
		field.reportValidity();
	}
}

export function getFieldValueOrNotify(id) {
	const field = getID(id);
	if (!field.value) {
		field.reportValidity();
		return null;
	}
	return field.value;
}

// Selects
export function closeAllSelects(excludeElement?) {
	var selectElements = document.getElementsByTagName('select');
	for (var i = 0; i < selectElements.length; i++) {
		var select = selectElements[i];
		if (select !== excludeElement && select.hasAttribute('open')) {
			select.removeAttribute('open');
		}
	}
}

export function getSelectCurrentLabel(select) {
	return select.options[select.selectedIndex].innerText;
}

export function addValueToSelectIfExists(value, select) {
	if (!select) return;
	for (var i = 0; i < select.options.length; i++) {
		if (select.options[i].value === value) {
			select.value = value;
		}
	}
}

export function getAllValuesFromSelect(select) {
	var values = [];
	for (var i = 0; i < select.options.length; i++) {
		values.push(select.options[i].value);
	}
	return values;
}

export function selectHasValue(select, value) {
	return Array.from(select.options).some((opt: HTMLOptionElement) => opt.value === value);
}

// Link Validation
export function isHttp(link) {
	return link.startsWith('http://') || link.startsWith('https://');
}

export function validateLink(id) {
	const div = getID(id);
	const link = div.value;

	if (!link || isHttp(link)) return;

	closeAllSelects();
	div.value = '';

	const title = translate('messages.fields.link.title', {
		icon: '<i class="iconify" data-icon="ic:twotone-link-off"></i>',
	});
	const content = translate('messages.fields.link.message');

	openToast(`${title}: ${content}`);
}

/**
 * Pure check that a link is a Google Maps / Apple Maps link. Shared by the
 * edit form's `validateMapLink` and the Places "Import with maps" local step
 * (gmaps scraper) — both must agree on what counts as a valid Maps URL.
 */
export function isValidMapLink(link) {
	const isGoogleMaps =
		(link.includes('google') && link.includes('maps')) ||
		link.includes('goo.gl/maps') ||
		link.includes('maps.app.goo.gl');
	const isAppleMaps = link.includes('maps.apple.com');
	return isHttp(link) && (isGoogleMaps || isAppleMaps);
}

export function validateMapLink(id) {
	const div = getID(id);
	const link = div.value;

	if (!link || isValidMapLink(link)) return;

	closeAllSelects();
	div.value = '';

	const icon = '<i class="iconify" data-icon="hugeicons:maps"></i>';
	const googleMapsIcon = '<i class="iconify" data-icon="simple-icons:googlemaps"></i>';
	const appleMapsIcon = '<i class="iconify" data-icon="ic:baseline-apple"></i>';

	const title = translate('messages.fields.map_link.title', { icon });
	const content = translate('messages.fields.map_link.message', {
		googleMapsIcon,
		appleMapsIcon,
	});

	openToast(`${title}: ${content}`);
}

export function validateInstagramLink(id) {
	const div = getID(id);
	const link = div.value;

	if (!link || (isHttp(link) && link.includes('instagram.com'))) return;

	div.value = '';

	const icon = '<i class="iconify" data-icon="mdi:instagram"></i>';

	const title = translate('messages.fields.instagram_link.title', { icon });
	const content = translate('messages.fields.instagram_link.message');

	openToast(`${title}: ${content}`);
}

export function validateMediaLink(id) {
	const div = getID(id);
	const link = div.value;

	const validDomains = [
		'youtu.be/',
		'youtube.com',
		'tiktok.com',
		'instagram.com/reel/',
		'instagram.com/reels/',
		'instagram.com/p/',
	];

	if (!link || (isHttp(link) && validDomains.some((domain) => link.includes(domain)))) {
		return;
	} else {
		div.value = '';
		const icon = '<i class="iconify" data-icon="ic:twotone-link-off"></i>';
		const tiktokIcon = '<i class="iconify" data-icon="cib:tiktok"></i>';
		const youtubeIcon = '<i class="iconify" data-icon="mdi:youtube"></i>';
		const instagramIcon = '<i class="iconify" data-icon="mdi:instagram"></i>';

		const title = translate('messages.fields.media_link.title', { icon });
		const content = translate('messages.fields.media_link.message', {
			youtubeIcon,
			tiktokIcon,
			instagramIcon,
		});

		openToast(`${title}: ${content}`);
	}
}

/**
 * Preload a URL in the background and resolve whether it actually loads and
 * decodes as an image. Unlike URL-shape heuristics this also rejects links to
 * web pages, missing files and any resource the browser cannot render as an
 * image. Uses a plain <img> (no crossOrigin) so image hosts that don't send
 * CORS headers still load fine.
 */
export function loadImage(url: string, timeoutMs = 10000): Promise<boolean> {
	return new Promise((resolve) => {
		const image = new Image();
		let settled = false;
		let timer = 0;
		const done = (ok: boolean) => {
			if (settled) return;
			settled = true;
			image.onload = null;
			image.onerror = null;
			window.clearTimeout(timer);
			resolve(ok);
		};
		image.onload = () => done(true);
		image.onerror = () => done(false);
		timer = window.setTimeout(() => done(false), timeoutMs);
		image.src = url;
	});
}

/** Why an image link value was rejected. */
export type ImageLinkRejectReason = 'link' | 'twitter' | 'image';

/** Show the toast that explains why an image link was rejected (no DOM change). */
export function toastImageLinkError(reason: ImageLinkRejectReason): void {
	let icon = '<i class="iconify" data-icon="ic:twotone-link-off"></i>';
	let title = translate('messages.fields.link.title', { icon });
	let content = translate('messages.fields.link.message');

	if (reason === 'twitter') {
		icon = '<i class="iconify" data-icon="mdi:twitter"></i>';
		title = translate('messages.fields.twitter_link.title', { icon });
		content = translate('messages.fields.twitter_link.message', {
			xIcon: '<i class="iconify" data-icon="fa6-brands:x-twitter"></i>',
		});
	} else if (reason === 'image') {
		icon = '<i class="iconify" data-icon="mdi:image-off"></i>';
		title = translate('messages.fields.image_link.title', { icon });
		content = translate('messages.fields.image_link.message');
	}

	openToast(`${title}: ${content}`);
}

/**
 * Validate an image link input. Besides checking that the value is an http(s)
 * link (and not an X/Twitter-hosted image), it actually tries to load the URL
 * as an image and rejects links that fail to load (broken links or links to
 * non-image pages). On rejection the field is cleared and a toast explains why.
 * Returns true when the current value is empty or a loadable image.
 */
export async function validateImageLink(id): Promise<boolean> {
	const div = getID(id);
	if (!div) return true;
	const imageLink = div.value.trim();

	if (!imageLink) return true;

	// Fast fail: must be an http(s) URL.
	if (!isHttp(imageLink)) {
		closeAllSelects();
		div.value = '';
		toastImageLinkError('link');
		return false;
	}

	// X/Twitter-hosted images are not supported.
	if (imageLink.includes('pbs.twimg.com')) {
		closeAllSelects();
		div.value = '';
		toastImageLinkError('twitter');
		return false;
	}

	// Real image check: try to load the URL. Only reject if the field still
	// holds the same value (the user may have typed or cleared it while the
	// load was in flight).
	const ok = await loadImage(imageLink);
	if (!ok && div.value.trim() === imageLink) {
		closeAllSelects();
		div.value = '';
		toastImageLinkError('image');
		return false;
	}
	return ok;
}

export function getSelectOptionsHTML(object, selectedKey) {
	let result = '';
	for (const key in object) {
		const selected = key == selectedKey ? 'selected' : '';
		result += `<option value="${key}" ${selected}>${object[key]}</option>`;
	}
	return result;
}

export function removeEl(id) {
	const el = document.getElementById(id);
	if (!el) return false;

	el.remove();
	return true;
}
