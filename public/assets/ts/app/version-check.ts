// ======= Version Check Module =======
// Detects when a newer app version is deployed and prompts the user to refresh,
// so they load the latest HTML/assets (content-hashed) instead of staying on a
// stale cached page. Uses LocalStorage to remember the last-seen version.
//
// Behavior (per the F190 spec):
//   1. First run (no stored version)  → store the current version, ignore.
//   2. Stored version === current     → ignore.
//   3. Stored version !== current     → show an unblockable dialog
//      ("A new version is available") whose only action refreshes the page.

import { cloneObject } from '../utils/dom.js';
import { displayFullMessage, MESSAGE_PROPERTIES } from '../utils/messages.js';
import { translate } from '../i18n/translation.js';
import { isStaticMode } from '../static-mode/static-mode.js';

const STORAGE_KEY = 'tripviewer:lastVersion';

/**
 * Check whether a newer app version is live and prompt to refresh if so.
 * @param version - Current app version string (APP.version, e.g. "2.24.0").
 */
export function checkForAppUpdate(version: string) {
	// Nothing to compare against (missing version.json / unknown version).
	if (!version || version === 'Unknown') return;
	// Static exports are self-contained snapshots — there's no server to
	// refresh from, and prompting would be meaningless.
	if (isStaticMode()) return;

	const previousVersion = readStoredVersion();

	if (previousVersion === null) {
		// First run — just remember the version and ignore.
		writeStoredVersion(version);
		return;
	}

	if (previousVersion === version) {
		// Version matches — nothing to do.
		return;
	}

	// Version mismatch — a new version is live. Remember it right away so the
	// dialog doesn't re-appear on every page while the user is still on the
	// stale build (index → view → edit, etc.).
	writeStoredVersion(version);

	const properties = cloneObject(MESSAGE_PROPERTIES);
	properties.title = translate('messages.app_update.title');
	properties.content = translate('messages.app_update.message', { version });
	// Unblockable: no X close button and Escape won't dismiss it. The only way
	// out is the Refresh button, which reloads the page onto the new build.
	properties.closeButton = false;
	properties.buttons = [
		{
			type: 'confirm',
			label: 'labels.refresh',
			action: () => window.location.reload(),
		},
	];

	displayFullMessage(properties);
}

function readStoredVersion(): string | null {
	try {
		return window.localStorage.getItem(STORAGE_KEY);
	} catch {
		// Storage unavailable (private mode, quota, blocked cookies).
		return null;
	}
}

function writeStoredVersion(version: string) {
	try {
		window.localStorage.setItem(STORAGE_KEY, version);
	} catch {
		// Ignore storage failures — worst case we re-prompt on the next page.
	}
}
