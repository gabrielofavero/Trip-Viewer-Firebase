import { stopLoadingScreen } from '../../../utils/loading.js';

var SAVED_SCROLL_POSITION = 0;
const ACTIVE_EMBEDS = {};

function loadViewEmbed() {
	if (FIRESTORE_DATA.modulos?.gastos === true) {
		loadEmbedListeners(_loadViewEmbedAction);
	}
}

function openViewEmbed(url) {
	const frameID = "lightbox-iframe";
	const newTab = true;
	const beforeOpen = () => {
		SAVED_SCROLL_POSITION =
			window.pageYOffset || document.documentElement.scrollTop;
		startLoadingScreen();
		window.scrollTo(0, 0);
	};
	const onLoad = () => {
		getID("lightbox").style.display = "block";
		getID("night-mode").style.display = "none";
		getID("menu").style.display = "none";
		getID("navbar").style.display = "none";
		stopLoadingScreen();
		disableScroll();
	};

	openEmbed({ frameID, url, beforeOpen, onLoad, newTab });
}

function closeViewEmbed(redirectToHome = false, visibility) {
	getID("lightbox").style.display = "none";
	getID("night-mode").style.display = "block";
	getID("menu").style.display = "block";
	getID("navbar").style.display = "block";
	enableScroll();

	if (redirectToHome) {
		window.location.href = `index?visibility=${visibility || getVisibility()}`;
	} else {
		window.scrollTo({
			top: SAVED_SCROLL_POSITION,
			behavior: "instant",
		});
	}

	if (visibility) {
		loadExternalVisibility(visibility);
	}
}

function openExpensesEmbed() {
	openEmbed({
		frameID: "expenses-embed-frame",
		url: `expenses.html?visibility=${getVisibility()}&embed=1&g=${getURLParam("v")}`,
	});
}

function loadImageLightbox(className) {
	GLightbox({
		selector: `.${className}`,
		autofocusVideos: false,
		touchNavigation: true,
		touchFollowAxis: true,
		width: "auto",
		height: "auto",
	});
}

function sendToExpenses(type, value) {
	sendToEmbed("expenses-embed-frame", type, value);
}

function loadViewEmbedAction(data) {
	switch (data?.page) {
		case "expenses":
			loadExpensesEmbedAction(data);
	}

	function loadExpensesEmbedAction(data) {
		switch (data.type) {
			case "height":
				getID("expenses-embed").style.height = `${data.value}px`;
				return;
			case "pin":
				if (PIN || !data.value || data.value.length != 4) return;
				updateProtectedDataFromExternalPin(data.value);
		}
	}
}
