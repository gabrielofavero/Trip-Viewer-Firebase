import { getChildIDs, getID, getJ } from '../../../utils/dom.js';
import { removeImageSelectorListeners, uploadImages } from '../../../data/firebase/storage.js';
import { validateImageLink } from '../../../ui/fields.js';
import { closeAccordions, openLastAccordion } from '../../../ui/accordion.js';
import { buildDS } from '../../../ui/dynamic-select.js';
import { FIRESTORE_NEW_DATA } from '../../../data/state.js';
import { IMAGE_UPLOAD_STATUS } from '../../../data/firebase/storage.js';
import { CUSTOM_UPLOADS } from '../../../utils/set.js';
import { addGallery } from '../new-trip.js';

export function getGalleryObject() {
	let result = {
		descriptions: [],
		categories: [],
		images: [],
		titles: [],
	};

	const childIDs = getChildIDs('gallery-box');
	for (var i = 0; i < childIDs.length; i++) {
		const j = getJ(childIDs[i]);

		const description = getID(`gallery-description-${j}`).value || '';
		result.descriptions.push(description);

		const title = getID(`gallery-title-${j}`).value || '';
		result.titles.push(title);

		if (getID(`enable-upload-gallery-${j}`).checked) {
			result.images.push('');
			CUSTOM_UPLOADS.gallery.push({
				file: getID(`upload-gallery-${j}`)?.files[0],
				position: j,
			});
		} else {
			result.images.push(getID(`link-gallery-${j}`).value);
		}
	}

	return result;
}

function deleteGallery(i) {
	const id = `gallery-${i}`;
	removeImageSelectorListeners(id);
	const div = getID(id);
	div.parentNode.removeChild(div);
}

// Listeners
export function loadGalleryListeners(j) {
	// Dynamic Title
	getID(`gallery-title-${j}`).addEventListener(
		'change',
		() => (getID(`gallery-title-${j}`).innerText = getID(`gallery-title-${j}`).value),
	);

	// Link Validation
	getID(`link-gallery-${j}`).addEventListener('change', () =>
		validateImageLink(`link-gallery-${j}`),
	);
}

export function galleryAddListenerAction() {
	closeAccordions('gallery');
	addGallery();
	openLastAccordion('gallery');
	buildDS('gallery-category');
}

async function uploadAndSetGalleryImages() {
	if (IMAGE_UPLOAD_STATUS.hasErrors || CUSTOM_UPLOADS.gallery.length === 0) {
		return;
	}
	const galleryFiles = CUSTOM_UPLOADS.gallery.map((file) => file.file);
	const galleryResult = await uploadImages('trips', galleryFiles);

	if (IMAGE_UPLOAD_STATUS.hasErrors === false) {
		for (let i = 0; i < galleryResult.length; i++) {
			const position = CUSTOM_UPLOADS.gallery[i].position - 1;
			FIRESTORE_NEW_DATA.gallery.images[position] = galleryResult[i].link;
		}
	}
}
