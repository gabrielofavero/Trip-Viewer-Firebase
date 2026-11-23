import { clearMediaCache } from '../../../app/media-cache.js';
import { backupOnClickAction } from '../../../backup/backup.js';
import { exportDocumentsOnClickAction } from '../../../backup/export-documents.js';
import {
	importDocumentsOnClickAction,
	importDocumentsOnFileSelectionAction,
} from '../../../backup/import-documents.js';
import { restoreOnClickAction, restoreOnFileSelectionAction } from '../../../backup/restore.js';
import { signInWithEmailAndPassword, signOut } from '../../../data/firebase/auth.js';
import { deleteAccount } from '../../../data/firebase/database.js';
import { translate } from '../../../i18n/translation.js';
import { exportStaticOnClickAction } from '../../../static-export/export-static.js';
import { registerActions } from '../../../ui/actions.js';
import { scrollTabIntoView, setupScrollHint } from '../../../ui/scroll-hint.js';
import { openAttributions } from '../../../utils/attributions.js';
import { getID } from '../../../utils/dom.js';
import { startLoadingScreen, stopLoadingScreen } from '../../../utils/loading.js';
import {
	animateDialogClose,
	animateDialogOpen,
	closeToast,
	DIALOG_LEAVE_CLASS,
	openToast,
	switchPanel,
} from '../../../utils/messages.js';
import {
	clearSearch,
	closeDestDialog,
	closeFoldersDialog,
	closeListDialog,
	closeTripDialog,
	deleteCurrentFolderFromDialog,
	onSearchInput,
	onTabChanged,
	openDestDialog,
	openFoldersDialog,
	openListDialog,
	openTripDialog,
	saveFolderFromDialog,
	toggleDestinationFolder,
} from './data.js';
import { newDestination, newListing, newTrip } from './navigation.js';
import { openPersonDialog } from './people.js';

/**
 * Hide Settings actions that must never run against real (production) Firebase
 * data. "Import Account" overwrites the entire account from a backup file, so
 * it is only offered while connected to the local emulators
 * (`__TRIPVIEWER_EMULATOR__`, set by firebase-config.js). On production —
 * deployed hosts or `dev:prd` (real Firebase on localhost) — the button is
 * hidden to avoid clobbering real user data.
 */
function hideProductionOnlySettings(): void {
	if (window.__TRIPVIEWER_EMULATOR__ === true) return;
	const importAccountBtn = document.querySelector<HTMLElement>('[data-action="restore-account"]');
	if (importAccountBtn) importAccountBtn.style.display = 'none';
}

export function loadListenersIndex() {
	hideProductionOnlySettings();

	// Login
	getID('login-button').addEventListener('click', function () {
		signInWithEmailAndPassword();
	});

	// Hide the inline login error as soon as the user starts editing the fields.
	['login-email', 'login-password'].forEach((id) => {
		const field = getID(id);
		if (field) {
			field.addEventListener('input', () => {
				const loginError = getID('login-error');
				if (loginError && !loginError.hidden) loginError.hidden = true;
			});
		}
	});

	// Category tabs
	const categoryTabs = getID('category-tabs');
	if (categoryTabs) setupScrollHint(categoryTabs);

	const tabs = document.querySelectorAll('.category-tab');
	tabs.forEach((tab) => {
		tab.addEventListener('click', function () {
			const target = this.getAttribute('data-tab');
			const content = document.getElementById('tab-' + target);
			const current = document.querySelector('.tab-content.active') as HTMLElement | null;

			// Standardized panel switch: the current content plays its leaving
			// animation while the target plays its entering one.
			if (switchPanel(current, content)) {
				tabs.forEach((t) => t.classList.remove('active'));
				this.classList.add('active');
				onTabChanged(target);
				// The active label expands on phones — keep the pill fully visible.
				scrollTabIntoView(this as HTMLElement);
			}
		});
	});

	// Profile icon → settings tab
	getID('profile-icon').addEventListener('click', function () {
		const current = document.querySelector('.tab-content.active') as HTMLElement | null;
		const settingsContent = document.getElementById('tab-settings');
		if (switchPanel(current, settingsContent)) {
			tabs.forEach((t) => t.classList.remove('active'));
			const settingsTab = document.querySelector('.category-tab[data-tab="settings"]');
			if (settingsTab) settingsTab.classList.add('active');
			onTabChanged('settings');
			if (settingsTab) scrollTabIntoView(settingsTab as HTMLElement);
		}
	});

	// New item buttons
	getID('new-trip-btn').addEventListener('click', function () {
		newTrip();
	});
	getID('new-dest-btn').addEventListener('click', function () {
		newDestination();
	});
	getID('new-list-btn').addEventListener('click', function () {
		newListing();
	});

	// Search
	getID('search-input').addEventListener('input', function (event) {
		onSearchInput((event.target as HTMLInputElement).value);
	});
	getID('search-clear').addEventListener('click', function () {
		clearSearch();
	});

	// Destination folder dialog — Enter in the name field saves the folder.
	const folderNameInput = getID('folder-dialog-name') as HTMLInputElement | null;
	if (folderNameInput) {
		folderNameInput.addEventListener('keydown', function (event) {
			if ((event as KeyboardEvent).key === 'Enter') {
				event.preventDefault();
				saveFolderFromDialog();
			}
		});
	}

	// Delete account
	getID('delete-btn').addEventListener('click', async function () {
		startLoadingScreen();
		await deleteAccount();
		closeModal();
		signOut();
		stopLoadingScreen();
	});

	// Restore file input
	document.getElementById('restore-account-input').addEventListener('change', function (event) {
		restoreOnFileSelectionAction(event);
	});

	// Import documents file input
	document.getElementById('import-documents-input').addEventListener('change', function (event) {
		importDocumentsOnFileSelectionAction(event);
	});

	// Register data-action handlers via the shared delegated handler (ui/actions.js)
	registerActions({
		'sign-out': () => signOut(),
		'backup-account': () => backupOnClickAction(),
		'restore-account': () => restoreOnClickAction(),
		'import-documents': () => importDocumentsOnClickAction(),
		'export-documents': () => exportDocumentsOnClickAction(),
		'export-static': () => exportStaticOnClickAction(),
		'clear-image-cache': async () => {
			const cleared = await clearMediaCache();
			openToast(translate(cleared ? 'account.image_cache.cleared' : 'account.image_cache.empty'));
		},
		'open-delete-modal': () => openModal(),
		'close-delete-modal': () => closeModal(),
		'close-trip-dialog': () => closeTripDialog(),
		'close-dest-dialog': () => closeDestDialog(),
		'close-list-dialog': () => closeListDialog(),
		'open-attributions': () => openAttributions(),
		'close-toast': () => closeToast(),
		'open-trip-dialog': (target) => {
			const tripId = target.getAttribute('data-trip-id');
			if (tripId) openTripDialog(tripId);
		},
		'open-dest-dialog': (target) => {
			const destId = target.getAttribute('data-dest-id');
			if (destId) openDestDialog(destId);
		},
		'open-list-dialog': (target) => {
			const listId = target.getAttribute('data-list-id');
			if (listId) openListDialog(listId);
		},
		'open-folders-dialog': () => openFoldersDialog(),
		'edit-dest-folder': (target) => openFoldersDialog(target.getAttribute('data-folder-id')),
		'save-folder': () => saveFolderFromDialog(),
		'delete-current-folder': () => deleteCurrentFolderFromDialog(),
		'close-folders-dialog': () => closeFoldersDialog(),
		'edit-person': (target) => openPersonDialog(target.getAttribute('data-person-id')),
		'add-person': () => openPersonDialog(null),
		'toggle-dest-folder': (target) =>
			toggleDestinationFolder(target.getAttribute('data-folder-id')),
	});
}

export function openModal() {
	const modal = getID('modal');
	animateDialogOpen(modal, 'flex');
	const card = modal?.querySelector<HTMLElement>('.modal-card');
	if (card) animateDialogOpen(card);
}

export function closeModal() {
	const modal = getID('modal');
	if (!modal || modal.style.display === 'none') return;
	const card = modal.querySelector<HTMLElement>('.modal-card');
	if (card) {
		// Fade the backdrop out while the card slides down; hide once it ends.
		modal.classList.add(DIALOG_LEAVE_CLASS);
		animateDialogClose(card, () => {
			modal.classList.remove(DIALOG_LEAVE_CLASS);
			modal.style.display = 'none';
		});
	} else {
		animateDialogClose(modal);
	}
}
