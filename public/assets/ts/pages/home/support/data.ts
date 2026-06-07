import { displayError } from '../../../utils/messages.js';
import { getUserData, registerIfUserNotPresent, setUserData, USER_DATA } from '../../../data/firebase/auth.js';
import { getCurrentTrips, getID, getLastUpdatedOnText, getNextTrips, getOrderedDocumentByUpdateDate, getPreviousTrips } from '../../../utils/dom.js';
import { translate, translatePage } from '../../../i18n/translation.js';
import { stopLoadingScreen } from '../../../utils/loading.js';
import { dateObjectToString } from '../../../utils/dates.js';
import { viewTrip, editTrip, viewDestination, editDestination, viewListing, editListing } from './navigation.js';

var INDEX_DATA: Record<string, any> = {};
var CURRENT_TRIPS: any[] = [];
var PREVIOUS_TRIPS: any[] = [];
var NEXT_TRIPS: any[] = [];
var ALL_TRIPS: any[] = []; // Merged for the unified trip view
var SELECTED_TRIP_ID: string | null = null;

export async function loadUserIndex() {
	try {
		firebase.auth().onAuthStateChanged(async (user) => {
			if (user) {
				registerIfUserNotPresent();
				showLoggedView();

			setUserData(await getUserData(user.uid));

				const displayName = USER_DATA.nome;
				const photoURL = USER_DATA.foto ? "url(" + USER_DATA.foto + ")" : "";

				getID("title-name").innerHTML = displayName.split(" ")[0];
				getID("greeting-avatar").style.backgroundImage = photoURL;
				getID("greeting-avatar").style.backgroundSize = "cover";

				getID("settings-user-name").innerHTML = displayName;
				getID("settings-avatar").style.backgroundImage = photoURL;
				getID("settings-avatar").style.backgroundSize = "cover";

				getID("profile-icon").style.backgroundImage = photoURL;
				getID("profile-icon").style.backgroundSize = "cover";

				INDEX_DATA = {
					viagens: USER_DATA.viagens || {},
					destinos: USER_DATA.destinos || {},
					listagens: USER_DATA.listagens || {},
				};

				CURRENT_TRIPS = getCurrentTrips(INDEX_DATA.viagens);
				PREVIOUS_TRIPS = getPreviousTrips(INDEX_DATA.viagens);
				NEXT_TRIPS = getNextTrips(INDEX_DATA.viagens);

				// Build ALL_TRIPS: current first, then next, then previous
				ALL_TRIPS = [
					...CURRENT_TRIPS.map(t => ({ ...t, category: "current" })),
					...NEXT_TRIPS.map(t => ({ ...t, category: "next" })),
					...PREVIOUS_TRIPS.map(t => ({ ...t, category: "past" })),
				];

				loadTripsTab();
				loadDestinationsTab();
				loadListsTab();
				translatePage();
			} else {
				showUnloggedView();
			}
		});
	} catch (error) {
		stopLoadingScreen();
		displayError(error);
		throw error;
	}
	stopLoadingScreen();
}

function showLoggedView() {
	getID("unlogged-view").style.display = "none";
	getID("logged-view").style.display = "block";
	getID("profile-icon").style.display = "flex";
}

function showUnloggedView() {
	getID("logged-view").style.display = "none";
	getID("unlogged-view").style.display = "block";
	getID("profile-icon").style.display = "none";
}

/*--------------------------------------------------------------
# Trips Tab
--------------------------------------------------------------*/
function loadTripsTab() {
	const grid = getID("trip-grid");
	const empty = getID("trips-empty");
	const count = getID("trips-count");

	if (ALL_TRIPS.length === 0) {
		grid.innerHTML = "";
		empty.style.display = "block";
		count.textContent = "";
		return;
	}
	empty.style.display = "none";
	count.textContent = ALL_TRIPS.length + " " + (ALL_TRIPS.length === 1 ? translate("trip.document") : translate("trip.document") + "s");

	let html = "";
	for (const trip of ALL_TRIPS) {
		const bgImage = getTripBackgroundImage(trip);
		const badgeClass = trip.category === "current" ? "badge-current" :
			trip.category === "next" ? "badge-next" : "badge-past";
		const badgeLabel = trip.category === "current" ? translate("index.active") :
			trip.category === "next" ? translate("index.upcoming") : translate("index.past");
		const dateStr = dateObjectToString(trip.inicio) + " – " + dateObjectToString(trip.fim);

		const imageHTML = bgImage
			? `<div class="trip-card-image" style="background-image: url('${bgImage}')"></div>`
			: `<div class="trip-card-image no-image"><i class="iconify card-image-icon" data-icon="tabler:plane-departure"></i></div>`;

		html += `
			<div class="trip-card" data-action="open-trip-dialog" data-trip-id="${trip.id}">
				<span class="trip-card-badge ${badgeClass}">${badgeLabel}</span>
				${imageHTML}
				<div class="trip-card-body">
					<div class="trip-card-title">${trip.titulo || translate("labels.no_title")}</div>
					<div class="trip-card-meta">
						<i class="iconify" data-icon="material-symbols:calendar-month" style="font-size:13px"></i>
						${dateStr}
					</div>
				</div>
			</div>`;
	}
	grid.innerHTML = html;
}

function getTripBackgroundImage(trip) {
	if (!trip.imagem || !trip.imagem.ativo) return null;
	return trip.imagem.background || trip.imagem.claro || trip.imagem.escuro || null;
}

/*--------------------------------------------------------------
# Trip Dialog
--------------------------------------------------------------*/
export function openTripDialog(tripId) {
	const trip = ALL_TRIPS.find(t => t.id === tripId);
	if (!trip) return;
	SELECTED_TRIP_ID = tripId;

	const dialog = getID("trip-dialog");
	const bgImage = getTripBackgroundImage(trip);

	// Image
	const imgDiv = getID("trip-dialog-image");
	if (bgImage) {
		imgDiv.style.backgroundImage = `url('${bgImage}')`;
		imgDiv.className = "dialog-image";
		imgDiv.innerHTML = "";
	} else {
		imgDiv.style.backgroundImage = "";
		imgDiv.className = "dialog-image no-image";
		imgDiv.innerHTML = `<i class="iconify dialog-image-icon" data-icon="tabler:plane-departure"></i>`;
	}

	// Title
	getID("trip-dialog-title").textContent = trip.titulo || translate("labels.no_title");

	// Badge
	const badge = getID("trip-dialog-badge");
	const badgeClass = trip.category === "current" ? "badge-current" :
		trip.category === "next" ? "badge-next" : "badge-past";
	const badgeLabel = trip.category === "current" ? translate("index.active") :
		trip.category === "next" ? translate("index.upcoming") : translate("index.past");
	badge.textContent = badgeLabel;
	badge.className = "dialog-badge " + badgeClass;

	// Dates
	getID("trip-dialog-dates").textContent = dateObjectToString(trip.inicio) + " – " + dateObjectToString(trip.fim);

	// Duration
	const durRow = getID("trip-dialog-duration-row");
	const duration = getTripDurationDays(trip);
	if (duration > 0) {
		durRow.style.display = "flex";
		getID("trip-dialog-duration").textContent = duration + " " + (duration === 1 ? translate("index.day") : translate("index.days"));
	} else {
		durRow.style.display = "none";
	}

	// Destinations
	const destRow = getID("trip-dialog-dest-row");
	const destCount = getTripDestinationCount(trip);
	if (destCount > 0) {
		destRow.style.display = "flex";
		getID("trip-dialog-dests").textContent = destCount + " " + translate("destination.title").toLowerCase();
	} else {
		destRow.style.display = "none";
	}

	// Modules
	const modulesDiv = getID("trip-dialog-modules");
	const moduleNames = {
		destinos: translate("destination.title"),
		hospedagens: translate("trip.accommodation.title"),
		transportes: translate("trip.transportation.title"),
		programacao: translate("trip.itinerary.title"),
		gastos: translate("trip.expenses.title"),
		galeria: translate("trip.gallery.title"),
		resumo: translate("labels.overview"),
	};
	let modulesHTML = "";
	if (trip.modulos) {
		for (const [key, active] of Object.entries(trip.modulos)) {
			if (active && moduleNames[key]) {
				modulesHTML += `<span class="module-pill">${moduleNames[key]}</span>`;
			}
		}
	}
	modulesDiv.innerHTML = modulesHTML || `<span class="module-pill">—</span>`;

	// Buttons
	getID("trip-dialog-view").onclick = function () { viewTrip(trip.id); };
	getID("trip-dialog-edit").onclick = function () { editTrip(trip.id); };

	// Show dialog with scroll lock
	dialog.style.display = "flex";
	document.body.classList.add("dialog-open");
}

export function closeTripDialog() {
	getID("trip-dialog").style.display = "none";
	document.body.classList.remove("dialog-open");
	SELECTED_TRIP_ID = null;
}

function getTripDurationDays(trip: Record<string, any>): number {
	if (!trip.inicio || !trip.fim) return 0;
	const start = new Date(trip.inicio.year, trip.inicio.month - 1, trip.inicio.day);
	const end = new Date(trip.fim.year, trip.fim.month - 1, trip.fim.day);
	return Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
}

function getTripDestinationCount(trip) {
	// This is a rough count — we don't have destinos linked at this level,
	// but we can check if the trip has destinos module active
	if (!trip.modulos || !trip.modulos.destinos) return 0;
	// Count destinations from USER_DATA that might be linked (if we had linkage)
	// For now, just indicate if destinations module is active
	return trip.modulos.destinos ? 1 : 0;
}

/*--------------------------------------------------------------
# Destinations Tab
--------------------------------------------------------------*/
export function loadDestinationsTab() {
	const grid = getID("dest-grid");
	const empty = getID("dest-empty");
	const count = getID("dests-count");
	const destinos = getOrderedDocumentByUpdateDate(INDEX_DATA.destinos);

	if (destinos.length === 0) {
		grid.innerHTML = "";
		empty.style.display = "block";
		count.textContent = "";
		return;
	}
	empty.style.display = "none";
	count.textContent = destinos.length + " " + (destinos.length === 1 ? translate("destination.document") : translate("destination.title"));

	let html = "";
	for (const dest of destinos) {
		const dateStr = getLastUpdatedOnText(dest.versao?.ultimaAtualizacao);
		html += `
			<div class="dest-card" data-action="open-dest-dialog" data-dest-id="${dest.id}">
				<div class="dest-card-image no-image">
					<i class="iconify card-image-icon" data-icon="material-symbols:location-on"></i>
				</div>
				<div class="dest-card-body">
					<div class="dest-card-title">${dest.titulo || translate("labels.no_title")}</div>
					<div class="dest-card-meta">
						<i class="iconify" data-icon="material-symbols:schedule" style="font-size:13px"></i>
						${dateStr}
					</div>
				</div>
			</div>`;
	}
	grid.innerHTML = html;
}

/*--------------------------------------------------------------
# Lists Tab
--------------------------------------------------------------*/
export function loadListsTab() {
	const grid = getID("list-grid");
	const empty = getID("lists-empty");
	const count = getID("lists-count");
	const listagens = getOrderedDocumentByUpdateDate(INDEX_DATA.listagens);

	if (listagens.length === 0) {
		grid.innerHTML = "";
		empty.style.display = "block";
		count.textContent = "";
		return;
	}
	empty.style.display = "none";
	count.textContent = listagens.length + " " + (listagens.length === 1 ? translate("listing.document") : translate("listing.title"));

	let html = "";
	for (const list of listagens) {
		const dateStr = getLastUpdatedOnText(list.versao?.ultimaAtualizacao);
		const bgImage = list.imagem?.ativo ? (list.imagem.background || list.imagem.claro || "") : "";
		const imageHTML = bgImage
			? `<div class="list-card-image" style="background-image: url('${bgImage}')"></div>`
			: `<div class="list-card-image no-image"><i class="iconify card-image-icon" data-icon="fluent:list-28-filled"></i></div>`;

		html += `
			<div class="list-card" data-action="open-list-dialog" data-list-id="${list.id}">
				${imageHTML}
				<div class="list-card-body">
					<div class="list-card-title">${list.titulo || translate("labels.no_title")}</div>
					<div class="list-card-meta">
						<i class="iconify" data-icon="material-symbols:schedule" style="font-size:13px"></i>
						${dateStr}
					</div>
				</div>
			</div>`;
	}
	grid.innerHTML = html;
}

/*--------------------------------------------------------------
# Destination Dialog
--------------------------------------------------------------*/
export function openDestDialog(destId) {
	const destinos = getOrderedDocumentByUpdateDate(INDEX_DATA.destinos);
	const dest = destinos.find(d => d.id === destId);
	if (!dest) return;

	getID("dest-dialog-title").textContent = dest.titulo || translate("labels.no_title");

	// Currency
	const currRow = getID("dest-dialog-currency-row");
	if (dest.moeda) {
		currRow.style.display = "flex";
		getID("dest-dialog-currency").textContent = translate("currency.title") + ": " + dest.moeda;
	} else {
		currRow.style.display = "none";
	}

	// Updated
	getID("dest-dialog-updated").textContent = getLastUpdatedOnText(dest.versao?.ultimaAtualizacao);

	// Buttons
	getID("dest-dialog-view").onclick = function () { closeDestDialog(); viewDestination(dest.id); };
	getID("dest-dialog-edit").onclick = function () { closeDestDialog(); editDestination(dest.id); };

	getID("dest-dialog").style.display = "flex";
	document.body.classList.add("dialog-open");
}

export function closeDestDialog() {
	getID("dest-dialog").style.display = "none";
	document.body.classList.remove("dialog-open");
}

/*--------------------------------------------------------------
# List Dialog
--------------------------------------------------------------*/
export function openListDialog(listId) {
	const listagens = getOrderedDocumentByUpdateDate(INDEX_DATA.listagens);
	const list = listagens.find(l => l.id === listId);
	if (!list) return;

	getID("list-dialog-title").textContent = list.titulo || translate("labels.no_title");

	// Subtitle
	const subRow = getID("list-dialog-subtitle-row");
	if (list.subtitulo) {
		subRow.style.display = "flex";
		getID("list-dialog-subtitle").textContent = list.subtitulo;
	} else {
		subRow.style.display = "none";
	}

	// Updated
	getID("list-dialog-updated").textContent = getLastUpdatedOnText(list.versao?.ultimaAtualizacao);

	// Image
	const imgDiv = getID("list-dialog-image");
	const bgImage = list.imagem?.ativo ? (list.imagem.background || list.imagem.claro || "") : "";
	if (bgImage) {
		imgDiv.style.backgroundImage = `url('${bgImage}')`;
		imgDiv.className = "dialog-image";
		imgDiv.innerHTML = "";
	} else {
		imgDiv.style.backgroundImage = "";
		imgDiv.className = "dialog-image no-image";
		imgDiv.innerHTML = `<i class="iconify dialog-image-icon" data-icon="fluent:list-28-filled"></i>`;
	}

	// Buttons
	getID("list-dialog-view").onclick = function () { closeListDialog(); viewListing(list.id); };
	getID("list-dialog-edit").onclick = function () { closeListDialog(); editListing(list.id); };

	getID("list-dialog").style.display = "flex";
	document.body.classList.add("dialog-open");
}

export function closeListDialog() {
	getID("list-dialog").style.display = "none";
	document.body.classList.remove("dialog-open");
}

/*--------------------------------------------------------------
# Dialog overlay click to close
--------------------------------------------------------------*/
document.addEventListener("click", function (e: MouseEvent) {
	const target = e.target as HTMLElement;
	if (target.classList.contains("dialog-overlay")) {
		if (target.id === "trip-dialog") closeTripDialog();
		if (target.id === "dest-dialog") closeDestDialog();
		if (target.id === "list-dialog") closeListDialog();
	}
});

document.addEventListener("keydown", function (e) {
	if (e.key === "Escape") {
		if (getID("trip-dialog").style.display === "flex") closeTripDialog();
		if (getID("dest-dialog").style.display === "flex") closeDestDialog();
		if (getID("list-dialog").style.display === "flex") closeListDialog();
	}
});
