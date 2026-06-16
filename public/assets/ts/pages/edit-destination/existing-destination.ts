import { buildDS, updateValueDS } from '../../ui/dynamic-select.js';
import { displayError } from '../../utils/messages.js';
import { getID } from '../../utils/dom.js';
import { setPageName } from '../../app/main.js';
import { translate } from "../../i18n/translation.js";
import { FIRESTORE_DESTINATIONS_DATA } from "../../data/state.js";
import { setDescription } from "./categories/description.js";
import { updateDescriptionButtonLabel } from "./categories/description.js";
import { loadCurrencyOptions } from "./categories/price.js";
import { loadCurrencyValueAndVisibility } from "./categories/price.js";
import { addSnacks } from "./new-destination.js";
import { addShopping } from "./new-destination.js";
import { addRestaurants } from "./new-destination.js";
import { addNightlife } from "./new-destination.js";
import { addTourism } from "./new-destination.js";

// Existing Destination
export function populateExistingDestinationForm() {
	try {
		loadBasicDestinationData();
		loadExistingDestination("restaurants");
		loadExistingDestination("snacks");
		loadExistingDestination("nightlife");
		loadExistingDestination("tourism");
		loadExistingDestination("shopping");
		buildDS("region");

		loadMapData();
		setPageName(
			`${translate("labels.edit")} ${FIRESTORE_DESTINATIONS_DATA.title}`,
		);
	} catch (error) {
		displayError(error);
		throw error;
	}
}

// Modules: Existing Tour
function loadBasicDestinationData() {
	getID("title").value = FIRESTORE_DESTINATIONS_DATA.title;

	const currencyValue = FIRESTORE_DESTINATIONS_DATA.currency;
	const currencyDiv = getID("currency");

	if (currencyDiv.querySelector(`option[value="${currencyValue}"]`)) {
		currencyDiv.value = currencyValue;
	} else {
		getID("other-currency").style.display = "block";
		getID("other-currency").value = currencyValue;
		currencyDiv.value = "other";
	}

	loadCurrencyOptions();
}

function loadExistingDestination(category) {
	const enabled = FIRESTORE_DESTINATIONS_DATA.modules[category] === true;
	getID(`enabled-${category}`).checked = enabled;
	getID(`enabled-${category}-content`).style.display = enabled
		? "block"
		: "none";
	getID(`${category}-add-box`).style.display = enabled
		? "block"
		: "none";

	const itemsArr = Object.entries(FIRESTORE_DESTINATIONS_DATA[category])
		.map(([id, value]) => ({
			id,
			...(value as Record<string, unknown>),
		}) as Record<string, unknown>)
		.sort((a, b) => {
			if (!a.createdAt && !b.createdAt) return 0;
			if (!a.createdAt) return 1;
			if (!b.createdAt) return -1;
			return new Date(a.createdAt as string).getTime() - new Date(b.createdAt as string).getTime();
		});

	for (let j = 1; j <= itemsArr.length; j++) {
		const item = itemsArr[j - 1];
		addDestination(category);
		addDestinationHTML(category, j, item);
		setDescription(category, j, item.description);
		updateDescriptionButtonLabel(category, j);
	}
}

export function addDestination(category) {
	switch (category) {
		case "restaurants":
			addRestaurants();
			break;
		case "snacks":
			addSnacks();
			break;
		case "nightlife":
			addNightlife();
			break;
		case "tourism":
			addTourism();
			break;
		case "shopping":
			addShopping();
	}
}

export function addDestinationHTML(category, j, item) {
	const id = item.id;
	if (id) {
		getID(`${category}-id-${j}`).value = id;
	}

	const createdAt = item.createdAt;
	if (createdAt) {
		getID(`${category}-createdAt-${j}`).value = createdAt;
	}

	const isNew = item.isNew || false;
	getID(`${category}-isNew-${j}`).checked = isNew;
	getID(`${category}-title-icon-${j}`).style.display = isNew ? "block" : "none";

	const name = item.name || "";
	getID(`${category}-name-${j}`).value = name;
	getID(`${category}-title-text-${j}`).innerText = name;

	const emoji = item.emoji;
	getID(`${category}-emoji-${j}`).value = emoji;
	getID(`${category}-title-text-${j}`).innerText += ` ${emoji}`;

	updateDescriptionButtonLabel(category, j);
	getID(`${category}-website-${j}`).value = item.website || "";
	getID(`${category}-map-${j}`).value = item.map || "";
	getID(`${category}-instagram-${j}`).value = item.instagram || "";
	getID(`${category}-region-${j}`).value = item.region || "";

	updateValueDS("region", item.region, `${category}-region-select-${j}`);
	loadCurrencyValueAndVisibility(item.price || "", category, j);

	getID(`${category}-media-${j}`).value = item.media || "";
	getID(`${category}-rating-${j}`).value = item.rating || "";
}

function loadMapData() {
	const mapLinkInput = getID("map-link");

	if (FIRESTORE_DESTINATIONS_DATA.modules.map === true) {
		getID("map-enabled").checked = true;
		getID("map-enabled-content").style.display = "block";
		mapLinkInput.setAttribute("required", "");

		const mapData = FIRESTORE_DESTINATIONS_DATA.myMaps;
		if (mapData) {
			mapLinkInput.value = mapData;
		}
	} else {
		mapLinkInput.removeAttribute("required");
	}
}
