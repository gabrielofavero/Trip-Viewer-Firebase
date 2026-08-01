import { translate } from '../../../../../i18n/translation.js';
import { getTravelersFieldset } from '../../travelers.js';
// Modal Content (HTML)
export function getInnerItineraryContent(j, k, period, selects, isNew = false) {
	return `<div class="inner-itinerary" id="inner-itinerary-box">
                <div id="inner-itinerary-main-screen">
                    <div class="nice-form-group" style="display: ${Object.values(selects).some((item: any) => item.active) ? 'block' : 'none'}">
                        <label style="margin-bottom: 0px;">${translate('trip.itinerary.linked_item')} <span class="opcional">(${translate('labels.optional')})</span></label>
                        <button id="inner-itinerary-linked-item" class="btn input-button placeholder-text" data-action="open-inner-itinerary-item" data-index="${j}" style="margin-top: 8px;">${translate('trip.itinerary.link_item')}</button>
                    </div>

                    <div class="nice-form-group">
                        <label>${translate('trip.itinerary.title')}</label>
                        <input required class="nice-form-group" id="inner-itinerary" type="text" placeholder="${translate('trip.itinerary.placeholder')}" maxlength="50" autocomplete="off" />
                    </div>

                    ${getTravelersFieldset('inner-itinerary-travelers', [])}

                    <div class="side-by-side-box-fixed">
                        <div class="nice-form-group side-by-side-fixed">
                        <label>
                            ${translate('labels.start')}<br>
                            <span class="opcional">(${translate('labels.optional')})</span>
                        </label>
                        <input class="flex-input-50-50" id="inner-itinerary-start" type="time">
                    </div>

                    <div class="nice-form-group side-by-side-fixed">
                        <label>
                            ${translate('labels.end')}<br>
                            <span class="opcional">(${translate('labels.optional')})</span>
                        </label>
                        <input class="flex-input-50-50" id="inner-itinerary-end" type="time">
                    </div>
                    </div>

                    <div class="nice-form-group" style="display: ${isNew ? 'block' : 'none'}">
                        <label>${translate('datetime.time_of_day.title')}</label>
                        <select class="edit-select" id="inner-itinerary-select-period">
                            <option value="earlyMorning">${translate('datetime.time_of_day.early_hours')}</option>
                            <option value="morning">${translate('datetime.time_of_day.morning')}</option>
                            <option value="afternoon">${translate('datetime.time_of_day.afternoon')}</option>
                            <option value="night">${translate('datetime.time_of_day.evening')}</option>
                        </select>
                    </div>
                    
                    <div class="button-box-right" style="margin-top: 8px; margin-bottom: 8px; display: ${isNew ? 'none' : 'block'}">
                        <button data-action="open-inner-itinerary-swap" class="btn btn-basic-secondary btn-format">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 48 48">
                                <g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="4"><path d="M18 31h20V5"/>
                                    <path d="M30 21H10v22m34-32l-6-6l-6 6"/><path d="m16 37l-6 6l-6-6"/>
                                </g>
                            </svg>
                        </button>
                        <button data-action="delete-inner-itinerary" data-j="${j}" data-k="${k}" data-period="${period}" class="btn btn-basic btn-format">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
                                <path fill="currentColor" fill-rule="evenodd" d="M8.106 2.553A1 1 0 0 1 9 2h6a1 1 0 0 1 .894.553L17.618 6H20a1 1 0 1 1 0 2h-1v11a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3V8H4a1 1 0 0 1 0-2h2.382l1.724-3.447ZM14.382 4l1 2H8.618l1-2h4.764ZM11 11a1 1 0 1 0-2 0v6a1 1 0 1 0 2 0v-6Zm4 0a1 1 0 1 0-2 0v6a1 1 0 1 0 2 0v-6Z" clip-rule="evenodd"></path>
                            </svg>
                        </button>
                    </div>
                </div>
                <div id="inner-itinerary-select-item" class="inner-itinerary" style="display: none;">
                    <div class="nice-form-group" id="inner-itinerary-select-item-radio">
                        <label>${translate('labels.type')}</label>
                        <fieldset class="nice-form-group">
                            <div class="nice-form-group" id="inner-itinerary-none-radio-container">
                                <input type="radio" name="inner-itinerary-item-radio" id="inner-itinerary-item-none-radio">
                                <label for="inner-itinerary-item-none-radio">${translate('labels.none')}</label>
                            </div>

                            <div class="nice-form-group" id="inner-itinerary-transportation-radio-container" style="display: ${selects.transportation.active ? 'block' : 'none'};">
                                <input type="radio" name="inner-itinerary-item-radio" id="inner-itinerary-item-transportation-radio">
                                <label for="inner-itinerary-item-transportation-radio">${translate('trip.transportation.title')}</label>
                            </div>
                
                            <div class="nice-form-group" id="inner-itinerary-accommodations-radio-container" style="display: ${selects.accommodations.active ? 'block' : 'none'};">
                                <input type="radio" name="inner-itinerary-item-radio" id="inner-itinerary-item-accommodations-radio">
                                <label for="inner-itinerary-item-accommodations-radio">${translate('trip.accommodation.title')}</label>
                            </div>
                
                            <div class="nice-form-group" id="inner-itinerary-destinations-radio-container" style="display: ${selects.destinations.active ? 'block' : 'none'};">
                                <input type="radio" name="inner-itinerary-item-radio" id="inner-itinerary-item-destinations-radio">
                                <label id="inner-itinerary-item-destinations-radio-label" for="inner-itinerary-item-destinations-radio">${translate('destination.title')}</label>
                            </div>
                        </fieldset>

                    </div>

                    <div class="nice-form-group" id="inner-itinerary-item-transportation" style="display: none;">
                        <label>${translate('trip.transportation.title')}</label>
                        <select class="edit-select" id="inner-itinerary-select-transportation">
                            <option value="">${translate('labels.select')}</option>
                            ${selects.transportation.options}
                        </select>
                    </div>

                <div class="nice-form-group" id="inner-itinerary-item-accommodations" style="display: none;">
                    <label>${translate('trip.accommodation.title')}</label>
                    <select class="edit-select" id="inner-itinerary-select-accommodations">
                        <option value="">${translate('labels.select')}</option>
                        ${selects.accommodations.options}
                    </select>
                </div>

                    <div id="inner-itinerary-item-destinations" style="display: none;">
                        <div class="nice-form-group" id="inner-itinerary-item-destinations-location">
                            <label>${translate('destination.document')}</label>
                            <select class="edit-select" id="inner-itinerary-select-location">
                                ${selects.destinations.options}
                                <option value="">${translate('labels.select')}</option>
                            </select>
                        </div>

                        <div class="nice-form-group" style="margin-top: 16px;">
                            <label>${translate('labels.type')}</label>
                            <select class="edit-select" id="inner-itinerary-select-category">
                                <option value="">${translate('labels.select')}</option>
                            </select>
                        </div>

                        <div class="nice-form-group" id="inner-itinerary-select-tour-box" style="margin-top: 16px;">
                            <label>${translate('trip.itinerary.title')}</label>
                            <select class="edit-select" id="inner-itinerary-select-tour">
                                <option value="">${translate('labels.select')}</option>
                            </select>
                        </div>            
                    </div>

                    <div class="nice-form-group" id="title-replacement-container" style="display: none">
                        <input type="checkbox" id="title-replacement-checkbox">
                        <label for="title-replacement" id="title-replacement-label"></label>
                    </div>

                    <div class="nice-form-group" id="time-replacement-container" style="display: none">
                        <input type="checkbox" id="time-replacement-checkbox">
                        <label for="time-replacement" id="time-replacement-label"></label>
                    </div>

                </div>

                <div id="inner-itinerary-swap-item" class="inner-itinerary" style="display: none;">
                    <div class="nice-form-group">
                        <label>${translate('labels.date')}</label>
                        <select class="edit-select" id="inner-itinerary-select-swap-date">
                            ${selects.dates}
                        </select>
                    </div>
                    <div class="nice-form-group">
                        <label>${translate('datetime.time_of_day.title')}</label>
                        <select class="edit-select" id="inner-itinerary-select-swap-period">
                            <option value="earlyMorning">${translate('datetime.time_of_day.early_hours')}</option>
                            <option value="morning">${translate('datetime.time_of_day.morning')}</option>
                            <option value="afternoon">${translate('datetime.time_of_day.afternoon')}</option>
                            <option value="night">${translate('datetime.time_of_day.evening')}</option>
                        </select>
                    </div>
                </div>
            </div>`;
}
