import { getCurrencies } from '../../app/config.js';
import { startLoadingScreen, stopLoadingScreen } from '../../utils/loading.js';
import { getID, getLastUnorderedJ, getRandomID, normalizeTikTokLink } from '../../utils/dom.js';
import { DOCUMENT_ID } from '../../data/state.js';
import { getLanguagePackName, LANGUAGES, translate } from '../../i18n/translation.js';
import {
	removeEl,
	validateInstagramLink,
	validateLink,
	validateMapLink,
	validateMediaLink,
} from '../../ui/fields.js';
import { closeMessage, displayMessage, displayPrompt } from '../../utils/messages.js';
import { update } from '../../data/firebase/database.js';
import { getUID } from '../../data/firebase/auth.js';
import { getRatingClass, getPlanned } from './categories.js';
import { getRatingIcon } from './categories.js';
import { FIRESTORE_DESTINATIONS_DATA } from '../../data/state.js';
import {
	ACTIVE_CATEGORY,
	getDestinationID,
	getItem,
	getItemFromJ,
	processAccordion,
	refreshDestination,
} from './destination.js';
import { getDestinationsAccordionBodyHTML } from './support/content.js';
import { getDestinationsHTML } from './support/content.js';
import { getEditHTML } from './support/content.js';
import {
	populatePlannedDestinationEditField,
	refreshTripData,
	resetActivePlannedDestination,
	setPlannedDestination,
} from './support/trip.js';
import { openDestinationsAccordion } from './support/visibility.js';

let ADDED_J;

// Main Functions
export async function edit(j: number): Promise<void> {
	const canUserEdit = await canEdit();
	if (!canUserEdit) {
		editForbidden();
		return;
	}

	const id = getDestinationID(j);
	const item = FIRESTORE_DESTINATIONS_DATA[ACTIVE_CATEGORY]?.[id];
	const accordionBody = getID(`accordion-body-${j}`);

	if (!item || !accordionBody) {
		editError();
		return;
	}

	accordionBody.innerHTML = getEditHTML(j);

	populateEditFields(j, item);
	setEditListeners(j, item);

	function populateEditFields(j, item) {
		getID(`edit-name-${j}`).value = item.name || '';
		getID(`edit-emoji-${j}`).value = item.emoji || '';

		populatePlannedDestinationEditField(id, j);

		getID(`edit-map-${j}`).value = item.map || '';
		getID(`edit-instagram-${j}`).value = item.instagram || '';
		getID(`edit-website-${j}`).value = item.website || '';

		getID(`edit-media-${j}`).value = item.media || '';

		populateScoresField(item.rating, j);
		populateRegionField(item.region, j);
		populateValueField(item.price, j);
		populateDescriptionFields(item.description || {}, j);

		function populateScoresField(rating, j) {
			getID(`edit-rating-${j}`).value = rating === '?' ? 'default' : rating || '';
			editScoreLoadAction(rating, j);
		}

		function populateRegionField(region, j) {
			const regionSelect = getID(`edit-region-select-${j}`);
			regionSelect.value = region || '';
		}

		function populateValueField(price, j) {
			const values = getCurrencies().values;
			const valueSelect = getID(`edit-price-select-${j}`);
			if (values.includes(price)) {
				valueSelect.value = price;
			} else {
				valueSelect.value = 'custom';
				editValueLoadAction('custom', j);
				getID(`edit-price-input-${j}`).value = price || '';
			}
		}

		function populateDescriptionFields(description, j) {
			getID(`edit-description-en-${j}`).value = description.en || '';
			getID(`edit-description-pt-${j}`).value = description.pt || '';
			applyDescriptionLanguage(j);
		}
	}
}

export async function add(): Promise<void> {
	(document.querySelector('.add-container') as HTMLElement).style.display = 'none';
	const canUserEdit = await canEdit();
	if (!canUserEdit) {
		editForbidden();
		return;
	}

	const accordionItems = Array.from(document.querySelectorAll('.accordion-item'));
	const pool = accordionItems.map((el) => el.getAttribute('data-id')).filter((id) => id !== null);

	const id = getRandomID({ pool });
	const j = getLastUnorderedJ('content') + 1;
	const item = {
		name: translate('destination.new'),
		rating: 'default',
		isNew: true,
	};
	const closeAction = '_closeAddedDestination';
	getID('content').innerHTML += getDestinationsHTML({
		j,
		id,
		item,
		closeAction,
	});

	const accordionBody = getID(`accordion-body-${j}`);
	if (!accordionBody) {
		editError();
		return;
	}

	ADDED_J = j;
	accordionBody.innerHTML = getEditHTML(ADDED_J);
	getID(`edit-delete-${ADDED_J}`).style.visibility = 'hidden';

	openDestinationsAccordion(ADDED_J);
	applyDescriptionLanguage(ADDED_J);
	setAddListeners();
}

// Visibility
export async function adjustEditVisibility(j?: number): Promise<void> {
	const canUserEdit = await canEdit();
	const display = canUserEdit ? '' : 'none';
	(document.querySelector('.add-container') as HTMLElement).style.display = display;
	if (j) {
		getID(`edit-container-${j}`).style.display = display;
		return;
	}

	for (const container of document.querySelectorAll<HTMLElement>('.edit-container')) {
		container.style.display = display;
	}
}

// Listeners
function setFieldListeners(j: number): void {
	getID(`edit-rating-${j}`)!.onchange = (e: Event) => {
		editScoreLoadAction((e.target as HTMLInputElement).value, j);
	};

	getID(`edit-map-${j}`)!.onchange = (e: Event) => {
		validateMapLink((e.target as HTMLElement).id);
	};

	getID(`edit-instagram-${j}`)!.onchange = (e: Event) => {
		validateInstagramLink((e.target as HTMLElement).id);
	};

	getID(`edit-website-${j}`)!.onchange = (e: Event) => {
		validateLink((e.target as HTMLElement).id);
	};

	getID(`edit-region-select-${j}`)!.onchange = (e: Event) => {
		editRegionLoadAction((e.target as HTMLSelectElement).value, j);
	};

	getID(`edit-price-select-${j}`)!.onchange = (e: Event) => {
		editValueLoadAction((e.target as HTMLSelectElement).value, j);
	};

	getID(`edit-description-lang-${j}`)!.onchange = (e: Event) => {
		editDescriptionLoadAction((e.target as HTMLSelectElement).value, j);
	};

	document.querySelectorAll<HTMLElement>('.description-textarea').forEach((textarea) => {
		textarea.onchange = (e: Event) => {
			(e.target as HTMLInputElement).value = (e.target as HTMLInputElement).value.trim();
		};
	});

	getID(`edit-media-${j}`)!.onchange = (e: Event) => {
		validateMediaLink((e.target as HTMLElement).id);
	};
}

function setEditListeners(j, item) {
	getID(`close-btn-${j}`).onclick = () => {
		restoreAccordionBody(j, item);
		processAccordion(j);
	};

	getID(`edit-delete-${j}`).onclick = () => {
		promptDeleteEdit(j);
	};

	getID(`edit-save-${j}`).onclick = () => {
		saveEdit(j);
	};

	setFieldListeners(j);
}

function setAddListeners() {
	getID(`close-btn-${ADDED_J}`).onclick = () => {
		closeAddedDestination();
	};

	getID(`edit-save-${ADDED_J}`).onclick = () => {
		saveEdit(ADDED_J, true);
	};

	setFieldListeners(ADDED_J);
}

// Load Actions
function editScoreLoadAction(value, j) {
	const icon = getID(`edit-rating-icon-${j}`);
	icon.innerHTML = `<i class="iconify rating-no-margin ${getRatingClass(value)}" data-icon="${getRatingIcon(value)}"></i>`;
}

function editRegionLoadAction(value, j) {
	const select = getID(`edit-region-select-${j}`);
	const input = getID(`edit-region-input-${j}`);
	if (value == 'custom') {
		input.style.display = '';
		select.value = 'custom';
	} else {
		input.style.display = 'none';
	}
}

function editValueLoadAction(value, j) {
	const select = getID(`edit-price-select-${j}`);
	const input = getID(`edit-price-input-${j}`);

	if (value == 'custom') {
		input.style.display = '';
		select.value = 'custom';
	} else {
		input.style.display = 'none';
	}
}

function editDescriptionLoadAction(value, j) {
	for (const lang of LANGUAGES) {
		const display = lang == value ? '' : 'none';
		const id = `edit-description-${lang}-${j}`;
		getID(id).style.display = display;
	}
}

function applyDescriptionLanguage(j) {
	const lang = getLanguagePackName();
	getID(`edit-description-lang-${j}`).value = lang;
	editDescriptionLoadAction(lang, j);
}

// Save Action
async function saveEdit(j, isNew = false) {
	startLoadingScreen();
	const id = getDestinationID(j);
	const originalItem = isNew ? {} : getItem(id);
	const item = {
		createdAt: originalItem?.createdAt || new Date().toISOString(),
		description: {
			en: getID(`edit-description-en-${j}`).value,
			pt: getID(`edit-description-pt-${j}`).value,
		},
		emoji: getID(`edit-emoji-${j}`).value,
		instagram: getID(`edit-instagram-${j}`).value,
		map: getID(`edit-map-${j}`).value,
		media: getID(`edit-media-${j}`).value,
		name: getID(`edit-name-${j}`).value,
		rating: getID(`edit-rating-${j}`).value,
		isNew: isNew ? true : originalItem.isNew,
		region: getValue('region', j),
		price: getValue('price', j),
		website: getID(`edit-website-${j}`).value,
	};

	if (!item.name) {
		stopLoadingScreen();
		displayMessage(translate('destination.edit'), translate('destination.errors.missing_title'));
		return;
	}

	if (item.media && item.media.includes('tiktok')) {
		item.media = await normalizeTikTokLink(item.media);
	}

	const docPath = `destinations/${DOCUMENT_ID}`;
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
		const selectValue = getID(`edit-${type}-select-${j}`).value;
		return selectValue != 'custom' ? selectValue : getID(`edit-${type}-input-${j}`).value;
	}
}

// Delete Actions
function promptDeleteEdit(j) {
	const id = getDestinationID(j);
	const name = getItem(id).name;

	const title = translate('destination.delete.title');
	const content = translate('destination.delete.message', { name });
	const yesAction = `deleteEdit('${id}')`;

	displayPrompt({ title, content, yesAction });
}

export async function deleteEdit(id) {
	closeMessage();
	startLoadingScreen();

	await update(`destinations/${DOCUMENT_ID}`, {
		[`${ACTIVE_CATEGORY}.${id}`]: firebase.firestore.FieldValue.delete(),
	});

	await refreshDestination();
	stopLoadingScreen();
}

// Cancel Actions
function abortEdit(title, message) {
	displayMessage(translate(title), translate(message));
	adjustEditVisibility();
	resetActivePlannedDestination();
}

function editError(message = 'messages.errors.unknown') {
	abortEdit('messages.errors.load_title', message);
}

function editForbidden(message = 'messages.access_denied.message.edit') {
	abortEdit('messages.access_denied.title', message);
}

export function closeAddedDestination(index?) {
	if (!ADDED_J) {
		return;
	}
	removeEl(`destinations-box-${ADDED_J}`);
	adjustEditVisibility();
	ADDED_J = null;
	resetActivePlannedDestination();
}

function restoreAccordionBody(j: number, item: Record<string, any>): void {
	const id = getDestinationID(j);
	const planned = getPlanned(id);
	const editBtn = true;
	getID(`accordion-body-${j}`)!.innerHTML = getDestinationsAccordionBodyHTML({
		j,
		item,
		planned,
		editBtn,
		values: undefined as any,
		currency: undefined as any,
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
	return accordionBody.querySelector('.edit-title-container') != undefined;
}

async function canEdit() {
	const uid = await getUID();
	if (!uid) {
		return false;
	}
	return FIRESTORE_DESTINATIONS_DATA.sharing.owner === uid;
}
