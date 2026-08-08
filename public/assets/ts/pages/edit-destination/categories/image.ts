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
import { animate } from '../../../theme/animations.js';
import { initializeSortableForGroup } from '../../../ui/sortable.js';
import { loadImageSelector } from '../../../data/firebase/storage.js';
import { CUSTOM_UPLOADS } from '../../../utils/set.js';

export var DESTINATION_IMAGES = {};
// Tracks which image slot editor is currently open (0 = none) and the
// category of the currently open images modal.
var OPEN_DESTINATION_IMAGE_SLOT = 0;
var OPEN_DESTINATION_IMAGE_CATEGORY = '';

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
	properties.fullscreen = true;
	properties.content = getDestinationImageContent(category, size);
	properties.icons = [{ type: 'goBack', action: 'closeDestinationImages()' }];
	properties.buttons = [
		{
			type: 'cancel',
		},
		{
			type: 'confirm',
			action: `confirmDestinationImages('${category}', ${j})`,
		},
	];

	OPEN_DESTINATION_IMAGE_SLOT = 0;
	OPEN_DESTINATION_IMAGE_CATEGORY = category;
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
	let buttons = '';
	let editors = '';
	for (let k = 1; k <= size; k++) {
		buttons += `
        <div class='input-button-container' id="input-button-container-${k}">
            <button id="${category}-image-button-${k}" class="btn input-button draggable" data-action="open-destination-image" data-category="${category}" data-index="${k}" style="margin-top:1em">${translate('labels.image.add')}</button>
            <i class="iconify drag-icon" data-icon="mdi:drag"></i>
        </div>
        `;

		editors += `
        <div id="${category}-image-editor-${k}" class="image-editor-screen" style="display: none">
            <div class="nice-form-group customization-box" id="${category}-box-${k}">
                <label>${translate('labels.image.title_plural')} <span class="opcional"> (${translate('labels.optional')})</span></label>
                <input id="upload-${category}-${k}" class='image-uploadbox' type="file" accept=".jpg, .jpeg, .png" />
                <p id="upload-${category}-${k}-size-message" class="message-text"> <i class='red'>*</i> ${translate('labels.image.upload_limit')}</p>
            </div>

            <div class="nice-form-group">
                <input id="link-${category}-${k}" class='image-input' type="url" placeholder="${translate('labels.image.placeholder')}" value="">
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

            <div class="button-box-right" style="margin-top: 8px; margin-bottom: 8px;">
                <button data-action="remove-destination-image" data-category="${category}" data-index="${k}" class="btn btn-basic btn-format">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
                        <path fill="currentColor" fill-rule="evenodd" d="M8.106 2.553A1 1 0 0 1 9 2h6a1 1 0 0 1 .894.553L17.618 6H20a1 1 0 1 1 0 2h-1v11a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3V8H4a1 1 0 0 1 0-2h2.382l1.724-3.447ZM14.382 4l1 2H8.618l1-2h4.764ZM11 11a1 1 0 1 0-2 0v6a1 1 0 1 0 2 0v-6Zm4 0a1 1 0 1 0-2 0v6a1 1 0 1 0 2 0v-6Z" clip-rule="evenodd"></path>
                    </svg>
                </button>
            </div>
        </div>
        `;
	}

	return `
    <p style="font-size: 0.8em; margin-top: -20px">${translate('labels.image.quantity_limit')}</p>
    <div id="${category}-images-box" class="image-editor-box">
        <div id="${category}-images-main-screen" class="image-editor-screen">
            <div class="draggable-area" data-group="image-${category}" id="image-${category}-buttons">
                ${buttons}
            </div>
        </div>
        ${editors}
    </div>
    `;
}

// Navigate to the dedicated editor screen for image slot k (mirrors the
// itinerary "link item" flow) instead of expanding the form inline.
export function openDestinationImage(category, k) {
	const editor = getID(`${category}-image-editor-${k}`);
	const mainScreen = getID(`${category}-images-main-screen`);
	if (!editor || !mainScreen) return;

	OPEN_DESTINATION_IMAGE_SLOT = k;
	getID('message-title').innerText = `${translate('labels.image.title')} ${k}`;
	getID('back-icon').style.visibility = 'visible';
	animate([`${category}-image-editor-${k}`], [`${category}-images-main-screen`]);
}

// Return from the editor screen to the images list (triggered by the modal's
// back arrow, the confirm button, or removing an image).
export function closeDestinationImages() {
	const k = OPEN_DESTINATION_IMAGE_SLOT;
	const category = OPEN_DESTINATION_IMAGE_CATEGORY;
	if (!k || !category) return;

	OPEN_DESTINATION_IMAGE_SLOT = 0;
	getID('message-title').innerText = translate('labels.image.add_title');
	getID('back-icon').style.visibility = 'hidden';
	updateDestinationImageButtonLabel(category, k);
	animate([`${category}-images-main-screen`], [`${category}-image-editor-${k}`]);
}

// Clear image slot k and return to the images list.
export function removeDestinationImage(category, k) {
	const link = getID(`link-${category}-${k}`);
	const upload = getID(`upload-${category}-${k}`);
	const description = getID(`${category}-image-description-${k}`);
	const enableLink = getID(`enable-link-${category}-${k}`);

	if (link) link.value = '';
	if (upload) upload.value = '';
	if (description) description.value = '';
	if (enableLink) enableLink.checked = true;

	updateDestinationImageButtonLabel(category, k);
	closeDestinationImages();
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
	// If an image editor screen is open, treat confirm as "back to the list".
	if (OPEN_DESTINATION_IMAGE_SLOT) {
		closeDestinationImages();
		return;
	}
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
