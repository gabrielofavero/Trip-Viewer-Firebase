import { registerActions } from '../../../ui/actions.js';
import { calendarPrevious, calendarNext } from '../categories/itinerary-module/calendar.js';
import { closeModalCalendar, displayInnerItineraryMessage } from '../categories/itinerary-module/inner-itinerary.js';
import { openAttributions } from '../../../utils/attributions.js';
import { closeToast } from '../../../utils/messages.js';
import { loadAndOpenDestino } from '../categories/destination.js';
import { copyToClipboard } from '../categories/transportation-module.js';

export function loadViewListeners() {
    registerActions({
        "calendar-previous": () => calendarPrevious(),
        "calendar-next": () => calendarNext(),
        "close-modal-calendar": () => closeModalCalendar(),
        "open-attributions": () => openAttributions(),
        "close-toast": () => closeToast(),
        "load-and-open-destination": (target) => {
            const type = target.getAttribute("data-type");
            if (type) loadAndOpenDestino(type);
        },
        "copy-to-clipboard": (target) => {
            const text = target.getAttribute("data-text");
            if (text) copyToClipboard(text);
        },
        "open-link": (target) => {
            const url = target.getAttribute("data-url");
            if (url) window.open(url, "_blank");
        },
        "display-inner-itinerary-message": (target) => {
            const index = parseInt(target.getAttribute("data-index"));
            if (!isNaN(index)) displayInnerItineraryMessage(index);
        },
    });
}
