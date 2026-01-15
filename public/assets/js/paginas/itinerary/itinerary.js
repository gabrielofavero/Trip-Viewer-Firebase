window.addEventListener("load", async function () {
	try {
		_startLoadingScreen();
		_main();
		_stopLoadingScreen();
	} catch (error) {
		_displayError(error);
		console.error(error);
	}
});
