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

export function validateImageLink(id) {
	const div = getID(id);
	const imageLink = div.value;

	if (isHttp(imageLink) && !imageLink.includes('pbs.twimg.com')) return;

	let icon = '';
	let title = '';
	let content = '';

	if (imageLink.includes('pbs.twimg.com')) {
		title = translate('messages.fields.twitter_link.title', {
			icon: '<i class="iconify" data-icon="mdi:twitter"></i>',
		});
		content = translate('messages.fields.twitter_link.message', {
			xIcon: '<i class="iconify" data-icon="fa6-brands:x-twitter"></i>',
		});
	} else {
		title = translate('messages.fields.link.title', {
			icon: '<i class="iconify" data-icon="ic:twotone-link-off"></i>',
		});
		content = translate('messages.fields.link.message');
	}

	closeAllSelects();
	div.value = '';

	openToast(`${title}: ${content}`);
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
