import { registerActions } from '../../../ui/actions.js';
import { openFilterDrawer } from './sort-and-filter/filter.js';
import { openSortDrawer } from './sort-and-filter/sort.js';
import { closeDrawer } from './sort-and-filter/support/drawer.js';
import { add } from '../edit-destination.js';
import { openAttributions } from '../../../utils/attributions.js';
import { closeToast } from '../../../utils/messages.js';

export function loadDestinationListeners() {
    registerActions({
        "open-filter-drawer": () => openFilterDrawer(),
        "open-sort-drawer": () => openSortDrawer(),
        "add-destination": () => add(),
        "open-attributions": () => openAttributions(),
        "close-drawer": () => closeDrawer(),
        "close-toast": () => closeToast(),
    });
}
