import { getID } from '../../../utils/dom.js';
import { signInWithEmailAndPassword, signOut } from '../../../data/firebase/auth.js';
import { startLoadingScreen, stopLoadingScreen } from '../../../utils/loading.js';
import { deleteAccount } from '../../../data/firebase/database.js';
import { newTrip, newDestination, newListing } from './navigation.js';
import { restoreOnFileSelectionAction, restoreOnClickAction } from '../../../backup/restore.js';
import { backupOnClickAction } from '../../../backup/backup.js';
import { openTripDialog, closeTripDialog, openDestDialog, closeDestDialog, openListDialog, closeListDialog } from './data.js';
import { openAttributions } from '../../../utils/attributions.js';
import { closeToast } from '../../../utils/messages.js';

export function loadListenersIndex() {
	// Login
	getID("login-button").addEventListener("click", function () {
		signInWithEmailAndPassword();
	});

	// Category tabs
	const tabs = document.querySelectorAll(".category-tab");
	tabs.forEach(tab => {
		tab.addEventListener("click", function () {
			const target = this.getAttribute("data-tab");

			// Update active tab
			tabs.forEach(t => t.classList.remove("active"));
			this.classList.add("active");

			// Show target content
			document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));
			const content = document.getElementById("tab-" + target);
			if (content) content.classList.add("active");
		});
	});

	// Profile icon → settings tab
	getID("profile-icon").addEventListener("click", function () {
		tabs.forEach(t => t.classList.remove("active"));
		document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));
		const settingsTab = document.querySelector('.category-tab[data-tab="settings"]');
		if (settingsTab) settingsTab.classList.add("active");
		const settingsContent = document.getElementById("tab-settings");
		if (settingsContent) settingsContent.classList.add("active");
	});

	// New item buttons
	getID("new-trip-btn").addEventListener("click", function () { newTrip(); });
	getID("new-dest-btn").addEventListener("click", function () { newDestination(); });
	getID("new-list-btn").addEventListener("click", function () { newListing(); });

	// Delete account
	getID("delete-btn").addEventListener("click", async function () {
		startLoadingScreen();
		await deleteAccount();
		closeModal();
		signOut();
		stopLoadingScreen();
	});

	// Restore file input
	document.getElementById("restore-account-input")
		.addEventListener("change", function (event) {
			restoreOnFileSelectionAction(event);
		});

	// Centralized delegated click handler for all data-action elements
	document.addEventListener("click", function (event) {
		const target = event.target.closest("[data-action]");
		if (!target) return;

		const action = target.getAttribute("data-action");
		if (!action) return;

		switch (action) {
			case "sign-out":
				signOut();
				break;
			case "backup-account":
				backupOnClickAction();
				break;
			case "restore-account":
				restoreOnClickAction();
				break;
			case "open-delete-modal":
				openModal();
				break;
			case "close-delete-modal":
				closeModal();
				break;
			case "close-trip-dialog":
				closeTripDialog();
				break;
			case "close-dest-dialog":
				closeDestDialog();
				break;
			case "close-list-dialog":
				closeListDialog();
				break;
			case "open-attributions":
				openAttributions();
				break;
			case "close-toast":
				closeToast();
				break;
			case "open-trip-dialog": {
				const tripId = target.getAttribute("data-trip-id");
				if (tripId) openTripDialog(tripId);
				break;
			}
			case "open-dest-dialog": {
				const destId = target.getAttribute("data-dest-id");
				if (destId) openDestDialog(destId);
				break;
			}
			case "open-list-dialog": {
				const listId = target.getAttribute("data-list-id");
				if (listId) openListDialog(listId);
				break;
			}
		}
	});
}

export function openModal() {
	getID("modal").style.display = "flex";
}

export function closeModal() {
	getID("modal").style.display = "none";
}
