import { getID } from '../../../utils/dom.js';
import { hasUnsavedChanges, reEdit, validateImageLink, validateLink } from '../../../ui/fields.js';
import { searchDestinationsListenerAction, closeModal } from '../../../theme/visibility.js';
import { translate } from '../../../i18n/translation.js';
import { getNextInputDay, getPreviousInputDay, inputDateToJsDate } from '../../../utils/dates.js';
import { addRemoveChildListenerDS } from '../../../ui/dynamic-select.js';
import { registerActions } from '../../../ui/actions.js';
import { registerActions as registerMessageActions } from '../../../utils/messages.js';
import { openTravelersInfo, saveTravelersInfo } from '../categories/travelers.js';
import { requestPinEditExpenses, reconfirmPin, validatePin } from '../categories/basic-data/protected-data.js';
import { deleteTrip, deleteTripAction, NEW_TRIP } from '../edit-trip.js';
import { DOCUMENT_ID, SUCCESSFUL_SAVE } from '../../../data/state.js';
import { openInnerExpense, deleteInnerExpense, saveInnerExpense } from '../categories/expenses.js';
import { openAttributions } from '../../../utils/attributions.js';
import { switchPin } from '../categories/basic-data/protected-data.js';
import { closeToast } from '../../../utils/messages.js';
import { openAccommodationImages, openInnerAccommodationImage, accommodationsAddListenerAction, closeInnerAccommodationImage, confirmAccommodationImages } from '../categories/accommodation.js';
import { galleryAddListenerAction } from '../categories/gallery.js';
import { reloadItinerary } from '../categories/itinerary-module/itinerary-module.js';
import { deleteInnerItinerary, openInnerItinerary, openInnerItineraryItem, openInnerItinerarySwap, closeInnerItinerary, innerItineraryConfirmAction } from "../categories/itinerary-module/inner-itinerary/inner-itinerary.js";
import { getVisibilityObject, setTripData } from "../set-trip.js";
import { autoFillDarkColor } from "../categories/customization.js";
import { applyTransportationTypeVisualization, transportationAddListenerAction } from "../categories/transportation.js";
import { getVisibility } from "../../../theme/theme.js";

// Loader
export function loadEventListeners() {
	// Register data-action handlers via the shared delegated handler (ui/actions.js)
	registerActions({
		saveTravelersInfo,
		reconfirmPin,
		validatePin,
		"open-travelers-info": () => openTravelersInfo(),
		"request-pin-expenses": () => requestPinEditExpenses(),
		"delete-trip": () => deleteTrip(),
		"open-inner-expense": (target) => {
			const category = target.getAttribute("data-category");
			if (category) openInnerExpense(category);
		},
		"open-attributions": () => openAttributions(),
		"close-modal": (target) => {
			const modalId = target.getAttribute("data-modal") || "delete-modal";
			closeModal(modalId);
		},
		"close-toast": () => closeToast(),
		"open-accommodation-images": (target) => {
			const index = parseInt(target.getAttribute("data-index"));
			if (!isNaN(index)) openAccommodationImages(index);
		},
		"open-inner-itinerary": (target) => {
			const index = parseInt(target.getAttribute("data-index"));
			if (!isNaN(index)) openInnerItinerary(index);
		},
		"open-inner-accommodation-image": (target) => {
			const index = parseInt(target.getAttribute("data-index"));
			if (!isNaN(index)) openInnerAccommodationImage(index);
		},
		"delete-inner-expense": (target) => {
			const category = target.getAttribute("data-category");
			const type = target.getAttribute("data-type");
			const index = parseInt(target.getAttribute("data-index"));
			if (category && type && !isNaN(index)) deleteInnerExpense(category, type, index);
		},
		"open-inner-itinerary-detail": (target) => {
			const j = parseInt(target.getAttribute("data-j"));
			const k = parseInt(target.getAttribute("data-k"));
			const period = target.getAttribute("data-period");
			if (!isNaN(j) && !isNaN(k) && period) openInnerItinerary(j, k, period);
		},
		"open-inner-itinerary-item": (target) => {
			const index = parseInt(target.getAttribute("data-index"));
			if (!isNaN(index)) openInnerItineraryItem(index);
		},
		"open-inner-itinerary-swap": () => openInnerItinerarySwap(),
		"delete-inner-itinerary": (target) => {
			const j = parseInt(target.getAttribute("data-j"));
			const k = parseInt(target.getAttribute("data-k"));
			const period = target.getAttribute("data-period");
			if (!isNaN(j) && !isNaN(k) && period) deleteInnerItinerary(j, k, period);
		},
	});

	// Register string-based button actions used in modals (via messages.js _actionRegistry)
	registerMessageActions({
		saveTravelersInfo,
		reconfirmPin,
		validatePin,
		deleteTripAction,
		closeInnerAccommodationImage,
		confirmAccommodationImages,
		saveInnerExpense,
		closeInnerItinerary,
		innerItineraryConfirmAction,
	});

	// Inputs
	getID("start").addEventListener("change", () => startListenerAction());
	getID("end").addEventListener("change", () => endListenerAction());

	// Buttons
	getID("save-btn").addEventListener("click", () => setTripData());
	getID("re-edit").addEventListener("click", () =>
		reEdit("trips", SUCCESSFUL_SAVE),
	);
	getID("preview").addEventListener("click", () =>
		visualizarListenerAction(),
	);
	getID("home").addEventListener(
		"click",
		() => (window.location.href = "../index.html"),
	);
	getID("home").addEventListener(
		"click",
		() => (window.location.href = "../index.html"),
	);
	getID("cancel-btn").addEventListener(
		"click",
		() => (window.location.href = "../index.html"),
	);
	getID("transportation-add").addEventListener("click", () =>
		transportationAddListenerAction(),
	);
	getID("accommodation-add").addEventListener("click", () =>
		accommodationsAddListenerAction(),
	);
	getID("gallery-add").addEventListener("click", () =>
		galleryAddListenerAction(),
	);
	getID("pin-disabled").addEventListener("click", switchPin);
	getID("pin-sensitive-only").addEventListener("click", switchPin);
	getID("pin-all-data").addEventListener("click", switchPin);
	getID("light-color").addEventListener("change", () => autoFillDarkColor());

	// Visibility do Ida e Volta (Transporte)
	getID("simple-view").addEventListener("change", () =>
		applyTransportationTypeVisualization(),
	);
	getID("leg-view").addEventListener("change", () =>
		applyTransportationTypeVisualization(),
	);
	getID("people-view").addEventListener("change", () =>
		applyTransportationTypeVisualization(),
	);

	// Image Validation in Customization module
	getID("link-background").addEventListener("change", () =>
		validateImageLink("link-background"),
	);
	getID("link-logo-light").addEventListener("change", () =>
		validateImageLink("link-logo-light"),
	);
	getID("link-logo-dark").addEventListener("change", () =>
		validateImageLink("link-logo-dark"),
	);

	// Link Validation in Customization module
	getID("link-attachments").addEventListener("change", () =>
		validateLink("link-attachments"),
	);
	getID("link-drive").addEventListener("change", () =>
		validateLink("link-drive"),
	);
	getID("link-maps").addEventListener("change", () =>
		validateLink("link-maps"),
	);
	getID("link-pdf").addEventListener("change", () => validateLink("link-pdf"));
	getID("link-ppt").addEventListener("change", () => validateLink("link-ppt"));
	getID("link-sheet").addEventListener("change", () =>
		validateLink("link-sheet"),
	);
	getID("link-vaccine").addEventListener("change", () =>
		validateLink("link-vaccine"),
	);

	// Barra de pesquisa em destinations
	getID("destinations-search").addEventListener("input", () =>
		searchDestinationsListenerAction(),
	);

	// Radios
	getID("dark-and-light").addEventListener("change", () =>
		visibilityListenerAction(),
	);
	getID("light-exclusive").addEventListener("change", () =>
		visibilityListenerAction(),
	);
	getID("dark-exclusive").addEventListener("change", () =>
		visibilityListenerAction(),
	);

	window.addEventListener("beforeunload", (event) => {
		if (hasUnsavedChanges() && !SUCCESSFUL_SAVE) {
			event.preventDefault();
			event.returnValue = translate("messages.exit_confirmation");
		}
	});
}

// Actions
function startListenerAction() {
	const startDiv = getID("start");
	const endDiv = getID("end");

	const start = startDiv.value;
	const end = endDiv.value;

	if (
		NEW_TRIP ||
		!end ||
		inputDateToJsDate(end).getTime() < inputDateToJsDate(start).getTime()
	) {
		endDiv.value = getNextInputDay(start);
	}

	reloadItinerary();
}

function endListenerAction() {
	const startDiv = getID("start");
	const endDiv = getID("end");

	const start = startDiv.value;
	const end = endDiv.value;

	if (
		!start ||
		inputDateToJsDate(end).getTime() < inputDateToJsDate(start).getTime()
	) {
		startDiv.value = getPreviousInputDay(end);
	}

	reloadItinerary();
}

function visualizarListenerAction() {
	if (DOCUMENT_ID) {
		window.open(
			`../view.html?t=${DOCUMENT_ID}&visibility=${getVisibility()}`,
			"_blank",
		);
	} else {
		window.location.href = "../index.html";
	}
}

export function addRemoveTransportationListener(j) {
	const dynamicSelects = [
		{
			type: "transportation-person",
			selectID: `transportation-person-select-${j}`,
		},
	];
	addRemoveChildListenerDS("transportation", j, dynamicSelects);
}

export function addRemoveGalleryListener(j) {
	const dynamicSelects = [
		{
			type: "gallery-category",
			selectID: `gallery-category-select-${j}`,
		},
	];
	addRemoveChildListenerDS("gallery", j, dynamicSelects);
}

export function visibilityListenerAction(visibility?) {
	if (!visibility) {
		visibility = getVisibilityObject();
	}

	getID("light-theme").style.display = visibility.light ? "block" : "none";
	getID("dark-theme").style.display = visibility.dark ? "block" : "none";
}
