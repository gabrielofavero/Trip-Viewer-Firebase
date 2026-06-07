// ======= Itinerary Model =======
// Data transformation functions for itinerary (grouping by date/time-of-day, multi-format output)
// Extracted from: itinerary-formatter.js

import { getItinerary, getTransportations, getCurrencies } from '../app/config.js';
import { getState } from '../data/state.js';
import { convertFromDateObject, getDateTitle } from '../utils/dates.js';
import { getInnerItinerary, getInnerItineraryTitle } from '../utils/dom.js';
import { getDestination } from '../data/firebase/database.js';
import { translate } from '../i18n/translation.js';
import { getNotaTranslation, getPriceValue } from './destination.model.js';
import { ITINERARY_HTML } from "../pages/itinerary/itinerary-formatter.js";
import { getTimeStringFromDateObj } from "../utils/dates.js";
import { getTurno } from "../pages/destination/categories.js";
import { getScheduleTitle } from "../pages/trip-detail/categories/itinerary-module/inner-itinerary.js";

// ======= Itinerary Content Generator (Multi-format) =======

let ITINERARY;
var FIRESTORE_PROTECTED_DATA;

export async function getItineraryContent(type) {
	const notPages = type != "pages";
	if (notPages && ITINERARY_HTML[type]) {
		return ITINERARY_HTML[type];
	}

	if (!ITINERARY) {
		ITINERARY = await getItineraryData();
	}

	const content = [];
	const title = getTitle(type);

	if (title) {
		content.push(title);
	}

	for (const itinerary of ITINERARY) {
		loadItineararyTitle(itinerary.title, type);
		for (const timeOfDay of getItinerary().timeofday) {
			const timeOfDayData = itinerary[timeOfDay];
			if (timeOfDayData.length === 0) continue;
			loadTimeOfDay(timeOfDay);
			for (const innerItinerary of timeOfDayData) {
				loadInnerItinerary(innerItinerary, type);
			}
			if (type == "notes") {
				content.push("<br>");
			}
		}
	}

	const result = content.join("\n");

	if (notPages) {
		ITINERARY_HTML[type] = result;
	}

	return result;

	// Helpers
	function getTitle(type) {
		switch (type) {
			case "page":
				return "";
			case "notes":
				return `<div style="font-size: 28px; font-weight: bold;">${getState().titulo}</div><br>`;
			default:
				return `*${getState().titulo.toUpperCase()}*`;
		}
	}

	function loadItineararyTitle(value, type) {
		if (!value) {
			return;
		}
		switch (type) {
			case "page":
				content.push(`<h2>${value}</h2>`);
				break;
			case "notes":
				content.push(
					`<div style="font-size: 20px; font-weight: bold;">${value}</div><br>`,
				);
				break;
			default:
				return content.push(`\n*${value}*`);
		}
	}

	function loadTimeOfDay(timeOfDayKey) {
		const timeOfDay = getTurno(timeOfDayKey);
		switch (type) {
			case "page":
				content.push(`<h3>${timeOfDay}</h3>`);
				break;
			case "notes":
				content.push(`<b>${timeOfDay}</b>`);
				break;
			default:
				return content.push(`\n_${timeOfDay}_`);
		}
	}

	function loadInnerItinerary(innerItinerary, type) {
		switch (type) {
			case "page":
				loadHTMLInnerItineraryPage(innerItinerary, type);
				break;
			case "notes":
				loadHTMLInnerItineraryNotes(innerItinerary, type);
				break;
			default:
				loadDefaultInnerItinerary(innerItinerary);
		}

		function loadHTMLInnerItineraryPage(innerItinerary, type) {
			const texts = innerItinerary.subItem?.texts ?? [];

			if (texts.length === 0) {
				content.push(`<li>${getTextContent(innerItinerary, type)}</li>`);
				return;
			}

			content.push(`<li>${getTextContent(innerItinerary, type)}<ul>`);

			for (const text of texts) {
				content.push(`<li>${getTextContent(text, type)}</li>`);
			}

			content.push(`</ul></li>`);
		}

		function loadHTMLInnerItineraryNotes(innerItinerary, type) {
			content.push(
				`<ul><li><div style="margin-left: 20px;">${getTextContent(innerItinerary, type)}</li></ul>`,
			);

			const texts = innerItinerary.subItem?.texts ?? [];
			if (texts.length === 0) {
				return;
			}

			content.push(`<div>`);

			for (const text of texts) {
				content.push(
					`&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;○  ${getTextContent(text, type)}<br>`,
				);
			}

			content.push(`</div>`);
		}

		function loadDefaultInnerItinerary(innerItinerary) {
			content.push(`- ${getTextContent(innerItinerary)}`);
			for (const text of innerItinerary.subItem.texts) {
				content.push(`> ${getTextContent(text)}`);
			}
		}

		// Helpers
		function getTextContent(textObj, type = "text") {
			switch (type) {
				case "page":
				case "notes":
					return textObj.title
						? `<b>${textObj.title}:</b> ${textObj.content}`
						: textObj.content;
				default:
					return textObj.title
						? `*${textObj.title}:* ${textObj.content}`
						: textObj.content;
			}
		}
	}
}

// ======= Itinerary Data Transformation =======

export async function getItineraryData() {
	ITINERARY = [];
	for (const schedule of getState().programacoes) {
		const title = getItineraryTitle(schedule);
		const earlyMorning = await getInnerItineraries(schedule.madrugada);
		const morning = await getInnerItineraries(schedule.manha);
		const afternoon = await getInnerItineraries(schedule.tarde);
		const evening = await getInnerItineraries(schedule.noite);

		ITINERARY.push({ title, madrugada: earlyMorning, manha: morning, tarde: afternoon, noite: evening });
	}

	return ITINERARY;

	function getItineraryTitle(schedule) {
		let size = 0;
		for (const timeofday of getItinerary().timeofday) {
			size += schedule[timeofday].length;
		}

		if (!size) {
			return "";
		}

		const date = convertFromDateObject(schedule.data);
		const dateTitle = getDateTitle(date, "weekday_day_month");

		const title = getScheduleTitle(
			schedule.titulo,
			schedule.destinosIDs,
			false,
		);
		return title ? `${title}: ${dateTitle}` : dateTitle;
	}

	async function getInnerItineraries(data) {
		if (data.length === 0) {
			return [];
		}
		const innerItineraries = [];
		for (const rawData of data) {
			const title = getInnerItineraryTitle(
				rawData,
				getState().pessoas || [],
			);
			const subItem = await getSubItem(rawData.item);
			innerItineraries.push({
				...title,
				subItem,
			});
		}
		return innerItineraries;

		async function getSubItem(item) {
			let destinations;
			if (item.tipo == "destinos") {
				destinations = await getDestination(item.local);
			}
			const card = getInnerItinerary(item, destinations);
			const texts = await getInnerItineraryAssociatedTexts(item);
			return { card, texts };
		}

		async function getInnerItineraryAssociatedTexts(item) {
			const texts = [];

			switch (item.tipo) {
				case "transporte":
					loadTransportation();
					break;
				case "hospedagens":
					loadAccommodationDetail();
					break;
				case "destinos":
					await loadDestinationDetail();
			}

			return texts;

			function loadTransportation() {
				const transportation = getState().transportes.dados.find(
					(obj) => obj.id === item.id,
				);
				if (!transportation) return;
				loadTextObj(
					"trip.transportation.type.title",
					getTransportationType(),
				);
				loadTextObj("trip.transportation.time_window", getTimeWindow());
				loadTextObj("labels.reservation.title", getReservation());
				loadTextObj("labels.company", getCompany());

				function getTransportationType() {
					const type = transportation.transporte;
					if (!type) return;
					const title = getTransportations().titulos[type];
					return title ? translate(title) : type;
				}

				function getTimeWindow() {
					const departure = transportation?.datas?.partida;
					const arrival = transportation?.datas?.chegada;
					return departure && arrival
						? `${getTimeStringFromDateObj(departure)} - ${getTimeStringFromDateObj(arrival)}`
						: "";
				}

				function getReservation() {
					const transporteProtegido =
						FIRESTORE_PROTECTED_DATA?.transportes?.[item.id];
					return transportation?.reserva || transporteProtegido?.reserva;
				}

				function getCompany() {
					return (
						getTransportations().empresas?.[transportation.transporte]?.[
							transportation?.empresa
						] || transportation?.empresa
					);
				}
			}

			function loadAccommodationDetail() {
				const accommodation = getState().hospedagens.find(
					(obj) => obj.id === item.id,
				);
				if (!accommodation) return;
				const protectedAccommodation =
					FIRESTORE_PROTECTED_DATA?.hospedagens?.[item.id];

				const checkin = accommodation?.datas.checkin
					? `${getTimeStringFromDateObj(accommodation.datas.checkin)}`
					: "";
				const checkout = accommodation?.datas.checkout
					? `${getTimeStringFromDateObj(accommodation.datas.checkout)}`
					: "";
				loadTextObj("trip.accommodation.accommodation", accommodation.nome);
				loadTextObj("trip.accommodation.checkin", checkin);
				loadTextObj("trip.accommodation.checkout", checkout);
				loadTextObj(
					"labels.reservation.title",
					accommodation?.reserva || protectedAccommodation?.reserva,
				);
			}

			async function loadDestinationDetail() {
				const destinations = await getDestination(item.local);
				const destination = destinations?.[item?.categoria]?.[item.id];
				if (!destination) return;

				const rating = getNotaTranslation(destination.nota);
				const currencies = getCurrencies();
				const price = getPriceValue(
					destination,
					currencies.escala[destinations.moeda],
					currencies.simbolos[destinations.moeda],
				);
				loadTextObj("labels.priority", rating);
				loadTextObj("labels.cost", price);
			}

			function loadTextObj(titleKey, content) {
				if (!content) return;
				const title = translate(titleKey);
				texts.push({ title, content });
			}
		}
	}
}
