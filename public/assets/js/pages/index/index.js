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
