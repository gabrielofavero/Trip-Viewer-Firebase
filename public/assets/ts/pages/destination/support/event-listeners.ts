import { registerActions } from '../../../ui/actions.js';
import { registerActions as registerMessageActions } from '../../../utils/messages.js';
import { openFilterDrawer } from './sort-and-filter/filter.js';
import { openSortDrawer } from './sort-and-filter/sort.js';
import { closeDrawer } from './sort-and-filter/support/drawer.js';
import { add, edit, deleteEdit } from '../edit-destination.js';
import { openDestinationDialog, closeDestinationDialog } from './dialog.js';
import { openAttributions } from '../../../utils/attributions.js';
import { closeToast } from '../../../utils/messages.js';

export function loadDestinationListeners() {
	registerActions({
		'open-filter-drawer': () => openFilterDrawer(),
		'open-sort-drawer': () => openSortDrawer(),
		'add-destination': () => add(),
		'open-attributions': () => openAttributions(),
		'close-drawer': () => closeDrawer(),
		'close-toast': () => closeToast(),
		'open-link': (target) => {
			const url = target.getAttribute('data-url');
			if (url) window.open(url, '_blank');
		},
		'open-destination-dialog': (target) => {
			const index = parseInt(target.getAttribute('data-index'));
			if (!isNaN(index)) openDestinationDialog(index);
		},
		'close-destination-dialog': () => closeDestinationDialog(),
		'edit-destination': (target) => {
			const index = parseInt(target.getAttribute('data-index'));
			if (!isNaN(index)) edit(index);
		},
	});

	// Register string-based button actions used in modals (via messages.js _actionRegistry)
	registerMessageActions({
		deleteEdit,
	});
}
