// ======= Destination Card Edit (P5) =======
// Owner-only edit affordance rendered on the card body — NOT in the link/action
// row. Wrapped in `.edit-container` (id `edit-container-${j}`) so the existing
// `adjustEditVisibility` (edit-destination.ts) keeps controlling owner-only
// visibility. The owner check here is synchronous (UID is cached by the time
// cards render) so lazy-loaded cards are hidden for non-owners too.

import { UID } from '../../../data/firebase/auth.js';
import { FIRESTORE_DESTINATIONS_DATA } from '../../../data/state.js';
import { translate } from '../../../i18n/translation.js';

export function getCardEditHTML(item, j) {
	const isOwner = FIRESTORE_DESTINATIONS_DATA?.sharing?.owner === UID;

	return `
    <div class="edit-container" id="edit-container-${j}" style="display: ${isOwner ? 'flex' : 'none'}">
        <button class="edit-btn" id="edit-${j}" data-action="edit-destination" data-index="${j}">
            <i class="iconify user-data-icon" data-icon="tabler:edit"></i>
            <span>${translate('labels.edit')}</span>
        </button>
    </div>`;
}
