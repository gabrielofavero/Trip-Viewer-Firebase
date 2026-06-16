import { PIN, switchPinVisibility, switchPinLabel, getCurrentPreferencePIN } from './categories/basic-data/protected-data.js';
import { setExpensesData } from './edit-trip.js';
import { DOCUMENT_ID } from '../../data/state.js';
import { setCurrentPreferencePIN } from './categories/basic-data/set-protected-data.js';
import { setTravelers, updateTravelersButtonLabel } from './categories/travelers.js';
import { loadCustomizationImageData, setCurrentLight } from './categories/customization.js';
import { visibilityListenerAction } from './support/event-listeners.js';
import { addTransportation, addAccommodations, loadDestinations, loadItinerarySchedule, addGallery } from './new-trip.js';
import { loadTransportationVisibility, updateTransportationTitle, applyTransportationTypeVisualization } from './categories/transportation.js';
import { ACCOMMODATION_IMAGES, setImageButtonLabel, loadCheckIn, loadCheckOut } from './categories/accommodation.js';
import { loadActiveDestinations, updateActiveDestinationsCardsHTML } from './categories/destination.js';
import { setItineraryData, applyLoadedItineraryData } from './categories/itinerary-module/itinerary-module.js';
import { displayError } from '../../utils/messages.js';
import { translate } from '../../i18n/translation.js';
import { getState } from '../../data/state.js';
import { cloneObject, getID, getOptionsFromSelect } from '../../utils/dom.js';
import { convertFromDateObject, getDateString, getTimeStringFromDate } from '../../utils/dates.js';
import { validateTravelersObject } from '../../models/traveler.model.js';
import { haveErrorFromGetRequest, get } from '../../data/firebase/database.js';
import { ERROR_FROM_GET_REQUEST } from '../../data/state.js';
import { buildDS, updateValueDS } from '../../ui/dynamic-select.js';
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

		setPageName(`${translate("labels.edit")} ${getState().title}`);
	} catch (error) {
		displayError(error);
		throw error;
	}
}

function loadBasicTripData() {
	getID("title").value = getState().title;
	getID("currency").value = getState().currency;

	const start = convertFromDateObject(getState().start);
	const end = convertFromDateObject(getState().end);

	getID("start").value = getDateString(start, "yyyy-mm-dd");
	getID("end").value = getDateString(end, "yyyy-mm-dd");

	setTravelers(cloneObject(getState().people));
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
		getID("images-enabled").checked = true;
		getID("images-enabled-content").style.display = "block";
	}

	loadCustomizationImageData(background, "link-background");
	loadCustomizationImageData(logoLight, "link-logo-light");
	loadCustomizationImageData(logoDark, "link-logo-dark");

	// Cores
	const lightColor = getID("light-color");
	const darkColor = getID("dark-color");

	if (getState().colors.active === true) {
		getID("colors-enabled").checked = true;
		lightColor.value = getState().colors.light;
		darkColor.value = getState().colors.dark;
		setCurrentLight(getState().colors.light);
		getID("colors-enabled-content").style.display = "block";
	}

	// Visibility
	const visibility = getState().visibility;
	if (visibility) {
		visibilityListenerAction(visibility);
		getID("dark-and-light").checked = visibility.light && visibility.dark;
		getID("light-exclusive").checked =
			visibility.light && !visibility.dark;
		getID("dark-exclusive").checked =
			!visibility.light && visibility.dark;
	}

	// Custom Links
	getID("links-enabled").checked = getState().links.active;
	getID("link-attachments").value = getState().links.attachments;
	getID("link-drive").value = getState().links.drive;
	getID("link-maps").value = getState().links.maps;
	getID("link-pdf").value = getState().links.pdf;
	getID("link-ppt").value = getState().links.ppt;
	getID("link-sheet").value = getState().links.sheet;
	getID("link-vaccine").value = getState().links.vaccine;
}

async function loadExpensesData() {
	if (getState().modules.expenses === true) {
		getID("enabled-expenses").checked = true;
		getID("enabled-expenses-content").style.display = "block";
	}

	const getPath = PIN.current
		? `expenses/protected/${PIN.current}/${DOCUMENT_ID}`
		: `expenses/${DOCUMENT_ID}`;

	setExpensesData(await get(getPath, true, true));

	if (haveErrorFromGetRequest()) {
		displayError(ERROR_FROM_GET_REQUEST);
		return;
	}

	loadExpensesData();
}

async function loadTransportationData() {
	if (getState().modules.transportation === true) {
		getID("transportation-enabled").checked = true;
		getID("transportation-enabled-content").style.display = "block";
		getID("transportation-add-box").style.display = "block";
	}
	getID(getState().transportation.viewMode || "simple-view").checked =
		true;

	for (let j = 1; j <= getState().transportation.data.length; j++) {
		addTransportation();
		const transport = getState().transportation.data[j - 1];

		getID(`${transport.direction}-${j}`).checked = true;

		const person = transport.person;
		if (person) {
			getID(`transportation-person-${j}`).value = person;
			updateValueDS(
				"transportation-person",
				person,
				`transportation-person-select-${j}`,
			);
			buildDS("transportation-person");
		}

		const departure = convertFromDateObject(transport.dates.departure);
		const arrival = convertFromDateObject(transport.dates.arrival);

		if (departure) {
			getID(`departure-${j}`).value = getDateString(departure, "yyyy-mm-dd");
			getID(`departure-time-${j}`).value = getTimeStringFromDate(departure);
		}

		if (arrival) {
			getID(`arrival-${j}`).value = getDateString(arrival, "yyyy-mm-dd");
			getID(`arrival-time-${j}`).value = getTimeStringFromDate(arrival);
		}

		getID(`transportation-type-${j}`).value = transport.type;
		const company = transport.company;
		if (company) {
			loadTransportationVisibility(j);
			if (getOptionsFromSelect(`company-select-${j}`).includes(company)) {
				getID(`company-select-${j}`).value = company;
			} else {
				getID(`company-select-${j}`).value = "other";
				getID(`company-${j}`).value = company;
				loadTransportationVisibility(j);
			}
		}

		getID(`transportation-id-${j}`).value = transport.id;
		getID(`transportation-duration-${j}`).value = transport.duration;
		getID(`reservation-transportation-${j}`).value = transport.reservation;
		getID(`point-departure-${j}`).value = transport.points.departure;
		getID(`point-arrival-${j}`).value = transport.points.arrival;
		getID(`transportation-link-${j}`).value = transport.link;

		updateTransportationTitle(j);
	}
	applyTransportationTypeVisualization();
}

function loadAccommodationData() {
	if (getState().modules.accommodations === true) {
		getID("accommodations-enabled").checked = true;
		getID("accommodations-enabled-content").style.display = "block";
		getID("accommodations-add-box").style.display = "block";
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
		getID(`reservation-accommodations-${j}`).value = accommodation.reservation || "";
		getID(`reservation-accommodations-link-${j}`).value = accommodation.link;

		setImageButtonLabel(j);
		loadCheckIn(accommodation, j);
		loadCheckOut(accommodation, j);
	}
}

async function loadDestinationsData() {
	if (
		getHTMLpage() === "edit-listing" ||
		getState().modules.destinations === true
	) {
		if (getID("destinations-enabled")) {
			getID("destinations-enabled").checked = true;
		}
		getID("destinations-enabled-content").style.display = "block";
		getID("no-destinations").style.display = "none";
		getID("has-destinations").style.display = "block";
	} else {
		getID("no-destinations").style.display = "block";
		getID("has-destinations").style.display = "none";
	}

	loadDestinations();
	const cards = document.querySelectorAll('#destinations-checkboxes .destination-card');
	for (const destination of getState().destinations) {
		const id = destination.destinationId;
		for (const card of cards) {
			if (card.getAttribute("data-destination-id") === id) {
				card.classList.add("selected");
				// Move to top of selected group
				const container = getID("destinations-checkboxes");
				container.prepend(card);
				break;
			}
		}
	}
	await loadActiveDestinations();
}

export function loadItineraryData() {
	if (getState().modules.itinerary === true) {
		getID("itinerary-enabled").checked = true;
		getID("itinerary-enabled-content").style.display = "block";
	}

	loadItinerarySchedule();

	let j = 1;
	while (getID(`itinerary-title-${j}`)) {
		const data = getState().schedules[j - 1];
		if (data?.data) {
			applyLoadedItineraryData(j, data);
		}
		j++;
	}
	updateActiveDestinationsCardsHTML("itinerary");
	setItineraryData(cloneObject(getState().schedules));
}

function loadGalleryData() {
	if (getState().modules.gallery === true) {
		getID("gallery-enabled").checked = true;
		getID("gallery-enabled-content").style.display = "block";
		getID("gallery-add-box").style.display = "block";
	}

	const gallerySize = getState().gallery?.images.length;
	if (gallerySize > 0) {
		for (let j = 1; j <= gallerySize; j++) {
			const i = j - 1;
			addGallery();

			const title = getState().gallery.titles[i];
			if (title) {
				getID(`gallery-title-${j}`).value = title;
				getID(`gallery-title-${j}`).innerText = title;
			}

			const category = getState().gallery.categories[i];
			if (category) {
				getID(`gallery-category-${j}`).value = category;
				updateValueDS(
					"gallery-category",
					category,
					`gallery-category-select-${j}`,
				);
				buildDS("gallery-category");
			}

			const description = getState().gallery.descriptions[i];
			if (description) {
				getID(`gallery-description-${j}`).value = description;
			}

			getID(`link-gallery-${j}`).value = getState().gallery.images[i];
		}
	}
}
