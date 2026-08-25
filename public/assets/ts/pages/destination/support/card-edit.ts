// ======= Destination Dialog Edit =======
// Owner check for the dialog's pencil edit button. The button itself is
// rendered by support/dialog.ts in the dialog header (right after the title).

import { UID } from '../../../data/firebase/auth.js';
import { FIRESTORE_DESTINATIONS_DATA } from '../../../data/state.js';

export function isOwner(): boolean {
	return FIRESTORE_DESTINATIONS_DATA?.sharing?.owner === UID;
}
