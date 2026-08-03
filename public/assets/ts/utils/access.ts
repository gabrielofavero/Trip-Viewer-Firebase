// ======= Edit Page Access Guard =======
// Prevents opening edit pages when the user is unauthenticated or, for
// existing documents, when they are not the document owner.
//
// Firestore security rules already enforce ownership on writes (server side).
// This guard is the client-side layer: it blocks the page *before* the edit
// form loads, so non-owners never see the form or trigger wasted writes.

import { getUID } from '../data/firebase/auth.js';
import { get } from '../data/firebase/database.js';
import { translate } from '../i18n/translation.js';
import { stopLoadingScreen } from './loading.js';
import { displayForbidden } from './messages.js';

/**
 * Check whether the current user may open an edit page.
 *
 * @param docType - Firestore collection name ('trips', 'destinations', 'listings').
 * @param docId   - Document ID being edited. Empty/null = creating a new document.
 * @returns `true` if the page may load, `false` if access was blocked.
 *
 * When blocked it:
 *  - stops any loading screen,
 *  - shows a clear "Access Denied" notification,
 *  - lets the user go back (index/login for unauthenticated, the document's
 *    view page for non-owners).
 */
export async function canAccessEditPage(docType: string, docId: string | null): Promise<boolean> {
	const uid = await getUID();

	// 1) Must be authenticated (also covers creating new documents).
	if (!uid) {
		stopLoadingScreen();
		displayForbidden(translate('messages.access_denied.message.unauthenticated'), '../index.html');
		return false;
	}

	// 2) For existing documents, the current user must be the owner.
	if (docId) {
		const doc = await get(`${docType}/${docId}`, true, true);
		if (!doc || doc.sharing?.owner !== uid) {
			stopLoadingScreen();
			displayForbidden(
				translate('messages.access_denied.message.not_owner'),
				`../view.html?t=${docId}`,
			);
			return false;
		}
	}

	return true;
}
