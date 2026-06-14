import { startLoadingScreen, stopLoadingScreen } from '../../utils/loading.js';
import { setState, DOCUMENT_ID, DESTINATIONS, SUCCESSFUL_SAVE, setDocumentId, setDestinations, setSuccessfulSaveFn } from '../../data/state.js';
import { getDateTitle, getTodayFormatted, getTomorrowFormatted, jsDateToKey } from '../../utils/dates.js';
import { cloneObject, getID, getOrderedDocumentByTitle, getURLParam } from '../../utils/dom.js';
import { deleteUserObjectDB, getPermissoes, getSingleData, getTripDataWithDestinations, get, deleteDocument } from '../../data/firebase/database.js';
import { loadDraggablesWithAccordions } from '../../ui/sortable.js';
import { newDynamicSelect } from '../../ui/dynamic-select.js';
import { getUserData, setUserData, USER_DATA } from '../../data/firebase/auth.js';
import { deleteUserObjectStorage, loadImageSelector, loadLogoSelector } from '../../data/firebase/storage.js';
import { snapshotFormState } from '../../ui/fields.js';
import { loadEditModule } from '../../theme/visibility.js';
import { translate } from '../../i18n/translation.js';
import { displayFullMessage, MESSAGE_PROPERTIES } from '../../utils/messages.js';
import { loadPinData, PIN } from './categories/basic-data/protected-data.js';
import { DATAS, loadNewTrip, addTransportation, addHospedagens, loadDestinations, addGaleria, loadItinerarySchedule } from './new-trip.js';
import { loadTripData } from './existing-trip.js';
import { loadEventListeners } from './support/event-listeners.js';
import { loadVisibilityIndex } from '../home/support/visibility.js';
import { loadUploadSelector } from "../../data/firebase/storage.js";
import { initEditTabs } from "../../ui/edit-tabs.js";
import { DateRangePicker } from "../../ui/date-range-picker.js";
import { enhanceAllColorPickers } from "../../ui/color-picker-hex.js";

var PERMISSOES;
export var FIRESTORE_PROTECTED_DATA: Record<string, any> = {};
export var FIRESTORE_GASTOS_DATA: Record<string, any> = {};
export function setGastosData(val: any) { FIRESTORE_GASTOS_DATA = val; }

export function setSuccessfulSave(val) { setSuccessfulSaveFn(val); }
var NEW_TRIP = false;

const TODAY = getTodayFormatted();
const TOMORROW = getTomorrowFormatted();

startLoadingScreen();

export async function loadEditTripPage() {
	setDocumentId(getURLParam("v"));
	PERMISSOES = await getPermissoes();

	loadVisibilityIndex();
	initEditTabs();
	loadHabilitados();
	loadDraggablesWithAccordions(["transporte", "hospedagens"]);
	newDynamicSelect("galeria-categoria");
	newDynamicSelect("transporte-pessoa");

	setUserData(await getUserData());
	setDestinations(getOrderedDocumentByTitle(USER_DATA.destinos));

	if (DOCUMENT_ID) {
		await loadTrip(true);
	} else {
		NEW_TRIP = true;
		loadNewTrip();
	}

	loadImageSelector("background");
	loadLogoSelector();

	loadEventListeners();
	stopLoadingScreen();
	snapshotFormState();

	// Initialize enhanced UI components
	initDateRangePickers();
	enhanceAllColorPickers();

	$("body").css("overflow", "auto");
}

function loadHabilitados() {
	loadEditModule("imagens");
	loadEditModule("cores");
	loadEditModule("links");
	loadEditModule("gastos");
	loadEditModule("transporte", addTransportation);
	loadEditModule("hospedagens", addHospedagens);
	loadEditModule("programacao", loadItinerarySchedule);
	loadEditModule("destinos", loadDestinations);
	loadEditModule("galeria", addGaleria);
}

function loadUploadSelectors() {
	loadUploadSelector("background");
	loadUploadSelector("logo");
}

async function loadTrip(stripped = false) {
	getID("delete-text").style.display = "block";
	startLoadingScreen();

	await loadPinData();

	if (PIN.current) {
		FIRESTORE_PROTECTED_DATA = await get(
			`viagens/protected/${PIN.current}/${DOCUMENT_ID}`,
			true,
			true,
		);
	}

	switch (FIRESTORE_PROTECTED_DATA?.pin) {
		case "all-data":
			setState(stripped
				? FIRESTORE_PROTECTED_DATA
				: await getTripDataWithDestinations(FIRESTORE_PROTECTED_DATA));
			break;
		case "sensitive-only":
			setState(getMergedTripObject(await getTravelDocument(stripped)));
			break;
		default:
			setState(await getTravelDocument(stripped));
	}

	await loadTripData();
	stopLoadingScreen();
}

export function deleteTrip() {
	let trip = getID("titulo").value;
	trip = trip ? ` "${trip}"` : "";

	const properties = cloneObject(MESSAGE_PROPERTIES);
	properties.titulo = translate("trip.delete.title");
	properties.conteudo = translate("trip.delete.message", { name: trip });
	properties.botoes = [
		{
			tipo: "cancelar",
		},
		{
			tipo: "confirmar",
			acao: "deleteTripAction()",
		},
	];

	displayFullMessage(properties);
}

export async function deleteTripAction() {
	if (!DOCUMENT_ID) return;

	const tasks = [
		deleteUserObjectDB(DOCUMENT_ID, "viagens"),
		deleteUserObjectStorage(),
		deleteDocument(`gastos/${DOCUMENT_ID}`, true),
	];

	if (PIN.current) {
		tasks.push(
			deleteDocument(`protegido/${DOCUMENT_ID}`, true),
			deleteDocument(`viagens/protected/${PIN.current}/${DOCUMENT_ID}`, true),
			deleteDocument(`gastos/protected/${PIN.current}/${DOCUMENT_ID}`, true),
		);
	}

	await Promise.all(tasks);
	window.location.href = "../index.html";
}

export function getDataSelectOptions(j) {
	const values = DATAS.map((data) => jsDateToKey(data));
	const labels = DATAS.map((data) => getDateTitle(data, "mini"));
	let result = j
		? ""
		: `<option value="" selected>${translate("datetime.select_date")}</option>`;

	for (let i = 0; i < values.length; i++) {
		result += `<option value="${values[i]}" ${j && i + 1 === j ? "selected" : ""}>${labels[i]}</option>`;
	}

	return result;
}

async function getTravelDocument(stripped = false) {
	return stripped
		? await get(`viagens/${DOCUMENT_ID}`)
		: await getSingleData("viagens");
}

function getMergedTripObject(tripData) {
	for (let i = 0; i < tripData.transportes.dados.length; i++) {
		const id = tripData.transportes.dados[i].id;
		tripData.transportes.dados[i].reserva =
			FIRESTORE_PROTECTED_DATA.transportes[id]?.reserva || "";
		tripData.transportes.dados[i].link =
			FIRESTORE_PROTECTED_DATA.transportes[id]?.link || "";
	}

	for (let i = 0; i < tripData.hospedagens.length; i++) {
		const id = tripData.hospedagens[i].id;
		tripData.hospedagens[i].reserva =
			FIRESTORE_PROTECTED_DATA.hospedagens[id]?.reserva || "";
		tripData.hospedagens[i].link =
			FIRESTORE_PROTECTED_DATA.hospedagens[id]?.link || "";
	}

	return tripData;
}

/** Initialize date range picker components on the edit trip page */
function initDateRangePickers() {
	const tripDateRange = getID("trip-date-range");
	if (tripDateRange) {
		const picker = new DateRangePicker(tripDateRange);
		// If hidden inputs already have values (from existing trip load), update display
		const inicio = getID("inicio") as HTMLInputElement;
		const fim = getID("fim") as HTMLInputElement;
		if (inicio?.value && fim?.value) {
			picker.setRange(inicio.value, fim.value);
		}
	}
}
