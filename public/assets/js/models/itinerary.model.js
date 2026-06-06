// ======= Itinerary Model =======
// Data transformation functions for itinerary (grouping by date/time-of-day, multi-format output)
// Extracted from: itinerary-formatter.js

import { getItinerary, getTransportations, getCurrencies } from '../app/config.js';
import { getState } from '../data/state.js';
import { convertFromDateObject, getDateTitle } from '../utils/dates.js';
import { getInnerItinerary, getInnerItineraryTitle } from '../utils/dom.js';
import { getDestination } from '../data/firebase/database.js';
import { translate } from '../i18n/translation.js';
import { getNotaTranslation, getValorValue } from './destination.model.js';
import { ITINERARY_HTML } from "../pages/itinerary/itinerary-formatter";
import { getTimeStringFromDateObj } from "../utils/dates";

// ======= Itinerary Content Generator (Multi-format) =======

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
	for (const programacao of getState().programacoes) {
		const title = getItineraryTitle(programacao);
		const madrugada = await getInnerItineraries(programacao.madrugada);
		const manha = await getInnerItineraries(programacao.manha);
		const tarde = await getInnerItineraries(programacao.tarde);
		const noite = await getInnerItineraries(programacao.noite);

		ITINERARY.push({ title, madrugada, manha, tarde, noite });
	}

	return ITINERARY;

	function getItineraryTitle(programacao) {
		let size = 0;
		for (const timeofday of getItinerary().timeofday) {
			size += programacao[timeofday].length;
		}

		if (!size) {
			return "";
		}

		const date = convertFromDateObject(programacao.data);
		const dateTitle = getDateTitle(date, "weekday_day_month");

		const title = getScheduleTitle(
			programacao.titulo,
			programacao.destinosIDs,
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
			let destinos;
			if (item.tipo == "destinos") {
				destinos = await getDestination(item.local);
			}
			const card = getInnerItinerary(item, destinos);
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
				const transporte = getState().transportes.dados.find(
					(obj) => obj.id === item.id,
				);
				if (!transporte) return;
				loadTextObj(
					"trip.transportation.type.title",
					getTransportationType(),
				);
				loadTextObj("trip.transportation.time_window", getTimeWindow());
				loadTextObj("labels.reservation.title", getReservation());
				loadTextObj("labels.company", getCompany());

				function getTransportationType() {
					const tipo = transporte.transporte;
					if (!tipo) return;
			const titulo = getTransportations().titulos[tipo];
					return titulo ? translate(titulo) : tipo;
				}

				function getTimeWindow() {
					const partida = transporte?.datas?.partida;
					const chegada = transporte?.datas?.chegada;
					return partida && chegada
						? `${getTimeStringFromDateObj(partida)} - ${getTimeStringFromDateObj(chegada)}`
						: "";
				}

				function getReservation() {
					const transporteProtegido =
						FIRESTORE_PROTECTED_DATA?.transportes?.[item.id];
					return transporte?.reserva || transporteProtegido?.reserva;
				}

				function getCompany() {
					return (
						getTransportations().empresas?.[transporte.transporte]?.[
							transporte?.empresa
						] || transporte?.empresa
					);
				}
			}

			function loadAccommodationDetail() {
				const hospedagem = getState().hospedagens.find(
					(obj) => obj.id === item.id,
				);
				if (!hospedagem) return;
				const hospedagemProtegida =
					FIRESTORE_PROTECTED_DATA?.hospedagens?.[item.id];

				const checkin = hospedagem?.datas.checkin
					? `${getTimeStringFromDateObj(hospedagem.datas.checkin)}`
					: "";
				const checkout = hospedagem?.datas.checkout
					? `${getTimeStringFromDateObj(hospedagem.datas.checkout)}`
					: "";
				loadTextObj("trip.accommodation.accommodation", hospedagem.nome);
				loadTextObj("trip.accommodation.checkin", checkin);
				loadTextObj("trip.accommodation.checkout", checkout);
				loadTextObj(
					"labels.reservation.title",
					hospedagem?.reserva || hospedagemProtegida?.reserva,
				);
			}

			async function loadDestinationDetail() {
				const destinos = await getDestination(item.local);
				const destino = destinos?.[item?.categoria]?.[item.id];
				if (!destino) return;

				const nota = getNotaTranslation(destino.nota);
				const moedas = getCurrencies();
				const valor = getValorValue(
					destino,
					moedas.escala[destinos.moeda],
					moedas.simbolos[destinos.moeda],
				);
				loadTextObj("labels.priority", nota);
				loadTextObj("labels.cost", valor);
			}

			function loadTextObj(titleKey, content) {
				if (!content) return;
				const title = translate(titleKey);
				texts.push({ title, content });
			}
		}
	}
}
