import { getTransportations } from '../../app/config.js';
import { getCategoryID, getChildIDs, getID, getJ, getNextJ } from '../../utils/dom.js';
import { addSelectorDS } from '../../ui/dynamic-select.js';
import { formattedDateToDate, getArrayOfDates, getDateTitle, getNextCategoryStartEnd, getTodayFormatted, getTomorrowFormatted } from '../../utils/dates.js';
import { addRemoveChildListener, registerVisibilityExport } from '../../theme/visibility.js';
import { loadImageSelector } from '../../data/firebase/storage.js';
import { translate } from '../../i18n/translation.js';
import { DESTINATIONS } from '../../data/state.js';
import { loadTransportationListeners, loadTransportationVisibility, applyTransportationTypeVisualization, updateTransportationTitle } from './categories/transportation.js';
import { loadAccommodationListeners, ACCOMMODATION_IMAGES, removeAccommodationImages } from './categories/accommodation.js';
import { addRemoveTransportationListener } from './support/event-listeners.js';
import { DateRangePicker } from '../../ui/date-range-picker.js';
import { getDestinationsItemCheckbox, getActiveDestinationsSelectVisibility, getActiveDestinationsCheckboxOptions, getDestinationsItemCard, getActiveDestinationsCardOptions } from './categories/destination.js';
import { loadGalleryListeners } from './categories/gallery.js';
import { getItineraryTitleSelectOptions, loadItineraryListeners, updateItineraryTitle, reloadItinerary } from './categories/itinerary-module/itinerary-module.js';
import { updateActiveDestinationsHTMLs, reorganizeDestinationsCheckbox } from "./categories/destination.js";
import { addRemoveGaleriaListener } from "./support/event-listeners.js";

export var DATAS = [];

const TODAY = getTodayFormatted();
const TOMORROW = getTomorrowFormatted();

// Register _add* functions for visibility module backward compat
registerVisibilityExport("_addTransporte", addTransportation);
registerVisibilityExport("_addAccommodations", addAccommodations);
registerVisibilityExport("_addDestinos", loadDestinations);
registerVisibilityExport("_addGallery", addGallery);
registerVisibilityExport("_addProgramacao", loadItinerarySchedule);

export function loadNewTrip() {
	loadBasicFieldsNewTrip();
	loadItinerarySchedule();
	loadDestinations();
}

function loadBasicFieldsNewTrip() {
	getID("start").value = TODAY;
	getID("end").value = TOMORROW;

	getID("currency").value = "BRL";
}

export function addTransportation() {
	const j = getNextJ("transporte-box");

	$("#transporte-box").append(`
  <div id="transporte-inner-box-${j}" class="inner-box draggable">
        <div id="transporte-${j}" class="accordion-item accordion-transporte accordion-draggable" >
        <h2 class="accordion-header" id="heading-transporte-${j}">
          <button id="transporte-title-${j}" class="accordion-button collapsed" type="button" data-bs-toggle="collapse"
            data-bs-target="#collapse-transporte-${j}" aria-expanded="false" aria-controls="collapse-transporte-${j}">
            ${translate("trip.transportation.title")} ${j}
          </button>
        </h2>
        <div id="collapse-transporte-${j}" class="accordion-collapse collapse"
          aria-labelledby="heading-transporte-${j}" data-bs-parent="#transporte-box">
            <div class="accordion-body">
              <div class="nice-form-group" style="display: none">
              <label>${translate("labels.id")}</label>
              <input id="transporte-id-${j}" type="text" disabled />
            </div>

            <fieldset class="nice-form-group" id="idaVolta-box-${j}">
              <div class="modern-radio-group">
                <div class="nice-form-group">
                  <input type="radio" name="idaVolta-${j}" id="ida-${j}" ${j === 1 ? "checked" : ""} />
                  <label for="ida-${j}">${translate("trip.transportation.departure")}</label>
                </div>

                <div class="nice-form-group">
                  <input type="radio" name="idaVolta-${j}" id="durante-${j}"/>
                  <label for="durante-${j}">${translate("trip.transportation.during")}</label>
                </div>

                <div class="nice-form-group">
                  <input type="radio" name="idaVolta-${j}" id="volta-${j}" ${j != 1 ? "checked" : ""} />
                  <label for="volta-${j}">${translate("trip.transportation.return")}</label>
                </div>
              </div>
            </fieldset>

            <div class="nice-form-group" id="people-box-${j}">
              <label>${translate("labels.person")}</label>
              <select ${getID("people-view").checked ? "required" : ""} class="editar-select" id="transportation-person-select-${j}" style="display: none;"></select>
              <input class="nice-form-group" id="transportation-person-${j}" type="text" placeholder="${translate("labels.person")}" />
            </div>

            <div class="nice-form-group">
              <label>Ponto de Partida <span class="opcional"> (${translate("labels.optional")})</span></label>
              <input id="ponto-partida-${j}" type="text" placeholder="Belo Horizonte" />
            </div>

            <div class="nice-form-group">
              <label>Ponto de Chegada <span class="opcional"> (${translate("labels.optional")})</span></label>
              <input id="ponto-chegada-${j}" type="text" placeholder="Las Vegas" />
            </div>
    
            <div class="nice-form-group">
              <label>${translate("trip.transportation.duration")}</label>
              <div class="date-range-picker" id="transporte-duration-${j}">
                <input type="hidden" id="partida-${j}" />
                <input type="hidden" id="chegada-${j}" />
              </div>
            </div>
    
            <div class="side-by-side-box">
              <div class="nice-form-group side-by-side">
                <label>${translate("trip.transportation.departure_time")}</label>
                <input required class="flex-input mini-box" id="partida-horario-${j}" type="time" value="00:00" />
              </div>
              <div class="nice-form-group side-by-side">
                <label>${translate("trip.transportation.arrival_time")}</label>
                <input required class="flex-input mini-box" id="chegada-horario-${j}" type="time" value="00:30" />
              </div>
            </div>
    
            <div class="nice-form-group">
              <label>Meio de Transporte</label>
              <select class="editar-select" required id="transporte-tipo-${j}">
                ${getTypeOptions()}
              </select>
            </div>

            <div class="nice-form-group">
              <label>${translate("labels.other")} <span class="opcional"> (${translate("labels.optional")})</span></label>
              <input class="flex-input" id="transporte-duracao-${j}" type="time" />
            </div>

            <div class="nice-form-group" id="empresa-select-form-group-${j}">
              <label>${translate("labels.company")} <span class="opcional"> (${translate("labels.optional")})</span></label>
              <select class="editar-select" id="empresa-select-${j}" style="display: none;"></select>
              <input class="nice-form-group" id="empresa-${j}" type="text" placeholder="${translate("labels.company")}" />
            </div>

            <div class="nice-form-group">
              <label>${translate("labels.reservation.code")} <span class="opcional"> (${translate("labels.optional")})</span></label>
              <input id="reserva-transporte-${j}" type="text" placeholder="ABC123" />
            </div>

            <div class="nice-form-group">
              <label>${translate("labels.reservation.link")} <span class="opcional"> (${translate("labels.optional")})</span></label>
              <input id="transporte-link-${j}" type="url" placeholder="https://www.google.com/" value=""
                class="icon-right" />
            </div>
    
          </div>
    
          <div class="button-box-right-formatted">
            <button id="remove-transporte-${j}" class="btn btn-basic btn-format">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
                <path fill="currentColor" fill-rule="evenodd"
                    d="M8.106 2.553A1 1 0 0 1 9 2h6a1 1 0 0 1 .894.553L17.618 6H20a1 1 0 1 1 0 2h-1v11a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3V8H4a1 1 0 0 1 0-2h2.382l1.724-3.447ZM14.382 4l1 2H8.618l1-2h4.764ZM11 11a1 1 0 1 0-2 0v6a1 1 0 1 0 2 0v-6Zm4 0a1 1 0 1 0-2 0v6a1 1 0 1 0 2 0v-6Z"
                    clip-rule="evenodd"></path>
            </svg>
            </button>
          </div>
    
        </div>
      </div>
      <i class="iconify drag-icon" data-icon="mdi:drag"></i>
    </div>
      `);

	getID(`transportation-id-${j}`).value = getCategoryID("transportation", j);
	getID(`ponto-partida-${j}`).value =
		j == 1 ? "" : getID(`ponto-chegada-${j - 1}`).value;
	getID(`ponto-chegada-${j}`).value =
		j == 2 ? getID(`ponto-partida-${j - 1}`).value : "";
	getID(`partida-${j}`).value =
		j == 1
			? getID("start").value
			: j == 2
				? getID("end").value
				: getID(`chegada-${j - 1}`).value;
	getID(`chegada-${j}`).value = getID(`partida-${j}`).value;

	// Initialize date range picker for this transportation
	const transportDurPicker = getID(`transportation-duration-${j}`);
	if (transportDurPicker) new DateRangePicker(transportDurPicker);

	loadTransportationListeners(j);
	loadTransportationVisibility(j);
	applyTransportationTypeVisualization(j);
	addRemoveTransportationListener(j);
	addSelectorDS(
		"transportation-person",
		`transportation-person-select-${j}`,
		`transportation-person-${j}`,
		() => updateTransportationTitle(j),
	);

	function getTypeOptions() {
		let result = "";
		const transportation = getTransportations();
		for (const type of transportation.types) {
			const title = transportation.titles[type];
			if (!title) continue;
			result += `<option value="${type}">${translate(title)}</option>`;
		}
		return result;
	}
}

export function addAccommodations() {
	const startEnd = getNextCategoryStartEnd("accommodations", "check-out");
	const j = getNextJ("accommodations-box");
	$("#accommodations-box").append(`
      <div id="hospedagens-inner-box-${j}" class="inner-box draggable">
        <div id="hospedagens-${j}" class="accordion-item accordion-hospedagens accordion-draggable" >
        <h2 class="accordion-header" id="heading-hospedagens-${j}">
          <button id="hospedagens-title-${j}" class="accordion-button collapsed" type="button" data-bs-toggle="collapse"
            data-bs-target="#collapse-hospedagens-${j}" aria-expanded="false" aria-controls="collapse-hospedagens-${j}">
            ${translate("trip.accommodation.accommodation")} ${j}
          </button>
        </h2>
        <div id="collapse-hospedagens-${j}" class="accordion-collapse collapse"
          aria-labelledby="heading-hospedagens-${j}" data-bs-parent="#accommodations-box">
            <div class="accordion-body">
              <div class="nice-form-group" style="display: none">
              <label>${translate("labels.id")}</label>
              <input id="hospedagens-id-${j}" type="text" disabled />
            </div>

            <div class="nice-form-group">
              <input id="hospedagens-cafe-${j}" type="checkbox" class="switch">
              <label for="hospedagens-cafe-${j}">
                ${translate("trip.accommodation.breakfast")}
              </label>
            </div>

            <div class="nice-form-group">
              <label>${translate("labels.name")}</label>
              <input required id="hospedagens-nome-${j}" type="text" placeholder="${translate("trip.accommodation.name_placeholder")}" />
            </div>
    
            <div class="nice-form-group">
              <label>${translate("labels.address")} <span class="opcional"> (${translate("labels.optional")})</span></label>
              <input id="hospedagens-endereco-${j}" type="text" placeholder="${translate("trip.accommodation.address_placeholder")}" />
            </div>
    
            <div class="nice-form-group">
              <label>${translate("trip.accommodation.stay_duration")}</label>
              <div class="date-range-picker" id="hospedagens-duration-${j}">
                <input type="hidden" id="check-in-${j}" value="${startEnd.start}" />
                <input type="hidden" id="check-out-${j}" value="${startEnd.end}" />
              </div>
            </div>
    
            <div class="side-by-side-box">
              <div class="nice-form-group side-by-side">
                <label>${translate("trip.accommodation.checkin_time")}</label>
                <input class="flex-input mini-box" id="check-in-horario-${j}" type="time" value="14:00" />
              </div>
              <div class="nice-form-group side-by-side">
                <label>${translate("trip.accommodation.checkout_time")}</label>
                <input class="flex-input mini-box" id="check-out-horario-${j}" type="time" value="12:00" />
              </div>
            </div>
    
            <div class="nice-form-group">
              <label>${translate("labels.description.title")} <span class="opcional"> (${translate("labels.optional")})</span></label>
              <input id="hospedagens-descricao-${j}" type="text" placeholder="${translate("trip.accommodation.description_placeholder")}" />
            </div>

            <div class="nice-form-group">
              <label>${translate("labels.reservation.code")} <span class="opcional"> (${translate("labels.optional")})</span></label>
              <input id="reserva-hospedagens-${j}" type="text" placeholder="ABC123" />
            </div>
      
            <div class="nice-form-group">
              <label>${translate("labels.reservation.link")} <span class="opcional"> (${translate("labels.optional")})</span></label>
              <input id="reserva-hospedagens-link-${j}" type="url" placeholder="https://www.google.com/" value=""
                class="icon-right" />
            </div>

            <div class="nice-form-group customization-box" id="hospedagens-${j}-box">
              <label>${translate("labels.image.title_plural")} <span class="opcional"> (${translate("labels.optional")})</span></label>
              <button id="imagens-hospedagem-button-${j}" data-action="open-accommodation-images" data-index="${j}" class="btn input-button" style="margin-top:0px">${translate("labels.image.add_title")}</button>
            </div>
              
          </div>
      
            <div class="button-box-right-formatted">
              <button id="remove-hospedagens-${j}" class="btn btn-basic btn-format">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
                <path fill="currentColor" fill-rule="evenodd"
                    d="M8.106 2.553A1 1 0 0 1 9 2h6a1 1 0 0 1 .894.553L17.618 6H20a1 1 0 1 1 0 2h-1v11a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3V8H4a1 1 0 0 1 0-2h2.382l1.724-3.447ZM14.382 4l1 2H8.618l1-2h4.764ZM11 11a1 1 0 1 0-2 0v6a1 1 0 1 0 2 0v-6Zm4 0a1 1 0 1 0-2 0v6a1 1 0 1 0 2 0v-6Z"
                    clip-rule="evenodd"></path>
              </svg>
              </button>
            </div>
          
        </div>
        </div>
        <i class="iconify drag-icon" data-icon="mdi:drag"></i>
      </div>
      `);

	getID(`accommodations-id-${j}`).value = getCategoryID("accommodations", j);
	addRemoveChildListener("accommodations", j, () => removeAccommodationImages(j));

	// Initialize date range picker for this accommodation
	const hospDurPicker = getID(`accommodations-duration-${j}`);
	if (hospDurPicker) new DateRangePicker(hospDurPicker);

	loadAccommodationListeners(j);
	ACCOMMODATION_IMAGES[j] = [];
}

export function loadDestinations() {
	if (!DESTINATIONS || DESTINATIONS.length === 0) return;

	let destinations = [...DESTINATIONS];
	destinations.sort((a, b) => a.titulo.localeCompare(b.titulo));
	getID("no-destinations").style.display = "none";
	getID("has-destinations").style.display = "block";

	const container = getID("destinations-checkboxes");
	container.innerHTML = "";
	for (const destino of destinations) {
		container.innerHTML += getDestinationsItemCard(destino.id, destino.titulo);
	}

	// Card click: toggle selected, move to top of selected group
	for (const card of container.querySelectorAll(".destination-card")) {
		card.addEventListener("click", () => {
			card.classList.toggle("selected");
			// Move clicked card to top of selected group
			if (card.classList.contains("selected")) {
				container.prepend(card);
			}
			reorganizeDestinationsCheckbox();
			updateActiveDestinationsHTMLs();
		});
	}

	getID("destinations-enabled")?.addEventListener("change", () =>
		updateActiveDestinationsHTMLs(),
	);
}

export function loadItinerarySchedule() {
	const start = getID("start").value;
	const end = getID("end").value;

	DATAS = getArrayOfDates(
		formattedDateToDate(start),
		formattedDateToDate(end),
	);

	const itineraryBox = getID("itinerary-box");
	itineraryBox.innerHTML = "";

	for (let j = 1; j <= DATAS.length; j++) {
		const data = DATAS[j - 1];
		let dataFormatada = getDateTitle(data, "weekday_day_month");

		itineraryBox.innerHTML += `
      <div id="programacao-${j}" class="accordion-item accordion-programacao" >
      <h2 class="accordion-header" id="heading-programacao-${j}">
        <button id="programacao-title-${j}" class="accordion-button collapsed" type="button" data-bs-toggle="collapse"
          data-bs-target="#collapse-programacao-${j}" aria-expanded="false"
          aria-controls="collapse-programacao-${j}">
          ${dataFormatada}
        </button>
      </h2>
      <div id="collapse-programacao-${j}" class="accordion-collapse collapse"
        aria-labelledby="heading-programacao-${j}" data-bs-parent="#programacao-box">
        <div class="accordion-body">

          <div class="nice-form-group" id="programacao-local-box-${j}" style="display: ${getActiveDestinationsSelectVisibility()}">
            <label>${translate("destination.title")}<span class="opcional"> (${translate("labels.optional")})</span></label>
            <div class="destinos-cards itinerario-cards" id="programacao-local-${j}">
              ${getActiveDestinationsCardOptions("itinerary", j)}
            </div>
          </div>

          <div class="nice-form-group">
            <label>${translate("labels.title")}<span class="opcional"> (${translate("labels.optional")})</span></label>
              <select class="editar-select" id="itinerary-inner-title-select-${j}" style="display: block;">
                ${getItineraryTitleSelectOptions()}
              </select>  
            <input class="nice-form-group" id="itinerary-inner-title-${j}" maxlength="25" type="text" placeholder="São Paulo" style="display: none;">
          </div>

          <div class='period-box' id='programacao-madrugada-${j}'>
            <label>${translate("datetime.time_of_day.early_hours")}</label>
            <div class="inner-itinerary draggable-area" data-group="itinerary-${j}" id="inner-itinerary-early-morning-${j}"></div>
          </div>

          <div class='period-box' id='programacao-manha-${j}'>
            <label>${translate("datetime.time_of_day.morning")}</label>
            <div class="inner-itinerary draggable-area" data-group="itinerary-${j}" id="inner-itinerary-morning-${j}"></div>
          </div>

          <div class='period-box' id='programacao-tarde-${j}'>
            <label>${translate("datetime.time_of_day.afternoon")}</label>
            <div class="inner-itinerary draggable-area" data-group="itinerary-${j}" id="inner-itinerary-afternoon-${j}"></div>
          </div>

          <div class='period-box' id='programacao-noite-${j}'>
            <label>${translate("datetime.time_of_day.evening")}</label>
            <div class="inner-itinerary draggable-area" data-group="itinerary-${j}" id="inner-itinerary-night-${j}"></div>
          </div>

          <div class="button-box-right-formatted" id="programacao-adicionar-box-${j}" style="display: block; margin-top: 24px">
            <button id="programacao-adicionar-${j}" class="btn btn-theme" data-action="open-inner-itinerary" data-index="${j}">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">
                <g fill="currentColor" fill-rule="evenodd" clip-rule="evenodd">
                  <path d="M2 12C2 6.477 6.477 2 12 2s10 4.477 10 10s-4.477 10-10 10S2 17.523 2 12Zm10-8a8 8 0 1 0 0 16a8 8 0 0 0 0-16Z">
                  </path>
                  <path d="M13 7a1 1 0 1 0-2 0v4H7a1 1 0 1 0 0 2h4v4a1 1 0 1 0 2 0v-4h4a1 1 0 1 0 0-2h-4V7Z">
                  </path>
                </g>
              </svg>
              ${translate("labels.add")}
            </button>
          </div>

        </div>
      </div>
    </div>`;
	}

	for (const child of getChildIDs("itinerary-box")) {
		const j = getJ(child);
		getID(`itinerary-inner-title-select-${j}`).addEventListener(
			"change",
			() => updateItineraryTitle(j),
		);
		getID(`itinerary-inner-title-${j}`).addEventListener("change", () =>
			updateItineraryTitle(j),
		);
		// Card click for itinerary destination cards
		const localContainer = getID(`itinerary-location-${j}`);
		for (const card of localContainer.querySelectorAll(".destination-card")) {
			card.addEventListener("click", () => {
				card.classList.toggle("selected");
				if (card.classList.contains("selected")) {
					localContainer.prepend(card);
				}
				updateItineraryTitle(j);
			});
		}
		loadItineraryListeners(j);
	}

	getID("itinerary-enabled").addEventListener("change", () =>
		reloadItinerary(),
	);
}

export function addGallery() {
	const j = getNextJ("galeria-box");
	$("#galeria-box").append(`
      <div id="galeria-${j}" class="accordion-item accordion-galeria" >
      <h2 class="accordion-header" id="heading-galeria-${j}">
        <button id="galeria-title-${j}" class="accordion-button collapsed" type="button" data-bs-toggle="collapse"
          data-bs-target="#collapse-galeria-${j}" aria-expanded="false" aria-controls="collapse-hospedagens-${j}">
          ${translate("labels.image.title")} ${j}
        </button>
      </h2>
      <div id="collapse-galeria-${j}" class="accordion-collapse collapse"
        aria-labelledby="heading-galeria-${j}" data-bs-parent="#galeria-box">
        <div class="accordion-body">
          <div class="nice-form-group">
            <label>${translate("labels.title")}</label>
            <input required id="galeria-titulo-${j}" type="text" placeholder="${translate("destination.lineup.title")}" />
          </div>

          <div class="nice-form-group" id="galeria-select-form-group-${j}">
            <label>${translate("labels.type")} <span class="opcional"> (${translate("labels.optional")})</span></label>
            <select id="gallery-category-select-${j}" style="display: none;"></select>
            <input class="nice-form-group" id="gallery-category-${j}" type="text" placeholder="${translate("destination.map.title")}" />
          </div>
    
          <div class="nice-form-group">
            <label>${translate("labels.description.title")} <span class="opcional"> (${translate("labels.optional")})</span></label>
            <input id="galeria-descricao-${j}" type="text" placeholder="${translate("trip.gallery.description_placeholder")}" />
          </div>
    
          <div class="nice-form-group customization-box" id="galeria-${j}-box">
            <label>${translate("labels.image.title")}</label>
            <input id="upload-galeria-${j}" class='image-uploadbox' type="file" accept=".jpg, .jpeg, .png" />
            <div id="upload-galeria-${j}-size-message" class="message-text"> <i class='red'>*</i> ${translate("labels.image.upload_limit")}</div>
          </div>
    
          <div class="nice-form-group">
            <input id="link-galeria-${j}" class='image-input' type="url" placeholder="${translate("labels.image.placeholder")}" value=""
              class="icon-right">
          </div>
    
          <fieldset class="nice-form-group image-checkbox">
            <div class="nice-form-group enable-link">
              <input type="radio" name="type-galeria-${j}" id="enable-link-galeria-${j}" checked>
              <label for="enable-link-galeria-${j}">${translate("labels.image.link")}</label>
            </div>
    
            <div class="nice-form-group">
              <input type="radio" name="type-galeria-${j}" id="enable-upload-galeria-${j}">
              <label for="enable-upload-galeria-${j}">${translate("labels.image.upload")} <span class="opcional"> (${translate("labels.image.upload_limit")})</span></label>
            </div>
          </fieldset>
    
          </div>
  
        <div class="button-box-right-formatted">
          <button id="remove-galeria-${j}" class="btn btn-basic btn-format">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
            <path fill="currentColor" fill-rule="evenodd"
                d="M8.106 2.553A1 1 0 0 1 9 2h6a1 1 0 0 1 .894.553L17.618 6H20a1 1 0 1 1 0 2h-1v11a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3V8H4a1 1 0 0 1 0-2h2.382l1.724-3.447ZM14.382 4l1 2H8.618l1-2h4.764ZM11 11a1 1 0 1 0-2 0v6a1 1 0 1 0 2 0v-6Zm4 0a1 1 0 1 0-2 0v6a1 1 0 1 0 2 0v-6Z"
                clip-rule="evenodd"></path>
          </svg>
          </button>
        </div>
        
      </div>
    </div>
      `);

	loadImageSelector(`gallery-${j}`);
	loadGalleryListeners(j);
	addRemoveGaleriaListener(j);
	addSelectorDS(
		"gallery-category",
		`gallery-category-select-${j}`,
		`gallery-category-${j}`,
	);
}
