// ======= Itinerary Model =======
// Data transformation functions for itinerary (grouping by date/time-of-day, multi-format output)
// Extracted from: itinerary-formatter.js

import { getItinerary, getTransportations, getCurrencies } from '../app/config.js';
import { getState } from '../data/state.js';
import { convertFromDateObject, getDateTitle } from '../utils/dates.js';
import { getInnerItinerary, getInnerItineraryTitle } from '../utils/dom.js';
import { getDestination } from '../data/firebase/database.js';
import { translate } from '../i18n/translation.js';
import { getRatingTranslation, getPriceValue } from './destination.model.js';
import { ITINERARY_HTML } from '../pages/itinerary/itinerary-formatter.js';
import { getTimeStringFromDateObj } from '../utils/dates.js';
import { getPeriod } from '../pages/destination/categories.js';
import { getScheduleTitle } from '../pages/trip-detail/categories/itinerary-module/inner-itinerary.js';
import type { ItineraryDay, PeriodItem } from './schema.js';

// ======= Itinerary Content Generator (Multi-format) =======

let ITINERARY: any[];
var FIRESTORE_PROTECTED_DATA: any;

export async function getItineraryContent(type: string): Promise<string> {
	const notPages = type != 'pages';
	if (notPages && ITINERARY_HTML[type]) {
		return ITINERARY_HTML[type];
	}

	if (!ITINERARY) {
		ITINERARY = await getItineraryData();
	}

	const content: string[] = [];

	if (type === 'page') {
		buildPageContent();
	} else {
		const title = getTitle(type);

		if (title) {
			content.push(title);
		}

		for (const itinerary of ITINERARY) {
			loadItineraryTitle(itinerary.title, type); // was "loadItineararyTitle"
			for (const timeOfDay of getItinerary().timeOfDay) {
				const timeOfDayData = itinerary[timeOfDay];
				if (timeOfDayData.length === 0) continue;
				loadTimeOfDay(timeOfDay);
				for (const innerItinerary of timeOfDayData) {
					loadInnerItinerary(innerItinerary, type);
				}
				if (type == 'notes') {
					content.push('<br>');
				}
			}
		}
	}

	const result = content.join('\n');

	if (notPages) {
		ITINERARY_HTML[type] = result;
	}

	return result;

	// Helpers
	function getTitle(type: string): string {
		switch (type) {
			case 'page':
				return '';
			case 'notes':
				return `<div style="font-size: 28px; font-weight: bold;">${getState().title}</div><br>`; // was "titulo"
			default:
				return `*${getState().title.toUpperCase()}*`; // was "titulo"
		}
	}

	function buildPageContent(): void {
		const days = ITINERARY.filter((itinerary) => itinerary.title);
		if (days.length === 0) return;

		content.push(`<div class="itin-table-wrap">`);
		content.push(`<table class="itin-table">`);
		content.push(`<thead>`);
		content.push(`<tr>`);
		content.push(`<th class="itin-col-day" scope="col">${translate('labels.days')}</th>`);

		for (const timeOfDay of getItinerary().timeOfDay) {
			content.push(`<th scope="col">${getPeriod(timeOfDay)}</th>`);
		}

		content.push(`</tr>`);
		content.push(`</thead>`);
		content.push(`<tbody>`);

		for (const itinerary of days) {
			content.push(`<tr>`);
			content.push(
				`<th class="itin-col-day" scope="row" data-label="${translate('labels.days')}">${itinerary.title}</th>`,
			);

			for (const timeOfDay of getItinerary().timeOfDay) {
				const timeOfDayData = itinerary[timeOfDay] || [];

				content.push(`<td class="itin-cell" data-label="${getPeriod(timeOfDay)}">`);
				if (timeOfDayData.length === 0) {
					content.push(`<span class="itin-empty" aria-hidden="true"></span>`);
				} else {
					content.push(`<ul class="itin-list">`);
					for (const innerItinerary of timeOfDayData) {
						content.push(loadPageItem(innerItinerary));
					}
					content.push(`</ul>`);
				}
				content.push(`</td>`);
			}

			content.push(`</tr>`);
		}

		content.push(`</tbody>`);
		content.push(`</table>`);
		content.push(`</div>`);

		function loadPageItem(innerItinerary: any): string {
			const texts = innerItinerary.subItem?.texts ?? [];
			const mainText = getPageText(innerItinerary);

			if (texts.length === 0) {
				return `<li class="itin-item">${mainText}</li>`;
			}

			const subItems = texts
				.map((text: any) => `<li class="itin-subitem">${getPageText(text)}</li>`)
				.join('');

			return `<li class="itin-item">${mainText}<ul class="itin-sublist">${subItems}</ul></li>`;
		}
	}

	function getPageText(textObj: any): string {
		const title = textObj?.title || '';
		const text = textObj?.content || '';

		if (!title) {
			return `<span class="itin-text">${text}</span>`;
		}

		const label = `<span class="itin-label">${title}${text ? ':' : ''}</span>`;
		const body = text ? ` <span class="itin-text">${text}</span>` : '';
		return `${label}${body}`;
	}

	function loadItineraryTitle(value: string, type: string): void {
		// was "loadItineararyTitle"
		if (!value) {
			return;
		}
		switch (type) {
			case 'page':
				content.push(`<h2>${value}</h2>`);
				break;
			case 'notes':
				content.push(`<div style="font-size: 20px; font-weight: bold;">${value}</div><br>`);
				break;
			default:
				content.push(`\n*${value}*`);
				return;
		}
	}

	function loadTimeOfDay(timeOfDayKey: string): void {
		const timeOfDay = getPeriod(timeOfDayKey);
		switch (type) {
			case 'page':
				content.push(`<h3>${timeOfDay}</h3>`);
				break;
			case 'notes':
				content.push(`<b>${timeOfDay}</b>`);
				break;
			default:
				content.push(`\n_${timeOfDay}_`);
				return;
		}
	}

	function loadInnerItinerary(innerItinerary: any, type: string): void {
		switch (type) {
			case 'page':
				loadHTMLInnerItineraryPage(innerItinerary, type);
				break;
			case 'notes':
				loadHTMLInnerItineraryNotes(innerItinerary, type);
				break;
			default:
				loadDefaultInnerItinerary(innerItinerary);
		}

		function loadHTMLInnerItineraryPage(innerItinerary: any, type: string): void {
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

		function loadHTMLInnerItineraryNotes(innerItinerary: any, type: string): void {
			content.push(
				`<ul><li><div style="margin-left: 20px;">${getTextContent(innerItinerary, type)}</li></ul>`,
			);

			const texts = innerItinerary.subItem?.texts ?? [];
			if (texts.length === 0) {
				return;
			}

			content.push(`<div>`);

			for (const text of texts) {
				content.push(`&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;○  ${getTextContent(text, type)}<br>`);
			}

			content.push(`</div>`);
		}

		function loadDefaultInnerItinerary(innerItinerary: any): void {
			content.push(`- ${getTextContent(innerItinerary)}`);
			for (const text of innerItinerary.subItem.texts) {
				content.push(`> ${getTextContent(text)}`);
			}
		}

		// Helpers
		function getTextContent(textObj: any, type: string = 'text'): string {
			switch (type) {
				case 'page':
				case 'notes':
					return textObj.title ? `<b>${textObj.title}:</b> ${textObj.content}` : textObj.content;
				default:
					return textObj.title ? `*${textObj.title}:* ${textObj.content}` : textObj.content;
			}
		}
	}
}

// ======= Itinerary Data Transformation =======

export async function getItineraryData(): Promise<any[]> {
	ITINERARY = [];
	for (const schedule of getState().itinerary) {
		// was "programacoes"
		const title = getItineraryTitle(schedule);
		const earlyMorning = await getInnerItineraries(schedule.earlyMorning); // was "madrugada"
		const morning = await getInnerItineraries(schedule.morning); // was "manha"
		const afternoon = await getInnerItineraries(schedule.afternoon); // was "tarde"
		const evening = await getInnerItineraries(schedule.night); // was "noite"

		ITINERARY.push({ title, earlyMorning, morning, afternoon, night: evening }); // was "madrugada", "manha", "tarde", "noite"
	}

	return ITINERARY;

	function getItineraryTitle(schedule: any): string {
		let size = 0;
		for (const timeofday of getItinerary().timeOfDay) {
			size += schedule[timeofday].length;
		}

		if (!size) {
			return '';
		}

		const date = convertFromDateObject(schedule.date); // was "data"
		const dateTitle = getDateTitle(date, 'weekday_day_month');

		const title = getScheduleTitle(
			schedule.title, // was "titulo"
			schedule.destinationIds, // was "destinosIDs"
			false,
		);
		return title ? `${title}: ${dateTitle}` : dateTitle;
	}

	async function getInnerItineraries(data: any[]): Promise<any[]> {
		if (data.length === 0) {
			return [];
		}
		const innerItineraries: any[] = [];
		for (const rawData of data) {
			const title = getInnerItineraryTitle(
				rawData,
				getState().travelers || [], // was "pessoas"
			);
			const subItem = await getSubItem(rawData.item);
			innerItineraries.push({
				...title,
				subItem,
			});
		}
		return innerItineraries;

		async function getSubItem(item: any): Promise<any> {
			if (!item) {
				// Schedule entries may lack an item (e.g. placeholder/free days).
				return { card: undefined, texts: [] };
			}

			let destinations: any;
			if (item.type == 'destination') {
				// was "tipo" == "destinos"
				destinations = await getDestination(item.location); // was "local"
			}
			const card = getInnerItinerary(item, destinations);
			const texts = await getInnerItineraryAssociatedTexts(item);
			return { card, texts };
		}

		async function getInnerItineraryAssociatedTexts(item: any): Promise<any[]> {
			const texts: any[] = [];
			if (!item) {
				return texts;
			}

			switch (
				item.type // was "tipo"
			) {
				case 'transportation': // was "transporte"
					loadTransportation();
					break;
				case 'accommodation': // was "hospedagens"
					loadAccommodationDetail();
					break;
				case 'destination': // was "destinos"
					await loadDestinationDetail();
			}

			return texts;

			function loadTransportation(): void {
				const transportation = getState().transportation?.legs?.find(
					// was "transportes.dados"
					(obj: any) => obj.id === item.id,
				);
				if (!transportation) return;
				loadTextObj('trip.transportation.type.title', getTransportationType());
				loadTextObj('trip.transportation.time_window', getTimeWindow());
				loadTextObj('labels.reservation.title', getReservation());
				loadTextObj('labels.company', getCompany());

				function getTransportationType(): string {
					const type = transportation.type; // was "transporte"
					if (!type) return '';
					const title = getTransportations().titles[type];
					return title ? translate(title) : type;
				}

				function getTimeWindow(): string {
					const departure = transportation?.dates?.departure; // was "datas.partida"
					const arrival = transportation?.dates?.arrival; // was "datas.chegada"
					return departure && arrival
						? `${getTimeStringFromDateObj(departure)} - ${getTimeStringFromDateObj(arrival)}`
						: '';
				}

				function getReservation(): string {
					const protectedTransport = FIRESTORE_PROTECTED_DATA?.transportation?.[item.id]; // was "transportes"
					return transportation?.reservation || protectedTransport?.reservation; // was "reserva"
				}

				function getCompany(): string {
					return (
						getTransportations().empresas?.[transportation.type]?.[ // was "transporte"
							transportation?.company // was "empresa"
						] || transportation?.company // was "empresa"
					);
				}
			}

			function loadAccommodationDetail(): void {
				const accommodation = getState().accommodations?.find(
					// was "hospedagens"
					(obj: any) => obj.id === item.id,
				);
				if (!accommodation) return;
				const protectedAccommodation = FIRESTORE_PROTECTED_DATA?.accommodations?.[item.id]; // was "hospedagens"

				const checkin = accommodation?.dates?.checkIn // was "datas.checkin"
					? `${getTimeStringFromDateObj(accommodation.dates.checkIn)}`
					: '';
				const checkout = accommodation?.dates?.checkOut // was "datas.checkout"
					? `${getTimeStringFromDateObj(accommodation.dates.checkOut)}`
					: '';
				loadTextObj('trip.accommodation.accommodation', accommodation.name); // was "nome"
				loadTextObj('trip.accommodation.checkin', checkin);
				loadTextObj('trip.accommodation.checkout', checkout);
				loadTextObj(
					'labels.reservation.title',
					accommodation?.reservation || protectedAccommodation?.reservation, // was "reserva"
				);
			}

			async function loadDestinationDetail(): Promise<void> {
				const destinations = await getDestination(item.location); // was "local"
				const destination = destinations?.[item?.category]?.[item.id]; // was "categoria"
				if (!destination) return;

				const rating = getRatingTranslation(destination.rating); // was "nota"
				const currencies = getCurrencies();
				const price = getPriceValue(
					destination,
					currencies.scale[destinations.currency], // was "moeda"
					currencies.symbols[destinations.currency], // was "moeda"
				);
				loadTextObj('labels.priority', rating);
				loadTextObj('labels.cost', price);
			}

			function loadTextObj(titleKey: string, content: string): void {
				if (!content) return;
				const title = translate(titleKey);
				texts.push({ title, content });
			}
		}
	}
}
