import { getChildIDs, getID, getJ } from '../../../utils/dom.js';
import { removeImageSelectorListeners, uploadImages } from '../../../data/firebase/storage.js';
import { validateImageLink } from '../../../ui/fields.js';
import { closeAccordions, openLastAccordion } from '../../../ui/accordion.js';
import { buildDS } from '../../../ui/dynamic-select.js';
import { FIRESTORE_NEW_DATA } from '../../../data/state.js';
import { IMAGE_UPLOAD_STATUS } from "../../../data/firebase/storage.js";
import { CUSTOM_UPLOADS } from "../../../utils/set.js";
import { addGaleria } from "../new-trip.js";

export function getGaleriaObject() {
	let result = {
		descricoes: [],
		categorias: [],
		imagens: [],
		titulos: [],
	};

	const childIDs = getChildIDs("gallery-box");
	for (var i = 0; i < childIDs.length; i++) {
		const j = getJ(childIDs[i]);

		const descricao = getID(`gallery-description-${j}`).value || "";
		result.descricoes.push(descricao);

		const titulo = getID(`gallery-title-${j}`).value || "";
		result.titulos.push(titulo);

		if (getID(`enable-upload-gallery-${j}`).checked) {
			result.imagens.push("");
			CUSTOM_UPLOADS.galeria.push({
				file: getID(`upload-gallery-${j}`)?.files[0],
				position: j,
			});
		} else {
			result.imagens.push(getID(`link-gallery-${j}`).value);
		}
	}

	return result;
}

function deleteGaleria(i) {
	const id = `gallery-${i}`;
	removeImageSelectorListeners(id);
	const div = getID(id);
	div.parentNode.removeChild(div);
}

// Listeners
export function loadGaleriaListeners(j) {
	// Dynamic Title
	getID(`gallery-title-${j}`).addEventListener(
		"change",
		() =>
			(getID(`gallery-title-${j}`).innerText = getID(
				`gallery-title-${j}`,
			).value),
	);

// Link Validation
	getID(`link-gallery-${j}`).addEventListener("change", () =>
		validateImageLink(`link-gallery-${j}`),
	);
}

export function galeriaAdicionarListenerAction() {
	closeAccordions("galeria");
	addGaleria();
	openLastAccordion("galeria");
	buildDS("galeria-categoria");
}

async function uploadAndSetGaleriaImages() {
	if (IMAGE_UPLOAD_STATUS.hasErrors || CUSTOM_UPLOADS.galeria.length === 0) {
		return;
	}
	const galeriaFiles = CUSTOM_UPLOADS.galeria.map((file) => file.file);
	const galeriaResult = await uploadImages("viagens", galeriaFiles);

	if (IMAGE_UPLOAD_STATUS.hasErrors === false) {
		for (let i = 0; i < galeriaResult.length; i++) {
			const position = CUSTOM_UPLOADS.galeria[i].position - 1;
			FIRESTORE_NEW_DATA.galeria.imagens[position] = galeriaResult[i].link;
		}
	}
}
