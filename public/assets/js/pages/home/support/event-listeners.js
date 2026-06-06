import { getID } from '../../../utils/dom.js';
import { signInWithEmailAndPassword, signOut } from '../../../data/firebase/auth.js';
import { startLoadingScreen, stopLoadingScreen } from '../../../utils/loading.js';
import { deleteAccount } from '../../../data/firebase/database.js';

function loadListenersIndex() {
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
	getID("new-trip-btn").addEventListener("click", function () { viagensNovo(); });
	getID("new-dest-btn").addEventListener("click", function () { destinosNovo(); });
	getID("new-list-btn").addEventListener("click", function () { listagensNovo(); });

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
}

function openModal() {
	getID("modal").style.display = "flex";
}

function closeModal() {
	getID("modal").style.display = "none";
}
