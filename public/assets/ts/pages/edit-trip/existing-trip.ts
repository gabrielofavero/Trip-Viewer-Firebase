import {
	PIN,
	switchPinVisibility,
	switchPinLabel,
	getCurrentPreferencePIN,
} from './categories/basic-data/protected-data.js';
import { setExpensesData } from './edit-trip.js';
import { loadExpenses } from './categories/expenses.js';
import { DOCUMENT_ID } from '../../data/state.js';
import { setCurrentPreferencePIN } from './categories/basic-data/set-protected-data.js';
import { setTravelers, updateTravelersButtonLabel } from './categories/travelers.js';
import { loadCustomizationImageData, setCurrentLight } from './categories/customization.js';
import {
	addTransportation,
	addAccommodations,
	getTransportationPicker,
	loadDestinations,
	loadItinerarySchedule,
} from './new-trip.js';
import { GALLERY_ITEMS, renderGalleryCarousel } from './categories/gallery.js';
import {
	loadTransportationVisibility,
	updateTransportationTitle,
	applyTransportationTypeVisualization,
	buildTransportationPersonSelect,
} from './categories/transportation.js';
import {
	ACCOMMODATION_IMAGES,
	renderAccommodationImageCarousel,
	loadCheckIn,
	loadCheckOut,
} from './categories/accommodation.js';
import {
	loadActiveDestinations,
	updateActiveDestinationsCardsHTML,
} from './categories/destination.js';
import {
	setItineraryData,
	applyLoadedItineraryData,
	getItineraryArray,
} from './categories/itinerary-module/itinerary-module.js';
import {
	autoPopulateItineraryFromTrip,
	hasItineraryItems,
} from './categories/itinerary-module/inner-itinerary/auto-populate.js';
import { displayError } from '../../utils/messages.js';
import { translate } from '../../i18n/translation.js';
import { getState } from '../../data/state.js';
import { cloneObject, getID, getOptionsFromSelect } from '../../utils/dom.js';
import { convertFromDateObject, getDateString, getTimeStringFromDate } from '../../utils/dates.js';
import { validateTravelersObject } from '../../models/traveler.model.js';
import { haveErrorFromGetRequest, get } from '../../data/firebase/database.js';
import { ERROR_FROM_GET_REQUEST } from '../../data/state.js';
import { getHTMLpage, setPageName } from '../../app/main.js';

export async function loadTripData() {
	try {
		loadBasicTripData();
		loadCustomizationData();
		await loadExpensesData();
		loadTransportationData();
		loadAccommodationData();
		await loadDestinationsData();
		loadItineraryData();
		loadGalleryData();

		setPageName(`${translate('labels.edit')} ${getState().title}`);
	} catch (error) {
		displayError(error);
		throw error;
	}
}

function loadBasicTripData() {
	getID('title').value = getState().title;
	getID('currency').value = getState().currency;

	const start = convertFromDateObject(getState().start);
	const end = convertFromDateObject(getState().end);

	getID('start').value = getDateString(start, 'yyyy-mm-dd');
	getID('end').value = getDateString(end, 'yyyy-mm-dd');

	setTravelers(cloneObject(getState().travelers));
	validateTravelersObject();
	updateTravelersButtonLabel();
	setCurrentPreferencePIN(getState().pin);
	switchPinVisibility();
	switchPinLabel();
}

export function loadCustomizationData(state?) {
	// Images
	const background = getState().image.background;
	const logoLight = getState().image.light;
	const logoDark = getState().image.dark;

	if (getState().image.active === true) {
		getID('images-enabled').checked = true;
		getID('images-enabled-content').style.display = 'block';
	}

	loadCustomizationImageData(background, 'link-background');
	loadCustomizationImageData(logoLight, 'link-logo-light');
	loadCustomizationImageData(logoDark, 'link-logo-dark');

	// Cores
	const lightColor = getID('light-color');
	const darkColor = getID('dark-color');

	if (getState().colors.active === true) {
		getID('colors-enabled').checked = true;
		lightColor.value = getState().colors.light;
		darkColor.value = getState().colors.dark;
		setCurrentLight(getState().colors.light);
		getID('colors-enabled-content').style.display = 'block';
	}

	// Visibility (theme mode)
	const visibility = getState().visibility;
	if (visibility) {
		const isLightOnly = visibility.light && !visibility.dark;
		const isDarkOnly = !visibility.light && visibility.dark;
		const isForced = isLightOnly || isDarkOnly;

		getID('theme-enabled').checked = isForced;
		if (isForced) {
			getID('theme-enabled-content').style.display = 'block';
			if (isDarkOnly) {
				(getID('theme-mode-dark') as HTMLInputElement).checked = true;
			} else {
				(getID('theme-mode-light') as HTMLInputElement).checked = true;
			}
		}
	}

	// Custom Links
	getID('links-enabled').checked = getState().links.active;
	getID('link-attachments').value = getState().links.attachments;
	getID('link-drive').value = getState().links.drive;
	getID('link-maps').value = getState().links.maps;
	getID('link-pdf').value = getState().links.pdf;
	getID('link-ppt').value = getState().links.ppt;
	getID('link-sheet').value = getState().links.sheet;
	getID('link-vaccine').value = getState().links.vaccine;
}

async function loadExpensesData() {
	if (getState().modules.expenses === true) {
		getID('expenses-enabled').checked = true;
		getID('expenses-enabled-content').style.display = 'block';
	}

	const getPath = PIN.current
		? `expenses/protected/${PIN.current}/${DOCUMENT_ID}`
		: `expenses/${DOCUMENT_ID}`;

	setExpensesData(await get(getPath, true, true));

	if (haveErrorFromGetRequest()) {
		displayError(ERROR_FROM_GET_REQUEST);
		return;
	}

	loadExpenses();
}

async function loadTransportationData() {
	if (getState().modules.transportation === true) {
		getID('transportation-enabled').checked = true;
		getID('transportation-enabled-content').style.display = 'block';
		getID('transportation-add-box').style.display = 'block';
	}
	// Migration 13 changed 'simple-view'→'simple', 'leg-view'→'leg' in Firestore.
	// Map back to the radio button IDs used in the HTML.
	const rawViewMode = getState().transportation.viewMode || 'simple-view';
	const viewModeId =
		rawViewMode === 'simple'
			? 'simple-view'
			: rawViewMode === 'leg'
				? 'leg-view'
				: rawViewMode === 'people'
					? 'people-view'
					: rawViewMode;
	getID(viewModeId).checked = true;

	for (let j = 1; j <= getState().transportation.data.length; j++) {
		addTransportation();
		const transport = getState().transportation.data[j - 1];

		// Only override the direction radio for valid stored values. Missing /
		// legacy directions keep addTransportation()'s default (departure for
		// the first leg, return for the rest) so legs stay distributed in leg
		// view instead of all collapsing into "While traveling".
		if (['departure', 'during', 'return'].includes(transport.direction)) {
			const directionRadio = getID(`${transport.direction}-${j}`);
			if (directionRadio) directionRadio.checked = true;
		}

		const person = transport.person;
		if (person) {
			buildTransportationPersonSelect(`transportation-person-select-${j}`, person);
		}

		const departure = convertFromDateObject(transport.dates.departure);
		const arrival = convertFromDateObject(transport.dates.arrival);

		if (departure) {
			getID(`departure-time-${j}`).value = getTimeStringFromDate(departure);
		}

		if (arrival) {
			getID(`arrival-time-${j}`).value = getTimeStringFromDate(arrival);
		}

		const picker = getTransportationPicker(j);
		if (picker && departure && arrival) {
			picker.setRange(getDateString(departure, 'yyyy-mm-dd'), getDateString(arrival, 'yyyy-mm-dd'));
		}

		getID(`transportation-type-${j}`).value = transport.type;
		const company = transport.company;
		if (company) {
			loadTransportationVisibility(j);
			if (getOptionsFromSelect(`company-select-${j}`).includes(company)) {
				getID(`company-select-${j}`).value = company;
			} else {
				getID(`company-select-${j}`).value = 'other';
				getID(`company-${j}`).value = company;
				loadTransportationVisibility(j);
			}
		}

		getID(`transportation-id-${j}`).value = transport.id;
		getID(`transportation-duration-other-${j}`).value = transport.duration;
		getID(`reservation-transportation-${j}`).value = transport.reservation;
		getID(`departure-point-${j}`).value = transport.points.origin;
		getID(`arrival-point-${j}`).value = transport.points.destination;
		getID(`transportation-link-${j}`).value = transport.link;

		updateTransportationTitle(j);
	}
	applyTransportationTypeVisualization();
}

function loadAccommodationData() {
	if (getState().modules.accommodations === true) {
		getID('accommodations-enabled').checked = true;
		getID('accommodations-enabled-content').style.display = 'block';
		getID('accommodations-add-box').style.display = 'block';
	}

	for (let j = 1; j <= getState().accommodations.length; j++) {
		addAccommodations();
		const accommodation = getState().accommodations[j - 1];
		ACCOMMODATION_IMAGES[j] = accommodation.images || [];

		getID(`accommodations-id-${j}`).value = accommodation.id;
		getID(`accommodations-breakfast-${j}`).checked = accommodation.breakfast;
		getID(`accommodations-name-${j}`).value = accommodation.name;
		getID(`accommodations-title-${j}`).innerText =
			accommodation.name || getID(`accommodations-title-${j}`).innerText;
		getID(`accommodations-address-${j}`).value = accommodation.address;
		getID(`accommodations-description-${j}`).value = accommodation.description;
		getID(`accommodations-payment-status-${j}`).value = accommodation.paymentStatus || '';
		getID(`reservation-accommodations-${j}`).value = accommodation.reservation || '';
		getID(`reservation-accommodations-link-${j}`).value = accommodation.link;

		renderAccommodationImageCarousel(j);
		loadCheckIn(accommodation, j);
		loadCheckOut(accommodation, j);
	}
}

async function loadDestinationsData() {
	if (getHTMLpage() === 'edit-listing' || getState().modules.destinations === true) {
		if (getID('destinations-enabled')) {
			getID('destinations-enabled').checked = true;
		}
		getID('destinations-enabled-content').style.display = 'flex';
		getID('no-destinations').style.display = 'none';
		getID('has-destinations').style.display = 'flex';
	} else {
		getID('no-destinations').style.display = 'block';
		getID('has-destinations').style.display = 'none';
	}

	loadDestinations();
	const destinations = getState().destinations || getState().destinationRefs;
	if (!destinations || !destinations.length) return;
	const cards = document.querySelectorAll('#destinations-checkboxes .destination-card');
	for (const destination of destinations) {
		const id = destination.id || destination.destinationId;
		for (const card of cards) {
			if (card.getAttribute('data-destination-id') === id) {
				card.classList.add('selected');
				// Move to top of selected group
				const container = getID('destinations-checkboxes');
				container.prepend(card);
				break;
			}
		}
	}
	await loadActiveDestinations();
}

export function loadItineraryData() {
	if (getState().modules.itinerary === true) {
		getID('itinerary-enabled').checked = true;
		getID('itinerary-enabled-content').style.display = 'block';
	}

	loadItinerarySchedule();

	let j = 1;
	while (getID(`itinerary-title-${j}`)) {
		const data = getState().itinerary[j - 1];
		if (data?.date) {
			applyLoadedItineraryData(j, data);
		}
		j++;
	}
	updateActiveDestinationsCardsHTML('itinerary');

	// Pre-fill from transportations/accommodations when the itinerary is
	// enabled but has no scheduled items yet.
	if (getID('itinerary-enabled')?.checked && !hasItineraryItems(getItineraryArray() || [])) {
		autoPopulateItineraryFromTrip();
	}

	setItineraryData(cloneObject(getState().itinerary));
}

function loadGalleryData() {
	if (getState().modules.gallery === true) {
		getID('gallery-enabled').checked = true;
		getID('gallery-enabled-content').style.display = 'block';
	}

	const gallery = getState().gallery;
	const size = gallery?.images?.length || 0;
	GALLERY_ITEMS.length = 0;
	for (let i = 0; i < size; i++) {
		GALLERY_ITEMS.push({
			title: gallery.titles?.[i] || '',
			category: gallery.categories?.[i] || '',
			description: gallery.descriptions?.[i] || '',
			link: gallery.images?.[i] || '',
		});
	}

	renderGalleryCarousel();
}
