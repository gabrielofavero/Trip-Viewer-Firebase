import { registerActions } from '../../../ui/actions.js';
import { registerActions as registerMessageActions } from '../../../utils/messages.js';
import {
	deleteDestination,
	openMoveDestinationModal,
	moveDestination,
	deleteDestinationAction,
} from '../edit-destination.js';
import { openDescriptionModal, saveDescription } from '../categories/description.js';
import {
	openDestinationImages,
	openDestinationImage,
	closeDestinationImages,
	removeDestinationImage,
	confirmDestinationImages,
} from '../categories/image.js';
import { openAttributions } from '../../../utils/attributions.js';
import { closeToast } from '../../../utils/messages.js';
import { closeModal } from '../../../theme/visibility.js';

export function loadEditDestinationListeners() {
	registerActions({
		'delete-destination': () => deleteDestination(),
		'open-attributions': () => openAttributions(),
		'close-modal': (target) => {
			const modalId = target.getAttribute('data-modal') || 'delete-modal';
			closeModal(modalId);
		},
		'close-toast': () => closeToast(),
		'open-description-modal': (target) => {
			const category = target.getAttribute('data-category');
			const index = parseInt(target.getAttribute('data-index'));
			if (category && !isNaN(index)) openDescriptionModal(category, index);
		},
		'open-destination-images': (target) => {
			const category = target.getAttribute('data-category');
			const index = parseInt(target.getAttribute('data-index'));
			if (category && !isNaN(index)) openDestinationImages(category, index);
		},
		'open-destination-image': (target) => {
			const category = target.getAttribute('data-category');
			const index = parseInt(target.getAttribute('data-index'));
			if (category && !isNaN(index)) openDestinationImage(category, index);
		},
		'remove-destination-image': (target) => {
			const category = target.getAttribute('data-category');
			const index = parseInt(target.getAttribute('data-index'));
			if (category && !isNaN(index)) removeDestinationImage(category, index);
		},
		'move-destination': (target) => {
			const index = parseInt(target.getAttribute('data-index'));
			const category = target.getAttribute('data-category');
			if (!isNaN(index) && category) openMoveDestinationModal(index, category);
		},
	});

	// Register string-based button actions used in modals (via messages.js _actionRegistry)
	registerMessageActions({
		deleteDestinationAction,
		moveDestination,
		saveDescription,
		confirmDestinationImages,
		closeDestinationImages,
	});
}
