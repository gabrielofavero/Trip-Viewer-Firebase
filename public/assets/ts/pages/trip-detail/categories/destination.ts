import { getDestinations, getLanguage } from '../../../app/config.js';
import { getState, DESTINATIONS, DOCUMENT_ID, setDestinations } from '../../../data/state.js';
import { getChildIDs, getID } from '../../../utils/dom.js';
import { convertFromDateObject, getTodayDateObject, jsDateToKey } from '../../../utils/dates.js';
import { loadCustomSelect, loadCustomSelectAction } from '../../../ui/custom-select.js';
import { translate } from '../../../i18n/translation.js';
import { openViewEmbed } from "../support/embed.js";
import { getVisibility } from "../../../theme/theme.js";
import { CUSTOM_SELECTS } from "../../../ui/custom-select.js";
import { END_DATE } from "../view.js";
import { START_DATE } from "../view.js";
import { SCHEDULE_DESTINATIONS } from "./itinerary-module/itinerary-module.js";

var P_RESULT = {};
var PLACES_FILTERED_SIZE;
var ACTIVE_DESTINATION;
var DESTINO_EXPORT = {};
var DESTINO_TRANSLATIONS = {};

// ======= LOADERS =======
export function loadDestinations() {
	for (let i = 0; i < DESTINATIONS.length; i++) {
		P_RESULT[DESTINATIONS[i].destinos.destinosID] = DESTINATIONS[i].destinos;
	}

	if (DESTINATIONS.length % 2 === 1) {
	// Odd
		getID("destinationsBox").classList.add("centered-destino-box");
	}

	if (
		DESTINATIONS.length === 1 &&
		getID("destinations-select").style.display === "none" &&
		getChildIDs("destinationsBox").length <= 1
	) {
		getID("destinationsTitleContainer").style.display = "none";
	}

	window.addEventListener("resize", function () {
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

	const targetDestinosID = hojeDestinos[0].destinosID;
	if (!targetDestinosID) return;

	const option = CUSTOM_SELECTS["destinations-select"]?.options.find(
		(opt) => opt.value === targetDestinosID,
	);
	if (!option) return;

	loadCustomSelectAction("destinations-select", targetDestinosID, option.label);
}

export function loadDestinationsCustomSelect() {
	setDestinations(getState().destinos);

	if (DESTINATIONS.length <= 1) {
		getID("destinations-select").style.display = "none";
		return;
	}

	const options = getDestinationsCustomSelectOptions();

	const customSelect = {
		id: "destinations-select",
		options,
		activeOption: options[0].value,
		action: loadDestionationCustomSelectAction,
	};

	loadCustomSelect(customSelect);

	function getDestinationsCustomSelectOptions() {
		const options = [];
		const itineraryOrder: Set<string> = getState().programacoes
			? new Set<string>(
					getState().programacoes
						.flatMap((item: any) =>
							(item.destinosIDs || []).map((d: any) => d.destinosID),
						)
						.filter(Boolean),
				)
			: new Set<string>();

		for (const destino of DESTINATIONS) {
			options.push({
				value: destino.destinosID,
				label: destino.destinos.titulo,
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
			if (DESTINATIONS[i].destinosID === value) {
				ACTIVE_DESTINATION = DESTINATIONS[i].destinosID;
				loadDestinationsHTML(getState().destinos[i]);
				adjustDestinationsHTML();
				break;
			}
		}
	}
}

export function loadDestinationsHTML(destino) {
	let text = "";
	const destinationsConfig = getDestinations();
	const types = destinationsConfig.categories.general;

	for (let i = 0; i < types.length; i++) {
		const type = types[i];

		if (type != "mapa" && Object.keys(destino.destinos[type]).length === 0) {
			continue;
		}

		const translatedType = destinationsConfig.translation[type] || type;
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

	getID("destinationsBox").innerHTML = text;
}

export function loadAndOpenDestino(code) {
	const translation = getDestinations().translation;
	const link = `destination?d=${ACTIVE_DESTINATION}&v=${DOCUMENT_ID}&type=${translation[code]}&visibility=${getVisibility()}`;
	openViewEmbed(link);
}

function getDestinationsBoxesIndex(i) {
	const boxes = getDestinations().boxes;
	if (i > boxes.length - 1) {
		return i % boxes.length;
	} else return i;
}

export function adjustDestinationsHTML() {
	const elements = Array.from(document.querySelectorAll(".bd"));

	for (const el of elements) {
		(el as HTMLElement).style.height = "auto";
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
