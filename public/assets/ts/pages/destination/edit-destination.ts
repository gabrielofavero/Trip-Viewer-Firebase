import { getCurrencies } from '../../app/config.js';
import { startLoadingScreen, stopLoadingScreen } from '../../utils/loading.js';
import { getID, getLastUnorderedJ, getRandomID, normalizeTikTokLink } from '../../utils/dom.js';
import { DOCUMENT_ID } from '../../data/state.js';
import { getLanguagePackName, translate } from '../../i18n/translation.js';
import { removeEl, validateInstagramLink, validateLink, validateMapLink, validateMediaLink } from '../../ui/fields.js';
import { closeMessage, displayMessage, displayPrompt } from '../../utils/messages.js';
import { update } from '../../data/firebase/database.js';
import { getUID } from '../../data/firebase/auth.js';
import {getNotaClass, getPlanejado} from "./categories.js";
import { getNotaIcon } from "./categories.js";
import { ACTIVE_CATEGORY, FIRESTORE_DESTINOS_DATA, getDestinationID, getItem, getItemFromJ, processAccordion, refreshDestination } from "./destination.js";
import { getDestinationsAccordionBodyHTML } from "./support/content.js";
import { getDestinationsHTML } from "./support/content.js";
import { getEditHTML } from "./support/content.js";
import { populatePlannedDestinationEditField } from "./support/trip.js";
import { refreshTripData } from "./support/trip.js";
import { setPlannedDestination } from "./support/trip.js";
import { openDestinationsAccordion } from "./support/visibility.js";

let ADDED_J;

// Main Functions
export async function edit(j: number): Promise<void> {
	const canUserEdit = await canEdit();
	if (!canUserEdit) {
		editForbidden();
		return;
	}

	const id = getDestinationID(j);
	const item = FIRESTORE_DESTINOS_DATA[ACTIVE_CATEGORY]?.[id];
	const accordionBody = getID(`accordion-body-${j}`);

	if (!item || !accordionBody) {
		editError();
		return;
	}

	accordionBody.innerHTML = getEditHTML(j);

	populateEditFields(j, item);
	setEditListeners(j, item);

	function populateEditFields(j, item) {
		getID(`editar-nome-${j}`).value = item.nome || "";
		getID(`editar-emoji-${j}`).value = item.emoji || "";

		populatePlannedDestinationEditField(id, j);

		getID(`editar-mapa-${j}`).value = item.mapa || "";
		getID(`editar-instagram-${j}`).value = item.instagram || "";
		getID(`editar-website-${j}`).value = item.website || "";

		getID(`editar-midia-${j}`).value = item.midia || "";

		populateScoresField(item.nota, j);
		populateRegionField(item.regiao, j);
		populateValueField(item.valor, j);
		populateDescriptionFields(item.descricao || {}, j);

		function populateScoresField(nota, j) {
			getID(`editar-nota-${j}`).value = nota === "?" ? "default" : nota || "";
			editScoreLoadAction(nota, j);
		}

		function populateRegionField(regiao, j) {
			const regionSelect = getID(`editar-regiao-select-${j}`);
			regionSelect.value = regiao || "";
		}

		function populateValueField(valor, j) {
			const valores = getCurrencies().valores;
			const valueSelect = getID(`editar-valor-select-${j}`);
			if (valores.includes(valor)) {
				valueSelect.value = valor;
			} else {
				valueSelect.value = "custom";
				editValueLoadAction("custom", j);
				getID(`editar-valor-input-${j}`).value = valor || "";
			}
		}

		function populateDescriptionFields(descricao, j) {
			getID(`editar-descricao-en-${j}`).value = descricao.en || "";
			getID(`editar-descricao-pt-${j}`).value = descricao.pt || "";
			applyDescriptionLanguage(j);
		}
	}
}

export async function add(): Promise<void> {
	(document.querySelector(".add-container") as HTMLElement).style.display = "none";
	const canUserEdit = await canEdit();
	if (!canUserEdit) {
		editForbidden();
		return;
	}

	const accordionItems = Array.from(
		document.querySelectorAll(".accordion-item"),
	);
	const pool = accordionItems
		.map((el) => el.getAttribute("data-id"))
		.filter((id) => id !== null);

	const id = getRandomID({ pool });
	const j = getLastUnorderedJ("content") + 1;
	const item = {
		nome: translate("destination.new"),
		nota: "default",
		novo: true,
	};
	const closeAction = "_closeAddedDestination";
	getID("content").innerHTML += getDestinationsHTML({ j, id, item, closeAction });

	const accordionBody = getID(`accordion-body-${j}`);
	if (!accordionBody) {
		editError();
		return;
	}

	ADDED_J = j;
	accordionBody.innerHTML = getEditHTML(ADDED_J);
	getID(`editar-delete-${ADDED_J}`).style.visibility = "hidden";

	openDestinationsAccordion(ADDED_J);
	applyDescriptionLanguage(ADDED_J);
	setAddListeners();
}

// Visibility
export async function adjustEditVisibility(j?: number): Promise<void> {
	const canUserEdit = await canEdit();
	const display = canUserEdit ? "" : "none";
	(document.querySelector(".add-container") as HTMLElement).style.display = display;
	if (j) {
		getID(`edit-container-${j}`).style.display = display;
		return;
	}

	for (const container of document.querySelectorAll<HTMLElement>(".edit-container")) {
		container.style.display = display;
	}
}

// Listeners
function setFieldListeners(j: number): void {
	getID(`editar-nota-${j}`)!.onchange = (e: Event) => {
		editScoreLoadAction((e.target as HTMLInputElement).value, j);
	};

	getID(`editar-mapa-${j}`)!.onchange = (e: Event) => {
		validateMapLink((e.target as HTMLElement).id);
	};

	getID(`editar-instagram-${j}`)!.onchange = (e: Event) => {
		validateInstagramLink((e.target as HTMLElement).id);
	};

	getID(`editar-website-${j}`)!.onchange = (e: Event) => {
		validateLink((e.target as HTMLElement).id);
	};

	getID(`editar-regiao-select-${j}`)!.onchange = (e: Event) => {
		editRegionLoadAction((e.target as HTMLSelectElement).value, j);
	};

	getID(`editar-valor-select-${j}`)!.onchange = (e: Event) => {
		editValueLoadAction((e.target as HTMLSelectElement).value, j);
	};

	getID(`editar-descricao-lang-${j}`)!.onchange = (e: Event) => {
		editDescriptionLoadAction((e.target as HTMLSelectElement).value, j);
	};

	document.querySelectorAll<HTMLElement>(".description-textarea").forEach((textarea) => {
		textarea.onchange = (e: Event) => {
			(e.target as HTMLInputElement).value = (e.target as HTMLInputElement).value.trim();
		};
	});

	getID(`editar-midia-${j}`)!.onchange = (e: Event) => {
		validateMediaLink((e.target as HTMLElement).id);
	};
}

function setEditListeners(j, item) {
	getID(`close-btn-${j}`).onclick = () => {
		restoreAccordionBody(j, item);
		processAccordion(j);
	};

	getID(`editar-delete-${j}`).onclick = () => {
		promptDeleteEdit(j);
	};

	getID(`editar-save-${j}`).onclick = () => {
		saveEdit(j);
	};

	setFieldListeners(j);
}

function setAddListeners() {
	getID(`close-btn-${ADDED_J}`).onclick = () => {
		closeAddedDestination();
	};

	getID(`editar-save-${ADDED_J}`).onclick = () => {
		saveEdit(ADDED_J, true);
	};

	setFieldListeners(ADDED_J);
}

// Load Actions
function editScoreLoadAction(value, j) {
	const icon = getID(`editar-nota-icon-${j}`);
	icon.innerHTML = `<i class="iconify nota-sem-margem ${getNotaClass(value)}" data-icon="${getNotaIcon(value)}"></i>`;
}

function editRegionLoadAction(value, j) {
	const select = getID(`editar-regiao-select-${j}`);
	const input = getID(`editar-regiao-input-${j}`);
	if (value == "custom") {
		input.style.display = "";
		select.value = "custom";
	} else {
		input.style.display = "none";
	}
}

function editValueLoadAction(value, j) {
	const select = getID(`editar-valor-select-${j}`);
	const input = getID(`editar-valor-input-${j}`);

	if (value == "custom") {
		input.style.display = "";
		select.value = "custom";
	} else {
		input.style.display = "none";
	}
}

function editDescriptionLoadAction(value, j) {
	for (const lang of LANGUAGES) {
		const display = lang == value ? "" : "none";
		const id = `editar-descricao-${lang}-${j}`;
		getID(id).style.display = display;
	}
}

function applyDescriptionLanguage(j) {
	const lang = getLanguagePackName();
	getID(`editar-descricao-lang-${j}`).value = lang;
	editDescriptionLoadAction(lang, j);
}

// Save Action
async function saveEdit(j, isNew = false) {
	startLoadingScreen();
	const id = getDestinationID(j);
	const originalItem = isNew ? {} : getItem(id);
	const item = {
		criadoEm: originalItem?.criadoEm || new Date().toISOString(),
		descricao: {
			en: getID(`editar-descricao-en-${j}`).value,
			pt: getID(`editar-descricao-pt-${j}`).value,
		},
		emoji: getID(`editar-emoji-${j}`).value,
		instagram: getID(`editar-instagram-${j}`).value,
		mapa: getID(`editar-mapa-${j}`).value,
		midia: getID(`editar-midia-${j}`).value,
		nome: getID(`editar-nome-${j}`).value,
		nota: getID(`editar-nota-${j}`).value,
		novo: isNew ? true : originalItem.novo,
		regiao: getValue("regiao", j),
		valor: getValue("valor", j),
		website: getID(`editar-website-${j}`).value,
	};

	if (!item.nome) {
		stopLoadingScreen();
		displayMessage(
			translate("destination.edit"),
			translate("destination.errors.missing_title"),
		);
		return;
	}

	if (item.midia && item.midia.includes("tiktok")) {
		item.midia = await normalizeTikTokLink(item.midia);
	}

	const docPath = `destinos/${DOCUMENT_ID}`;
	const [, plannedResult] = await Promise.all([
		update(docPath, { [`${ACTIVE_CATEGORY}.${id}`]: item }),
		setPlannedDestination(id, j),
	]);

	if (plannedResult) {
		await refreshTripData();
	}

	await refreshDestination();

	stopLoadingScreen();

	function getValue(type, j) {
		const selectValue = getID(`editar-${type}-select-${j}`).value;
		return selectValue != "custom"
			? selectValue
			: getID(`editar-${type}-input-${j}`).value;
	}
}

// Delete Actions
function promptDeleteEdit(j) {
	const id = getDestinationID(j);
	const name = getItem(id).nome;

	const titulo = translate("destination.delete.title");
	const conteudo = translate("destination.delete.message", { name });
	const yesAction = `deleteEdit('${id}')`;

	displayPrompt({ titulo, conteudo, yesAction });
}

async function deleteEdit(id) {
	closeMessage();
	startLoadingScreen();

	await update(`destinos/${DOCUMENT_ID}`, {
		[`${ACTIVE_CATEGORY}.${id}`]: firebase.firestore.FieldValue.delete(),
	});

	await refreshDestination();
	stopLoadingScreen();
}

// Cancel Actions
function abortEdit(title, message) {
	displayMessage(translate(title), translate(message));
	adjustEditVisibility();
	ACTIVE_PLANNED_DESTINATION = [];
}

function editError(message = "messages.errors.unknown") {
	abortEdit("messages.errors.load_title", message);
}

function editForbidden(message = "messages.access_denied.message.edit") {
	abortEdit("messages.access_denied.title", message);
}

export function closeAddedDestination(index?) {
	if (!ADDED_J) {
		return;
	}
	removeEl(`destinos-box-${ADDED_J}`);
	adjustEditVisibility();
	ADDED_J = null;
	ACTIVE_PLANNED_DESTINATION = [];
}

function restoreAccordionBody(j: number, item: Record<string, any>): void {
	const id = getDestinationID(j);
	const planejado = getPlanejado(id);
	const editBtn = true;
	getID(`accordion-body-${j}`)!.innerHTML = getDestinationsAccordionBodyHTML({
		j,
		item,
		planejado,
		editBtn,
		valores: undefined as any,
		moeda: undefined as any,
	});
}

export function restoreIfEditing(j) {
	if (isEditing(j)) {
		const item = getItemFromJ(j);
		if (!item) return;
		restoreAccordionBody(j, item);
	}
}

// Checkers
function isEditing(j) {
	const accordionBody = getID(`accordion-body-${j}`);
	return accordionBody.querySelector(".edit-title-container") != undefined;
}

async function canEdit() {
	const uid = await getUID();
	if (!uid) {
		return false;
	}
	return FIRESTORE_DESTINOS_DATA.compartilhamento.dono === uid;
}
