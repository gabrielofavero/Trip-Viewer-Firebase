import { getTransportations } from '../../app/config.js';
import { cloneObject, getCategoryID, getChildIDs, getID, getJ, getNextJ } from '../../utils/dom.js';
import { addSelectorDS } from '../../ui/dynamic-select.js';
import {
	formattedDateToDate,
	getArrayOfDates,
	getDateTitle,
	getNextCategoryStartEnd,
	getTodayFormatted,
	getTomorrowFormatted,
} from '../../utils/dates.js';
import { addRemoveChildListener, registerVisibilityExport } from '../../theme/visibility.js';
import { loadImageSelector } from '../../data/firebase/storage.js';
import { translate } from '../../i18n/translation.js';
import { closeMessage, displayFullMessage, MESSAGE_PROPERTIES } from '../../utils/messages.js';
import { DESTINATIONS } from '../../data/state.js';
import {
	loadTransportationListeners,
	loadTransportationVisibility,
	applyTransportationTypeVisualization,
	updateTransportationTitle,
} from './categories/transportation.js';
import {
	loadAccommodationListeners,
	ACCOMMODATION_IMAGES,
	removeAccommodationImages,
	renderAccommodationImageCarousel,
} from './categories/accommodation.js';
import { addRemoveTransportationListener } from './support/event-listeners.js';
import { DateRangePicker } from '../../ui/date-range-picker.js';
import { getTravelerOptionsHTML } from './categories/travelers.js';
import { switchPinLabel, switchPinVisibility } from './categories/basic-data/protected-data.js';
import {
	getDestinationsItemCheckbox,
	getActiveDestinationsSelectVisibility,
	getActiveDestinationsCheckboxOptions,
	getDestinationsItemCard,
	getActiveDestinationsCardOptions,
} from './categories/destination.js';
import {
	getItineraryTitleSelectOptions,
	loadItineraryListeners,
	updateItineraryTitle,
	reloadItinerary,
	clearItineraryDurationStash,
} from './categories/itinerary-module/itinerary-module.js';
import {
	addAccommodationToItinerary,
	addTransportationToItinerary,
} from './categories/itinerary-module/inner-itinerary/auto-populate.js';
import {
	countItineraryDestinationLinks,
	unlinkItineraryDestinationLinks,
} from './categories/itinerary-module/inner-itinerary/inner-itinerary.js';
import {
	getWallpaperSourceDestination,
	handleWallpaperSourceUnlink,
} from './categories/wallpaper-import.js';
import {
	updateActiveDestinationsHTMLs,
	reorganizeDestinationsCheckbox,
} from './categories/destination.js';

export var DATAS = [];

// Guard so re-rendering the schedule (page loads + trip-duration changes) does
// not stack duplicate listeners on #itinerary-enabled.
let itineraryToggleListenerAttached = false;

const TODAY = getTodayFormatted();
const TOMORROW = getTomorrowFormatted();

// Register _add* functions for visibility module backward compat
registerVisibilityExport('_addTransportation', addTransportation);
registerVisibilityExport('_addAccommodations', addAccommodations);
registerVisibilityExport('_addDestinations', loadDestinations);
registerVisibilityExport('_addItinerary', loadItinerarySchedule);
export function loadNewTrip() {
	// Fresh editing session — parked days from a previous unsaved new trip must
	// not leak into this one.
	clearItineraryDurationStash();
	loadBasicFieldsNewTrip();
	loadItinerarySchedule();
	loadDestinations();
}

function loadBasicFieldsNewTrip() {
	getID('start').value = TODAY;
	getID('end').value = TOMORROW;

	getID('currency').value = 'BRL';

	// New trips default to "no protection" — reflect that in the PIN section
	// visibility and button label (see #pin-disabled in trip.html).
	switchPinVisibility();
	switchPinLabel();
}

const TRANSPORTATION_PICKERS = new Map<number, DateRangePicker>();

export function getTransportationPicker(j: number): DateRangePicker | undefined {
	return TRANSPORTATION_PICKERS.get(j);
}

export function addTransportation() {
	const j = getNextJ('transportation-box');

	$('#transportation-box').append(`
  <div id="transportation-inner-box-${j}" class="inner-box draggable">
        <div id="transportation-${j}" class="accordion-item accordion-transportation accordion-draggable" >
        <h2 class="accordion-header" id="heading-transportation-${j}">
          <button id="transportation-title-${j}" class="accordion-button collapsed" type="button" data-bs-toggle="collapse"
            data-bs-target="#collapse-transportation-${j}" aria-expanded="false" aria-controls="collapse-transportation-${j}">
            ${translate('trip.transportation.title')} ${j}
          </button>
        </h2>
        <div id="collapse-transportation-${j}" class="accordion-collapse collapse"
          aria-labelledby="heading-transportation-${j}" data-bs-parent="#transportation-box">
            <div class="accordion-body">
              <div class="import-fetch-wrapper">
                <button type="button" id="transportation-import-button-${j}" data-action="open-transportation-import"
                  data-index="${j}" class="btn btn-basic btn-sm" style="display:none"
                  title="${translate('trip.transportation.import.button')}"
                  aria-label="${translate('trip.transportation.import.button')}">
                  <i class="iconify" data-icon="heroicons:document-arrow-down-16-solid"></i>
                  <span>${translate('trip.transportation.import.button')}</span>
                </button>
              </div>
              <div class="nice-form-group" style="display: none">
              <label>${translate('labels.id')}</label>
              <input id="transportation-id-${j}" type="text" disabled />
            </div>

            <fieldset class="nice-form-group" id="direction-box-${j}">
              <div class="modern-radio-group">
                <div class="nice-form-group">
                  <input type="radio" name="direction-${j}" id="departure-${j}" ${j === 1 ? 'checked' : ''} />
                  <label for="departure-${j}">${translate('trip.transportation.departure')}</label>
                </div>

                <div class="nice-form-group">
                  <input type="radio" name="direction-${j}" id="during-${j}"/>
                  <label for="during-${j}">${translate('trip.transportation.during')}</label>
                </div>

                <div class="nice-form-group">
                  <input type="radio" name="direction-${j}" id="return-${j}" ${j != 1 ? 'checked' : ''} />
                  <label for="return-${j}">${translate('trip.transportation.return')}</label>
                </div>
              </div>
            </fieldset>

            <div class="nice-form-group" id="people-box-${j}">
              <label>${translate('labels.traveler')}</label>
              <select ${getID('people-view').checked ? 'required' : ''} class="edit-select" id="transportation-person-select-${j}">
                <option value="">${translate('labels.select')}</option>
                ${getTravelerOptionsHTML()}
              </select>
            </div>

            <div class="nice-form-group">
              <label>Departure Point</label>
              <input id="departure-point-${j}" type="text" placeholder="Belo Horizonte" />
            </div>

            <div class="nice-form-group">
              <label>Arrival Point</label>
              <input id="arrival-point-${j}" type="text" placeholder="Las Vegas" />
            </div>
    
            <div class="nice-form-group">
              <label>${translate('trip.transportation.departure_arrival')}</label>
              <div class="date-range-picker" id="transportation-duration-${j}">
                <input type="hidden" id="transportation-departure-date-${j}" />
                <input type="hidden" id="transportation-arrival-date-${j}" />
              </div>
            </div>
    
            <div class="side-by-side-box">
              <div class="nice-form-group side-by-side">
                <label>${translate('trip.transportation.departure_time')}</label>
                <input required class="flex-input mini-box" id="departure-time-${j}" type="time" value="00:00" />
              </div>
              <div class="nice-form-group side-by-side">
                <label>${translate('trip.transportation.arrival_time')}</label>
                <input required class="flex-input mini-box" id="arrival-time-${j}" type="time" value="00:30" />
              </div>
            </div>
    
            <div class="nice-form-group">
              <label>Transportation Method</label>
              <select class="edit-select" required id="transportation-type-${j}">
                ${getTypeOptions()}
              </select>
            </div>

            <div class="nice-form-group">
              <label>${translate('trip.transportation.duration')}</label>
              <input class="flex-input" id="transportation-duration-other-${j}" type="time" />
            </div>

            <div class="nice-form-group" id="company-select-form-group-${j}">
              <label>${translate('labels.company')} <span class="opcional"> (${translate('labels.optional')})</span></label>
              <select class="edit-select" id="company-select-${j}" style="display: none;"></select>
              <input class="nice-form-group" id="company-${j}" type="text" placeholder="${translate('labels.company')}" />
            </div>

            <div class="nice-form-group">
              <label>${translate('labels.reservation.code')} <span class="opcional"> (${translate('labels.optional')})</span></label>
              <input id="reservation-transportation-${j}" type="text" placeholder="ABC123" />
            </div>

            <div class="nice-form-group">
              <label>${translate('labels.reservation.link')} <span class="opcional"> (${translate('labels.optional')})</span></label>
              <input id="transportation-link-${j}" type="url" placeholder="https://www.google.com/" value=""
                class="icon-right" />
            </div>

          </div>
    
          <div class="button-box-right-formatted">
            <button id="remove-transportation-${j}" class="btn btn-basic btn-format">
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

	getID(`transportation-id-${j}`).value = getCategoryID('transportation', j);
	getID(`departure-point-${j}`).value = j == 1 ? '' : getID(`arrival-point-${j - 1}`).value;
	getID(`arrival-point-${j}`).value = j == 2 ? getID(`departure-point-${j - 1}`).value : '';
	getID(`transportation-departure-date-${j}`).value =
		j == 1
			? getID('start').value
			: j == 2
				? getID('end').value
				: getID(`transportation-arrival-date-${j - 1}`).value;
	getID(`transportation-arrival-date-${j}`).value = getID(
		`transportation-departure-date-${j}`,
	).value;

	// Initialize date range picker for this transportation
	const transportDurPicker = getID(`transportation-duration-${j}`);
	if (transportDurPicker) TRANSPORTATION_PICKERS.set(j, new DateRangePicker(transportDurPicker));

	loadTransportationListeners(j);
	loadTransportationVisibility(j);
	applyTransportationTypeVisualization(j);
	addRemoveTransportationListener(j);

	// Auto-add the new leg to the itinerary when the module is enabled.
	if (getID('itinerary-enabled')?.checked) {
		addTransportationToItinerary(j);
	}

	function getTypeOptions() {
		let result = '';
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
	const startEnd = getNextCategoryStartEnd('accommodations', 'check-out');
	const j = getNextJ('accommodations-box');
	$('#accommodations-box').append(`
      <div id="accommodations-inner-box-${j}" class="inner-box draggable">
        <div id="accommodations-${j}" class="accordion-item accordion-accommodations accordion-draggable" >
        <h2 class="accordion-header" id="heading-accommodations-${j}">
          <button id="accommodations-title-${j}" class="accordion-button collapsed" type="button" data-bs-toggle="collapse"
            data-bs-target="#collapse-accommodations-${j}" aria-expanded="false" aria-controls="collapse-accommodations-${j}">
            ${translate('trip.accommodation.accommodation')} ${j}
          </button>
        </h2>
        <div id="collapse-accommodations-${j}" class="accordion-collapse collapse"
          aria-labelledby="heading-accommodations-${j}" data-bs-parent="#accommodations-box">
            <div class="accordion-body">
              <div class="import-fetch-wrapper">
                <button type="button" id="accommodation-import-button-${j}" data-action="open-accommodation-import"
                  data-index="${j}" class="btn btn-basic btn-sm" style="display:none"
                  title="${translate('trip.accommodation.import.button')}"
                  aria-label="${translate('trip.accommodation.import.button')}">
                  <i class="iconify" data-icon="heroicons:document-arrow-down-16-solid"></i>
                  <span>${translate('trip.accommodation.import.button')}</span>
                </button>
              </div>
              <div class="nice-form-group" style="display: none">
              <label>${translate('labels.id')}</label>
              <input id="accommodations-id-${j}" type="text" disabled />
            </div>

            <div class="nice-form-group">
              <input id="accommodations-breakfast-${j}" type="checkbox" class="switch">
              <label for="accommodations-breakfast-${j}">
                ${translate('trip.accommodation.breakfast')}
              </label>
            </div>

            <div class="nice-form-group">
              <label>${translate('labels.name')}</label>
              <input required id="accommodations-name-${j}" type="text" placeholder="${translate('trip.accommodation.name_placeholder')}" />
            </div>
    
            <div class="nice-form-group">
              <label>${translate('labels.address')} <span class="opcional"> (${translate('labels.optional')})</span></label>
              <input id="accommodations-address-${j}" type="text" placeholder="${translate('trip.accommodation.address_placeholder')}" />
            </div>
    
            <div class="nice-form-group">
              <label>${translate('trip.accommodation.stay_duration')}</label>
              <div class="date-range-picker" id="accommodations-duration-${j}">
                <input type="hidden" id="check-in-${j}" value="${startEnd.start}" />
                <input type="hidden" id="check-out-${j}" value="${startEnd.end}" />
              </div>
            </div>
    
            <div class="side-by-side-box">
              <div class="nice-form-group side-by-side">
                <label>${translate('trip.accommodation.checkin_time')}</label>
                <input class="flex-input mini-box" id="check-in-time-${j}" type="time" value="14:00" />
              </div>
              <div class="nice-form-group side-by-side">
                <label>${translate('trip.accommodation.checkout_time')}</label>
                <input class="flex-input mini-box" id="check-out-time-${j}" type="time" value="12:00" />
              </div>
            </div>
    
            <div class="nice-form-group">
              <label>${translate('labels.description.title')} <span class="opcional"> (${translate('labels.optional')})</span></label>
              <input id="accommodations-description-${j}" type="text" placeholder="${translate('trip.accommodation.description_placeholder')}" />
            </div>

            <div class="nice-form-group">
              <label>${translate('trip.accommodation.payment_status')} <span class="opcional"> (${translate('labels.optional')})</span></label>
              <select id="accommodations-payment-status-${j}">
                <option value="">${translate('trip.accommodation.payment_status_options.none')}</option>
                <option value="prepaid">${translate('trip.accommodation.payment_status_options.prepaid')}</option>
                <option value="partial_prepaid">${translate('trip.accommodation.payment_status_options.partial_prepaid')}</option>
                <option value="pay_on_site">${translate('trip.accommodation.payment_status_options.pay_on_site')}</option>
              </select>
            </div>

            <div class="nice-form-group">
              <label>${translate('labels.reservation.code')} <span class="opcional"> (${translate('labels.optional')})</span></label>
              <input id="reservation-accommodations-${j}" type="text" placeholder="ABC123" />
            </div>
      
            <div class="nice-form-group">
              <label>${translate('labels.reservation.link')} <span class="opcional"> (${translate('labels.optional')})</span></label>
              <input id="reservation-accommodations-link-${j}" type="url" placeholder="https://www.google.com/" value=""
                class="icon-right" />
            </div>

            <div class="nice-form-group customization-box" id="accommodations-${j}-box">
              <label>${translate('labels.image.title_plural')} <span class="opcional"> (${translate('labels.optional')})</span></label>
              <div id="accommodation-images-carousel-${j}" class="image-slot-carousel"></div>
            </div>
          </div>
      
            <div class="button-box-right-formatted">
              <button id="remove-accommodations-${j}" class="btn btn-basic btn-format">
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

	getID(`accommodations-id-${j}`).value = getCategoryID('accommodations', j);
	addRemoveChildListener('accommodations', j, () => removeAccommodationImages(j));

	// Initialize date range picker for this accommodation
	const accommDurPicker = getID(`accommodations-duration-${j}`);
	if (accommDurPicker) new DateRangePicker(accommDurPicker);

	loadAccommodationListeners(j);
	ACCOMMODATION_IMAGES[j] = [];
	renderAccommodationImageCarousel(j);

	// Auto-add check-in/check-out to the itinerary when the module is enabled.
	if (getID('itinerary-enabled')?.checked) {
		addAccommodationToItinerary(j);
	}
}

export function loadDestinations() {
	if (!DESTINATIONS || DESTINATIONS.length === 0) return;

	let destinations = [...DESTINATIONS];
	destinations.sort((a, b) => a.title.localeCompare(b.title));
	getID('no-destinations').style.display = 'none';
	getID('has-destinations').style.display = 'flex';
	getID('all-destinations-used').style.display = 'none';

	const container = getID('destinations-checkboxes');
	container.innerHTML = '';
	for (const destination of destinations) {
		container.innerHTML += getDestinationsItemCard(destination.id, destination.title);
	}

	// Card click: toggle selected, move to top of selected group.
	// Unselecting a destination linked to itinerary items or used as the
	// wallpaper prompts the user before those links are removed.
	for (const card of container.querySelectorAll('.destination-card')) {
		card.addEventListener('click', () => handleDestinationCardClick(card, container));
	}

	getID('destinations-enabled')?.addEventListener('change', () => updateActiveDestinationsHTMLs());
}

/**
 * Card click for the trip-level destination picker. Unselecting a destination
 * that is linked to itinerary items or used as the wallpaper asks the user for
 * confirmation before removing those links.
 */
async function handleDestinationCardClick(card: Element, container: HTMLElement) {
	const destinationId = card.getAttribute('data-destination-id') || '';
	const wasSelected = card.classList.contains('selected');

	if (wasSelected && destinationId) {
		const linkInfo = getDestinationLinkInfo(destinationId);
		if (linkInfo.itineraryCount > 0 || linkInfo.isWallpaper) {
			const confirmed = await confirmDestinationUnlink(linkInfo);
			if (!confirmed) return; // keep the destination selected
		}
		unlinkDestinationReferences(destinationId, linkInfo);
	}

	card.classList.toggle('selected');
	if (card.classList.contains('selected')) {
		container.prepend(card);
	}
	reorganizeDestinationsCheckbox();
	updateActiveDestinationsHTMLs();
}

function getDestinationLinkInfo(destinationId: string) {
	return {
		itineraryCount: countItineraryDestinationLinks(destinationId),
		isWallpaper: getWallpaperSourceDestination() === destinationId,
	};
}

function unlinkDestinationReferences(destinationId: string, linkInfo) {
	if (linkInfo.itineraryCount > 0) {
		unlinkItineraryDestinationLinks(destinationId);
		reloadItinerary(); // refresh itinerary DOM after clearing references
	}
	if (linkInfo.isWallpaper) {
		handleWallpaperSourceUnlink(destinationId);
	}
}

function confirmDestinationUnlink(linkInfo): Promise<boolean> {
	return new Promise((resolve) => {
		const properties = cloneObject(MESSAGE_PROPERTIES);
		properties.title = translate('destination.unlink.title');
		properties.content = getDestinationUnlinkContent(linkInfo);
		properties.buttons = [
			{
				type: 'cancel',
				action: () => {
					closeMessage();
					resolve(false);
				},
			},
			{
				type: 'confirm',
				action: () => {
					closeMessage();
					resolve(true);
				},
				label: 'destination.unlink.confirm',
			},
		];
		displayFullMessage(properties);
	});
}

function getDestinationUnlinkContent(linkInfo) {
	const items = [];
	if (linkInfo.itineraryCount > 0) {
		items.push(
			`<li>${translate('destination.unlink.itinerary', { count: linkInfo.itineraryCount })}</li>`,
		);
	}
	if (linkInfo.isWallpaper) {
		items.push(`<li>${translate('destination.unlink.wallpaper')}</li>`);
	}
	return `<p>${translate('destination.unlink.message')}</p><ul>${items.join('')}</ul>`;
}

export function loadItinerarySchedule() {
	const start = getID('start').value;
	const end = getID('end').value;

	DATAS = getArrayOfDates(formattedDateToDate(start), formattedDateToDate(end));

	const itineraryBox = getID('itinerary-box');
	itineraryBox.innerHTML = '';

	for (let j = 1; j <= DATAS.length; j++) {
		const data = DATAS[j - 1];
		let formattedDate = getDateTitle(data, 'weekday_day_month');

		itineraryBox.innerHTML += `
      <div id="itinerary-day-${j}" class="accordion-item accordion-itinerary" >
      <h2 class="accordion-header" id="heading-itinerary-${j}">
        <button id="itinerary-title-${j}" class="accordion-button collapsed" type="button" data-bs-toggle="collapse"
          data-bs-target="#collapse-itinerary-${j}" aria-expanded="false"
          aria-controls="collapse-itinerary-${j}">
          ${formattedDate}
        </button>
      </h2>
      <div id="collapse-itinerary-${j}" class="accordion-collapse collapse"
        aria-labelledby="heading-itinerary-${j}" data-bs-parent="#itinerary-box">
        <div class="accordion-body">

          <div class="nice-form-group" id="itinerary-location-box-${j}" style="display: ${getActiveDestinationsSelectVisibility()}">
            <label>${translate('destination.title')}<span class="optional"> (${translate('labels.optional')})</span></label>
            <div class="destination-cards itinerary-cards" id="itinerary-location-${j}">
              ${getActiveDestinationsCardOptions('itinerary', j)}
            </div>
          </div>

          <div class="nice-form-group">
            <label>${translate('labels.title')}<span class="optional"> (${translate('labels.optional')})</span></label>
              <select class="edit-select" id="itinerary-inner-title-select-${j}" style="display: block;">
                ${getItineraryTitleSelectOptions()}
              </select>  
            <input class="nice-form-group" id="itinerary-inner-title-${j}" maxlength="25" type="text" placeholder="São Paulo" style="display: none;">
          </div>

          <div class='period-box' id='itinerary-early-morning-${j}'>
            <label>${translate('datetime.time_of_day.early_hours')}</label>
            <div class="inner-itinerary draggable-area" data-group="itinerary-${j}" id="inner-itinerary-early-morning-${j}"></div>
          </div>

          <div class='period-box' id='itinerary-morning-${j}'>
            <label>${translate('datetime.time_of_day.morning')}</label>
            <div class="inner-itinerary draggable-area" data-group="itinerary-${j}" id="inner-itinerary-morning-${j}"></div>
          </div>

          <div class='period-box' id='itinerary-afternoon-${j}'>
            <label>${translate('datetime.time_of_day.afternoon')}</label>
            <div class="inner-itinerary draggable-area" data-group="itinerary-${j}" id="inner-itinerary-afternoon-${j}"></div>
          </div>

          <div class='period-box' id='itinerary-night-${j}'>
            <label>${translate('datetime.time_of_day.evening')}</label>
            <div class="inner-itinerary draggable-area" data-group="itinerary-${j}" id="inner-itinerary-night-${j}"></div>
          </div>

          <div class="button-box-right-formatted" id="itinerary-add-box-${j}" style="display: block; margin-top: 24px">
            <button id="itinerary-add-${j}" class="btn btn-theme" data-action="open-inner-itinerary" data-index="${j}">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">
                <g fill="currentColor" fill-rule="evenodd" clip-rule="evenodd">
                  <path d="M2 12C2 6.477 6.477 2 12 2s10 4.477 10 10s-4.477 10-10 10S2 17.523 2 12Zm10-8a8 8 0 1 0 0 16a8 8 0 0 0 0-16Z">
                  </path>
                  <path d="M13 7a1 1 0 1 0-2 0v4H7a1 1 0 1 0 0 2h4v4a1 1 0 1 0 2 0v-4h4a1 1 0 1 0 0-2h-4V7Z">
                  </path>
                </g>
              </svg>
              ${translate('labels.add')}
            </button>
          </div>

        </div>
      </div>
    </div>`;
	}

	for (const child of getChildIDs('itinerary-box')) {
		const j = getJ(child);
		getID(`itinerary-inner-title-select-${j}`).addEventListener('change', () =>
			updateItineraryTitle(j),
		);
		getID(`itinerary-inner-title-${j}`).addEventListener('change', () => updateItineraryTitle(j));
		// Destination card clicks (select + auto-title) are handled here.
		loadItineraryListeners(j);
	}

	if (!itineraryToggleListenerAttached) {
		itineraryToggleListenerAttached = true;
		getID('itinerary-enabled').addEventListener('change', () => reloadItinerary());
	}
}
