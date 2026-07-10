import { startLoadingScreen, stopLoadingScreen } from '../../utils/loading.js';
import {
	closeMessage,
	displayError,
	displayFullMessage,
	getContainersInput,
} from '../../utils/messages.js';
import { getTodayFormatted, getTomorrowFormatted } from '../../utils/dates.js';
import {
	cloneObject,
	firstCharToUpperCase,
	getID,
	getLastJ,
	getURLParam,
	removeChildWithValidation,
	removeRequired,
	setRequired,
} from '../../utils/dom.js';
import {
	addRemoveChildListenerDS,
	buildDS,
	newDynamicSelect,
	removeSelectorDS,
	updateValueDS,
} from '../../ui/dynamic-select.js';
import {
	hasUnsavedChanges,
	snapshotFormState,
	validateInstagramLink,
	validateLink,
	validateMapLink,
	validateMediaLink,
} from '../../ui/fields.js';
import { hideContent, loadEditModule, showContent } from '../../theme/visibility.js';
import { closeAccordions, openLastAccordion } from '../../ui/accordion.js';
import { translate } from '../../i18n/translation.js';
import { deleteUserObjectDB, getSingleData } from '../../data/firebase/database.js';
import { loadVisibilityIndex } from '../home/support/visibility.js';
import { loadEditDestinationListeners } from './support/event-listeners.js';
import { getVisibility } from '../../theme/theme.js';
import { populateExistingDestinationForm } from './existing-destination.js';
import { getDescription } from './categories/description.js';
import { setDescription } from './categories/description.js';
import { updateDescriptionButtonLabel } from './categories/description.js';
import { loadCurrencySelects } from './categories/price.js';
import { addDestination } from './existing-destination.js';
import { addDestinationHTML } from './existing-destination.js';
import { addSnacks } from './new-destination.js';
import { addShopping } from './new-destination.js';
import { addRestaurants } from './new-destination.js';
import { addNightlife } from './new-destination.js';
import { addTourism } from './new-destination.js';
import { setDocumento } from '../../utils/set.js';
import { buildDestinationObject, updateTikTokLinks } from './set-destination.js';
import {
	FIRESTORE_DESTINATIONS_DATA,
	FIRESTORE_DESTINATIONS_NEW_DATA,
	SUCCESSFUL_SAVE,
	DOCUMENT_ID,
	setDocumentId,
	setFirestoreDestinationsData,
	getState,
} from '../../data/state.js';
import { MESSAGE_PROPERTIES } from '../../utils/messages.js';
import { initEditTabs } from '../../ui/edit-tabs.js';

const TODAY = getTodayFormatted();
const TOMORROW = getTomorrowFormatted();

var SCHEDULE = {};

var REGIONS = [];

export async function loadEditDestinationPage() {
	loadEditDestinationListeners();

	setDocumentId(getURLParam('d'));
	populateDevPage();

	loadVisibilityIndex();
	initEditTabs();
	loadEnabled();
	newDynamicSelect('region');

	if (DOCUMENT_ID) {
		await loadDestinations();
	}

	loadEventListeners();
	stopLoadingScreen();
	snapshotFormState();
	$('body').css('overflow', 'auto');

	populateDevPage();
}

function loadEnabled() {
	loadEditModule('restaurants');
	loadEditModule('snacks');
	loadEditModule('nightlife');
	loadEditModule('tourism');
	loadEditModule('shopping');
	loadEditModule('map');

	const mapCheckbox = getID('map-enabled');
	mapCheckbox.addEventListener('change', function () {
		if (mapCheckbox.checked) {
			setRequired('map-link');
		} else {
			removeRequired('map-link');
		}
	});
}

function loadEventListeners() {
	getID('restaurants-add').addEventListener('click', () => {
		closeAccordions('restaurants');
		addRestaurants();
		openLastAccordion('restaurants');
		buildDS('region');
	});

	getID('snacks-add').addEventListener('click', () => {
		closeAccordions('snacks');
		addSnacks();
		openLastAccordion('snacks');
		buildDS('region');
	});

	getID('nightlife-add').addEventListener('click', () => {
		closeAccordions('nightlife');
		addNightlife();
		openLastAccordion('nightlife');
		buildDS('region');
	});

	getID('tourism-add').addEventListener('click', () => {
		closeAccordions('tourism');
		addTourism();
		openLastAccordion('tourism');
		buildDS('region');
	});

	getID('shopping-add').addEventListener('click', () => {
		closeAccordions('shopping');
		addShopping();
		openLastAccordion('shopping');
		buildDS('region');
	});

	getID('save-btn').addEventListener('click', () => {
		startLoadingScreen();
		const type = 'destinations';
		const dataBuildingFunctions = [buildDestinationObject, updateTikTokLinks];

		setDocumento({ type, dataBuildingFunctions });
	});

	getID('cancel-btn').addEventListener('click', () => {
		window.location.href = `../index?visibility=${getVisibility()}`;
	});

	getID('currency').addEventListener('change', () => {
		if (getID('currency').value == 'other') {
			getID('other-currency').style.display = 'block';
		} else {
			getID('other-currency').style.display = 'none';
		}
		loadCurrencySelects();
	});

	getID('other-currency').addEventListener('change', () => {
		loadCurrencySelects();
	});

	window.addEventListener('beforeunload', (event) => {
		if (hasUnsavedChanges() && !SUCCESSFUL_SAVE) {
			event.preventDefault();
			event.returnValue = translate('messages.exit_confirmation');
		}
	});
}

export function addListenerToRemoveDestination(category, j) {
	const dynamicSelects = [
		{
			type: 'region',
			selectID: `${category}-region-select-${j}`,
		},
	];
	addRemoveChildListenerDS(category, j, dynamicSelects);
}

async function loadDestinations() {
	getID('delete-text').style.display = 'block';
	startLoadingScreen();

	const singleData = await getSingleData('destinations');
	setFirestoreDestinationsData(singleData);

	populateExistingDestinationForm();
	stopLoadingScreen();
	populateDevPage();
}

// Listeners
export function addDestinationsListeners(category, j) {
	// Interactive Title
	getID(`${category}-name-${j}`).addEventListener('change', () =>
		updateDestinationsTitle(j, category),
	);
	getID(`${category}-emoji-${j}`).addEventListener('change', () =>
		updateDestinationsTitle(j, category),
	);
	getID(`${category}-isNew-${j}`).addEventListener('click', () =>
		updateDestinationsTitle(j, category),
	);

	// Emoji Validation
	getID(`${category}-emoji-${j}`).addEventListener('input', () => emojisOnInputAction(j, category));

	// Price
	getID(`${category}-price-${j}`).addEventListener('change', () =>
		priceListenerAction(j, category),
	);

	// Region

	// Links
	getID(`${category}-website-${j}`).addEventListener('change', () =>
		validateLink(`${category}-website-${j}`),
	);
	getID(`${category}-map-${j}`).addEventListener('change', () =>
		validateMapLink(`${category}-map-${j}`),
	);
	getID(`${category}-instagram-${j}`).addEventListener('change', () =>
		validateInstagramLink(`${category}-instagram-${j}`),
	);
	getID(`${category}-media-${j}`).addEventListener('change', () =>
		validateMediaLink(`${category}-media-${j}`),
	);
}

function priceListenerAction(j, category) {
	const price = getID(`${category}-price-${j}`);
	const otherPrice = getID(`${category}-other-price-${j}`);

	if (price.value == 'other') {
		otherPrice.style.display = 'block';
		otherPrice.required = true;
	} else {
		otherPrice.style.display = 'none';
		otherPrice.required = false;
	}
}

export function updateDestinationsTitle(j, category) {
	const titleDiv = getID(`${category}-title-text-${j}`);
	const emojiDiv = getID(`${category}-emoji-${j}`);

	const name = getID(`${category}-name-${j}`).value;
	const emoji = emojiDiv.value ? emojiDiv.value.replace(/[a-zA-Z0-9\s!-\/:-@\[-`{-~]/g, '') : '';

	if (emoji && name) {
		titleDiv.innerText = `${name} ${emoji}`;
	} else if (name) {
		titleDiv.innerText = name;
	}

	getID(`${category}-title-icon-${j}`).style.display = getID(`${category}-isNew-${j}`).checked
		? 'block'
		: 'none';
}

export function emojisOnInputAction(j, category) {
	const emojiDiv = getID(`${category}-emoji-${j}`);
	const emojiUntreated = emojiDiv.value;
	const emojiTreated = emojiUntreated
		? emojiUntreated.replace(/[a-zA-Z0-9\s!-\/:-@\[-`{-~]/g, '')
		: '';

	if (emojiTreated && emojiUntreated && emojiTreated !== emojiUntreated) {
		emojiDiv.value = emojiTreated;
	} else if (!emojiTreated && emojiUntreated) {
		emojiDiv.value = '';
		emojiDiv.placeholder = translate('destination.errors.invalid_emoji');
	}
}

export function openMoveDestinationModal(j, category) {
	const properties = cloneObject(MESSAGE_PROPERTIES);

	properties.title =
		getID(`${category}-name-${j}`).value ||
		translate('destination.move.title', {
			category: firstCharToUpperCase(category),
		});
	properties.containers = getContainersInput();
	properties.botoes = [
		{
			type: 'cancel',
		},
		{
			type: 'confirm',
			action: `moveDestination(${j}, '${category}')`,
		},
	];

	const options: Record<string, string> = {};
	for (const cat of ['restaurants', 'snacks', 'nightlife', 'tourism', 'shopping']) {
		options[cat] = translate(`destination.${cat}.title`);
	}

	let optionsString = '';

	for (const option in options) {
		if (option != category) {
			optionsString += `<option value="${option}">${options[option]}</option>`;
		}
	}

	properties.content = `
  <div class="nice-form-group"">
    <label>${translate('destination.move.label')}</label>
      <select class="edit-select" id="move-select">
        ${optionsString}
      </select>
  </div>`;

	displayFullMessage(properties);
}

export function moveDestination(j, category) {
	const newCategory = getID('move-select').value;
	const description = getDescription(category, j);

	if (category != newCategory) {
		const destination = {
			isNew: getID(`${category}-isNew-${j}`).checked,
			name: getID(`${category}-name-${j}`).value,
			emoji: getID(`${category}-emoji-${j}`).value,
			website: getID(`${category}-website-${j}`).value,
			map: getID(`${category}-map-${j}`).value,
			instagram: getID(`${category}-instagram-${j}`).value,
			region: getID(`${category}-region-select-${j}`).value,
			price: getID(`${category}-price-${j}`).value,
			media: getID(`${category}-media-${j}`).value,
			rating: getID(`${category}-rating-${j}`).value,
		};

		const newJ = getLastJ(`${newCategory}-box`) + 1;

		addDestination(newCategory);
		addDestinationHTML(newCategory, newJ, destination);
		setDescription(newCategory, newJ, description);
		removeChildWithValidation(category, j);

		removeSelectorDS('region', `${category}-region-select-${j}`);
		updateValueDS('region', destination.region, `${newCategory}-region-select-${newJ}`);
		buildDS('region');

		updateDescriptionButtonLabel(newCategory, newJ);

		if (getID(`enabled-${newCategory}-content`).children.length === 1) {
			getID(`enabled-${newCategory}`).checked = true;
			showContent(newCategory);
		}

		if (getID(`enabled-${category}-content`).children.length === 0) {
			getID(`enabled-${category}`).checked = false;
			hideContent(category);
		}
	}

	closeMessage();
}

export function deleteDestination() {
	const name = getID('title').value;

	const properties = cloneObject(MESSAGE_PROPERTIES);
	properties.title = translate('destination.delete.title');
	properties.content = translate('destination.delete.message', { name });
	properties.botoes = [
		{
			type: 'cancel',
		},
		{
			type: 'confirm',
			action: 'deleteDestinationAction()',
		},
	];

	displayFullMessage(properties);
}

export async function deleteDestinationAction() {
	if (DOCUMENT_ID) {
		await deleteUserObjectDB(DOCUMENT_ID, 'destinations');
		window.location.href = `../index?visibility=${getVisibility()}`;
	}
}

function getDestinationID(category, j) {
	return getID(`${category}-id-${j}`).value;
}

/** Populate dev.page.* with useful references (only on localhost). */
function populateDevPage() {
	const dev = (window as any).dev;
	if (!dev?.isEnabled) return;
	const page = dev.page;

	page.type = 'edit-destination';
	page.docId = DOCUMENT_ID;

	// ── Raw data fetched from Firestore (existing destination) ──
	page.state = getState();
	page.destinationsData = FIRESTORE_DESTINATIONS_DATA;

	// ── New data object built on save ──
	page.newData = FIRESTORE_DESTINATIONS_NEW_DATA;

	page.successfulSave = SUCCESSFUL_SAVE;

	console.log(
		'%c[DEV]%c dev.page populated for edit-destination — type %cdev.page%c to explore',
		'color:#f0c040;font-weight:bold;',
		'',
		'font-weight:bold;',
		'',
	);
}
