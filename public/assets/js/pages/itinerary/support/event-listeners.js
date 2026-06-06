import { registerActions } from '../../ui/actions.js';
import { openAttributions } from '../../utils/attributions.js';
import { closeToast } from '../../utils/messages.js';

export function loadItineraryListeners() {
    registerActions({
        "open-attributions": () => openAttributions(),
        "close-toast": () => closeToast(),
    });
}
