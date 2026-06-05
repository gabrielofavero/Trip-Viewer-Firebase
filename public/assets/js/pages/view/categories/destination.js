import { getDestinos, getLanguage } from '../../../core/config.js';

var P_RESULT = {};
var PLACES_FILTERED_SIZE;
var DESTINOS = [];
var ACTIVE_DESTINATION;
var DESTINO_EXPORT = {};
var DESTINO_TRANSLATIONS = {};

// ======= LOADERS =======
function loadDestinations() {
	for (let i = 0; i < DESTINOS.length; i++) {
		P_RESULT[DESTINOS[i].destinos.destinosID] = DESTINOS[i].destinos;
	}

	if (DESTINOS.length % 2 === 1) {
		// Ímpar
		getID("destinosBox").classList.add("centered-destino-box");
	}

	if (
		DESTINOS.length === 1 &&
		getID("destinos-select").style.display === "none" &&
		getChildIDs("destinosBox").length <= 1
	) {
		getID("destinosTitleContainer").style.display = "none";
	}

	window.addEventListener("resize", function () {
		adjustDestinationsHTML();
	});

	autoNavigateDestinos();
}

function autoNavigateDestinos() {
	if (DESTINOS.length <= 1) return;
	if (!INICIO?.date || !FIM?.date) return;

	const hoje = convertFromDateObject(getTodayDateObject());
	if (hoje < START_DATE.date || hoje > END_DATE.date) return;

	const hojeKey = jsDateToKey(hoje);
	const hojeDestinos = SCHEDULE_DESTINATIONS[hojeKey];
	if (!hojeDestinos || hojeDestinos.length === 0) return;

	const targetDestinosID = hojeDestinos[0].destinosID;
	if (!targetDestinosID) return;

	const option = CUSTOM_SELECTS["destinos-select"]?.options.find(
		(opt) => opt.value === targetDestinosID,
	);
	if (!option) return;

	loadCustomSelectAction("destinos-select", targetDestinosID, option.label);
}

function loadDestinationsCustomSelect() {
	DESTINOS = FIRESTORE_DATA.destinos;

	if (DESTINOS.length <= 1) {
		getID("destinos-select").style.display = "none";
		return;
	}

	const options = getDestinationsCustomSelectOptions();

	const customSelect = {
		id: "destinos-select",
		options,
		activeOption: options[0].value,
		action: loadDestionationCustomSelectAction,
	};

	loadCustomSelect(customSelect);

	function getDestinationsCustomSelectOptions() {
		const options = [];
		const itineraryOrder = FIRESTORE_DATA.programacoes
			? new Set(
					FIRESTORE_DATA.programacoes
						.flatMap((item) =>
							(item.destinosIDs || []).map((d) => d.destinosID),
						)
						.filter(Boolean),
				)
			: [];

		for (const destino of DESTINOS) {
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
		for (let i = 0; i < DESTINOS.length; i++) {
			if (DESTINOS[i].destinosID === value) {
				ACTIVE_DESTINATION = DESTINOS[i].destinosID;
				loadDestinationsHTML(FIRESTORE_DATA.destinos[i]);
				adjustDestinationsHTML();
				break;
			}
		}
	}
}

function loadDestinationsHTML(destino) {
	let text = "";
	const destinos = getDestinos();
	const types = destinos.categorias.geral;

	for (let i = 0; i < types.length; i++) {
		const type = types[i];

		if (type != "mapa" && Object.keys(destino.destinos[type]).length === 0) {
			continue;
		}

		const translatedType = destinos.translation[type] || type;
		const j = i + 1;
		const box = destinos.boxes[getDestinationsBoxesIndex(i)];
		const title = translate(`destination.${translatedType}.title`);
		const description = translate(`destination.${translatedType}.description`);
		const icon = destinos.icons[type];

		text += `
    <div class="col-lg-4 col-md-6 d-flex align-items-stretch" data-aos="zoom-in" data-aos-delay="100" id="b${j}">
    <a href="#" onclick="loadAndOpenDestino('${type}')" id="ba${j}">
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

	getID("destinosBox").innerHTML = text;
}

function loadAndOpenDestino(code) {
	const translation = getDestinos().translation;
	const link = `destination?d=${ACTIVE_DESTINATION}&v=${DOCUMENT_ID}&type=${translation[code]}&visibility=${getVisibility()}`;
	openViewEmbed(link);
}

function getDestinationsBoxesIndex(i) {
	const boxes = getDestinos().boxes;
	if (i > boxes.length - 1) {
		return i % boxes.length;
	} else return i;
}

function adjustDestinationsHTML() {
	const elements = Array.from(document.querySelectorAll(".bd"));

	for (const el of elements) {
		el.style.height = "auto";
	}

	const maxHeight = Math.max(...elements.map((el) => el.offsetHeight));

	for (const el of elements) {
		el.style.height = `${maxHeight}px`;
	}
}

function getDestinationsTranslations() {
	if (Object.keys(DESTINO_TRANSLATIONS) == 0) {
		const language = getLanguage();
		DESTINO_TRANSLATIONS = {
			filter: language.destination.filter,
			sort: language.destination.sort,
		};
	}
	return DESTINO_TRANSLATIONS;
}
