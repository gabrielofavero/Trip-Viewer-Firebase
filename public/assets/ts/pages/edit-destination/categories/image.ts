// ======= Destination Entry Images =======
// Mirrors the accommodation image implementation from
// edit-trip/categories/accommodation.ts, generalized per
// category (restaurants, snacks, nightlife, tourism, shopping).
//
// Each destination entry can hold up to 5 images, each either a
// URL ("link") or an uploaded file. Data is staged in
// DESTINATION_IMAGES["{category}-{j}"] and written to Firestore
// as `images: { description, link }[]` on the entry.

import { cloneObject, getChildIDs, getID, getJ } from '../../../utils/dom.js';
import { validateImageLink } from '../../../ui/fields.js';
import {
	closeMessage,
	displayFullMessage,
	getContainersInput,
	MESSAGE_PROPERTIES,
} from '../../../utils/messages.js';
import { translate } from '../../../i18n/translation.js';
import { initializeSortableForGroup } from '../../../ui/sortable.js';
import { loadImageSelector } from '../../../data/firebase/storage.js';
import { CUSTOM_UPLOADS } from '../../../utils/set.js';

export var DESTINATION_IMAGES = {};

/** Serialized images for the given entry — collects pending file uploads. */
export function getDestinationImages(category, j) {
	const result = [];
	for (const image of DESTINATION_IMAGES[`${category}-${j}`] || []) {
		if (image.file) {
			CUSTOM_UPLOADS.destinations.push(image);
		}
		result.push({
			description: image.description,
			link: image.link,
		});
	}
	return result;
}

// Internal Loading (Modal)
export function openDestinationImages(category, j) {
	const size = 5;
	const properties = cloneObject(MESSAGE_PROPERTIES);

	properties.title = translate('labels.image.add_title');
	properties.containers = getContainersInput();
	properties.content = getDestinationImageContent(category, size);
	properties.buttons = [
		{
			type: 'cancel',
		},
		{
			type: 'confirm',
			action: `confirmDestinationImages('${category}', ${j})`,
		},
	];

	displayFullMessage(properties);
	initializeSortableForGroup(`image-${category}`, { onEnd: '' });

	for (let k = 1; k <= size; k++) {
		const image = DESTINATION_IMAGES[`${category}-${j}`]?.[k - 1];
		if (image) {
			getID(`${category}-image-description-${k}`).value = image.description;
			getID(`link-${category}-${k}`).value = image.link;
		}

		updateDestinationImageButtonLabel(category, k);
		loadImageSelector(`${category}-${k}`);
		getID(`link-${category}-${k}`).addEventListener('change', () =>
			validateImageLink(`link-${category}-${k}`),
		);
	}
}

function getDestinationImageContent(category, size = 5) {
	let inner = '';
	for (let k = 1; k <= size; k++) {
		inner += `
        <div class='input-button-container' id="input-button-container-${k}">
            <button id="${category}-image-button-${k}" class="btn input-button draggable" data-action="toggle-destination-image" data-category="${category}" data-index="${k}" style="margin-top:1em">${translate('labels.image.add')}</button>
            <i class="iconify drag-icon" data-icon="mdi:drag"></i>

            <div id="${category}-image-${k}" style="display: none">
                <div class="nice-form-group customization-box" id="${category}-box-${k}">
                    <label>${translate('labels.image.title_plural')} <span class="opcional"> (${translate('labels.optional')})</span></label>
                    <input id="upload-${category}-${k}" class='image-uploadbox' type="file" accept=".jpg, .jpeg, .png" />
                    <p id="upload-${category}-${k}-size-message" class="message-text"> <i class='red'>*</i> ${translate('labels.image.upload_limit')}</p>
                </div>

                <div class="nice-form-group">
                    <input id="link-${category}-${k}" class='image-input' type="url" placeholder="${translate('labels.image.placeholder')}" value="" class="icon-right">
                </div>

                <fieldset class="nice-form-group image-checkbox" id="upload-checkbox-${category}-${k}">
                    <div class="nice-form-group">
                    <input type="radio" name="type-${category}-${k}" id="enable-link-${category}-${k}" checked>
                    <label for="enable-link-${category}-${k}">${translate('labels.image.link')}</label>
                    </div>

                    <div class="nice-form-group">
                    <input type="radio" name="type-${category}-${k}" id="enable-upload-${category}-${k}">
                    <label for="enable-upload-${category}-${k}">${translate('labels.image.upload')} <span class="opcional"> (${translate('labels.image.upload_limit')})</span></label>
                    </div>
                </fieldset>

                <div class="nice-form-group">
                    <label>${translate('labels.image.description')} <span class="opcional"> (${translate('labels.optional')})</span></label>
                    <input id="${category}-image-description-${k}" type="text" placeholder="${translate('destination.image_description_placeholder')}" />
                </div>
            </div>
        </div>
        `;
	}

	return `
    <p style="font-size: 0.8em; margin-top: -20px">${translate('labels.image.quantity_limit')}</p>
    <div class="draggable-area" data-group="image-${category}" id="image-${category}-buttons">
        ${inner}
    </div>
    `;
}

export function toggleDestinationImage(category, k) {
	const editor = getID(`${category}-image-${k}`);
	if (!editor) return;
	editor.style.display = editor.style.display === 'block' ? 'none' : 'block';
	updateDestinationImageButtonLabel(category, k);
}

function updateDestinationImageButtonLabel(category, k) {
	const button = getID(`${category}-image-button-${k}`);
	if (!button) return;
	if (hasInnerDestinationImage(category, k)) {
		const description = getID(`${category}-image-description-${k}`)?.value;
		button.innerText = description || `${translate('labels.image.title')} ${k}`;
	} else {
		button.innerText = translate('labels.image.add');
	}
}

function hasInnerDestinationImage(category, k) {
	return (
		(getID(`enable-link-${category}-${k}`).checked && getID(`link-${category}-${k}`).value) ||
		(getID(`enable-upload-${category}-${k}`).checked &&
			getID(`upload-${category}-${k}`).value)
	);
}

export function confirmDestinationImages(category, j) {
	saveDestinationImages(category, j);
	setDestinationImageButtonLabel(category, j);
}

export function setDestinationImageButtonLabel(category, j) {
	getID(`${category}-images-button-${j}`).innerText =
		(DESTINATION_IMAGES[`${category}-${j}`] || []).length > 0
			? translate('labels.image.edit')
			: translate('labels.image.add');
}

function saveDestinationImages(category, j) {
	const result = [];
	for (const id of getChildIDs(`image-${category}-buttons`)) {
		const k = getJ(id);
		if (hasInnerDestinationImage(category, k)) {
			result.push({
				description: getID(`${category}-image-description-${k}`).value,
				link: getID(`enable-link-${category}-${k}`).checked
					? getID(`link-${category}-${k}`).value
					: '',
				file: getID(`enable-upload-${category}-${k}`).checked
					? getID(`upload-${category}-${k}`)?.files[0]
					: '',
				position: [j, k],
			});
		}
	}

	DESTINATION_IMAGES[`${category}-${j}`] = result;
	closeMessage();
}

export function removeDestinationImages(category, j) {
	DESTINATION_IMAGES[`${category}-${j}`] = [];
}
