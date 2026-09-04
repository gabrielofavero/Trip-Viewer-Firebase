import {
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
import { markStagedChanges, validateLink } from '../../../ui/fields.js';
import { closeAccordions, openLastAccordion } from '../../../ui/accordion.js';
import { translate } from '../../../i18n/translation.js';
import { renderImageSlotCarousel } from '../../../ui/image-slot-picker.js';
import type { ImageSlot } from '../../../ui/image-slot-picker.js';
import { addAccommodations } from '../new-trip.js';

export var ACCOMMODATION_IMAGES: Record<number, ImageSlot[]> = {};

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
			paymentStatus: getID(`accommodations-payment-status-${j}`).value,
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
	return (ACCOMMODATION_IMAGES[j] || []).map((image) => ({
		description: image.description || '',
		link: image.link || '',
	}));
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

// Carousel rendering — one card per photo (logo-picker-card proportions)
// plus a single "add photo" card while slots remain (max 5).
export function renderAccommodationImageCarousel(j) {
	const images = ACCOMMODATION_IMAGES[j] || [];
	renderImageSlotCarousel({
		containerId: `accommodation-images-carousel-${j}`,
		images,
		maxSlots: 5,
		addLabel: translate('labels.image.add_photo'),
		extraFields: 'label',
		onChanged: () => markStagedChanges(),
		dialogTitle: (index) =>
			index === images.length
				? translate('labels.image.add_photo')
				: translate('labels.image.photo_n', { n: index + 1 }),
	});
}

/** Clear the photos of an accommodation (used when the stay itself is removed). */
export function removeAccommodationImages(j) {
	ACCOMMODATION_IMAGES[j] = [];
	markStagedChanges();
}
