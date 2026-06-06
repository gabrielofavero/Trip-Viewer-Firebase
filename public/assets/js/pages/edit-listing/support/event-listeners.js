import { registerActions } from '../../ui/actions.js';
import { deleteListagem } from '../edit-listing.js';
import { openAttributions } from '../../utils/attributions.js';
import { closeToast } from '../../utils/messages.js';
import { closeModal } from '../../theme/visibility.js';

export function loadEditListingListeners() {
    registerActions({
        "delete-listing": () => deleteListagem(),
        "open-attributions": () => openAttributions(),
        "close-modal": (target) => {
            const modalId = target.getAttribute("data-modal") || "delete-modal";
            closeModal(modalId);
        },
        "close-toast": () => closeToast(),
    });
}
