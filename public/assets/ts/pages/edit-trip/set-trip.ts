import { getCurrentPreferencePIN, validatePinField } from './categories/basic-data/protected-data.js';
import { setProtectedDataAndExpenses } from './categories/basic-data/set-protected-data.js';
import { getState, DOCUMENT_ID, FIRESTORE_NEW_DATA, setFirestoreNewData } from '../../data/state.js';
import { getChildIDs, getID, setRequired } from '../../utils/dom.js';
import { formattedDateToDateObject } from '../../utils/dates.js';
import { getUID } from '../../data/firebase/auth.js';
import { deleteUnusedImages } from '../../data/firebase/storage.js';
import { translate } from '../../i18n/translation.js';
import { getGaleriaObject } from './categories/gallery.js';
import { getItineraryArray } from './categories/itinerary-module/itinerary-module.js';
import { getDestinationsArray } from "./categories/destination.js";
import { getAccommodationArray, getProtectedAccommodationObject } from "./categories/accommodation.js";
import { getProtectedTransportationObject, getTransportationObject } from "./categories/transportation.js";
import { getExpensesObject } from "./categories/expenses.js";
import { setDocumento, addSetResponse } from "../../utils/set.js";
import { IMAGE_UPLOAD_STATUS } from "../../data/firebase/storage.js";
import { TRAVELERS } from '../../data/state.js';

export var FIRESTORE_PROTECTED_NEW_DATA = {};

export var FIRESTORE_GASTOS_NEW_DATA = {};
export var FIRESTORE_GASTOS_PROTECTED_NEW_DATA = {};

async function buildTripObject() {
	switch (getCurrentPreferencePIN()) {
		case "all-data":
		setFirestoreNewData(await getUnprotectedTripObject());
			FIRESTORE_PROTECTED_NEW_DATA = await getTripObjectFull(false);
			break;
		case "sensitive-only":
		setFirestoreNewData(await getTripObjectFull(true));
			FIRESTORE_PROTECTED_NEW_DATA = getSensitiveTripObject();
			break;
		default:
		setFirestoreNewData(await getTripObjectFull(false));
			FIRESTORE_PROTECTED_NEW_DATA = {};
	}
}

async function getUnprotectedTripObject() {
	return {
		destinos: getDestinationsArray(),
		compartilhamento: await getSharingObject(),
		cores: getCoresObject(),
		fim: getID(`fim`).value
			? formattedDateToDateObject(getID(`fim`).value)
			: "",
		galeria: {},
		hospedagens: [],
		imagem: getImagemObject(),
		inicio: getID(`inicio`).value
			? formattedDateToDateObject(getID(`inicio`).value)
			: "",
		links: {},
		modulos: {},
		moeda: getID("currency").value,
		programacoes: {},
		pessoas: {},
		titulo: getID("title").value,
		transportes: getVisibilidadeObject(),
		versao: {
			ultimaAtualizacao: new Date().toISOString(),
		},
		visibilidade: {},
		pin: getCurrentPreferencePIN(),
	};
}

function getSensitiveTripObject() {
	const hospedagens = getProtectedAccommodationObject();
	const transportes = getProtectedTransportationObject();

	if (
		Object.keys(hospedagens).length === 0 &&
		Object.keys(transportes).length === 0
	) {
		return {};
	}

	return {
		hospedagens: hospedagens,
		transportes: transportes,
		pin: getCurrentPreferencePIN(),
	};
}

async function getTripObjectFull(protectedReservationCodes = false) {
	return {
		destinos: getDestinationsArray(),
		compartilhamento: await getSharingObject(),
		cores: getCoresObject(),
		fim: getID(`fim`).value
			? formattedDateToDateObject(getID(`fim`).value)
			: "",
		galeria: getGaleriaObject(),
		hospedagens: getAccommodationArray(protectedReservationCodes),
		imagem: getImagemObject(),
		inicio: getID(`inicio`).value
			? formattedDateToDateObject(getID(`inicio`).value)
			: "",
		links: getLinksObject(),
		modulos: getModulosObject(),
		moeda: getID("currency").value,
		programacoes: getItineraryArray(),
		pessoas: TRAVELERS,
		titulo: getID("title").value,
		transportes: getTransportationObject(protectedReservationCodes),
		versao: {
			ultimaAtualizacao: new Date().toISOString(),
		},
		visibilidade: getVisibilidadeObject(),
		pin: getCurrentPreferencePIN(),
	};
}

async function buildExpensesObject() {
	switch (getCurrentPreferencePIN()) {
		case "all-data":
		case "sensitive-only":
			FIRESTORE_GASTOS_PROTECTED_NEW_DATA = await getExpensesObject();
			FIRESTORE_GASTOS_NEW_DATA = {};
			break;
		default:
			FIRESTORE_GASTOS_NEW_DATA = await getExpensesObject(false);
			FIRESTORE_PROTECTED_NEW_DATA = {};
	}
}

function getModulosObject() {
	return {
		hospedagens: getID("accommodations-enabled").checked,
		destinos: getID("destinations-enabled").checked,
		gastos: getID("enabled-expenses").checked,
		programacao: getID("itinerary-enabled").checked,
		resumo: true,
		transportes: getID("transportation-enabled").checked,
		galeria: getID("gallery-enabled").checked,
	};
}

function getCoresObject() {
	return {
		ativo: getID("colors-enabled").checked,
		claro: getID("claro").value,
		escuro: getID("escuro").value,
	};
}

export async function getSharingObject() {
	return {
		ativo: true,
		dono:
			getState() && Object.keys(getState()).length > 0
				? getState().compartilhamento.dono
				: await getUID(),
		editores: [],
	};
}

function getImagemObject() {
	return {
		ativo: getID("habilitado-imagens").checked,
		background: getID("link-background").value || "",
		claro: getID("link-logo-light").value || "",
		escuro: getID("link-logo-dark").value || "",
	};
}

function getLinksObject() {
	return {
		ativo: getID("habilitado-links").checked,
		attachments: getID("link-attachments").value || "",
		drive: getID("link-drive").value || "",
		maps: getID("link-maps").value || "",
		pdf: getID("link-pdf").value || "",
		ppt: getID("link-ppt").value || "",
		sheet: getID("link-sheet").value || "",
		vacina: getID("link-vacina").value || "",
	};
}

export function getVisibilidadeObject() {
	return {
		claro: getID("dark-and-light").checked || getID("light-exclusive").checked,
		escuro: getID("dark-and-light").checked || getID("dark-exclusive").checked,
	};
}

function verifyImageUploads(type) {
	if (DOCUMENT_ID && !IMAGE_UPLOAD_STATUS.hasErrors) {
		const path = `${type}/${DOCUMENT_ID}`;

		const documentLinks = [];

		if (FIRESTORE_NEW_DATA.imagem.background) {
			documentLinks.push(FIRESTORE_NEW_DATA.imagem.background);
		}

		if (FIRESTORE_NEW_DATA.imagem.claro) {
			documentLinks.push(FIRESTORE_NEW_DATA.imagem.claro);
		}

		if (FIRESTORE_NEW_DATA.imagem.escuro) {
			documentLinks.push(FIRESTORE_NEW_DATA.imagem.escuro);
		}

		if (type == "viagens") {
		const data: Record<string, any> =
				getCurrentPreferencePIN() === "all-data"
					? FIRESTORE_PROTECTED_NEW_DATA
					: FIRESTORE_NEW_DATA;
			const hospedagens = data.hospedagens || [];
			const hospedagemLinks = (hospedagens ?? []).flatMap((hospedagem) =>
				(hospedagem?.imagens ?? [])
					.map((imagem) => imagem?.link)
					.filter(Boolean),
			);

			const imagens = data?.galeria?.imagens || [];
			documentLinks.push(...hospedagemLinks);
			documentLinks.push(...imagens);
		}

		deleteUnusedImages(path, documentLinks);
	}

	addSetResponse(
		translate("labels.image.check"),
		!IMAGE_UPLOAD_STATUS.hasErrors,
	);
}

export async function setTripData() {
	if (getID("destinations-enabled").checked) {
		for (const child of getChildIDs("has-destinations")) {
			const i = parseInt(child.split("-")[2]);
			setRequired(`select-destinations-${i}`);
		}
	}

	const type = "viagens";
	const checks = [validatePinField];
	const dataBuildingFunctions = [buildTripObject, buildExpensesObject];
	const batchFunctions = [setProtectedDataAndExpenses];

	await setDocumento({ type, checks, dataBuildingFunctions, batchFunctions });
}
