import { cloneObject, getChildIDs, getID, getJ, getOrCreateCategoryID } from '../../../utils/dom.js';
import { convertFromDateObject, formattedDateToDateObject, getDateString, getTimeStringFromDate } from '../../../utils/dates.js';
import { validateImageLink, validateLink } from '../../../ui/fields.js';
import { closeAccordions, openLastAccordion } from '../../../ui/accordion.js';
import { translate } from '../../../i18n/translation.js';
import { closeMessage, displayFullMessage, getContainersInput, MESSAGE_PROPERTIES } from '../../../utils/messages.js';
import { initializeSortableForGroup } from '../../../ui/sortable.js';
import { loadImageSelector, uploadImages } from '../../../data/firebase/storage.js';
import { fade } from '../../../theme/animations.js';
import { FIRESTORE_NEW_DATA } from '../../../data/state.js';
import { IMAGE_UPLOAD_STATUS } from "../../../data/firebase/storage.js";
import { CUSTOM_UPLOADS } from "../../../utils/set.js";
import { addHospedagens } from "../new-trip.js";

export var ACCOMMODATION_IMAGES = {};

export function getAccommodationArray(protectedReservationCodes = false) {
	let result = [];
	for (const id of getChildIDs("hospedagens-box")) {
		const j = getJ(id);
		result.push({
			cafe: getID(`accommodations-cafe-${j}`).checked,
			datas: {
				checkin: formattedDateToDateObject(
					getID(`check-in-${j}`).value,
					getID(`check-in-horario-${j}`).value,
				),
				checkout: formattedDateToDateObject(
					getID(`check-out-${j}`).value,
					getID(`check-out-horario-${j}`).value,
				),
			},
			descricao: getID(`accommodations-description-${j}`).value,
			endereco: getID(`accommodations-endereco-${j}`).value,
			id: getOrCreateCategoryID("hospedagens", j),
			imagens: getAccommodationImages(j),
			reserva: protectedReservationCodes
				? ""
				: getID(`reserva-accommodations-${j}`).value,
			link: protectedReservationCodes
				? ""
				: getID(`reserva-accommodations-link-${j}`).value,
			nome: getID(`accommodations-nome-${j}`).value,
		});
	}
	return result;
}

export function getProtectedAccommodationObject() {
	let result = {};
	for (const childID of getChildIDs("hospedagens-box")) {
		const j = getJ(childID);
		const id = getID(`accommodations-id-${j}`).value;
		const reserva = getID(`reserva-accommodations-${j}`).value;
		const link = getID(`reserva-accommodations-link-${j}`).value;
		result[id] = { reserva, link };
	}
	return result;
}

function getAccommodationImages(j) {
	const result = [];
	for (const imagem of ACCOMMODATION_IMAGES[j]) {
		if (imagem.file) {
			CUSTOM_UPLOADS.hospedagens.push(imagem);
		}
		result.push({
			descricao: imagem.descricao,
			link: imagem.link,
		});
	}
	return result;
}

export function loadCheckIn(hospedagem, j) {
	loadAccommodationCheck("checkin", "in", hospedagem, j);
}

export function loadCheckOut(hospedagem, j) {
	loadAccommodationCheck("checkout", "out", hospedagem, j);
}

function loadAccommodationCheck(chave, checkTipo, hospedagem, j) {
	const data = convertFromDateObject(hospedagem.datas[chave]);
	if (data) {
		getID(`check-${checkTipo}-${j}`).value = getDateString(data, "yyyy-mm-dd");
		getID(`check-${checkTipo}-horario-${j}`).value =
			getTimeStringFromDate(data);
	}
}

// Listener
export function loadAccommodationListeners(j) {
// Link Validation
	getID(`reserva-accommodations-link-${j}`).addEventListener("change", () =>
		validateLink(`reserva-accommodations-link-${j}`),
	);

	// Nome
	getID(`accommodations-nome-${j}`).addEventListener("change", function () {
		if (getID(`accommodations-nome-${j}`).value) {
			getID(`accommodations-title-${j}`).innerText = getID(
				`accommodations-nome-${j}`,
			).value;
		}
	});
}

export function accommodationsAddListenerAction() {
	closeAccordions("hospedagens");
	addHospedagens();
	openLastAccordion("hospedagens");
}

// Internal Loading (Modal)
export function openAccommodationImages(j) {
	const size = 5;
	const propriedades = cloneObject(MESSAGE_PROPERTIES);

	propriedades.titulo = translate("labels.image.add_title");
	propriedades.containers = getContainersInput();
	propriedades.conteudo = getAccommodationImageContent(size);
	propriedades.icons = [
		{ tipo: "voltar", acao: `closeInnerAccommodationImage()` },
	];
	propriedades.botoes = [
		{
			tipo: "cancelar",
		},
		{
			tipo: "confirmar",
			acao: `confirmAccommodationImages(${j})`,
		},
	];

	displayFullMessage(propriedades);
	initializeSortableForGroup(`image-hospedagens`, { onEnd: "" });

	for (let k = 1; k <= size; k++) {
		const imagem = ACCOMMODATION_IMAGES[j][k - 1];
		if (imagem) {
			getID(`accommodations-image-description-${k}`).value = imagem.descricao;
			getID(`link-accommodations-${k}`).value = imagem.link;
			getID(`accommodations-image-button-${k}`).innerText =
				imagem.descricao || `${translate("labels.image.title")} ${k}`;
		}

		loadImageSelector(`accommodations-${k}`);
		getID(`link-accommodations-${k}`).addEventListener("change", () =>
			validateImageLink(`link-accommodations-${k}`),
		);
	}
}

function getAccommodationImageContent(size = 5) {
	let botoes = "";
	let inner = "";
	for (let k = 1; k <= size; k++) {
		botoes += `
        <div class="input-botao-container" id="input-botao-container-${k}">
            <button id="hospedagens-imagem-botao-${k}" class="btn input-botao draggable" data-action="open-inner-accommodation-image" data-index="${k}" style="margin-top:1em">${translate("labels.image.add")}</button>
            <i class="iconify drag-icon" data-icon="mdi:drag"></i>
        </div>`;

		inner += `
        <div id="hospedagens-imagem-${k}" style="display: none">
            <div class="nice-form-group customization-box" id="hospedagens-box-${k}">
                <label>${translate("labels.image.title_plural")} <span class="opcional"> (${translate("labels.optional")})</span></label>
                <input id="upload-hospedagens-${k}" class="imagem-uploadbox" type="file" accept=".jpg, .jpeg, .png" />
                <p id="upload-hospedagens-${k}-size-message" class="message-text"> <i class='red'>*</i> ${translate("labels.image.upload_limit")}</p>
            </div>

            <div class="nice-form-group">
                <input id="link-hospedagens-${k}" class="imagem-input" type="url" placeholder="${translate("labels.image.placeholder")}" value=""
                class="icon-right">
            </div>

            <fieldset class="nice-form-group imagem-checkbox" id="upload-checkbox-hospedagens-${k}">
                <div class="nice-form-group">
                <input type="radio" name="type-hospedagens-${k}" id="enable-link-hospedagens-${k}" checked>
                <label for="enable-link-hospedagens-${k}">${translate("labels.image.link")}</label>
                </div>

                <div class="nice-form-group">
                <input type="radio" name="type-hospedagens-${k}" id="enable-upload-hospedagens-${k}">
                <label for="enable-upload-hospedagens-${k}">${translate("labels.image.upload")} <span class="opcional"> (${translate("labels.image.upload_limit")})</span></label>
                </div>
            </fieldset>

            <div class="nice-form-group">
                <label>${translate("labels.image.description")} <span class="opcional"> (${translate("labels.optional")})</span></label>
                <input id="hospedagens-imagem-descricao-${k}" type="text" placeholder="${translate("trip.accommodation.description_placeholder")}" />
            </div>
        </div>
        `;
	}

	return `
    <p style="font-size: 0.8em; margin-top: -20px">${translate("labels.image.quantity_limit")}</p>
    <div class="draggable-area" data-group="imagem-hospedagens" id="imagem-hospedagens-botoes">
        ${botoes}
    </div>
    <div id="inner-hospedagens-imagem">
        ${inner}
    </div>
    `;
}

export function openInnerAccommodationImage(k) {
	fade([`image-accommodations-botoes`], [`accommodations-image-${k}`]);
	getID("back-icon").style.visibility = "visible";
}

export function closeInnerAccommodationImage() {
	for (const orderId of getChildIDs("inner-hospedagens-imagem")) {
		const k = getJ(orderId);
		const id = `accommodations-image-${k}`;
		if (getID(id).style.display == "block") {
			let titulo = translate("labels.image.add");

			if (hasInnerAccommodationImage(k)) {
				titulo =
					getID(`accommodations-image-description-${k}`).value ||
					`${translate("labels.image.title")} ${k}`;
			}

			getID(`accommodations-image-button-${k}`).innerText = titulo;
			fade([`accommodations-image-${k}`], [`image-accommodations-botoes`]);
			break;
		}
	}
	getID("back-icon").style.visibility = "hidden";
}

function hasInnerAccommodationImage(k) {
	return (
		(getID(`enable-link-accommodations-${k}`).checked &&
			getID(`link-accommodations-${k}`).value) ||
		(getID(`enable-upload-accommodations-${k}`).checked &&
			getID(`upload-accommodations-${k}`).value)
	);
}

export function confirmAccommodationImages(j) {
	const isEditing = getID(`accommodations-image-${j}`).style.display === "block";
	if (isEditing) {
		closeInnerAccommodationImage();
	} else {
		saveAccommodationImages(j);
		setImagemButtonLabel(j);
	}
}

export function setImagemButtonLabel(j) {
	getID(`imagens-hospedagem-button-${j}`).innerText =
		ACCOMMODATION_IMAGES[j].length > 0
			? translate("labels.image.edit")
			: translate("labels.image.add");
}

function saveAccommodationImages(j) {
	const result = [];
	for (const id of getChildIDs("imagem-hospedagens-botoes")) {
		const k = getJ(id);
		if (hasInnerAccommodationImage(k)) {
			result.push({
				descricao: getID(`accommodations-image-description-${k}`).value,
				link: getID(`enable-link-accommodations-${k}`).checked
					? getID(`link-accommodations-${k}`).value
					: "",
				file: getID(`enable-upload-accommodations-${k}`).checked
					? getID(`upload-accommodations-${k}`)?.files[0]
					: "",
				position: [j, k],
			});
		}
	}

	ACCOMMODATION_IMAGES[j] = result;
	closeMessage();
}

export function removeAccommodationImages(j) {
	ACCOMMODATION_IMAGES[j] = [];
}

async function uploadAndSetAccommodationImages() {
	if (
		IMAGE_UPLOAD_STATUS.hasErrors ||
		CUSTOM_UPLOADS.hospedagens.length === 0
	) {
		return;
	}

	const hospedagensFiles = CUSTOM_UPLOADS.hospedagens.map((file) => file.file);
	const hospedagemResult = await uploadImages("viagens", hospedagensFiles);

	if (IMAGE_UPLOAD_STATUS.hasErrors === false) {
		for (let i = 0; i < hospedagemResult.length; i++) {
			const outerPosition = CUSTOM_UPLOADS.hospedagens[i].position[0] - 1;
			const innerPosition = CUSTOM_UPLOADS.hospedagens[i].position[1] - 1;
			FIRESTORE_NEW_DATA.hospedagens[outerPosition].imagens[
				innerPosition
			].link = hospedagemResult[i].link;
		}
	}
}
