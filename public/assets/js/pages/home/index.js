import { startLoadingScreen, stopLoadingScreen } from '../../utils/loading.js';
import { displayError } from '../../utils/messages.js';

document.addEventListener("DOMContentLoaded", async function () {
	startLoadingScreen();
	try {
		main();
	} catch (error) {
		displayError(error);
		throw error;
	}
	stopLoadingScreen();
});

async function loadIndexPage() {
	loadVisibilityIndex();
	loadListenersIndex();
	loadUserIndex();
}
window.loadIndexPage = loadIndexPage;
