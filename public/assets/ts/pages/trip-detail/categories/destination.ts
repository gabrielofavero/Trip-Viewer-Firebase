import { getDestinations, getLanguage } from '../../../app/config.js';
import { getState, DESTINATIONS, setDestinations } from '../../../data/state.js';
import { getChildIDs, getID } from '../../../utils/dom.js';
import { convertFromDateObject, getTodayDateObject, jsDateToKey } from '../../../utils/dates.js';
import { loadCustomSelect, loadCustomSelectAction } from '../../../ui/custom-select.js';
import { translate } from '../../../i18n/translation.js';
import { openDestinationLightbox } from '../support/embed.js';
import { CUSTOM_SELECTS } from '../../../ui/custom-select.js';
import { END_DATE } from '../view.js';
import { START_DATE } from '../view.js';
import { SCHEDULE_DESTINATIONS } from './itinerary-module/itinerary-module.js';

var P_RESULT = {};
var PLACES_FILTERED_SIZE;
var ACTIVE_DESTINATION;
export function setActiveDestination(val: any) {
	ACTIVE_DESTINATION = val;
}
var DESTINO_EXPORT = {};
var DESTINO_TRANSLATIONS = {};

// ======= LOADERS =======
export function loadDestinations() {
	for (let i = 0; i < DESTINATIONS.length; i++) {
		P_RESULT[DESTINATIONS[i].id] = DESTINATIONS[i];
	}

	if (DESTINATIONS.length % 2 === 1) {
		// Odd
		getID('destinationsBox').classList.add('centered-destination-box');
	}

	if (
		DESTINATIONS.length === 1 &&
		getID('destinations-select').style.display === 'none' &&
		getChildIDs('destinationsBox').length <= 1
	) {
		getID('destinationsTitleContainer').style.display = 'none';
	}

	window.addEventListener('resize', function () {
		adjustDestinationsHTML();
	});

	autoNavigateDestinos();
}

function autoNavigateDestinos() {
	if (DESTINATIONS.length <= 1) return;
	if (!START_DATE?.date || !END_DATE?.date) return;

	const hoje = convertFromDateObject(getTodayDateObject());
	if (hoje < START_DATE.date || hoje > END_DATE.date) return;

	const hojeKey = jsDateToKey(hoje);
	const hojeDestinos = SCHEDULE_DESTINATIONS[hojeKey];
	if (!hojeDestinos || hojeDestinos.length === 0) return;

	const targetDestinosID = hojeDestinos[0].id;
	if (!targetDestinosID) return;

	const option = CUSTOM_SELECTS['destinations-select']?.options.find(
		(opt) => opt.value === targetDestinosID,
	);
	if (!option) return;

	loadCustomSelectAction('destinations-select', targetDestinosID, option.label);
}

export function loadDestinationsCustomSelect() {
	setDestinations(getState().destinations || getState().destinationRefs);

	if (DESTINATIONS.length <= 1) {
		getID('destinations-select').style.display = 'none';
		return;
	}

	const options = getDestinationsCustomSelectOptions();

	const customSelect = {
		id: 'destinations-select',
		options,
		activeOption: options[0].value,
		action: loadDestionationCustomSelectAction,
	};

	loadCustomSelect(customSelect);

	function getDestinationsCustomSelectOptions() {
		const options = [];
		const itineraryOrder: Set<string> = getState().itinerary
			? new Set<string>(
					getState()
						.itinerary.flatMap((item: any) => (item.destinationIds || []).map((d: any) => d.id))
						.filter(Boolean),
				)
			: new Set<string>();

		for (const destination of DESTINATIONS) {
			options.push({
				value: destination.id,
				label: destination.title || destination.destinations?.title,
			});
		}

		if (itineraryOrder.size > 0) {
			const ordered = [];
			const remaining = [];

			for (const option of options) {
				if (itineraryOrder.has(option.value)) {
					ordered.push(option);
				} else {
					remaining.push(option);
				}
			}

			options.length = 0;
			for (const id of itineraryOrder) {
				const match = ordered.find((opt) => opt.value === id);
				if (match) options.push(match);
			}

			options.push(...remaining);
		}

		return options;
	}

	function loadDestionationCustomSelectAction(value) {
		for (let i = 0; i < DESTINATIONS.length; i++) {
			if (DESTINATIONS[i].id === value) {
				ACTIVE_DESTINATION = DESTINATIONS[i].id;
				loadDestinationsHTML((getState().destinations || getState().destinationRefs)[i]);
				adjustDestinationsHTML();
				break;
			}
		}
	}
}

export function loadDestinationsHTML(destination) {
	let text = '';
	const destinationsConfig = getDestinations();
	const types = destinationsConfig.categories.general;

	for (let i = 0; i < types.length; i++) {
		const type = types[i];

		if (!shouldShowDestinationCategory(destination, type)) {
			continue;
		}

		const translatedType = destinationsConfig.translation[type].toLowerCase() || type.toLowerCase();
		const j = i + 1;
		const box = destinationsConfig.boxes[getDestinationsBoxesIndex(i)];
		const title = translate(`destination.${translatedType}.title`);
		const description = translate(`destination.${translatedType}.description`);
		const icon = destinationsConfig.icons[type];

		text += `
    <div class="col-lg-4 col-md-6 d-flex align-items-stretch" data-aos="zoom-in" data-aos-delay="100" id="b${j}">
    <a href="#" data-action="load-and-open-destination" data-type="${type}" id="ba${j}">
        <div class="icon-box iconbox-${box.color}" id="ib${j}">
          <div class="icon">
            <svg width="100" height="100" viewBox="0 0 600 600" xmlns="http://www.w3.org/2000/svg">
              <path stroke="none" stroke-width="0" fill="#f5f5f5" d="${box.d}"></path>
            </svg>
            <i class="${icon}"></i>
          </div>
          <div id="b${j}t"><h4>${title}</h4></div>
          <div class="bd" id="b${j}d"><p>${description}</p></div>
        </div>
      </a>
    </div>`;
	}

	getID('destinationsBox').innerHTML = text;
}

/**
 * Whether a destination category box should render on the view page.
 * - The `map` box is always shown (it's just a My Maps link box).
 * - For data categories, prefer the denormalized per-category "has entries"
 *   booleans cached on the trip doc (destinationRefs[i].categories), falling
 *   back to deriving them from the category entry counts for legacy trips /
 *   destination-exclusive mode where only the full document is available.
 */
function shouldShowDestinationCategory(destination, type): boolean {
	if (type === 'map') return true;
	const categories = destination?.categories ?? destination?.destinations?.categories;
	if (categories && typeof categories[type] === 'boolean') {
		return categories[type];
	}
	const entries = destination?.destinations?.[type];
	return !!entries && Object.keys(entries).length > 0;
}

export function loadAndOpenDestino(code) {
	openDestinationLightbox(ACTIVE_DESTINATION, code.toLowerCase());
}

function getDestinationsBoxesIndex(i) {
	const boxes = getDestinations().boxes;
	if (i > boxes.length - 1) {
		return i % boxes.length;
	} else return i;
}

export function adjustDestinationsHTML() {
	const elements = Array.from(document.querySelectorAll('.bd'));

	for (const el of elements) {
		(el as HTMLElement).style.height = 'auto';
	}

	const maxHeight = Math.max(...elements.map((el) => (el as HTMLElement).offsetHeight));

	for (const el of elements) {
		(el as HTMLElement).style.height = `${maxHeight}px`;
	}
}

function getDestinationsTranslations() {
	if (Object.keys(DESTINO_TRANSLATIONS).length === 0) {
		const language: any = getLanguage();
		DESTINO_TRANSLATIONS = {
			filter: language.destination.filter,
			sort: language.destination.sort,
		};
	}
	return DESTINO_TRANSLATIONS;
}
