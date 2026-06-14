import { getState, DESTINATIONS, DOCUMENT_ID } from '../../../../data/state.js';
import { getID } from '../../../../utils/dom.js';
import { convertFromDateObject, dateObjectToKey, getDateString, getTodayDateObject } from '../../../../utils/dates.js';
import { getColorNameFromOptions } from '../../../../theme/colors.js';
import { loadCalendar } from "./calendar.js";
import { loadCalendarItem } from "./inner-itinerary.js";
import { openViewEmbed } from "../../support/embed.js";
import { getVisibility } from "../../../../theme/theme.js";
import { END_DATE } from "../../view.js";
import { START_DATE } from "../../view.js";
import { CURRENT_SCHEDULE_DATE, SCHEDULE_OPEN } from './inner-itinerary.js';

export var SCHEDULE_DESTINATIONS = {};
var PILLS_ACTIONS = {};
var PILLS_INDEX = {};

export function loadItinerarySchedule() {
	loadScheduleDestinations();
	loadCalendar();
	loadSchedulePills();
	loadScheduleTodayButton();

	getID("full-itinerary").addEventListener("click", openFullItinerary);
}

function loadScheduleDestinations() {
	const programacoes = getState()?.programacoes;
	if (!programacoes) return;
	for (const programacao of programacoes) {
		const key = dateObjectToKey(programacao.data);
		SCHEDULE_DESTINATIONS[key] = programacao.destinosIDs;
	}
}

function getUniqueDestinationsFromSchedule() {
	const result = [];
	for (const key in SCHEDULE_DESTINATIONS) {
		const destinos = SCHEDULE_DESTINATIONS[key];
		for (const destino of destinos) {
			if (!result.includes(destino.destinosID)) {
				result.push(destino.destinosID);
			}
		}
	}
	return result;
}

// Pills
function loadSchedulePills(multipleColors = true) {
	const destinos = getUniqueDestinationsFromSchedule();
	if (destinos.length > 1) {
		const pillBox = getID("pill-box");
		pillBox.style.display = "";

		let innerHTML = "";

		for (let i = 0; i < destinos.length; i++) {
			const destinoID = destinos[i];
			const destino = DESTINATIONS.find(
				(destino) => destino.destinosID === destinoID,
			);
			if (!destino) continue;

			const circleClass = multipleColors
				? `pill-circle pill-circle-${getColorNameFromOptions(i)}`
				: `pill-circle pill-circle-default`;
			innerHTML += `<div class="pill" id="pill-${destinoID}">
                            <span class="${circleClass}" id="pill-circle-${destinoID}"></span><span>${destino.destinos.titulo}</span>
                          </div>`;
		}

		pillBox.innerHTML = innerHTML;

		for (let i = 0; i < destinos.length; i++) {
			const destinoID = destinos[i];
			const destino = DESTINATIONS.find(
				(destino) => destino.destinosID === destinoID,
			);
			if (!destino) continue;

			const colorIndex = multipleColors ? i : -1;
			addPillListeners(destinos[i], colorIndex);
			PILLS_INDEX[destinos[i]] = colorIndex;
		}
	}
}

function loadPill(destinoID, action, colorIndex = -1) {
	const lastAction = PILLS_ACTIONS[destinoID];
	if (!lastAction) {
		if (action === "click" || action === "mouseenter") {
			PILLS_ACTIONS[destinoID] = action;
			activatePill(destinoID, colorIndex);
		}
	} else if (lastAction === "click") {
		if (action === "click") {
			deactivatePill(destinoID, colorIndex);
		}
	} else if (lastAction === "mouseenter") {
		if (action === "mouseleave") {
			deactivatePill(destinoID, colorIndex);
		}
		if (action === "click") {
			PILLS_ACTIONS[destinoID] = action;
		}
	} else if (lastAction === "mouseleave") {
		if (action === "click" || action === "mouseenter") {
			PILLS_ACTIONS[destinoID] = action;
			activatePill();
		}
	}
}

export function refreshPills() {
	for (const destinoID in PILLS_ACTIONS) {
		const action = PILLS_ACTIONS[destinoID];
		const index = PILLS_INDEX[destinoID];
		deactivatePill(destinoID, index);
		loadPill(destinoID, action, index);
	}
}

function activatePill(destinoID?, colorIndex = -1) {
	const pillClasses = getPillClasses(colorIndex);
	getID(`pill-${destinoID}`).classList.add("active-pill");
	getID(`pill-circle-${destinoID}`).classList.add(pillClasses.activeCircle);
	for (const calendarDay of document.getElementsByClassName(
		`pill-${destinoID}`,
	)) {
		calendarDay.classList.add(pillClasses.activeCalendar);
	}
}

function deactivatePill(destinoID, colorIndex = -1) {
	const pillClasses = getPillClasses(colorIndex);
	getID(`pill-${destinoID}`).classList.remove("active-pill");
	getID(`pill-circle-${destinoID}`).classList.remove(pillClasses.pillCircle);
	getID(`pill-circle-${destinoID}`).classList.remove(pillClasses.activeCircle);
	for (const calendarDay of document.getElementsByClassName(
		`pill-${destinoID}`,
	)) {
		calendarDay.classList.remove(pillClasses.activeCalendar);
	}
	delete PILLS_ACTIONS[destinoID];
}

function addPillListeners(destinoID, colorIndex) {
	getID(`pill-${destinoID}`).addEventListener("mouseenter", function () {
		loadPill(destinoID, "mouseenter", colorIndex);
	});

	getID(`pill-${destinoID}`).addEventListener("mouseleave", function () {
		loadPill(destinoID, "mouseleave", colorIndex);
	});

	getID(`pill-${destinoID}`).addEventListener("click", function () {
		loadPill(destinoID, "click", colorIndex);
	});
}

function getPillClasses(colorIndex) {
	let pillCircle = "pill-circle";
	let activeCircle = "active-circle";
	let activeCalendar = "active-calendar";

	if (colorIndex >= 0) {
		const colorName = getColorNameFromOptions(colorIndex);
		pillCircle = `pill-circle-${colorName}`;
		activeCircle = `active-circle-${colorName}`;
		activeCalendar = `active-calendar-${colorName}`;
	}
	return { pillCircle, activeCircle, activeCalendar };
}

// Today's Schedule
function loadScheduleTodayButton() {
	const hoje = convertFromDateObject(getTodayDateObject());

	if (hoje >= START_DATE.date && hoje <= END_DATE.date) {
		getID("todays-itinerary-btn").style.display = "";
		getID("todays-itinerary-btn").addEventListener("click", function () {
			const hojeText = getDateString(hoje, "dd/mm/yyyy");
			const programacaoText =
				CURRENT_SCHEDULE_DATE.dia.toString().padStart(2, "0") +
				"/" +
				CURRENT_SCHEDULE_DATE.mes.toString().padStart(2, "0") +
				"/" +
				CURRENT_SCHEDULE_DATE.ano;

			if (
				!SCHEDULE_OPEN ||
				(SCHEDULE_OPEN && hojeText != programacaoText)
			) {
				loadCalendarItem(
					hoje.getUTCDate(),
					hoje.getUTCMonth() + 1,
					hoje.getUTCFullYear(),
					true,
				);
			}

			getID("itinerary-box").scrollIntoView({ behavior: "smooth" });
		});
	}
}

// Full Schedule
function openFullItinerary() {
	const url = `itinerary?v=${DOCUMENT_ID}&visibility=${getVisibility()}`;
	openViewEmbed(url);
}
