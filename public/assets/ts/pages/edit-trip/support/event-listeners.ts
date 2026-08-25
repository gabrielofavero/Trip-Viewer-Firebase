import { getID } from '../../../utils/dom.js';
import { hasUnsavedChanges, validateImageLink, validateLink } from '../../../ui/fields.js';
import { searchDestinationsListenerAction } from '../../../theme/visibility.js';
import { translate } from '../../../i18n/translation.js';
import { getNextInputDay, getPreviousInputDay, inputDateToJsDate } from '../../../utils/dates.js';
import { addRemoveChildListenerDS } from '../../../ui/dynamic-select.js';
import { registerActions } from '../../../ui/actions.js';
import { registerActions as registerMessageActions } from '../../../utils/messages.js';
import { openTravelersInfo, saveTravelersInfo } from '../categories/travelers.js';
import { openImagePicker, refreshImagePickers } from '../categories/wallpaper-import.js';
import {
	requestPinEditExpenses,
	reconfirmPin,
	validatePin,
} from '../categories/basic-data/protected-data.js';
import { deleteTrip, deleteTripAction, NEW_TRIP } from '../edit-trip.js';
import { SUCCESSFUL_SAVE } from '../../../data/state.js';
import { openInnerExpense, deleteInnerExpense, saveInnerExpense } from '../categories/expenses.js';
import { openAttributions } from '../../../utils/attributions.js';
import { switchPin } from '../categories/basic-data/protected-data.js';
import { closeToast } from '../../../utils/messages.js';
import {
	openAccommodationImages,
	openAccommodationImage,
	closeAccommodationImages,
	removeAccommodationImage,
	accommodationsAddListenerAction,
	confirmAccommodationImages,
} from '../categories/accommodation.js';
import {
	openAccommodationImport,
	refreshAccommodationImportButtons,
} from '../categories/accommodation-import.js';
import {
	openTransportationImport,
	refreshTransportationImportButtons,
} from '../categories/transportation-import.js';
import { galleryAddListenerAction } from '../categories/gallery.js';
import { reloadItinerary } from '../categories/itinerary-module/itinerary-module.js';
import {
	deleteInnerItinerary,
	openInnerItinerary,
	openInnerItineraryItem,
	openInnerItinerarySwap,
	closeInnerItinerary,
	innerItineraryConfirmAction,
} from '../categories/itinerary-module/inner-itinerary/inner-itinerary.js';
import { setTripData } from '../set-trip.js';
import { autoFillDarkColor } from '../categories/customization.js';
import {
	applyTransportationTypeVisualization,
	transportationAddListenerAction,
} from '../categories/transportation.js';

// Loader
export function loadEventListeners() {
	// Register data-action handlers via the shared delegated handler (ui/actions.js)
	registerActions({
		saveTravelersInfo,
		reconfirmPin,
		validatePin,
		'open-travelers-info': () => openTravelersInfo(),
		'open-image-picker': (target) => {
			const type = target.getAttribute('data-type');
			if (type) openImagePicker(type);
		},
		'request-pin-expenses': () => requestPinEditExpenses(),
		'delete-trip': () => deleteTrip(),
		'open-inner-expense': (target) => {
			const category = target.getAttribute('data-category');
			if (category) openInnerExpense(category);
		},
		'open-attributions': () => openAttributions(),
		'close-toast': () => closeToast(),
		'open-accommodation-images': (target) => {
			const index = parseInt(target.getAttribute('data-index'));
			if (!isNaN(index)) openAccommodationImages(index);
		},
		'open-accommodation-import': (target) => {
			const index = parseInt(target.getAttribute('data-index'));
			if (!isNaN(index)) openAccommodationImport(index);
		},
		'open-transportation-import': (target) => {
			const index = parseInt(target.getAttribute('data-index'));
			if (!isNaN(index)) openTransportationImport(index);
		},
		'open-inner-itinerary': (target) => {
			const index = parseInt(target.getAttribute('data-index'));
			if (!isNaN(index)) openInnerItinerary(index);
		},
		'open-accommodation-image': (target) => {
			const index = parseInt(target.getAttribute('data-index'));
			if (!isNaN(index)) openAccommodationImage(index);
		},
		'remove-accommodation-image': (target) => {
			const index = parseInt(target.getAttribute('data-index'));
			if (!isNaN(index)) removeAccommodationImage(index);
		},
		'delete-inner-expense': (target) => {
			const category = target.getAttribute('data-category');
			const type = target.getAttribute('data-type');
			const index = parseInt(target.getAttribute('data-index'));
			if (category && type && !isNaN(index)) deleteInnerExpense(category, type, index);
		},
		'open-inner-itinerary-detail': (target) => {
			const j = parseInt(target.getAttribute('data-j'));
			const k = parseInt(target.getAttribute('data-k'));
			const period = target.getAttribute('data-period');
			if (!isNaN(j) && !isNaN(k) && period) openInnerItinerary(j, k, period);
		},
		'open-inner-itinerary-item': (target) => {
			const index = parseInt(target.getAttribute('data-index'));
			if (!isNaN(index)) openInnerItineraryItem(index);
		},
		'open-inner-itinerary-swap': () => openInnerItinerarySwap(),
		'delete-inner-itinerary': (target) => {
			const j = parseInt(target.getAttribute('data-j'));
			const k = parseInt(target.getAttribute('data-k'));
			const period = target.getAttribute('data-period');
			if (!isNaN(j) && !isNaN(k) && period) deleteInnerItinerary(j, k, period);
		},
	});

	// Register string-based button actions used in modals (via messages.js _actionRegistry)
	registerMessageActions({
		saveTravelersInfo,
		reconfirmPin,
		validatePin,
		deleteTripAction,
		confirmAccommodationImages,
		closeAccommodationImages,
		saveInnerExpense,
		closeInnerItinerary,
		innerItineraryConfirmAction,
	});

	// Inputs
	getID('start').addEventListener('change', () => startListenerAction());
	getID('end').addEventListener('change', () => endListenerAction());

	// Buttons
	getID('save-btn').addEventListener('click', () => setTripData());
	getID('cancel-btn').addEventListener('click', () => (window.location.href = '../index.html'));
	getID('transportation-add').addEventListener('click', () => {
		transportationAddListenerAction();
		refreshTransportationImportButtons();
	});
	getID('accommodation-add').addEventListener('click', () => {
		accommodationsAddListenerAction();
		void refreshAccommodationImportButtons();
	});
	getID('gallery-add').addEventListener('click', () => galleryAddListenerAction());
	getID('pin-disabled').addEventListener('click', switchPin);
	getID('pin-sensitive-only').addEventListener('click', switchPin);
	getID('pin-all-data').addEventListener('click', switchPin);
	getID('light-color').addEventListener('change', () => autoFillDarkColor());

	// Visibility do Ida e Volta (Transporte)
	getID('simple-view').addEventListener('change', refreshTransportationView);
	getID('leg-view').addEventListener('change', refreshTransportationView);
	getID('people-view').addEventListener('change', refreshTransportationView);
	getID('transportation-box').addEventListener('change', () =>
		refreshTransportationImportButtons(),
	);

	// Image Validation in Customization module
	getID('link-background').addEventListener('change', () => validateImageLink('link-background'));
	getID('link-logo-light').addEventListener('change', () => validateImageLink('link-logo-light'));
	getID('link-logo-dark').addEventListener('change', () => validateImageLink('link-logo-dark'));

	// Link Validation in Customization module
	getID('link-attachments').addEventListener('change', () => validateLink('link-attachments'));
	getID('link-drive').addEventListener('change', () => validateLink('link-drive'));
	getID('link-maps').addEventListener('change', () => validateLink('link-maps'));
	getID('link-pdf').addEventListener('change', () => validateLink('link-pdf'));
	getID('link-ppt').addEventListener('change', () => validateLink('link-ppt'));
	getID('link-sheet').addEventListener('change', () => validateLink('link-sheet'));
	getID('link-vaccine').addEventListener('change', () => validateLink('link-vaccine'));

	// Barra de pesquisa em destinations
	getID('destinations-search').addEventListener('input', () => searchDestinationsListenerAction());

	// Render the wallpaper/logo picker cards (values are set for existing
	// trips; the destination-changed event handles mid-edit changes).
	refreshImagePickers();
	void refreshAccommodationImportButtons();
	refreshTransportationImportButtons();

	window.addEventListener('beforeunload', (event) => {
		if (hasUnsavedChanges() && !SUCCESSFUL_SAVE) {
			event.preventDefault();
			event.returnValue = translate('messages.exit_confirmation');
		}
	});
}

function refreshTransportationView() {
	applyTransportationTypeVisualization();
	refreshTransportationImportButtons();
}

// Actions
function startListenerAction() {
	const startDiv = getID('start');
	const endDiv = getID('end');

	const start = startDiv.value;
	const end = endDiv.value;

	if (NEW_TRIP || !end || inputDateToJsDate(end).getTime() < inputDateToJsDate(start).getTime()) {
		endDiv.value = getNextInputDay(start);
	}

	reloadItinerary();
}

function endListenerAction() {
	const startDiv = getID('start');
	const endDiv = getID('end');

	const start = startDiv.value;
	const end = endDiv.value;

	if (!start || inputDateToJsDate(end).getTime() < inputDateToJsDate(start).getTime()) {
		startDiv.value = getPreviousInputDay(end);
	}

	reloadItinerary();
}

export function addRemoveTransportationListener(j) {
	addRemoveChildListenerDS('transportation', j);
}

export function addRemoveGalleryListener(j) {
	const dynamicSelects = [
		{
			type: 'gallery-category',
			selectID: `gallery-category-select-${j}`,
		},
	];
	addRemoveChildListenerDS('gallery', j, dynamicSelects);
}
