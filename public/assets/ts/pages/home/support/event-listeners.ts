import { getID } from '../../../utils/dom.js';
import { signInWithEmailAndPassword, signOut } from '../../../data/firebase/auth.js';
import { startLoadingScreen, stopLoadingScreen } from '../../../utils/loading.js';
import { deleteAccount } from '../../../data/firebase/database.js';
import { newTrip, newDestination, newListing } from './navigation.js';
import { restoreOnFileSelectionAction, restoreOnClickAction } from '../../../backup/restore.js';
import { backupOnClickAction } from '../../../backup/backup.js';
import {
	importDocumentsOnClickAction,
	importDocumentsOnFileSelectionAction,
} from '../../../backup/import-documents.js';
import { exportDocumentsOnClickAction } from '../../../backup/export-documents.js';
import { exportStaticOnClickAction } from '../../../static-export/export-static.js';
import {
	openTripDialog,
	closeTripDialog,
	openDestDialog,
	closeDestDialog,
	openListDialog,
	closeListDialog,
	onSearchInput,
	clearSearch,
	onTabChanged,
} from './data.js';
import { openAttributions } from '../../../utils/attributions.js';
import {
	closeToast,
	animateDialogOpen,
	animateDialogClose,
	DIALOG_LEAVE_CLASS,
	switchPanel,
} from '../../../utils/messages.js';
import { registerActions } from '../../../ui/actions.js';

export function loadListenersIndex() {
	// Login
	getID('login-button').addEventListener('click', function () {
		signInWithEmailAndPassword();
	});

	// Category tabs
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
