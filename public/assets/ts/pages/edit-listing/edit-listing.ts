import {
	getState,
	setState,
	DOCUMENT_ID,
	DESTINATIONS,
	FIRESTORE_NEW_DATA,
	SUCCESSFUL_SAVE,
	setDocumentId,
	setDestinations,
	setFirestoreNewData,
} from '../../data/state.js';
import { startLoadingScreen, stopLoadingScreen } from '../../utils/loading.js';
import {
	cloneObject,
	getChildIDs,
	getID,
	getURLParam,
	setRequired,
} from '../../utils/dom.js';
import { deleteUserObjectDB, deleteDocument, getPermissions, getSingleData, getUserDestinationSummaries, COLLECTION, SUBCOLLECTION } from '../../data/firebase/database.js';
import { getUserData, getUID, setUserData, USER_DATA } from '../../data/firebase/auth.js';
import {
	deleteUserObjectStorage,
	loadImageSelector,
	loadLogoSelector,
	setPermissions,
} from '../../data/firebase/storage.js';
import { hasUnsavedChanges, snapshotFormState } from '../../ui/fields.js';
import { loadEditModule, searchDestinationsListenerAction } from '../../theme/visibility.js';
import { translate } from '../../i18n/translation.js';
import { displayFullMessage, MESSAGE_PROPERTIES, registerActions } from '../../utils/messages.js';
import { loadVisibilityIndex } from '../home/support/visibility.js';

var FIRESTORE_PROTECTED_DATA = {};

startLoadingScreen();

import { loadEditListingListeners } from './support/event-listeners.js';
import {
	buildSharingObject,
	buildDestinationsArray,
	buildImageObject,
	buildLinksObject,
} from './support/build-listing-objects.js';

import { loadUploadSelector } from '../../data/firebase/storage.js';
import { loadListData } from './existing-listing.js';
import { autoFillDarkColor, buildColorPresets } from '../edit-trip/categories/customization.js';
import { loadDestinations } from '../edit-trip/new-trip.js';
import { setDocument } from '../../utils/set.js';
import { initEditTabs } from '../../ui/edit-tabs.js';
import { enhanceAllColorPickers } from '../../ui/color-picker-hex.js';

export async function loadEditListingPage() {
	loadEditListingListeners();

	// Register string-based button actions used in modals
	registerActions({ deleteListagemAction });

	setDocumentId(getURLParam('l'));
	populateDevPage();

	setPermissions(await getPermissions());

	loadVisibilityIndex();
	initEditTabs();
	loadHabilitados();

	setUserData(await getUserData());
	const destSummaries = await getUserDestinationSummaries(await getUID());
	setDestinations(destSummaries.sort((a: any, b: any) => a.title.localeCompare(b.title)));

	if (DOCUMENT_ID) {
		await carregarListagem();
	} else {
		loadDestinations();
	}

	loadImageSelector('background');
	loadLogoSelector();

	loadEventListeners();
	buildColorPresets();
	stopLoadingScreen();
	snapshotFormState();

	enhanceAllColorPickers();

	$('body').css('overflow', 'auto');

	populateDevPage();
}

function loadHabilitados() {
	loadEditModule('images');
	loadEditModule('colors', () => {});
	loadEditModule('links');
}

function loadUploadSelectors() {
	loadUploadSelector('background');
	loadUploadSelector('logo');
}

function loadEventListeners() {
	getID('cancel-btn').addEventListener('click', () => {
		window.location.href = '../index.html';
	});

	getID('save-btn').addEventListener('click', () => {
		setListagem();
	});

	getID('destinations-search').addEventListener('input', () => searchDestinationsListenerAction());

	window.addEventListener('beforeunload', (event) => {
		if (hasUnsavedChanges() && !SUCCESSFUL_SAVE) {
			event.preventDefault();
			event.returnValue = translate('messages.exit_confirmation');
		}
	});
	getID('light-color').addEventListener('change', () => autoFillDarkColor());
}

async function carregarListagem() {
	getID('delete-text').style.display = 'block';
	startLoadingScreen();

	setState(await getSingleData('listings'));

	await loadListData(getState());
	stopLoadingScreen();
	populateDevPage();
}

async function buildListObject() {
	setFirestoreNewData({
		sharing: await buildSharingObject(),
		colors: {
			active: getID('colors-enabled').checked,
			light: getID('light-color').value,
			dark: getID('dark-color').value,
		},
		description: getID('description').value,
		destinations: buildDestinationsArray(),
		image: buildImageObject(),
		links: buildLinksObject(),
		subtitle: getID('subtitle').value,
		title: getID('title').value,
		version: {
			lastUpdated: new Date().toISOString(),
			showInDestinations: getID('show-in-destinations').checked,
		},
	});
}

function getIgnoredPathDestinos() {
	if (!getState()) return [];
	let result = [];
	const dests = getState().destinations || getState().destinationRefs;
	for (let i = 0; i < dests.length; i++) {
		result.push(`destinations.${i}.destinations`);
	}
	return result;
}

async function setListagem() {
	for (const child of getChildIDs('has-destinations')) {
		const i = parseInt(child.split('-')[2]);
		setRequired(`select-destinations-${i}`);
	}

	const type = 'listings';
	const dataBuildingFunctions = [buildListObject];
	await setDocument({ type, dataBuildingFunctions });
}

export function deleteListagem() {
	let listing = getID('title').value;
	listing = listing ? ` "${listing}"` : '';

	const properties = cloneObject(MESSAGE_PROPERTIES);
	properties.title = translate('listing.delete.title');
	properties.content = translate('listing.delete.message', {
		name: listing.replace(/^ "|"$/g, ''),
	});
	properties.botoes = [
		{
			type: 'cancel',
		},
		{
			type: 'confirm',
			action: 'deleteListagemAction()',
		},
	];

	displayFullMessage(properties);
}

export async function deleteListagemAction() {
	if (DOCUMENT_ID) {
		await deleteUserObjectDB(DOCUMENT_ID, 'listings');
		await deleteUserObjectStorage();

		// Also delete the listing summary from the user subcollection
		const uid = await getUID();
		if (uid) {
			try {
				await deleteDocument(
					`${COLLECTION.USERS}/${uid}/${SUBCOLLECTION.LISTING_SUMMARIES}/${DOCUMENT_ID}`,
					true,
				);
			} catch (e) {
				console.warn('Failed to delete listing summary:', e);
			}
		}

		window.location.href = '../index.html';
	}
}

/** Populate dev.page.* with useful references (only on localhost). */
function populateDevPage() {
	const dev = (window as any).dev;
	if (!dev?.isEnabled) return;
	const page = dev.page;

	page.type = 'edit-listing';
	page.docId = DOCUMENT_ID;

	// ── Raw data fetched from Firestore (existing listing) ──
	page.state = getState();

	// ── Reference data ──
	page.destinations = DESTINATIONS;

	// ── New data object built on save (live getter so it reflects the latest value) ──
	Object.defineProperty(page, 'newData', {
		get() { return FIRESTORE_NEW_DATA; },
		enumerable: true,
		configurable: true,
	});

	page.successfulSave = SUCCESSFUL_SAVE;

	console.log(
		'%c[DEV]%c dev.page populated for edit-listing — type %cdev.page%c to explore',
		'color:#f0c040;font-weight:bold;',
		'',
		'font-weight:bold;',
		'',
	);
}
