import { startLoadingScreen, stopLoadingScreen } from '../../utils/loading.js';;
import { setState } from '../../data/state.js';
import { getDateTitle, getTodayFormatted, getTomorrowFormatted, jsDateToKey } from '../../utils/dates.js';
import { cloneObject, getID, getOrderedDocumentByTitle, getURLParam } from '../../utils/dom.js';
import { deleteUserObjectDB, getPermissoes, getSingleData, getTripDataWithDestinations } from '../../data/firebase/database.js';
import { loadDraggablesWithAccordions } from '../../ui/sortable.js';
import { newDynamicSelect } from '../../ui/dynamic-select.js';
import { getUserData } from '../../data/firebase/auth.js';
import { deleteUserObjectStorage, loadImageSelector, loadLogoSelector } from '../../data/firebase/storage.js';
import { snapshotFormState } from '../../ui/fields.js';
import { loadEditModule } from '../../theme/visibility.js';
import { translate } from '../../i18n/translation.js';
import { displayFullMessage } from '../../utils/messages.js';
import { loadVisibilityIndex } from '../home/support/visibility.js';

var FIRESTORE_PROTECTED_DATA = {};
var FIRESTORE_GASTOS_DATA = {};

var SUCCESSFUL_SAVE = false;
var NEW_TRIP = false;

const TODAY = getTodayFormatted();
const TOMORROW = getTomorrowFormatted();

startLoadingScreen();

export async function loadEditTripPage() {
	DOCUMENT_ID = getURLParam("v");
	PERMISSOES = await getPermissoes();

	loadVisibilityIndex();
	loadHabilitados();
	loadDraggablesWithAccordions(["transporte", "hospedagens"]);
	newDynamicSelect("galeria-categoria");
	newDynamicSelect("transporte-pessoa");

	USER_DATA = await getUserData();
	DESTINOS = getOrderedDocumentByTitle(USER_DATA.destinos);

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

	$("body").css("overflow", "auto");
}

function loadHabilitados() {
	loadEditModule("imagens");
	loadEditModule("cores");
	loadEditModule("links");
	loadEditModule("gastos");
	loadEditModule("transporte");
	loadEditModule("hospedagens");
	loadEditModule("programacao");
	loadEditModule("destinos");
	loadEditModule("galeria");
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

function deleteTrip() {
	let viagem = getID("titulo").value;
	viagem = viagem ? ` "${viagem}"` : "";

	const propriedades = cloneObject(MESSAGE_PROPERTIES);
	propriedades.titulo = translate("trip.delete.title");
	propriedades.conteudo = translate("trip.delete.message", { name: viagem });
	propriedades.botoes = [
		{
			tipo: "cancelar",
		},
		{
			tipo: "confirmar",
			acao: "deleteTripAction()",
		},
	];

	displayFullMessage(propriedades);
}

async function deleteTripAction() {
	if (!DOCUMENT_ID) return;

	const tasks = [
		deleteUserObjectDB(DOCUMENT_ID, "viagens"),
		deleteUserObjectStorage(),
		delete(`gastos/${DOCUMENT_ID}`, true),
	];

	if (PIN.current) {
		tasks.push(
			delete(`protegido/${DOCUMENT_ID}`, true),
			delete(`viagens/protected/${PIN.current}/${DOCUMENT_ID}`, true),
			delete(`gastos/protected/${PIN.current}/${DOCUMENT_ID}`, true),
		);
	}

	await Promise.all(tasks);
	window.location.href = "../index.html";
}

function getDataSelectOptions(j) {
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
