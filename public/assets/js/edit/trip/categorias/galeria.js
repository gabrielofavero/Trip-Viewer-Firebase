import { buildDS } from "../../../support/components/dynamic-select.js";
import { IMAGE_UPLOAD_STATUS, uploadImages, removeImageSelectorListeners } from "../../../support/firebase/storage.js";
import { closeAccordions, openLastAccordion } from "../../../support/html/accordion.js";
import { validateImageLink } from "../../../support/html/fields.js";

function _deleteGaleria(i) {
    const id = `galeria-${i}`;
    removeImageSelectorListeners(id);
    const div = getID(id);
    div.parentNode.removeChild(div);
}

// Listeners
function _loadGaleriaListeners(j) {
    // Dynamic Title
    getID(`galeria-titulo-${j}`).addEventListener('change', () => getID(`galeria-title-${j}`).innerText = getID(`galeria-titulo-${j}`).value);

    // Validação de Link
    getID(`link-galeria-${j}`).addEventListener('change', () => validateImageLink(`link-galeria-${j}`));
}

function _galeriaAdicionarListenerAction() {
    closeAccordions('galeria');
    _addGaleria();
    openLastAccordion('galeria');
    buildDS('galeria-categoria');
}

async function _uploadAndSetGaleriaImages() {
    if (IMAGE_UPLOAD_STATUS.hasErrors || CUSTOM_UPLOADS.galeria.length === 0) {
        return;
    }
    const galeriaFiles = CUSTOM_UPLOADS.galeria.map(file => file.file)
    const galeriaResult = await uploadImages('viagens', galeriaFiles);
    
    if (IMAGE_UPLOAD_STATUS.hasErrors === false) {
        for (let i = 0; i < galeriaResult.length; i++) {
            const position = CUSTOM_UPLOADS.galeria[i].position - 1;
            FIRESTORE_NEW_DATA.galeria.imagens[position] = galeriaResult[i].link;
        }
    }
}