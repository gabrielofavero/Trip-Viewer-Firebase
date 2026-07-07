import {
	cloneObject,
	getChildIDs,
	getID,
	getJ,
	getOrCreateCategoryID,
} from '../../../utils/dom.js';
import {
	convertFromDateObject,
	formattedDateToDateObject,
	getDateString,
	getTimeStringFromDate,
} from '../../../utils/dates.js';
import { validateImageLink, validateLink } from '../../../ui/fields.js';
import { closeAccordions, openLastAccordion } from '../../../ui/accordion.js';
import { translate } from '../../../i18n/translation.js';
import {
	closeMessage,
	displayFullMessage,
	getContainersInput,
	MESSAGE_PROPERTIES,
} from '../../../utils/messages.js';
import { initializeSortableForGroup } from '../../../ui/sortable.js';
import { loadImageSelector, uploadImages } from '../../../data/firebase/storage.js';
import { fade } from '../../../theme/animations.js';
import { FIRESTORE_NEW_DATA } from '../../../data/state.js';
import { IMAGE_UPLOAD_STATUS } from '../../../data/firebase/storage.js';
import { CUSTOM_UPLOADS } from '../../../utils/set.js';
import { addAccommodations } from '../new-trip.js';

export var ACCOMMODATION_IMAGES = {};

export function getAccommodationArray(protectedReservationCodes = false) {
	let result = [];
	for (const id of getChildIDs('accommodations-box')) {
		const j = getJ(id);
		result.push({
			breakfast: getID(`accommodations-breakfast-${j}`).checked,
			dates: {
				checkIn: formattedDateToDateObject(
					getID(`check-in-${j}`).value,
					getID(`check-in-time-${j}`).value,
				),
				checkOut: formattedDateToDateObject(
					getID(`check-out-${j}`).value,
					getID(`check-out-time-${j}`).value,
				),
			},
			description: getID(`accommodations-description-${j}`).value,
			address: getID(`accommodations-address-${j}`).value,
			id: getOrCreateCategoryID('accommodations', j),
			images: getAccommodationImages(j),
			reservation: protectedReservationCodes ? '' : getID(`reservation-accommodations-${j}`).value,
			link: protectedReservationCodes ? '' : getID(`reservation-accommodations-link-${j}`).value,
			name: getID(`accommodations-name-${j}`).value,
		});
	}
	return result;
}

export function getProtectedAccommodationObject() {
	let result = {};
	for (const childID of getChildIDs('accommodations-box')) {
		const j = getJ(childID);
		const id = getID(`accommodations-id-${j}`).value;
		const reservation = getID(`reservation-accommodations-${j}`).value;
		const link = getID(`reservation-accommodations-link-${j}`).value;
		result[id] = { reservation, link };
	}
	return result;
}

function getAccommodationImages(j) {
	const result = [];
	for (const image of ACCOMMODATION_IMAGES[j]) {
		if (image.file) {
			CUSTOM_UPLOADS.accommodations.push(image);
		}
		result.push({
			description: image.description,
			link: image.link,
		});
	}
	return result;
}

export function loadCheckIn(accommodation, j) {
	loadAccommodationCheck('checkIn', 'in', accommodation, j);
}

export function loadCheckOut(accommodation, j) {
	loadAccommodationCheck('checkOut', 'out', accommodation, j);
}

function loadAccommodationCheck(chave, checkTipo, accommodation, j) {
	const data = convertFromDateObject(accommodation.dates[chave]);
	if (data) {
		getID(`check-${checkTipo}-${j}`).value = getDateString(data, 'yyyy-mm-dd');
		getID(`check-${checkTipo}-time-${j}`).value = getTimeStringFromDate(data);
	}
}

// Listener
export function loadAccommodationListeners(j) {
	// Link Validation
	getID(`reservation-accommodations-link-${j}`).addEventListener('change', () =>
		validateLink(`reservation-accommodations-link-${j}`),
	);

	// Nome
	getID(`accommodations-name-${j}`).addEventListener('change', function () {
		if (getID(`accommodations-name-${j}`).value) {
			getID(`accommodations-title-${j}`).innerText = getID(`accommodations-name-${j}`).value;
		}
	});
}

export function accommodationsAddListenerAction() {
	closeAccordions('accommodations');
	addAccommodations();
	openLastAccordion('accommodations');
}

// Internal Loading (Modal)
export function openAccommodationImages(j) {
	const size = 5;
	const properties = cloneObject(MESSAGE_PROPERTIES);

	properties.title = translate('labels.image.add_title');
	properties.containers = getContainersInput();
	properties.content = getAccommodationImageContent(size);
	properties.icons = [{ type: 'goBack', action: `closeInnerAccommodationImage()` }];
	properties.buttons = [
		{
			type: 'cancel',
		},
		{
			type: 'confirm',
			action: `confirmAccommodationImages(${j})`,
		},
	];

	displayFullMessage(properties);
	initializeSortableForGroup(`image-accommodations`, { onEnd: '' });

	for (let k = 1; k <= size; k++) {
		const image = ACCOMMODATION_IMAGES[j][k - 1];
		if (image) {
			getID(`accommodations-image-description-${k}`).value = image.description;
			getID(`link-accommodations-${k}`).value = image.link;
			getID(`accommodations-image-button-${k}`).innerText =
				image.description || `${translate('labels.image.title')} ${k}`;
		}

		loadImageSelector(`accommodations-${k}`);
		getID(`link-accommodations-${k}`).addEventListener('change', () =>
			validateImageLink(`link-accommodations-${k}`),
		);
	}
}

function getAccommodationImageContent(size = 5) {
	let buttons = '';
	let inner = '';
	for (let k = 1; k <= size; k++) {
		buttons += `
        <div class='input-button-container' id="input-button-container-${k}">
            <button id="accommodations-image-button-${k}" class="btn input-button draggable" data-action="open-inner-accommodation-image" data-index="${k}" style="margin-top:1em">${translate('labels.image.add')}</button>
            <i class="iconify drag-icon" data-icon="mdi:drag"></i>
        </div>`;

		inner += `
        <div id="accommodations-image-${k}" style="display: none">
            <div class="nice-form-group customization-box" id="accommodations-box-${k}">
                <label>${translate('labels.image.title_plural')} <span class="opcional"> (${translate('labels.optional')})</span></label>
                <input id="upload-accommodations-${k}" class='image-uploadbox' type="file" accept=".jpg, .jpeg, .png" />
                <p id="upload-accommodations-${k}-size-message" class="message-text"> <i class='red'>*</i> ${translate('labels.image.upload_limit')}</p>
            </div>

            <div class="nice-form-group">
                <input id="link-accommodations-${k}" class='image-input' type="url" placeholder="${translate('labels.image.placeholder')}" value=""
                class="icon-right">
            </div>

            <fieldset class="nice-form-group image-checkbox" id="upload-checkbox-accommodations-${k}">
                <div class="nice-form-group">
                <input type="radio" name="type-accommodations-${k}" id="enable-link-accommodations-${k}" checked>
                <label for="enable-link-accommodations-${k}">${translate('labels.image.link')}</label>
                </div>

                <div class="nice-form-group">
                <input type="radio" name="type-accommodations-${k}" id="enable-upload-accommodations-${k}">
                <label for="enable-upload-accommodations-${k}">${translate('labels.image.upload')} <span class="opcional"> (${translate('labels.image.upload_limit')})</span></label>
                </div>
            </fieldset>

            <div class="nice-form-group">
                <label>${translate('labels.image.description')} <span class="opcional"> (${translate('labels.optional')})</span></label>
                <input id="accommodations-image-description-${k}" type="text" placeholder="${translate('trip.accommodation.description_placeholder')}" />
            </div>
        </div>
        `;
	}

	return `
    <p style="font-size: 0.8em; margin-top: -20px">${translate('labels.image.quantity_limit')}</p>
    <div class="draggable-area" data-group="image-accommodations" id="image-accommodations-buttons">
        ${buttons}
    </div>
    <div id="inner-accommodations-image">
        ${inner}
    </div>
    `;
}

export function openInnerAccommodationImage(k) {
	fade([`image-accommodations-buttons`], [`accommodations-image-${k}`]);
	getID('back-icon').style.visibility = 'visible';
}

export function closeInnerAccommodationImage() {
	for (const orderId of getChildIDs('inner-accommodations-image')) {
		const k = getJ(orderId);
		const id = `accommodations-image-${k}`;
		if (getID(id).style.display == 'block') {
			let title = translate('labels.image.add');

			if (hasInnerAccommodationImage(k)) {
				title =
					getID(`accommodations-image-description-${k}`).value ||
					`${translate('labels.image.title')} ${k}`;
			}

			getID(`accommodations-image-button-${k}`).innerText = title;
			fade([`accommodations-image-${k}`], [`image-accommodations-buttons`]);
			break;
		}
	}
	getID('back-icon').style.visibility = 'hidden';
}

function hasInnerAccommodationImage(k) {
	return (
		(getID(`enable-link-accommodations-${k}`).checked && getID(`link-accommodations-${k}`).value) ||
		(getID(`enable-upload-accommodations-${k}`).checked &&
			getID(`upload-accommodations-${k}`).value)
	);
}

export function confirmAccommodationImages(j) {
	const isEditing = getID(`accommodations-image-${j}`).style.display === 'block';
	if (isEditing) {
		closeInnerAccommodationImage();
	} else {
		saveAccommodationImages(j);
		setImageButtonLabel(j);
	}
}

export function setImageButtonLabel(j) {
	getID(`images-accommodation-button-${j}`).innerText =
		ACCOMMODATION_IMAGES[j].length > 0
			? translate('labels.image.edit')
			: translate('labels.image.add');
}

function saveAccommodationImages(j) {
	const result = [];
	for (const id of getChildIDs('image-accommodations-buttons')) {
		const k = getJ(id);
		if (hasInnerAccommodationImage(k)) {
			result.push({
				description: getID(`accommodations-image-description-${k}`).value,
				link: getID(`enable-link-accommodations-${k}`).checked
					? getID(`link-accommodations-${k}`).value
					: '',
				file: getID(`enable-upload-accommodations-${k}`).checked
					? getID(`upload-accommodations-${k}`)?.files[0]
					: '',
				position: [j, k],
			});
		}
	}

	ACCOMMODATION_IMAGES[j] = result;
	closeMessage();
}

export function removeAccommodationImages(j) {
	ACCOMMODATION_IMAGES[j] = [];
}

async function uploadAndSetAccommodationImages() {
	if (IMAGE_UPLOAD_STATUS.hasErrors || CUSTOM_UPLOADS.accommodations.length === 0) {
		return;
	}

	const accommodationFiles = CUSTOM_UPLOADS.accommodations.map((file) => file.file);
	const accommodationResult = await uploadImages('trips', accommodationFiles);

	if (IMAGE_UPLOAD_STATUS.hasErrors === false) {
		for (let i = 0; i < accommodationResult.length; i++) {
			const outerPosition = CUSTOM_UPLOADS.accommodations[i].position[0] - 1;
			const innerPosition = CUSTOM_UPLOADS.accommodations[i].position[1] - 1;
			FIRESTORE_NEW_DATA.accommodations[outerPosition].images[innerPosition].link =
				accommodationResult[i].link;
		}
	}
}
