import { getCurrencies, getDestinations, getItinerary } from '../../../../../app/config.js';
import { getDateTitle, jsDateToKey } from '../../../../../utils/dates.js';
import { cloneObject, getCategoryLegJs, getDestinationTitle, getID, getInnerItineraryTitleHTML } from '../../../../../utils/dom.js';
import {
	getDescriptionValue,
	getEntryMapLinks,
	getPriceValue,
	getRatingTranslation,
} from '../../../../../models/destination.model.js';
import { getMapLinksMenuHTML, initMapLinksMenus } from '../../../../../ui/map-links-menu.js';
import {
	closeMessage,
	displayFullMessage,
	getContainersInput,
	MESSAGE_PROPERTIES,
} from '../../../../../utils/messages.js';
import { getSelectCurrentLabel } from '../../../../../ui/fields.js';
import { translate } from '../../../../../i18n/translation.js';
import { animate } from '../../../../../theme/animations.js';
import { getDestination } from '../../../../../data/firebase/database.js';
import { ACTIVE_DESTINATIONS } from '../../destination.js';
import { DATAS } from '../../../new-trip.js';
import { DESTINOS_DATA, getDestinationsFromCards } from '../../destination.js';
import { getInnerItineraryContent } from './content.js';
import { loadTextReplacementCheckboxes, TEXT_REPLACEMENT } from './text-replacement.js';
import { replaceTextIfEnabled } from './text-replacement.js';
import { replaceTimeIfEnabled } from './text-replacement.js';
import { getActiveDestinations } from '../itinerary-module.js';
import { enableAllTravelersFieldset } from '../../travelers.js';
import { getCheckedTravelersIDs } from '../../travelers.js';
import { updateTravelersFieldset } from '../../travelers.js';
import { validateTravelersFieldset } from '../../travelers.js';
import { getDataSelectOptions } from '../../../edit-trip.js';
import {
	excludeAutoKey,
	getAutoKeysForEntry,
	getAutoKeySource,
} from './auto-excluded.js';

export var INNER_ITINERARY = {};
var INNER_ITINERARY_DESTINATIONS_DATA = {};
var LAST_OPENED_PERIOD = {};
var INNER_ITINERARY_IS_NEW = false;
/** Rating tints shared with the destination page cards (.rating-N in edit.css). */
const DESTINATION_PICKER_RATINGS = ['1', '2', '3', '4', '5'];
/**
 * Destination picker state. `open` is tracked here instead of by reading the
 * panel's inline display: `animate()` only hides the faded-out panel ~250ms
 * after the swap starts, so display checks lag behind the real screen.
 */
var INNER_ITINERARY_PICKER = { open: false, j: 0, category: '' };
/**
 * Detail screen state, opened from a picker card's info button. Same reason for
 * tracking `open` here: the panel is hidden by `animate()` only after the fade.
 */
var INNER_ITINERARY_DETAIL = { open: false, id: '', category: '', image: 0 };
var INNER_ITINERARY_IS_LINK_SCREEN = false;

// Main Loading
export function loadInnerItineraryHTML(j) {
	const key = jsDateToKey(DATAS[j - 1]);
	if (Object.keys(INNER_ITINERARY).length == 0 || !INNER_ITINERARY[key]) return;

	getID(`inner-itinerary-early-morning-${j}`).innerHTML = '';
	getID(`inner-itinerary-morning-${j}`).innerHTML = '';
	getID(`inner-itinerary-afternoon-${j}`).innerHTML = '';
	getID(`inner-itinerary-night-${j}`).innerHTML = '';

	for (let period in INNER_ITINERARY[key]) {
		const periodData = INNER_ITINERARY[key][period];
		const periodHTML = period.replace(/([A-Z])/g, '-$1').toLowerCase();
		for (let k = 1; k <= periodData.length; k++) {
			const dataEntry = periodData[k - 1];
			const div = getID(`inner-itinerary-${periodHTML}-${j}`);

			if (dataEntry.label) {
				div.innerHTML += `<div class='input-button-container'>
                                    <button id="input-button-${periodHTML}-${j}-${k}" class="btn input-button draggable" data-action="open-inner-itinerary-detail" data-j="${j}" data-k="${k}" data-period="${period}">
                                        ${getInnerItineraryTitleHTML(dataEntry, 'inner-itinerary-highlight')}
                                    </button>
                                    <i class="iconify drag-icon" data-icon="mdi:drag"></i>
                                </div>`;
			}

			getID(`itinerary-${periodHTML}-${j}`).style.display = div.innerHTML ? 'block' : 'none';
		}
	}
}

/**
 * Periods of the day with the given date key (YYYYMMDD), creating the day
 * structure when nothing was loaded for it — a day of the trip's range without
 * a stored document, or a day created by a duration change. Without this, the
 * pushes/splices that store an item threw on those days and the edit was
 * silently dropped.
 */
export function ensureInnerItineraryDay(key: string) {
	if (!INNER_ITINERARY[key]) {
		INNER_ITINERARY[key] = { earlyMorning: [], morning: [], afternoon: [], night: [] };
	}
	return INNER_ITINERARY[key];
}

// Carregamento Interno (Modal)
export async function openInnerItinerary(j, k?, period?) {
	const selects = getInnerItinerarySelects(j);
	const isNew = !k && !period;
	INNER_ITINERARY_IS_NEW = isNew;
	INNER_ITINERARY_PICKER.open = false;
	INNER_ITINERARY_DETAIL.open = false;
	INNER_ITINERARY_IS_LINK_SCREEN = false;

	const properties = cloneObject(MESSAGE_PROPERTIES);
	properties.title = getInnerItineraryMessageTitle(j);
	properties.containers = getContainersInput();
	properties.fullscreen = true;
	properties.content = getInnerItineraryContent(j, k, period, selects, isNew);
	properties.icons = [{ type: 'goBack', action: `closeInnerItinerary(${j})` }];
	properties.buttons = [
		{
			type: 'cancel',
		},
		{
			type: 'confirm',
			action: `innerItineraryConfirmAction(${j}, ${k}, '${period}')`,
		},
	];

	displayFullMessage(properties);

	const activeDestinations = getActiveDestinations(j);
	if (activeDestinations.length === 1) {
		getID('inner-itinerary-item-destinations-location').style.display = 'none';
		getID('inner-itinerary-item-destinations-radio-label').innerText = getSelectCurrentLabel(
			getID(`inner-itinerary-select-location`),
		);
	}

	await loadInnerItineraryListeners(j);
	enableAllTravelersFieldset('inner-itinerary-travelers');
	await loadInnerItineraryCurrentData(j, k, period, isNew);
	loadInnerItineraryEventListeners(j);
}

// Selects
function getInnerItinerarySelects(j) {
	return {
		transportation: getInnerItinerarySelect('transportation'),
		accommodations: getInnerItinerarySelect('accommodations'),
		destinations: getInnerItinerarySelectsDestinations(j),
		dates: getDataSelectOptions(j),
	};
}

function getInnerItinerarySelect(type) {
	let active = false;
	let options = '';

	// Query the actual leg/accommodation items (.inner-box) instead of the box's
	// direct children: in leg/people view the legs are re-wrapped inside
	// .transportation-group containers, so iterating box.children yields group
	// ids (e.g. transportation-group-items-<key>) with no matching title element.
	for (const j of getCategoryLegJs(type)) {
		const title = getID(`${type}-title-${j}`);
		const idInput = getID(`${type}-id-${j}`);
		if (!title || !idInput) continue;

		const label = title.innerText;
		const id = idInput.value;
		if (id && label) {
			active = true;
			options += `<option value="${id}">${label}</option>`;
		}
	}

	return {
		active: active,
		options: options,
	};
}

function getInnerItinerarySelectsDestinations(j) {
	if (getID('destinations-enabled').checked === false || ACTIVE_DESTINATIONS.length === 0)
		returnFalse();
	const destinations = getDestinationsFromCards('itinerary', j);
	if (destinations.length === 0) returnFalse();

	let options = '';
	let active = false;
	for (const strippedData of destinations) {
		const id = strippedData.destinationId;
		if (!id) continue;
		active = true;
		options += `<option value="${id}">${strippedData.title}</option>`;
	}

	return { active, options };
	function returnFalse() {
		const active = false;
		return { active };
	}
}

// Load current data into Modal
async function loadInnerItineraryCurrentData(j, k, period, isNew) {
	if (period) {
		getID('inner-itinerary-select-period').value = period;
		getID('inner-itinerary-select-swap-period').value = period;
		LAST_OPENED_PERIOD[j] = period;
	}

	const key = jsDateToKey(DATAS[j - 1]);
	if (
		!isNew &&
		INNER_ITINERARY &&
		INNER_ITINERARY[key] &&
		INNER_ITINERARY[key][period] &&
		INNER_ITINERARY[key][period][k - 1]
	) {
		const dataEntry = INNER_ITINERARY[key][period][k - 1];

		getID(`inner-itinerary`).value = dataEntry.label;
		getID(`inner-itinerary-start`).value = dataEntry.start;
		getID(`inner-itinerary-end`).value = dataEntry.end;
		updateTravelersFieldset('inner-itinerary-travelers', dataEntry.travelers || dataEntry.people || []);
		syncInnerItineraryButton();

		switch (dataEntry?.item?.type) {
			case 'transportation':
				getID(`inner-itinerary-item-transportation-radio`).checked = true;
				getID(`inner-itinerary-item-transportation`).style.display = 'block';
				getID(`inner-itinerary-select-transportation`).value = dataEntry.item.id;
				break;
			case 'accommodations':
				getID(`inner-itinerary-item-accommodations-radio`).checked = true;
				getID(`inner-itinerary-item-accommodations`).style.display = 'block';
				getID(`inner-itinerary-select-accommodations`).value = dataEntry.item.id;
				break;
			case 'destinations':
				getID(`inner-itinerary-item-destinations-radio`).checked = true;
				getID('inner-itinerary-item-destinations').style.display = 'block';

				getID(`inner-itinerary-select-location`).value = dataEntry.item.location;
				await innerItinerarySelectLocationAction();

				getID(`inner-itinerary-select-category`).value = dataEntry.item.category;
				await innerItinerarySelectCategoryAction();

				const tour = dataEntry.item.id;
				if (tour) {
					getID(`inner-itinerary-select-tour`).value = tour;
				}
				break;
			default:
				getID(`inner-itinerary-item-none-radio`).checked = true;
		}
	} else if (isNew) {
		const selectPeriod = getID('inner-itinerary-select-period');
		selectPeriod.value = getNewPeriod(j);
		LAST_OPENED_PERIOD[j] = selectPeriod.value;
	}

	syncInnerItineraryButton();
	syncInnerItineraryConfirmButton();
}

// Modal Navigation
export async function openInnerItineraryItem(j) {
	const height = getID('inner-itinerary-main-screen').offsetHeight;
	const itemSelect = getID('inner-itinerary-select-item');
	itemSelect.style.minHeight = `${height}px`;

	getID('message-title').innerText = translate('trip.itinerary.title');

	animate(['inner-itinerary-select-item'], ['inner-itinerary-main-screen']);
	getID('back-icon').style.visibility = 'visible';
	itemSelect.scrollTop = 0;
	INNER_ITINERARY_IS_LINK_SCREEN = true;

	// Brand-new entries have no linked item yet — default to the "none" radio
	// (without overriding a selection the user makes on a later visit).
	if (INNER_ITINERARY_IS_NEW) {
		const radios = Array.from(document.getElementsByName('inner-itinerary-item-radio'));
		const hasSelection = radios.some((radio) => (radio as HTMLInputElement).checked);
		if (!hasSelection) {
			getID('inner-itinerary-item-none-radio').checked = true;
		}
	}

	loadTextReplacementCheckboxes(j);
	TEXT_REPLACEMENT.applied = false;
	syncInnerItineraryConfirmButton();
}

export function openInnerItinerarySwap() {
	const height = getID('inner-itinerary-main-screen').offsetHeight;
	const itemSwap = getID('inner-itinerary-swap-item');
	itemSwap.style.minHeight = `${height}px`;

	getID('message-title').innerText = translate('trip.itinerary.swap_title');
	animate(['inner-itinerary-swap-item'], ['inner-itinerary-main-screen']);
	getID('back-icon').style.visibility = 'visible';
	INNER_ITINERARY_IS_LINK_SCREEN = false;
}

export function closeInnerItinerary(j) {
	if (INNER_ITINERARY_DETAIL.open) {
		INNER_ITINERARY_DETAIL.open = false;
		getID('message-title').innerText = translate('trip.itinerary.pick_destination');
		getID('back-icon').style.visibility = 'visible';

		syncInnerItineraryConfirmButton();
		animate(['inner-itinerary-destination-picker'], ['inner-itinerary-destination-detail']);
		return;
	}

	if (INNER_ITINERARY_PICKER.open) {
		INNER_ITINERARY_PICKER.open = false;
		INNER_ITINERARY_IS_LINK_SCREEN = true;
		getID('message-title').innerText = translate('trip.itinerary.title');
		getID('back-icon').style.visibility = 'visible';

		syncInnerItineraryConfirmButton();
		animate(['inner-itinerary-select-item'], ['inner-itinerary-destination-picker']);
		return;
	}

	if (getID('inner-itinerary-select-item').style.display === 'block') {
		INNER_ITINERARY_IS_LINK_SCREEN = false;
		getID('message-title').innerText = getInnerItineraryMessageTitle(j);
		getID('back-icon').style.visibility = 'hidden';

		replaceTextIfEnabled();
		replaceTimeIfEnabled();
		syncInnerItineraryButton();
		syncInnerItineraryConfirmButton();
		TEXT_REPLACEMENT.applied = true;

		animate(['inner-itinerary-main-screen'], ['inner-itinerary-select-item']);
	} else if (getID('inner-itinerary-swap-item').style.display === 'block') {
		INNER_ITINERARY_IS_LINK_SCREEN = false;
		getID('message-title').innerText = getInnerItineraryMessageTitle(j);
		getID('back-icon').style.visibility = 'hidden';

		animate(['inner-itinerary-main-screen'], ['inner-itinerary-swap-item']);
	}
}

// Keep the main-screen "Itinerary" button in sync with the title input
// (which lives on the link-item screen).
function syncInnerItineraryButton() {
	const button = getID('inner-itinerary-button');
	const value = getID('inner-itinerary').value.trim();
	button.classList.toggle('placeholder-text', !value);
	button.textContent = value || translate('trip.itinerary.placeholder');
}

function getInnerItineraryMessageTitle(j) {
	const newJ = getMostRecentJ(j);
	return getDateTitle(DATAS[newJ - 1], 'mini');
}

/**
 * True while the link screen is asking for a destination item: the user picked
 * the "destinations" radio but no item yet, so the confirm button opens the
 * focused picker instead of saving. The destination document may still be
 * loading, in which case the button stays on "Confirm" until the categories
 * arrive (see innerItinerarySelectLocationAction).
 */
function isInnerItineraryDestinationPickerPending() {
	if (!INNER_ITINERARY_IS_LINK_SCREEN || INNER_ITINERARY_PICKER.open) return false;
	if (!getID('inner-itinerary-item-destinations-radio')?.checked) return false;
	if (getID('inner-itinerary-item-destinations').style.display !== 'block') return false;
	if (getID('inner-itinerary-select-tour').value) return false;

	const data = INNER_ITINERARY_DESTINATIONS_DATA[getID('inner-itinerary-select-location').value];
	return !!data?.categories?.length;
}

/**
 * The confirm button is created once per dialog and its click is bound to
 * innerItineraryConfirmAction, so the "Next" label is applied here (visually)
 * while the action itself branches on the same state. It is hidden while the
 * picker is open — that screen only steps back or picks — and turns into the
 * detail screen's "Choose this item" action.
 */
function syncInnerItineraryConfirmButton() {
	const button = getID('message-confirm');
	if (!button) return;

	if (INNER_ITINERARY_DETAIL.open) {
		button.style.display = '';
		button.innerHTML = translate('trip.itinerary.choose_item');
		return;
	}

	if (INNER_ITINERARY_PICKER.open) {
		button.style.display = 'none';
		return;
	}

	button.style.display = '';
	button.innerHTML = translate(
		isInnerItineraryDestinationPickerPending() ? 'labels.next' : 'labels.confirm',
	);
}

export function innerItineraryConfirmAction(j, k, period) {
	if (INNER_ITINERARY_DETAIL.open) {
		chooseInnerItineraryDestinationDetail();
		return;
	}
	if (INNER_ITINERARY_PICKER.open) {
		closeInnerItinerary(j);
		return;
	}
	if (getID('inner-itinerary-select-item').style.display === 'block') {
		if (isInnerItineraryDestinationPickerPending()) {
			openInnerItineraryDestinationPicker(j);
			return;
		}
		closeInnerItinerary(j);
		return;
	}
	if (period && period != 'undefined') {
		addInnerItinerary(j, k, period);
	} else {
		addInnerItinerary(j);
	}

	if (!getID('inner-itinerary')?.value) {
		return;
	}

	closeMessage();
}

// Save Inner Itinerary
function addInnerItinerary(j, k?, period?) {
	const itinerary = getID(`inner-itinerary`);

	if (!TEXT_REPLACEMENT.applied) {
		replaceTextIfEnabled();
		replaceTimeIfEnabled();
	}

	if (!itinerary.value || !validateTravelersFieldset('inner-itinerary-travelers')) {
		itinerary.reportValidity();
	} else {
		const innerItinerary = buildInnerItinerary(itinerary);
		setInnerItinerary(innerItinerary, j, k, period);
	}

	function buildInnerItinerary(itinerary) {
		let item = {
			type: '',
			id: '',
			location: '',
			category: '',
		};

		if (
			getID('inner-itinerary-item-transportation-radio').checked &&
			getID(`inner-itinerary-select-transportation`).value
		) {
			item.type = 'transportation';
			item.id = getID(`inner-itinerary-select-transportation`).value;
		} else if (
			getID('inner-itinerary-item-accommodations-radio').checked &&
			getID(`inner-itinerary-select-accommodations`).value
		) {
			item.type = 'accommodations';
			item.id = getID(`inner-itinerary-select-accommodations`).value;
		} else if (
			getID('inner-itinerary-item-destinations-radio').checked &&
			getID(`inner-itinerary-select-tour`).value
		) {
			item.type = 'destinations';
			item.location = getID(`inner-itinerary-select-location`).value;
			item.id = getID(`inner-itinerary-select-tour`).value;
			item.category = getID(`inner-itinerary-select-category`).value;
		}

		return {
			label: itinerary.value,
			travelers: getCheckedTravelersIDs('inner-itinerary-travelers'),
			start: getID(`inner-itinerary-start`).value,
			end: getID(`inner-itinerary-end`).value,
			item: item,
		};
	}

	function setInnerItinerary(innerItinerary, j, k, period) {
		const key = jsDateToKey(DATAS[j - 1]);
		const day = ensureInnerItineraryDay(key);
		const isNew = !k && !period;
		const newPeriod = getID(`inner-itinerary-select-period`).value;

		if (isNew) {
			// New Inner Itinerary (Addition Only)
			day[newPeriod].push(innerItinerary);
			LAST_OPENED_PERIOD[j] = newPeriod;
		} else {
			// Existing Inner Itinerary (Replacement)
			const newJ = getMostRecentJ(j);
			// The edited entry may have been fed by a transportation/accommodation.
			transferAutoOwnership(day[period][k - 1], innerItinerary);
			if (period == newPeriod && newJ == j) {
				// Simple Replacement
				day[period][k - 1] = innerItinerary;
			} else {
				// Compound Replacement
				const newKey = jsDateToKey(DATAS[newJ - 1]);
				ensureInnerItineraryDay(newKey)[newPeriod].push(innerItinerary);
				day[period].splice(k - 1, 1);
				LAST_OPENED_PERIOD[newJ] = newPeriod;
				loadInnerItineraryHTML(newJ);
			}
		}
		loadInnerItineraryHTML(j);
	}

	/**
	 * Keep an automatically added entry owned by the source that created it: the
	 * tag follows the entry while it still links the same leg or stay, and the
	 * source is remembered as excluded once the user re-purposes the entry, so
	 * the item is never recreated next to the one they made out of it.
	 */
	function transferAutoOwnership(previous, next) {
		const source = getAutoKeySource(previous?.auto);
		if (!source) return;

		if (next.item?.type === source.type && next.item?.id === source.id) {
			next.auto = previous.auto;
		} else {
			excludeAutoKey(previous.auto);
		}
	}
}

// Delete Inner Itinerary
export function deleteInnerItinerary(j, k, period) {
	const isNew = !k && !period;
	if (isNew) {
		closeMessage();
		return;
	} else {
		const key = jsDateToKey(DATAS[j - 1]);
		const [removed] = ensureInnerItineraryDay(key)[period]?.splice(k - 1, 1) || [];
		// A deleted entry must stay deleted: remember the transportation leg or
		// accommodation side behind it, so nothing brings it back.
		for (const autoKey of getAutoKeysForEntry(removed)) excludeAutoKey(autoKey);
		loadInnerItineraryHTML(j);
		closeMessage();
	}
}

/**
 * Number of inner itinerary entries linked to the given destination
 * (item.type === 'destinations' && item.location === destinationId).
 */
export function countItineraryDestinationLinks(destinationId: string): number {
	let count = 0;
	for (const key of Object.keys(INNER_ITINERARY)) {
		const day = INNER_ITINERARY[key];
		if (!day) continue;
		for (const period of Object.keys(day)) {
			const entries = day[period];
			if (!Array.isArray(entries)) continue;
			for (const entry of entries) {
				if (entry?.item?.type === 'destinations' && entry.item.location === destinationId) {
					count++;
				}
			}
		}
	}
	return count;
}

/**
 * Drops the destination reference from every inner itinerary entry linked to
 * the given destination, leaving each entry as a plain title (its schedule
 * text is kept). Returns the number of entries that were unlinked.
 */
export function unlinkItineraryDestinationLinks(destinationId: string): number {
	let count = 0;
	for (const key of Object.keys(INNER_ITINERARY)) {
		const day = INNER_ITINERARY[key];
		if (!day) continue;
		for (const period of Object.keys(day)) {
			const entries = day[period];
			if (!Array.isArray(entries)) continue;
			for (const entry of entries) {
				if (entry?.item?.type === 'destinations' && entry.item.location === destinationId) {
					entry.item = { type: '', id: '', location: '', category: '' };
					count++;
				}
			}
		}
	}
	return count;
}

// Listeners
async function loadInnerItineraryListeners(j) {
	const itemTransportation = getID(`inner-itinerary-item-transportation`);
	const itemAccommodations = getID(`inner-itinerary-item-accommodations`);
	const itemDestinations = getID(`inner-itinerary-item-destinations`);

	getID(`inner-itinerary-item-transportation-radio`).addEventListener('change', () => {
		itemTransportation.style.display = 'block';
		itemAccommodations.style.display = 'none';
		itemDestinations.style.display = 'none';
		loadTextReplacementCheckboxes(j);
		syncInnerItineraryConfirmButton();
	});

	getID(`inner-itinerary-item-accommodations-radio`).addEventListener('change', () => {
		itemTransportation.style.display = 'none';
		itemAccommodations.style.display = 'block';
		itemDestinations.style.display = 'none';
		loadTextReplacementCheckboxes(j);
		syncInnerItineraryConfirmButton();
	});

	getID(`inner-itinerary-item-destinations-radio`).addEventListener('change', () => {
		itemTransportation.style.display = 'none';
		itemAccommodations.style.display = 'none';
		itemDestinations.style.display = 'block';
		loadTextReplacementCheckboxes(j);
		syncInnerItineraryConfirmButton();
	});

	getID(`inner-itinerary-item-none-radio`).addEventListener('change', () => {
		itemTransportation.style.display = 'none';
		itemAccommodations.style.display = 'none';
		itemDestinations.style.display = 'none';
		loadTextReplacementCheckboxes(j);
		syncInnerItineraryConfirmButton();
	});

	getID(`inner-itinerary-select-location`).addEventListener('change', () =>
		innerItinerarySelectLocationAction(),
	);
	getID(`inner-itinerary-select-category`).addEventListener('change', () =>
		innerItinerarySelectCategoryAction(),
	);
	getID('inner-itinerary-select-tour').addEventListener('change', () => {
		loadTextReplacementCheckboxes(j);
		syncInnerItineraryConfirmButton();
	});

	getID('inner-itinerary-select-transportation').addEventListener('change', () =>
		loadTextReplacementCheckboxes(j),
	);
	getID('inner-itinerary-select-accommodations').addEventListener('change', () =>
		loadTextReplacementCheckboxes(j),
	);

	getID('inner-itinerary-select-period').addEventListener('change', () =>
		pairTurnos('inner-itinerary-select-period'),
	);
	getID('inner-itinerary-select-swap-period').addEventListener('change', () =>
		pairTurnos('inner-itinerary-select-swap-period'),
	);
}

async function innerItinerarySelectLocationAction() {
	const selectLocal = getID('inner-itinerary-select-location');
	const selectCategoria = getID('inner-itinerary-select-category');
	const selectPasseio = getID('inner-itinerary-select-tour');

	const id = selectLocal.value;
	const locais = await getInnerItineraryDestinationsData(id);

	if (locais) {
		selectCategoria.innerHTML =
			`<option value="">${translate('labels.select')}</option>` + locais.categoriaOptions;
	} else {
		selectCategoria.innerHTML = `<option value="">${translate('labels.no_data')}</option>`;
		selectPasseio.innerHTML = `<option value="">${translate('labels.no_data')}</option>`;
	}

	selectCategoria.addEventListener('change', () => {
		innerItinerarySelectCategoryAction();
	});

	// The confirm button turns into "Next" only once the categories are in.
	syncInnerItineraryConfirmButton();
}

async function innerItinerarySelectCategoryAction() {
	const selectLocal = getID('inner-itinerary-select-location');
	const selectCategoria = getID('inner-itinerary-select-category');
	const selectPasseio = getID('inner-itinerary-select-tour');

	const id2 = selectLocal.value;
	const locais2 = await getInnerItineraryDestinationsData(id2);

	if (
		selectLocal.value &&
		selectCategoria.value &&
		locais2?.passeioOptions?.[selectCategoria.value]
	) {
		selectPasseio.innerHTML =
			`<option value="">${translate('labels.select')}</option>` +
			locais2.passeioOptions[selectCategoria.value];
	} else {
		selectPasseio.innerHTML = `<option value="">${translate('labels.no_data')}</option>`;
	}

	syncInnerItineraryConfirmButton();
}

async function buildInnerItineraryDestinationsData(id) {
	if (INNER_ITINERARY_DESTINATIONS_DATA[id]) {
		return INNER_ITINERARY_DESTINATIONS_DATA[id];
	}

	if (!DESTINOS_DATA[id]) {
		DESTINOS_DATA[id] = await getDestination(id);
	}

	const data = DESTINOS_DATA[id];
	const titles = {
		restaurants: translate('destination.restaurants.title'),
		snacks: translate('destination.snacks.title'),
		nightlife: translate('destination.nightlife.title'),
		tourism: translate('destination.tourism.title'),
		shopping: translate('destination.shopping.title'),
	};

	const passeios = getDestinations().categories.tours;
	const categories = Object.keys(data)
		.filter(
			(key) =>
				passeios.includes(key) &&
				data[key] &&
				typeof data[key] === 'object' &&
				Object.keys(data[key]).length > 0,
		)
		.sort((a, b) => passeios.indexOf(a) - passeios.indexOf(b));

	const categoriaOptions = categories
		.map((category) => `<option value="${category}">${titles[category]}</option>`)
		.join('');

	const passeioOptions = {};
	const items = {};
	for (const category of categories) {
		const passeiosArr = Object.entries(data[category]).map(([id, value]) => ({
			id,
			...(value as any),
		}));
		passeiosArr.sort((a, b) => a.name.localeCompare(b.name));
		items[category] = passeiosArr;
		passeioOptions[category] = passeiosArr
			.map((passeio) => `<option value="${passeio.id}">${passeio.name}</option>`)
			.join('');
	}

	INNER_ITINERARY_DESTINATIONS_DATA[id] = {
		categoriaOptions,
		passeioOptions,
		categories,
		titles,
		items,
	};
	return INNER_ITINERARY_DESTINATIONS_DATA[id];
}

/** Cached destination document data, fetched (once) when still missing. */
async function getInnerItineraryDestinationsData(id) {
	if (!id) return null;
	return INNER_ITINERARY_DESTINATIONS_DATA[id] || (await buildInnerItineraryDestinationsData(id));
}

// Destination item picker (focused screen reached from the link screen)
/**
 * Focused counterpart of the destination page's grid: the document chosen on
 * the link screen is listed category by category, and picking a card fills the
 * link screen's category + item selects.
 */
export async function openInnerItineraryDestinationPicker(j) {
	const destinationId = getID('inner-itinerary-select-location').value;
	if (!destinationId) return;

	const data = await getInnerItineraryDestinationsData(destinationId);
	if (!data?.categories?.length) return;

	const selected = getID('inner-itinerary-select-category').value;
	INNER_ITINERARY_PICKER = {
		open: true,
		j,
		category: data.categories.includes(selected)
			? selected
			: getInnerItineraryCategoryOfLinkedItem(data),
	};
	INNER_ITINERARY_IS_LINK_SCREEN = false;

	const picker = getID('inner-itinerary-destination-picker');
	picker.style.minHeight = `${getID('inner-itinerary-select-item').offsetHeight}px`;

	getID('message-title').innerText = translate('trip.itinerary.pick_destination');
	getID('back-icon').style.visibility = 'visible';

	renderInnerItineraryDestinationPicker();
	syncInnerItineraryConfirmButton();
	picker.scrollTop = 0;
	animate(['inner-itinerary-destination-picker'], ['inner-itinerary-select-item']);
}

export function selectInnerItineraryDestinationCategory(category) {
	if (!INNER_ITINERARY_PICKER.open || !category) return;

	INNER_ITINERARY_PICKER.category = category;
	renderInnerItineraryDestinationPicker();
}

export async function pickInnerItineraryDestination(id, category) {
	if (!id) return;

	const j = INNER_ITINERARY_PICKER.j;
	getID('inner-itinerary-item-destinations-radio').checked = true;
	getID('inner-itinerary-item-destinations').style.display = 'block';

	if (category) {
		getID('inner-itinerary-select-category').value = category;
		await innerItinerarySelectCategoryAction();
	}
	getID('inner-itinerary-select-tour').value = id;

	// The picked item is the new title suggestion (auto-checked while the
	// entry has no title yet), and going back applies it.
	loadTextReplacementCheckboxes(j);
	closeInnerItinerary(j);
}

/**
 * Category holding the item already linked on the link screen, used as the
 * picker's initial tab when the category select is still empty (re-opening the
 * picker resets that select, but the linked item should stay in view).
 */
function getInnerItineraryCategoryOfLinkedItem(data) {
	const itemId = getID('inner-itinerary-select-tour').value;
	if (itemId) {
		const found = data.categories.find((category) =>
			(data.items[category] || []).some((item) => item.id === itemId),
		);
		if (found) return found;
	}
	return data.categories[0];
}

/**
 * Reflects the link screen's destination document in the picker: one tab per
 * non-empty category (destination page icon bar), then the cards of the active
 * category, with the already-linked check and the priority circle of the
 * destination page cards.
 */
function renderInnerItineraryDestinationPicker() {
	const destinationId = getID('inner-itinerary-select-location').value;
	const data = INNER_ITINERARY_DESTINATIONS_DATA[destinationId];
	const activeCategory = INNER_ITINERARY_PICKER.category;
	const icons = getDestinations().icons;

	const tabs = getID('inner-itinerary-destination-picker-tabs');
	const categories = data?.categories || [];
	tabs.innerHTML = categories
		.map((category) => {
			const isActive = category === activeCategory;
			const label = data.titles?.[category] || category;
			return `<button type="button" class="category-tab${isActive ? ' active' : ''}" data-category="${category}" data-action="select-itinerary-destination-category" title="${label}">
                        <i class="${icons[category] || icons['map']}"></i>
                        <span class="tab-label">${label}</span>
                    </button>`;
		})
		.join('');

	const grid = getID('inner-itinerary-destination-picker-grid');
	const items = data?.items?.[activeCategory] || [];
	grid.innerHTML = items.length
		? items
				.map((item) =>
					getInnerItineraryDestinationCardHTML(destinationId, activeCategory, item),
				)
				.join('')
		: `<p class="destination-picker-empty">${translate('labels.no_data')}</p>`;

	getID('inner-itinerary-destination-picker').scrollTop = 0;
}

function getInnerItineraryDestinationCardHTML(destinationId, category, item) {
	const link =
		(Array.isArray(item.images) ? item.images : []).find((image) => image?.link)?.link || '';
	const title = getDestinationTitle(item);
	const thumb = link
		? `<span class="image-picker-thumb destination-picker-thumb" style="background-image:url('${link.replace(/'/g, "\\'")}')"></span>`
		: `<span class="image-picker-thumb destination-picker-thumb placeholder"><i class="iconify image-picker-icon" data-icon="material-symbols:image-outline"></i></span>`;

	const check = isInnerItineraryDestinationLinked(destinationId, item.id)
		? `<span class="destination-picker-check" title="${translate('trip.itinerary.already_linked')}"><i class="iconify" data-icon="fa-solid:check"></i></span>`
		: '';
	const score = DESTINATION_PICKER_RATINGS.includes(item?.rating)
		? `<span class="destination-picker-score ${getInnerItineraryRatingClass(item.rating)}">${item.rating}</span>`
		: '';
	const isCurrent = getID('inner-itinerary-select-tour').value === item.id;
	const infoLabel = translate('trip.itinerary.see_item_info');

	// The info control is a sibling of the card button (buttons cannot nest),
	// aligned with the top-left corner of the thumb like the badges are with
	// the top-right one.
	return `<div class="destination-picker-card-box">
                <button type="button" class="image-picker-card destination-picker-card${isCurrent ? ' is-current' : ''}" data-action="pick-itinerary-destination" data-id="${escapeHtml(item.id)}" data-category="${escapeHtml(category)}">
                    ${thumb}
                    <span class="destination-picker-badges">${check}${score}</span>
                    <span class="image-picker-label" title="${escapeHtml(title)}">${title}</span>
                </button>
                <button type="button" class="destination-picker-info" data-action="open-itinerary-item-info" data-id="${escapeHtml(item.id)}" data-category="${escapeHtml(category)}" title="${escapeHtml(infoLabel)}" aria-label="${escapeHtml(infoLabel)}">
                    <i class="iconify" data-icon="mdi:information-outline"></i>
                </button>
            </div>`;
}

/** Item already linked somewhere else in this itinerary (editable entries). */
function isInnerItineraryDestinationLinked(destinationId, itemId) {
	for (const key of Object.keys(INNER_ITINERARY)) {
		const day = INNER_ITINERARY[key];
		if (!day) continue;
		for (const period of Object.keys(day)) {
			const entries = day[period];
			if (!Array.isArray(entries)) continue;
			for (const entry of entries) {
				if (
					entry?.item?.type === 'destinations' &&
					entry.item.location === destinationId &&
					entry.item.id === itemId
				) {
					return true;
				}
			}
		}
	}
	return false;
}

function getInnerItineraryRatingClass(rating) {
	return DESTINATION_PICKER_RATINGS.includes(rating) ? `rating-${rating}` : 'rating-absent';
}

// Destination item detail screen (on demand, from a picker card's info button)
/**
 * The saved info of one picker card — photo, priority, region, price,
 * description and the link buttons — reached from the card's info button so the
 * card itself stays a one-tap select. The modal's confirm button becomes
 * "Choose this item" while it is open, so the item can also be picked from here.
 */
export function openInnerItineraryDestinationDetail(id, category) {
	if (!INNER_ITINERARY_PICKER.open || !id) return;

	const item = getInnerItineraryDestinationDetailItem(id, category);
	if (!item) return;

	INNER_ITINERARY_DETAIL = { open: true, id, category, image: 0 };

	getID('message-title').innerText = translate('trip.itinerary.item_info');
	renderInnerItineraryDestinationDetail(item);
	syncInnerItineraryConfirmButton();

	const panel = getID('inner-itinerary-destination-detail');
	panel.style.minHeight = `${getID('inner-itinerary-destination-picker').offsetHeight}px`;
	panel.scrollTop = 0;
	animate(['inner-itinerary-destination-detail'], ['inner-itinerary-destination-picker']);
}

/** Picks the item being previewed, from the detail screen's confirm button. */
async function chooseInnerItineraryDestinationDetail() {
	if (!INNER_ITINERARY_DETAIL.open) return;

	const { id, category } = INNER_ITINERARY_DETAIL;
	INNER_ITINERARY_DETAIL.open = false;
	// Dropped here instead of by animate(): the grid it returns to is faded back
	// in by the picker branch of closeInnerItinerary, which only fades the
	// picker panel out, so this one would stay on top of it.
	getID('inner-itinerary-destination-detail').style.display = 'none';
	await pickInnerItineraryDestination(id, category);
}

/** Hero photo of the detail screen (only shown when the item has 2+ images). */
export function selectInnerItineraryDestinationImage(index) {
	if (!INNER_ITINERARY_DETAIL.open || isNaN(index)) return;

	const item = getInnerItineraryDestinationDetailItem();
	if (!item) return;

	INNER_ITINERARY_DETAIL.image = index;
	getID('inner-itinerary-destination-detail-media').innerHTML =
		getInnerItineraryDestinationDetailMediaHTML(item);
}

function getInnerItineraryDestinationDetailItem(id?, category?) {
	const destinationId = getID('inner-itinerary-select-location').value;
	const data = INNER_ITINERARY_DESTINATIONS_DATA[destinationId];
	const itemId = id || INNER_ITINERARY_DETAIL.id;
	const itemCategory = category || INNER_ITINERARY_DETAIL.category;
	return (data?.items?.[itemCategory] || []).find((item) => item.id === itemId) || null;
}

function renderInnerItineraryDestinationDetail(item) {
	const destinationId = getID('inner-itinerary-select-location').value;
	const data = INNER_ITINERARY_DESTINATIONS_DATA[destinationId];
	const description = getDescriptionValue(item);

	// Same badge + label pair as the trip page's item dialog: the number alone
	// (a tooltip on the cards) is not readable on a touch screen.
	const score = DESTINATION_PICKER_RATINGS.includes(item?.rating)
		? `<span class="destination-picker-score ${getInnerItineraryRatingClass(item.rating)}">${item.rating}</span><span class="destination-detail-score-text">${getRatingTranslation(item.rating)}</span>`
		: '';
	const note = isInnerItineraryDestinationLinked(destinationId, item.id)
		? `<p class="destination-detail-note">
                    <i class="iconify" data-icon="fa-solid:check"></i>
                    <span>${translate('trip.itinerary.already_linked')}</span>
                </p>`
		: '';

	getID('inner-itinerary-destination-detail-body').innerHTML = `
                <div id="inner-itinerary-destination-detail-media">${getInnerItineraryDestinationDetailMediaHTML(item)}</div>
                <div class="destination-detail-header">
                    <h4 class="destination-detail-title">${getDestinationTitle(item)}</h4>
                    ${score ? `<span class="destination-detail-score">${score}</span>` : ''}
                </div>
                ${note}
                ${getInnerItineraryDestinationDetailFactsHTML(item, data)}
                ${description ? `<p class="destination-detail-description">${description}</p>` : ''}
                ${getInnerItineraryDestinationDetailLinksHTML(item)}`;
}

function getInnerItineraryDestinationDetailMediaHTML(item) {
	const images = (Array.isArray(item.images) ? item.images : []).filter((image) => image?.link);
	if (images.length === 0) {
		return `<div class="destination-detail-photo placeholder"><i class="iconify" data-icon="material-symbols:image-outline"></i></div>`;
	}

	const index = Math.min(INNER_ITINERARY_DETAIL.image, images.length - 1);
	INNER_ITINERARY_DETAIL.image = index;
	const photo = `<img class="destination-detail-photo" src="${escapeHtml(images[index].link)}" alt="${escapeHtml(item.name || '')}">`;
	if (images.length === 1) return photo;

	const thumbs = images.map((image, i) => getInnerItineraryDestinationDetailThumbHTML(image, i, index));
	return `${photo}<div class="destination-detail-thumbs">${thumbs.join('')}</div>`;
}

function getInnerItineraryDestinationDetailThumbHTML(image, i, index) {
	const link = image.link.replace(/'/g, "\\'");
	const label = translate('labels.image.photo_n', { n: i + 1 });
	return `<button type="button" class="destination-detail-thumb${i === index ? ' is-active' : ''}" data-action="select-itinerary-item-image" data-index="${i}" style="background-image:url('${link}')" aria-label="${escapeHtml(label)}"></button>`;
}

function getInnerItineraryDestinationDetailFactsHTML(item, data) {
	const icons = getDestinations().icons;
	const category = INNER_ITINERARY_DETAIL.category;
	const rows = [
		getInnerItineraryDestinationDetailFactHTML(
			// The destination icons are BoxIcons classes, not Iconify names.
			`<i class="${icons[category] || icons['map']}"></i>`,
			data?.titles?.[category] || category,
		),
	];

	const regions = getInnerItineraryDestinationDetailRegions(item);
	if (regions.length) {
		rows.push(
			getInnerItineraryDestinationDetailFactHTML(
				'<i class="iconify" data-icon="mingcute:location-line"></i>',
				getInnerItineraryDestinationDetailRegionsHTML(regions),
			),
		);
	}
	if (item.price) {
		const currency = DESTINOS_DATA[getID('inner-itinerary-select-location').value]?.currency;
		const values = getCurrencies().scale[currency] || getCurrencies().scale['BRL'];
		rows.push(
			getInnerItineraryDestinationDetailFactHTML(
				'<i class="iconify" data-icon="bx:dollar"></i>',
				getPriceValue(item, values, currency || 'BRL'),
			),
		);
	}

	return `<ul class="destination-detail-facts">${rows.join('')}</ul>`;
}

function getInnerItineraryDestinationDetailRegions(item) {
	if (Array.isArray(item?.regions)) {
		return item.regions
			.map((region) => (region == null ? '' : String(region).trim()))
			.filter(Boolean);
	}
	return item?.region ? [item.region] : [];
}

/** Single region as plain text, several as pills — as on the destination page. */
function getInnerItineraryDestinationDetailRegionsHTML(regions) {
	if (regions.length <= 1) return escapeHtml(regions[0] || '');

	const pills = regions
		.map((region) => `<span class="region-pill">${escapeHtml(region)}</span>`)
		.join('');
	return `<span class="region-pills">${pills}</span>`;
}

function getInnerItineraryDestinationDetailFactHTML(iconHTML, valueHTML) {
	return `<li>${iconHTML}<span class="destination-detail-value">${valueHTML}</span></li>`;
}

/** Mirrors the destination page's detail-dialog action row (open-link buttons). */
function getInnerItineraryDestinationDetailLinksHTML(item) {
	const buttons: string[] = [];
	if (item.website) {
		buttons.push(
			getInnerItineraryDestinationDetailLinkButtonHTML(
				'tabler:world',
				translate('labels.social.website'),
				item.website,
			),
		);
	}

	const mapLinks = getEntryMapLinks(item);
	if (mapLinks.length === 1) {
		buttons.push(
			getInnerItineraryDestinationDetailLinkButtonHTML(
				'f7:map',
				translate('labels.customization.links.map'),
				mapLinks[0].url,
			),
		);
	} else if (mapLinks.length > 1) {
		buttons.push(getInnerItineraryDestinationDetailMapButtonHTML(mapLinks));
	}

	if (item.instagram) {
		buttons.push(
			getInnerItineraryDestinationDetailLinkButtonHTML(
				'ri:instagram-line',
				translate('labels.social.instagram'),
				item.instagram,
			),
		);
	}
	if (item.media) {
		const media = getInnerItineraryDestinationDetailMediaButton(item.media);
		buttons.push(
			getInnerItineraryDestinationDetailLinkButtonHTML(media.icon, media.label, item.media),
		);
	}

	if (!buttons.length) return '';
	// Same threshold as the destination dialog: from four buttons on the labels
	// are dropped, since the buttons would be too narrow for their text.
	const compact = buttons.length >= 4 ? ' dialog-actions-icons' : '';
	return `<div class="dialog-actions dialog-actions-links${compact}">${buttons.join('')}</div>`;
}

/** One map link per region (F204) folded into the same action row as a popover. */
function getInnerItineraryDestinationDetailMapButtonHTML(links) {
	const label = translate('labels.customization.links.map');
	initMapLinksMenus();
	return `<span class="map-links">
                    <button type="button" class="btn btn-outline-theme dialog-action-btn map-links-trigger" aria-haspopup="true">
                        <i class="iconify" data-icon="f7:map"></i>
                        <span>${label}</span>
                        <i class="iconify map-links-chevron" data-icon="material-symbols:keyboard-arrow-down-rounded"></i>
                    </button>
                    ${getMapLinksMenuHTML(links)}
                </span>`;
}

function getInnerItineraryDestinationDetailLinkButtonHTML(icon, label, url) {
	return `<button type="button" class="btn btn-outline-theme dialog-action-btn" data-action="open-link" data-url="${escapeHtml(url)}">
                    <i class="iconify" data-icon="${icon}"></i>
                    <span>${label}</span>
                </button>`;
}

function getInnerItineraryDestinationDetailMediaButton(media) {
	let icon = 'lets-icons:video-fill';
	let label = translate('labels.video');

	if (media.includes('youtube') || media.includes('youtu.be')) {
		icon = 'mdi:youtube';
		label = 'YouTube';
	} else if (media.includes('tiktok')) {
		icon = 'ic:baseline-tiktok';
		label = 'TikTok';
	} else if (media.includes('spotify')) {
		icon = 'mdi:spotify';
		label = translate('trip.itinerary.media_button.playlist');
	} else if (media.includes('instagram')) {
		icon = 'mdi:instagram';
		label = 'Instagram';
	}

	return { icon, label };
}

function escapeHtml(value) {
	return String(value)
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

function loadInnerItineraryEventListeners(j) {
	getID('inner-itinerary-start').addEventListener('change', function (event) {
		const inicioValue = (event.target as HTMLInputElement).value;
		const inicioHora = parseInt(inicioValue.split(':')[0]);
		getID('inner-itinerary-select-period').value = getPeriod(inicioHora);
	});

	getID(`inner-itinerary-end`).addEventListener('change', function (event) {
		const fimValue = (event.target as HTMLInputElement).value;
		const fimHora = parseInt(fimValue.split(':')[0]);
		const fimMinuto = parseInt(fimValue.split(':')[1]);

		const inicioValue = getID(`inner-itinerary-start`).value;
		const inicioHora = parseInt(inicioValue.split(':')[0]);
		const inicioMinuto = parseInt(inicioValue.split(':')[1]);

		if (fimHora < inicioHora || (fimHora == inicioHora && fimMinuto < inicioMinuto)) {
			getID(`inner-itinerary-end`).value = '';
			getID(`inner-itinerary-end`).reportValidity();
		}
	});

	getID('inner-itinerary-item-destinations-radio').addEventListener('click', function () {
		innerItinerarySelectLocationAction();
		// Re-selecting the radio once an item is linked re-opens the picker, so
		// the selection can be changed without going through the select.
		if (getID('inner-itinerary-select-tour').value) openInnerItineraryDestinationPicker(j);
	});
}

export function getPeriod(inicioHora) {
	if (inicioHora < 6) {
		return 'earlyMorning';
	} else if (inicioHora < 12) {
		return 'morning';
	} else if (inicioHora < 18) {
		return 'afternoon';
	} else {
		return 'night';
	}
}

function pairTurnos(callerID) {
	const id1 = 'inner-itinerary-select-period';
	const id2 = 'inner-itinerary-select-swap-period';

	const turno1 = getID(id1).value;
	const turno2 = getID(id2).value;

	if (turno1 !== turno2) {
		if (callerID === id1) {
			getID(id2).value = turno1;
		} else if (callerID === id2) {
			getID(id1).value = turno2;
		}
	}
}

function getMostRecentJ(j) {
	const nova = getID('inner-itinerary-select-swap-date')?.value;

	if (nova) {
		const keys = DATAS.map((data) => jsDateToKey(data));
		const atual = keys[j - 1];
		if (atual != nova) {
			const period = getID('inner-itinerary-select-swap-period').value;
			if (keys.includes(nova) && getItinerary().timeOfDay.includes(period)) {
				return keys.indexOf(nova) + 1;
			}
		}
	}

	return j;
}

function getNewPeriod(j) {
	if (LAST_OPENED_PERIOD[j]) {
		return LAST_OPENED_PERIOD[j];
	} else {
		for (const period of getItinerary().timeOfDay) {
			const element = getID(`inner-itinerary-${period}-${j}`);
			if (element && !element.innerText) {
				return period;
			}
		}
	}
	return 'night';
}

const PERIOD_BY_HTML: Record<string, string> = {
	'early-morning': 'earlyMorning',
	morning: 'morning',
	afternoon: 'afternoon',
	night: 'night',
};

/** Map a period container id ("inner-itinerary-early-morning-2") to its period key. */
function getPeriodKeyFromContainerId(id: string): string {
	const periodHtml = String(id || '')
		.replace(/^inner-itinerary-/, '')
		.replace(/-\d+$/, '');
	return PERIOD_BY_HTML[periodHtml] || periodHtml;
}

export function afterDragInnerItinerary(evt) {
	try {
		const turnoInicial = getPeriodKeyFromContainerId(evt.from?.id);
		const turnoFinal = getPeriodKeyFromContainerId(evt.to?.id);

		// Day index comes from the item's own data attribute — deriving it from
		// the button id breaks for the multi-word "early-morning" period.
		const button = evt.item?.children?.[0];
		const j = Number(button?.getAttribute('data-j')) || 0;
		if (!j || !turnoInicial || !turnoFinal) return;

		const key = jsDateToKey(DATAS[j - 1]);
		const sourceItems = INNER_ITINERARY[key]?.[turnoInicial];
		if (!Array.isArray(sourceItems)) return;

		const element = sourceItems.splice(evt.oldIndex, 1)[0]; // First
		if (element === undefined) return;

		const targetItems = INNER_ITINERARY[key][turnoFinal] || (INNER_ITINERARY[key][turnoFinal] = []);
		targetItems.splice(evt.newIndex, 0, element); // Last
		LAST_OPENED_PERIOD[j] = turnoFinal;

		loadInnerItineraryHTML(j);
	} catch (error) {
		// Never let a drag-end error leak into SortableJS — when onEnd throws,
		// its internal cleanup is skipped and every later drag on the page dies.
		console.warn('[itinerary] drag failed:', error);
	}
}
