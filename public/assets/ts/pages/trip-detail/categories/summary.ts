import { getState } from '../../../data/state.js';
import { TRAVELERS, setTravelersFn } from '../../../data/state.js';
import { getID } from '../../../utils/dom.js';
import { translate } from "../../../i18n/translation.js";
import { END_DATE } from "../view.js";
import { START_DATE } from "../view.js";

export function loadSummary() {
	setTravelersFn(getState().pessoas);
	const days = Math.ceil((END_DATE.date - START_DATE.date) / (1000 * 60 * 60 * 24)) + 1;
	const travelers = getState().pessoas.length || 1;

	// Keypoint 1
	getID("keypoint1").innerHTML = `<i class="bx bxs-plane-take-off"></i>
                                                <span>${START_DATE.text}</span>
                                                <p>${translate("trip.transportation.departure")}</p>`;

	// Keypoint 2
	getID("keypoint2").innerHTML = `<i class="bx bxs-plane-land"></i>
                                                <span>${END_DATE.text}</span>
                                                <p>${translate("trip.transportation.return")}</p>`;

	// Keypoint 3
	getID("keypoint3").innerHTML = `<i class="bx bxs-sun"></i>
                                                <span>${days}</span>
                                                <p>${translate("labels.days")}</p>`;

	// Keypoint 4
	getID("keypoint4").innerHTML = `<i class="bx bx-male"></i>
                                                <span>${travelers}</span>
                                                <p>${translate("labels.people")}</p>`;
}
