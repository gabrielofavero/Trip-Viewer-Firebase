import { registerActions } from '../../ui/actions.js';
import { deleteDestino, openMoveDestinationModal } from '../edit-destination.js';
import { openDescriptionModal } from '../categories/description.js';
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
        "open-description-modal": (target) => {
            const category = target.getAttribute("data-category");
            const index = parseInt(target.getAttribute("data-index"));
            if (category && !isNaN(index)) openDescriptionModal(category, index);
        },
        "move-destination": (target) => {
            const index = parseInt(target.getAttribute("data-index"));
            const category = target.getAttribute("data-category");
            if (!isNaN(index) && category) openMoveDestinationModal(index, category);
        },
    });
}
