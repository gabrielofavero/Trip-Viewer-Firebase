import { startLoadingTimer, stopLoadingScreen } from '../../utils/loading.js';
import { closeMessage, displayError, MESSAGE_MODAL_OPEN, registerActions } from '../../utils/messages.js';
import { getState, setState, TRAVELERS, DOCUMENT_ID, DESTINATIONS, setDocumentId, setDestinations } from '../../data/state.js';
import { getErrorFromGetRequestMessage, getID, getLastUpdatedOnText, getURLParam, getURLParams } from '../../utils/dom.js';
import { getSingleData, getTripComplete, haveErrorFromGetRequest, COLLECTION } from '../../data/firebase/database.js';
import { isOnDarkMode, loadVisibility, LOGO_LIGHT, LOGO_DARK, setLogoLight, setLogoDark } from '../../theme/visibility.js';
import { loadCloseCustomSelectListeners } from '../../ui/custom-select.js';
import { convertFromDateObject } from '../../utils/dates.js';
import { getPageURL, setPageName } from '../../app/main.js';
import { translate } from '../../i18n/translation.js';
import { loadViewListeners } from './support/event-listeners.js';
import { adjustCardsHeights, adjustCardsHeightsListener, loadViewVisibility, mainView } from "./support/visibility.js";
import { loadViewEmbed, openExpensesEmbed } from "./support/embed.js";
import { loadSensitiveReservations, requestDocumentPin, protectedDataConfirmAction } from "./support/sensitive-reservation.js";
import { adjustDestinationsHTML, loadDestinations, loadDestinationsCustomSelect, loadDestinationsHTML } from "./categories/destination.js";
import { adjustPortfolioHeight, loadGallery, refreshCategorias } from "./categories/gallery.js";
import { loadSummary } from "./categories/summary.js";
import { loadTransportation } from "./categories/transportation-module.js";
import { loadAccommodations } from "./categories/accommodation-module.js";
import { loadItinerarySchedule } from "./categories/itinerary-module/itinerary-module.js";
import { ACTIVE_EMBEDS } from './support/embed.js';

var REFRESHED = false;
export var TYPE = "trips";
export var START_DATE = {
	date: null,
	text: "",
};

export var END_DATE = {
	date: null,
	text: "",
};

/**
 * Normalize viewMode values from Firestore (which may be "simple"/"leg" after
 * migration 13) to the hyphenated format expected by the transportation module
 * ("simple-view"/"leg-view"/"people-view").
 */
function normalizeTransportViewMode(raw: string): string {
	switch (raw) {
		case "simple": return "simple-view";
		case "leg": return "leg-view";
		case "people": return "people-view";
		default: return raw || "simple-view";
	}
}

document.addEventListener("DOMContentLoaded", async function () {
	try {
		startLoadingTimer();
		mainView();
	} catch (error) {
		displayError(error);
		throw error;
	}
});

export async function loadViewPage() {
	loadViewListeners();

	// Register string-based button actions used in PIN modals
	registerActions({ protectedDataConfirmAction });

	const urlParams = getURLParams();
	TYPE = urlParams["l"] ? "listings" : urlParams["d"] ? "destinations" : "trips";
	setDocumentId(urlParams["l"] || urlParams["d"] || urlParams["t"]);

	window.addEventListener("scroll", () => {
		if (window.scrollY > 0) {
			if (!REFRESHED) {
				refreshCategorias();
				REFRESHED = true;
			}
		} else {
			REFRESHED = false;
		}
	});

	let firestoreData;

	if (TYPE === COLLECTION.TRIPS) {
		const tripId = getURLParam("t");
		firestoreData = await getTripComplete(tripId);
	} else {
		firestoreData = await getSingleData(TYPE);
	}

	if (haveErrorFromGetRequest()) {
		displayError(getErrorFromGetRequestMessage(), true);
		stopLoadingScreen();
		return;
	}

	if (!haveErrorFromGetRequest()) {
		// Keep a ref to raw data before normalization for dev tools
		const rawFirestoreData = structuredClone(firestoreData);

		// Normalize transportation data from subcollection format to module-expected format
		if (firestoreData?.transportation) {
			// Also handle the legacy embedded format { viewMode, data } from the trip doc
			// (used as fallback when subcollection migration hasn't run yet)
			const rawViewMode: string =
				firestoreData.transportation.settings?.viewMode ||
				firestoreData.transportation.viewMode ||
				"simple";
			const rawData: any[] =
				firestoreData.transportation.legs ||
				firestoreData.transportation.data ||
				[];

			firestoreData.transportation = {
				viewMode: normalizeTransportViewMode(rawViewMode),
				data: rawData,
			};
		}

		if (firestoreData.pin === "all-data") {
			loadProtectedData(firestoreData, rawFirestoreData);
		} else {
			setFirestoreData(firestoreData, rawFirestoreData);
		}
	}
}

async function syncModules() {
	try {
		// Loading Screen
		stopLoadingScreen();
		adjustDestinationsHTML();
	} catch (error) {
		displayError(error);
		throw error;
	}
}

function prepareViewData() {
	if (getState().start && getState().end) {
		loadStartEnd();
	}

	loadVisibility();
	adjustCardsHeightsListener();
	loadCloseCustomSelectListeners();

	loadHeader();
	loadModules();
	loadViewEmbed();
}

function loadStartEnd(data = getState()) {
	START_DATE.date = convertFromDateObject(data.start);
	END_DATE.date = convertFromDateObject(data.end);

	START_DATE.text = `${data.start.day}/${data.start.month}`;
	END_DATE.text = `${data.end.day}/${data.end.month}`;
}

function loadHeader() {
	loadTitle();

	if (TYPE == "destinations" && getState().version?.lastUpdated) {
		getID("hero-subtitle").innerHTML = getLastUpdatedOnText(
			getState().version.lastUpdated,
		);
	}

	if (getState()?.version.showInDestinations) {
		let dates = [new Date(getState().version.lastUpdated)];

		for (const destination of getState().destinations) {
			const lastUpdated = destination.destinations.version.lastUpdated;
			if (lastUpdated) {
				dates.push(new Date(lastUpdated));
			}
		}

		const mostRecentDate = dates.reduce((a, b) => (a > b ? a : b));
		getID("destinations-update").innerHTML = getLastUpdatedOnText(mostRecentDate);
	}

	if (getState().description) {
		getID("destinations-description").innerHTML = getState().description;
		getID("destinations-description").style.display = "block";
	}

	if (getState().links?.active) {
		getID("social-links").style.display = "block";

		if (getState().links.attachments) {
			getID("attachmentsLink").href = getState().links.attachments;
		} else {
			getID("attachmentsLink").style.display = "none";
		}

		if (getState().links.sheet) {
			getID("sheetLink").href = getState().links.sheet;
		} else {
			getID("sheetLink").style.display = "none";
		}

		if (getState().links.ppt) {
			getID("pptLink").href = getState().links.ppt;
		} else {
			getID("pptLink").style.display = "none";
		}

		if (getState().links.drive) {
			getID("driveLink").href = getState().links.drive;
		} else {
			getID("driveLink").style.display = "none";
		}

		if (getState().links.vaccine) {
			getID("vaccineLink").href = getState().links.vaccine;
		} else {
			getID("vaccineLink").style.display = "none";
		}

		if (getState().links.pdf) {
			getID("pdfLink").href = getState().links.pdf;
		} else {
			getID("pdfLink").style.display = "none";
		}

		if (getState().links.maps) {
			getID("mapsLink").href = getState().links.maps;
		} else {
			getID("mapsLink").style.display = "none";
		}
	}

	loadHeaderImageAndLogo();
}

function loadTitle(data = getState()) {
	setPageName(data.title);
	getID("header1").innerHTML = data.title;
	getID("header2").style.display = "none";

	if (data.subtitle) {
		getID("hero-subtitle").innerHTML = data.subtitle;
	}
}

function loadHeaderImageAndLogo(data = getState()) {
	if (data.image?.active) {
		const background = data.image.background;
		const light = data.image.light;
		const dark = data.image.dark;

		if (background) {
			var hero = getID("hero");
			hero.style.background = 'url("' + background + '") top center no-repeat';
			hero.style.backgroundSize = "cover";
		}

		if (light) {
			setLogoLight(light);
			if (dark) {
				setLogoDark(dark);
			} else {
				setLogoDark(LOGO_LIGHT);
			}

			getID("header2").src = isOnDarkMode() ? LOGO_DARK : LOGO_LIGHT;
			getID("header1").style.display = "none";
			getID("header2").style.display = "block";
			document.querySelectorAll(".header-text").forEach((element) => {
				(element as HTMLElement).style.textAlign = "center";
			});
		}
	}
}

function loadModules() {
	loadSharingModule();
	loadSummaryModule();
	loadExpensesModule();
	loadTransportationModule();
	loadAccommodationsModule();
	loadItineraryScheduleModule();
	loadDestinationsModule();
	loadGalleryModule();

	function loadSharingModule() {
		const share = getID("share");
		if (navigator.share && window.location.hostname != "localhost") {
			share.addEventListener("click", () => {
				shareTrip();
			});
		} else {
			share.style.display = "none";
		}

		function shareTrip() {
			const title = getState().title || document.title;
			const text = getSharingText();
			const url = getPageURL();
			navigator.share({ title, text, url });
		}

		function getSharingText() {
			switch (TYPE) {
				case "listings":
					return translate("listing.share", { name: getState().title });
				case "destinations":
					return translate("destination.share", {
						name: getState().title,
					});
				case "trip":
				case "trips":
					return translate("trip.share", {
						name: getState().title,
						start: START_DATE.text,
						end: END_DATE.text,
					});
				default:
					return translate("messages.share");
			}
		}
	}

	function loadSummaryModule() {
		if (getState().modules?.summary === true) {
			loadSummary();
		} else {
			getID("keypointsNav").innerHTML = "";
			getID("keypoints").innerHTML = "";
			getID("keypoints").style.display = "none";
		}
	}

	function loadExpensesModule() {
		const active = getState().modules?.expenses === true;
		localStorage.setItem(
			"expenses",
			JSON.stringify({ active, pin: getState().pin || "no-pin" }),
		);

		if (active) {
			openExpensesEmbed();
			ACTIVE_EMBEDS["expenses"] = true;
		} else {
			getID("expensesNav").innerHTML = "";
			getID("expenses").innerHTML = "";
			getID("expenses").style.display = "none";
		}
	}

	function loadTransportationModule() {
		if (getState().modules?.transportation === true) {
			loadTransportation();
		} else {
			getID("transportationNav").innerHTML = "";
			getID("transportation").innerHTML = "";
			getID("transportation").style.display = "none";
		}
	}

	function loadAccommodationsModule() {
		if (getState().modules?.accommodations === true) {
			loadAccommodations();
		} else {
			getID("stayNav").innerHTML = "";
			getID("stay").innerHTML = "";
			getID("stay").style.display = "none";
		}
	}

	function loadItineraryScheduleModule() {
		if (getState().modules?.itinerary === true) {
			loadItinerarySchedule();
		} else {
			getID("scheduleCalendarNav").innerHTML = "";
			getID("scheduleCalendar").innerHTML = "";
			getID("scheduleCalendar").style.display = "none";
		}
	}

	function loadDestinationsModule() {
		switch (TYPE) {
			case "trips":
				if (
					getState().modules?.destinations === true &&
					getState().destinations?.length > 0
				) {
					loadDestinationsDefault();
				} else {
					disableDestinations();
				}
				break;
			case "listings":
				loadDestinationsDefault();
				break;
			case "destinations":
				loadDestinationsExclusive();
				break;
		}

		function loadDestinationsDefault() {
			loadDestinationsCustomSelect();
			loadDestinationsHTML(DESTINATIONS[0]);

			if (DESTINATIONS.length === 1) {
				setUniqueDestinationText();
				ACTIVE_DESTINATION = DESTINATIONS[0].id.toLowerCase();
			}

			loadDestinations();
		}

		function loadDestinationsExclusive() {
			const id = getURLParam("d");
			const destinations = getState();

			setDestinations([{ id, destinations }]);
			ACTIVE_DESTINATION = id.toLowerCase();

			getID("destinations-select").style.display = "none";

			setUniqueDestinationText();
			loadDestinationsHTML(DESTINATIONS[0]);

			loadDestinations();
		}

		function disableDestinations() {
		getID("destinations").style.display = "none";
		getID("destinationsNav").innerHTML = "";
		}

		function setUniqueDestinationText() {
			const title = DESTINATIONS[0].destinations.title;
		getID("destinations-title").innerHTML = title;
		getID("destinationsNavText").innerHTML = title;
		}
	}

	function loadGalleryModule() {
		if (getState().modules?.gallery === true) {
			loadGallery();
		} else {
			getID("portfolioM").innerHTML = "";
			getID("portfolio").style.display = "none";
		}
	}
}

/** Populate dev.page.* with useful references (only on localhost). */
function populateDevPage(rawFirestoreData?: any) {
	const dev = (window as any).dev;
	if (!dev?.isEnabled) return;
	const page = dev.page;

	page.type = TYPE;
	page.docId = DOCUMENT_ID;
	page.startDate = START_DATE;
	page.endDate = END_DATE;
	page.state = { get: getState };
	page.modules = () => getState().modules;
	page.travelers = TRAVELERS;
	page.destinations = DESTINATIONS;
	page.pin = () => getState().pin;
	page.title = () => getState().title;
	page.raw = rawFirestoreData;
	page.activeEmbeds = ACTIVE_EMBEDS;

	console.log("%c[DEV]%c dev.page populated — type %cdev.page%c to explore",
		"color:#f0c040;font-weight:bold;", "", "font-weight:bold;", "");
}

export function setFirestoreData(firestoreData, rawFirestoreData?: any) {
	setState(firestoreData);
	populateDevPage(rawFirestoreData);
	console.log("Firestore Database data loaded successfully");
	loadDocumentData();
}

function loadDocumentData() {
	prepareViewData();
	syncModules();
	loadViewVisibility();
	adjustPortfolioHeight();
	refreshCategorias();

	if (getState().pin == "sensitive-only") {
		loadSensitiveReservations();
	}

	$("body").css("overflow", "auto");

	if (!MESSAGE_MODAL_OPEN) {
		setTimeout(() => {
			adjustCardsHeights();
			adjustPortfolioHeight();
			refreshCategorias();
		}, 1000);
	}
}

function loadProtectedData(firestoreData, rawFirestoreData?: any) {
	loadTitle(firestoreData);
	loadStartEnd(firestoreData);
	loadHeaderImageAndLogo(firestoreData);
	loadVisibility(firestoreData.colors);
	populateDevPage(rawFirestoreData);
	requestDocumentPin();
}
