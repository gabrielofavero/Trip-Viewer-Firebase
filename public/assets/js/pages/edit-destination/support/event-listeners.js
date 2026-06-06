import { registerActions } from '../../ui/actions.js';
import { deleteDestino } from '../edit-destination.js';
import { openAttributions } from '../../utils/attributions.js';
import { closeToast } from '../../utils/messages.js';
import { closeModal } from '../../theme/visibility.js';

export function loadEditDestinationListeners() {
    registerActions({
        "delete-destination": () => deleteDestino(),
        "open-attributions": () => openAttributions(),
        "close-modal": (target) => {
            const modalId = target.getAttribute("data-modal") || "delete-modal";
            closeModal(modalId);
        },
        "close-toast": () => closeToast(),
    });
}
