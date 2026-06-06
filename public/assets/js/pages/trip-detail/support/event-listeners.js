import { registerActions } from '../../../ui/actions.js';
import { calendarPrevious, calendarNext } from '../categories/itinerary-module/calendar.js';
import { closeModalCalendar } from '../categories/itinerary-module/inner-itinerary.js';
import { openAttributions } from '../../../utils/attributions.js';
import { closeToast } from '../../../utils/messages.js';

export function loadViewListeners() {
    registerActions({
        "calendar-previous": () => calendarPrevious(),
        "calendar-next": () => calendarNext(),
        "close-modal-calendar": () => closeModalCalendar(),
        "open-attributions": () => openAttributions(),
        "close-toast": () => closeToast(),
    });
}
