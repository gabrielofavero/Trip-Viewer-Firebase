// ======= Version Check Module =======
// Detects when a newer app version is deployed and prompts the user to refresh,
// so they load the latest HTML/assets (content-hashed) instead of staying on a
// stale cached page.
//
// Why startup only syncs (never prompts):
//   The HTML shell is served `no-cache, must-revalidate`, so every page load
//   already revalidates and receives the newest build (with its content-hashed
//   version.json). By the time startup runs, the running code IS the newest
//   version — a "refresh to load the new version" dialog there would be
//   pointless ("the cache already shows it's ok"). So startup just records the
//   last-seen build and returns.
//
// How a new version IS detected while the app is open:
//   The app polls a stable, un-hashed /version.json (served with
//   Cache-Control: no-store — see firebase.json) on a timer and whenever the
//   tab regains focus. It compares the monotonic `build` counter (incremented
//   on EVERY deploy, even when the semver label stays the same) against the
//   build this tab loaded. If the live build is newer, it shows an unblockable
//   "new version available" dialog whose only action refreshes onto the new
//   build. No worker and no per-request limits: one tiny JSON per check.

import { cloneObject } from '../utils/dom.js';
import {
	displayFullMessage,
	MESSAGE_MODAL_OPEN,
	MESSAGE_PROPERTIES,
} from '../utils/messages.js';
import { translate } from '../i18n/translation.js';
import { isStaticMode } from '../static-mode/static-mode.js';

const STORAGE_KEY = 'tripviewer:lastVersion';
// Stable, un-hashed endpoint excluded from content-hashing (hash-assets.js)
// and served `no-store` (firebase.json), so every fetch reflects the latest
// deploy instead of a year-long immutable cache.
const LIVE_VERSION_URL = '/version.json';
// How often to re-check while the app stays open (ms).
const POLL_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

interface StoredVersion {
	version: string;
	build: number;
}

// Baseline of the build this tab actually loaded at startup. The poller
// compares the live endpoint against THIS (not LocalStorage), so detection is
// always relative to the code currently running in this tab.
let loadedBuild = 0;
let loadedVersion = '';
let loadedProjectId = '';
// Prompt once per loaded build; after the refresh the new build takes over.
let updatePrompted = false;

/**
 * Sync the last-seen version marker at startup. Never prompts: the page that
 * just loaded is already the newest build (see header comment).
 * @param version - Current app version string (APP.version, e.g. "2.28.0").
 * @param build - Monotonic build counter from version.json (APP.build).
 */
export function checkForAppUpdate(version: string, build: number) {
	// Nothing to compare against (missing version.json / unknown version).
	if (!version || version === 'Unknown') return;
	// Static exports are self-contained snapshots — there's no server to
	// refresh from, and prompting would be meaningless.
	if (isStaticMode()) return;

	loadedVersion = version;
	loadedBuild = build;

	const stored = readStoredVersion();

	if (stored === null) {
		// First run — just remember the version and ignore.
		writeStoredVersion(version, build);
		return;
	}

	if (stored.build !== build) {
		// The loaded page IS the latest build; the mismatch only means the user
		// opened the app after a deploy. Silently sync — nothing to refresh.
		writeStoredVersion(version, build);
	}
}

/**
 * Start background detection of newly deployed versions while the app is open.
 * Call once at startup with the version/build this tab loaded.
 * @param version - Version string this tab loaded (used in the dialog message).
 * @param build - Build counter this tab loaded (comparison baseline).
 * @param projectId - Current Firebase project id (to read the live version label).
 */
export function startVersionUpdatePolling(
	version: string,
	build: number,
	projectId: string,
) {
	if (isStaticMode()) return;

	loadedVersion = version || loadedVersion;
	loadedBuild = build || loadedBuild;
	loadedProjectId = projectId || loadedProjectId;
	// No meaningful baseline (missing version.json) → nothing to detect.
	if (!loadedVersion || loadedVersion === 'Unknown') return;

	// Re-check when the user comes back to the tab — the most useful moment to
	// catch an update (covers the long-open-tab case without constant polling).
	window.addEventListener('focus', checkForLiveUpdate);
	document.addEventListener('visibilitychange', () => {
		if (!document.hidden) checkForLiveUpdate();
	});

	// Safety-net timer for tabs that stay open and visible for a long time.
	window.setInterval(checkForLiveUpdate, POLL_INTERVAL_MS);

	// Immediate first check (catches a deploy that landed while loading).
	checkForLiveUpdate();
}

/** Fetch the live version.json and prompt if a newer build is deployed. */
async function checkForLiveUpdate() {
	// Prompt once per loaded build; after refresh the new build takes over.
	if (updatePrompted) return;
	// Never stack the update dialog on top of another modal — the next poll
	// tick (or focus) will try again.
	if (MESSAGE_MODAL_OPEN) return;
	// Skip while the tab is hidden — the visibilitychange handler re-checks the
	// moment the user comes back, so no update is ever missed.
	if (document.hidden) return;

	let live: { build?: number; projects?: Record<string, any> };
	try {
		const response = await fetch(LIVE_VERSION_URL, { cache: 'no-store' });
		if (!response.ok) return;
		live = await response.json();
	} catch {
		// Offline / server hiccup — retry on the next tick.
		return;
	}

	const liveBuild = typeof live?.build === 'number' ? live.build : 0;
	if (liveBuild <= loadedBuild) return;

	updatePrompted = true;
	const liveVersion =
		live?.projects?.[loadedProjectId]?.version?.system || loadedVersion;
	promptRefresh(liveVersion);
}

/** Show the unblockable "new version available — refresh" dialog. */
function promptRefresh(version: string) {
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

function readStoredVersion(): StoredVersion | null {
	try {
		const raw = window.localStorage.getItem(STORAGE_KEY);
		if (!raw) return null;
		const parsed = JSON.parse(raw);
		if (
			parsed &&
			typeof parsed.version === 'string' &&
			typeof parsed.build === 'number'
		) {
			return { version: parsed.version, build: parsed.build };
		}
		// Legacy value: plain version string from the pre-polling format.
		return { version: String(raw), build: 0 };
	} catch {
		// Storage unavailable (private mode, quota, blocked cookies).
		return null;
	}
}

function writeStoredVersion(version: string, build: number) {
	try {
		window.localStorage.setItem(
			STORAGE_KEY,
			JSON.stringify({ version, build }),
		);
	} catch {
		// Ignore storage failures — worst case we re-check on the next page.
	}
}
